/**
 * Memory schema — the foundation everything builds on (eng-review locked).
 *
 * SINGLE mode-tagged store (revised from siloed after cross-model challenge):
 * one space, every record carries `mode`, retrieval is filtered by active mode.
 * Same no-leak guarantee via a retrieval-scope policy, not separate databases,
 * and it keeps a UNIFIED life-arc (the stronger moat artifact).
 */
import type { Mode } from '@/design/tokens';

export type ID = string;

/** Raw conversational turns. The verbatim log. */
export interface EpisodicEntry {
  id: ID;
  mode: Mode;
  role: 'user' | 'companion';
  text: string;
  createdAt: number;
  /** Embedding for semantic retrieval. null until embedded. */
  embedding: number[] | null;
}

/** Durable facts about the person. Always injected (pinned). */
export interface SemanticFact {
  id: ID;
  mode: Mode | 'shared'; // identity-level facts are 'shared'
  key: string;
  value: string;
  confidence: number; // 0..1
  updatedAt: number;
}

/** Commitments the companion gave. Backs coached-step completion + the ritual. */
export interface OpenLoop {
  id: ID;
  mode: Mode;
  commitment: string;
  createdAt: number;
  dueAt: number | null;
  status: 'open' | 'done' | 'dropped';
  resolvedAt: number | null;
}

/** Mood/energy timeseries. Backs state-sensing + the life-arc trend. */
export interface MoodPoint {
  id: ID;
  mode: Mode;
  // Self-reported on a calm 1..5 scale + optional transcript-sentiment.
  mood: number; // 1 low .. 5 high
  energy: number; // 1 low .. 5 high
  note: string | null;
  createdAt: number;
}

/** A "moment" surfaced in the life-arc narrative (kept commitment, hard day got through). */
export interface ArcMoment {
  id: ID;
  mode: Mode;
  kind: 'kept' | 'got_through' | 'win' | 'turning_point';
  text: string; // narrated in the companion's voice
  createdAt: number;
}

export interface MemorySnapshot {
  episodic: EpisodicEntry[];
  facts: SemanticFact[];
  loops: OpenLoop[];
  mood: MoodPoint[];
  moments: ArcMoment[];
}

export const newId = (): ID =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
