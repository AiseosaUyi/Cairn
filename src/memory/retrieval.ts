/**
 * Hybrid memory retrieval (eng-review locked): pinned facts + recency +
 * semantic. The thing ChatGPT structurally can't do — it wakes amnesiac.
 *
 * Embedding is pluggable. The default is a cheap deterministic local hash
 * embedding so the loop runs with zero credentials; swap for a real model
 * (pgvector + HNSW on the Supabase adapter) by setting the embedder.
 */
import type { Mode } from '@/design/tokens';
import { getStore } from './store';
import type { EpisodicEntry, MemorySnapshot } from './schema';

export type Embedder = (text: string) => Promise<number[]>;

const DIM = 64;

// Deterministic bag-of-tokens hash embedding. Not good, but stable, free, and
// good enough to prove the retrieval shape end-to-end without a model.
const localEmbedder: Embedder = async (text: string) => {
  const v = new Array(DIM).fill(0);
  for (const tok of text.toLowerCase().split(/\W+/).filter(Boolean)) {
    let h = 0;
    for (let i = 0; i < tok.length; i++) h = (h * 31 + tok.charCodeAt(i)) | 0;
    v[Math.abs(h) % DIM] += 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
};

let embedder: Embedder = localEmbedder;
export function setEmbedder(e: Embedder) {
  embedder = e;
}
export const embed = (t: string) => embedder(t);

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) dot += a[i] * b[i];
  return dot; // both pre-normalized
}

export interface RetrievedContext {
  pinnedFacts: string[];
  recent: EpisodicEntry[];
  semantic: EpisodicEntry[];
  openLoops: MemorySnapshot['loops'];
  recentMood: MemorySnapshot['mood'];
}

/**
 * Assemble the per-turn context for one mode. Small top-k, bounded — a
 * year-long relationship must not blow the context window (memory-budget lock).
 */
export async function retrieve(
  mode: Mode,
  query: string,
  opts: { recentK?: number; semanticK?: number } = {},
): Promise<RetrievedContext> {
  const recentK = opts.recentK ?? 8;
  const semanticK = opts.semanticK ?? 5;
  const store = await getStore();
  const snap = await store.snapshot(mode);

  const pinnedFacts = snap.facts
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 12)
    .map((f) => `${f.key}: ${f.value}`);

  const byTime = [...snap.episodic].sort((a, b) => a.createdAt - b.createdAt);
  const recent = byTime.slice(-recentK);
  const recentIds = new Set(recent.map((e) => e.id));

  const qVec = await embed(query);
  const candidates = byTime.filter((e) => !recentIds.has(e.id) && e.embedding);
  const semantic = candidates
    .map((e) => ({ e, score: cosine(qVec, e.embedding as number[]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, semanticK)
    .map((x) => x.e);

  return {
    pinnedFacts,
    recent,
    semantic,
    openLoops: snap.loops.filter((l) => l.status === 'open'),
    recentMood: snap.mood.slice(-7),
  };
}
