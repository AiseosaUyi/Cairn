/**
 * Coached-step completion (CEO-plan expansion #2) + life-arc moment capture.
 *
 * The substance metric: did the user actually DO the thing the companion
 * coached? Measured, surfaced in the life-arc, never bond-alone. Plus the
 * "got through it" moments that make the arc something to grieve losing.
 */
import type { Mode } from '@/design/tokens';
import { newId } from '@/memory/schema';
import { getStore } from '@/memory/store';

export async function addCommitment(
  mode: Mode,
  commitment: string,
  dueAt: number | null = null,
) {
  const store = await getStore();
  await store.addLoop({
    id: newId(),
    mode,
    commitment,
    createdAt: Date.now(),
    dueAt,
    status: 'open',
    resolvedAt: null,
  });
}

export async function resolveCommitment(
  mode: Mode,
  id: string,
  status: 'done' | 'dropped',
) {
  const store = await getStore();
  await store.updateLoop(id, { status, resolvedAt: Date.now() });
  if (status === 'done') {
    const snap = await store.snapshot(mode);
    const loop = snap.loops.find((l) => l.id === id);
    if (loop) {
      await store.addMoment({
        id: newId(),
        mode,
        kind: 'kept',
        text: `You said you'd ${loop.commitment}. You did.`,
        createdAt: Date.now(),
      });
    }
  }
}

/** Substance metric: completion rate of coached commitments in a mode. */
export async function completionRate(mode: Mode): Promise<{
  done: number;
  total: number;
  rate: number;
}> {
  const snap = await (await getStore()).snapshot(mode);
  const resolved = snap.loops.filter((l) => l.status !== 'open');
  const done = resolved.filter((l) => l.status === 'done').length;
  const total = resolved.length;
  return { done, total, rate: total ? done / total : 0 };
}
