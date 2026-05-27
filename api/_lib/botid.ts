/**
 * BotID guard for our Vercel Node functions.
 *
 * `checkBotId()` from `botid/server` reads the current request from
 * framework context (Next/Nuxt/SvelteKit). We're on the Expo + Vercel
 * Node pattern, so we wrap it with a try/catch and fail OPEN locally /
 * when BotID isn't configured, and CLOSED in production when configured.
 *
 * Configuration:
 *   - BOTID_REQUIRED=1 in production env → enforces the check; bots get
 *     403'd.
 *   - Unset / 0 → calls checkBotId() and logs, but lets requests through
 *     even if the check throws. Good for the cutover period.
 *
 * The client-side `initBotId({ protect: [...] })` decides which paths
 * get the challenge headers; the server-side check verifies them.
 */

export interface BotCheckResult {
  isBot: boolean;
  /** Why we let it through (for logging). */
  why?: string;
}

export async function checkBot(): Promise<BotCheckResult> {
  const required = process.env.BOTID_REQUIRED === '1';
  // Local dev / preview without BotID config: don't block, don't even
  // attempt — keeps the loop runnable without the package's framework
  // wiring set up.
  if (!required && process.env.NODE_ENV !== 'production') {
    return { isBot: false, why: 'BOTID_REQUIRED unset in non-prod' };
  }
  try {
    const { checkBotId } = await import('botid/server');
    const v = await checkBotId();
    if (v.isBot) return { isBot: true };
    return { isBot: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (required) {
      // Configured-required but check errored → fail CLOSED. Better to
      // 403 a legitimate user (rare) than let bots through.
      console.error('[botid] check failed but required:', msg);
      return { isBot: true, why: `check failed: ${msg}` };
    }
    console.warn('[botid] check failed (open):', msg);
    return { isBot: false, why: `check failed but optional: ${msg}` };
  }
}
