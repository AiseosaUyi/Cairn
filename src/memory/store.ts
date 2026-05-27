/**
 * Data layer. One interface, swappable adapters:
 *   - "local"    : expo-sqlite (default; runs with zero credentials)
 *   - "supabase" : stub wired for the real adapter when keys are added
 *
 * Sensitive-data note (eng-review tiered-encryption lock): raw episodic text +
 * identifiers are the strong-encryption tier. The local adapter stores them in
 * the app sandbox; the Supabase adapter MUST apply at-rest encryption + RLS
 * before any health data is written. Embeddings/derived text are the
 * searchable tier. Enforced at the adapter boundary, documented honestly.
 */
import type { Mode } from '@/design/tokens';
import {
  type ArcMoment,
  type EpisodicEntry,
  type MemorySnapshot,
  type MoodPoint,
  type OpenLoop,
  type SemanticFact,
} from './schema';

export interface MemoryStore {
  init(): Promise<void>;
  addEpisodic(e: EpisodicEntry): Promise<void>;
  addFact(f: SemanticFact): Promise<void>;
  addLoop(l: OpenLoop): Promise<void>;
  updateLoop(id: string, patch: Partial<OpenLoop>): Promise<void>;
  addMood(m: MoodPoint): Promise<void>;
  addMoment(m: ArcMoment): Promise<void>;
  /** Returns the full snapshot scoped to a mode (+ shared facts). */
  snapshot(mode: Mode): Promise<MemorySnapshot>;
  /** Unified across modes — only for the life-arc artifact. */
  snapshotAll(): Promise<MemorySnapshot>;
  /** Account/data deletion — irreversible. Store-review requirement. */
  wipeAll(): Promise<void>;
  /** Full export (data portability / "download my data"). */
  exportAll(): Promise<MemorySnapshot>;
}

// --- In-memory backing used by the local adapter and tests ----------------
class InMemoryBacking {
  episodic: EpisodicEntry[] = [];
  facts: SemanticFact[] = [];
  loops: OpenLoop[] = [];
  mood: MoodPoint[] = [];
  moments: ArcMoment[] = [];
}

/**
 * Local adapter. Uses an in-memory backing hydrated from / flushed to
 * expo-sqlite when available. The SQLite calls are isolated so the engine and
 * tests run anywhere; persistence is best-effort and never blocks the UI.
 */
class LocalStore implements MemoryStore {
  private db = new InMemoryBacking();
  private sqlite: any = null;

  async init() {
    try {
      // Lazy import keeps non-Expo test environments working.
      const SQLite = await import('expo-sqlite');
      this.sqlite = await SQLite.openDatabaseAsync('cairn.db');
      await this.sqlite.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT);
      `);
      const row = await this.sqlite.getFirstAsync(
        'SELECT v FROM kv WHERE k = ?',
        ['snapshot'],
      );
      if (row?.v) {
        const parsed = JSON.parse(row.v) as InMemoryBacking;
        Object.assign(this.db, parsed);
      }
    } catch {
      // No SQLite (web/test) — stay in-memory. Graceful, never throws.
      this.sqlite = null;
    }
  }

  private async flush() {
    if (!this.sqlite) return;
    try {
      await this.sqlite.runAsync(
        'INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)',
        ['snapshot', JSON.stringify(this.db)],
      );
    } catch {
      /* persistence is best-effort; UI must not depend on it */
    }
  }

  async addEpisodic(e: EpisodicEntry) {
    this.db.episodic.push(e);
    await this.flush();
  }
  async addFact(f: SemanticFact) {
    const i = this.db.facts.findIndex((x) => x.key === f.key && x.mode === f.mode);
    if (i >= 0) this.db.facts[i] = f;
    else this.db.facts.push(f);
    await this.flush();
  }
  async addLoop(l: OpenLoop) {
    this.db.loops.push(l);
    await this.flush();
  }
  async updateLoop(id: string, patch: Partial<OpenLoop>) {
    const i = this.db.loops.findIndex((x) => x.id === id);
    if (i >= 0) this.db.loops[i] = { ...this.db.loops[i], ...patch };
    await this.flush();
  }
  async addMood(m: MoodPoint) {
    this.db.mood.push(m);
    await this.flush();
  }
  async addMoment(m: ArcMoment) {
    this.db.moments.push(m);
    await this.flush();
  }

  async snapshot(mode: Mode): Promise<MemorySnapshot> {
    // Retrieval-scope policy: only this mode's records + shared facts. This is
    // the no-cross-mode-leak guarantee, enforced here, covered by an eval.
    return {
      episodic: this.db.episodic.filter((e) => e.mode === mode),
      facts: this.db.facts.filter((f) => f.mode === mode || f.mode === 'shared'),
      loops: this.db.loops.filter((l) => l.mode === mode),
      mood: this.db.mood.filter((m) => m.mode === mode),
      moments: this.db.moments.filter((m) => m.mode === mode),
    };
  }

  async snapshotAll(): Promise<MemorySnapshot> {
    return {
      episodic: [...this.db.episodic],
      facts: [...this.db.facts],
      loops: [...this.db.loops],
      mood: [...this.db.mood],
      moments: [...this.db.moments],
    };
  }

  async wipeAll() {
    this.db = new InMemoryBacking();
    if (this.sqlite) {
      try {
        await this.sqlite.runAsync('DELETE FROM kv WHERE k = ?', ['snapshot']);
      } catch {
        /* ignore */
      }
    }
  }

  async exportAll(): Promise<MemorySnapshot> {
    return this.snapshotAll();
  }
}

/** Supabase adapter — intentionally a guarded stub until creds + RLS exist. */
class SupabaseStore implements MemoryStore {
  async init() {
    throw new Error(
      'Supabase adapter not configured. Set EXPO_PUBLIC_SUPABASE_* and ' +
        'apply at-rest encryption + row-level security before storing health data ' +
        '(eng-review tiered-encryption gate). Falling back to local is intentional.',
    );
  }
  async addEpisodic() {}
  async addFact() {}
  async addLoop() {}
  async updateLoop() {}
  async addMood() {}
  async addMoment() {}
  async snapshot(): Promise<MemorySnapshot> {
    return { episodic: [], facts: [], loops: [], mood: [], moments: [] };
  }
  async snapshotAll(): Promise<MemorySnapshot> {
    return { episodic: [], facts: [], loops: [], mood: [], moments: [] };
  }
  async wipeAll() {}
  async exportAll(): Promise<MemorySnapshot> {
    return { episodic: [], facts: [], loops: [], mood: [], moments: [] };
  }
}

let singleton: MemoryStore | null = null;

export async function getStore(): Promise<MemoryStore> {
  if (singleton) return singleton;
  const adapter = process.env.EXPO_PUBLIC_DATA_ADAPTER ?? 'local';
  let store: MemoryStore = new LocalStore();
  if (adapter === 'supabase') {
    try {
      const sb = new SupabaseStore();
      await sb.init();
      store = sb;
    } catch (err) {
      console.warn('[memory] supabase unavailable, using local:', String(err));
      store = new LocalStore();
      await store.init();
    }
  } else {
    await store.init();
  }
  singleton = store;
  return store;
}

/** Test seam. */
export function __resetStoreForTest() {
  singleton = null;
}
