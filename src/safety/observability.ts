/**
 * Runtime safety subsystem (added to v1 by eng-review outside-voice gap #1).
 *
 * Offline evals gate release; THIS catches what they can't at runtime:
 *   - every turn gets a risk score + is logged
 *   - risky turns raise an operator flag (miss-triage queue)
 *   - a per-mode kill switch can disable a mode instantly
 *
 * Without this, a production crisis-detection miss is invisible. Detection
 * theater is worse than no detection.
 */
import type { Mode } from '@/design/tokens';
import type { CrisisLevel } from './crisis';

export interface RiskEvent {
  id: string;
  mode: Mode;
  at: number;
  crisis: CrisisLevel;
  redFlag: boolean;
  deferred: boolean;
  excerpt: string; // short, for triage; full text stays in the encrypted tier
}

type Listener = (e: RiskEvent) => void;

class SafetyBus {
  private events: RiskEvent[] = [];
  private listeners: Listener[] = [];
  private killed: Partial<Record<Mode, boolean>> = {};

  record(e: Omit<RiskEvent, 'id' | 'at'>) {
    const full: RiskEvent = { ...e, id: `${Date.now()}`, at: Date.now() };
    this.events.push(full);
    if (full.crisis !== 'none' || full.redFlag) {
      // Operator flag. In production this fans out to a real on-call channel;
      // here it is an in-app triage queue so a human is never blind to a miss.
      for (const l of this.listeners) l(full);
    }
  }

  subscribe(l: Listener) {
    this.listeners.push(l);
    return () => {
      this.listeners = this.listeners.filter((x) => x !== l);
    };
  }

  triageQueue(): RiskEvent[] {
    return this.events.filter((e) => e.crisis !== 'none' || e.redFlag);
  }

  /** Kill switch — disable a mode instantly if it is misbehaving. */
  kill(mode: Mode) {
    this.killed[mode] = true;
  }
  revive(mode: Mode) {
    this.killed[mode] = false;
  }
  isKilled(mode: Mode): boolean {
    return !!this.killed[mode];
  }
}

export const Safety = new SafetyBus();
