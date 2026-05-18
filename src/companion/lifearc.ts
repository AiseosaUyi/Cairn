/**
 * Life-arc artifact (the named moat, design-review locked): a quiet narrative
 * timeline. Words first, trend behind the moments, companion's voice. NOT a
 * stats/streak dashboard. Unified across modes (single mode-tagged store).
 *
 * Droplets-vs-trend rule (design-doc lock): when a recent entry is low but the
 * trailing slope is flat-or-up, name BOTH — validate the bad day, then show
 * the longer arc. NEVER false-cheerlead when the trend is genuinely declining;
 * surface the decline honestly instead.
 */
import { getStore } from '@/memory/store';
import type { ArcMoment, MoodPoint } from '@/memory/schema';

export interface LifeArc {
  moments: ArcMoment[]; // newest first, the scrollable story
  trend: number[]; // mood series for the subtle line behind the words
  reframe: string | null; // companion-voice line, or null when none is honest
}

function slope(series: number[]): number {
  if (series.length < 2) return 0;
  const n = series.length;
  const xs = series.map((_, i) => i);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = series.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (series[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den ? num / den : 0;
}

export function buildReframe(mood: MoodPoint[]): string | null {
  if (mood.length < 4) return null;
  const series = mood.map((m) => m.mood);
  const recent = series[series.length - 1];
  const trailing = series.slice(-Math.min(21, series.length));
  const s = slope(trailing);

  // Recent bad day + flat/rising arc → the reframe.
  if (recent <= 2 && s >= -0.02) {
    return (
      'Today was heavy, and I’m not going to pretend it wasn’t. But look at the ' +
      'longer line: across these weeks you’ve been climbing, even on days like ' +
      'this one. A hard day is a droplet, not the river.'
    );
  }
  // Genuinely declining → do NOT cheerlead. Name it honestly.
  if (s < -0.05) {
    return (
      'I want to be straight with you: the last stretch has been trending down, ' +
      'not just one bad day. That’s worth us looking at together — not to ' +
      'panic, but because you don’t have to white-knuckle this alone.'
    );
  }
  return null;
}

export async function getLifeArc(): Promise<LifeArc> {
  // Unified across modes — only the life-arc reads everything.
  const snap = await (await getStore()).snapshotAll();
  const moments = [...snap.moments].sort((a, b) => b.createdAt - a.createdAt);
  const mood = [...snap.mood].sort((a, b) => a.createdAt - b.createdAt);
  return {
    moments,
    trend: mood.map((m) => m.mood),
    reframe: buildReframe(mood),
  };
}
