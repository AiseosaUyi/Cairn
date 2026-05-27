/**
 * Design tokens — single source of truth, transcribed from DESIGN.md.
 *
 * Direction (2026-05-26, v3): Mature Consumer — premium editorial sans
 * with a single warm accent. References: Apple Family pages, Headspace,
 * Stripe Atlas, Notion marketing. Warmth comes from palette + cadence, not
 * from rounded letterforms. Inter does the structural work; Instrument
 * Serif is the one editorial moment per screen (companion voice + the
 * occasional display).
 *
 * Supersedes:
 * - v1 "Duolingo warmth" (slab buttons, pillowy radii, emoji tabs) — too toy.
 * - v2 "Quiet Modern" (Fraunces + Nunito + cognac) — both type families
 *   were optical-soft / rounded-soft, compounding into "playful." Founder
 *   feedback 2026-05-26: looked odd, wanted top-site polish.
 */

export type Mode = 'career' | 'health';
export type Scheme = 'light' | 'dark';

const base = {
  light: {
    // warm off-white, mature — between pure white and cream
    canvas: '#F8F7F4',
    card: '#FFFFFF',
    // near-black with the faintest warmth (not blue-black, not cold)
    ink: '#0E0D0B',
    inkSoft: '#5E5A52',
    hairline: '#E8E4DC',
  },
  dark: {
    canvas: '#0F0E0C',
    card: '#1A1916',
    ink: '#F2EFEA',
    inkSoft: '#A39F96',
    hairline: '#2B2924',
  },
} as const;

// ONE muted warm accent — terracotta. Reads like museum signage or a worn
// leather notebook: dignified, considered, warm without candy. Not the
// prior cognac (still felt food-brand). Career-only at launch — Health
// accent parked behind the gate.
const accent: Record<Mode, Record<Scheme, string>> = {
  career: { light: '#A24F33', dark: '#C46A4D' },
  health: { light: '#3A8B72', dark: '#56C2A2' },
};

// Crisis: calm, serious — NEVER red, NEVER playful.
const crisis = { light: '#3E4754', dark: '#9AA6B4' } as const;

const joy = {
  // muted forest for encouragement (a real kept commitment)
  light: { coral: '#C25F4A', encourage: '#4A6B3D' },
  dark: { coral: '#D9745F', encourage: '#6B8A5C' },
} as const;

const semantic = {
  light: { success: '#4A6B3D', caution: '#A87C2E', error: '#B24A38', info: '#3F6079' },
  dark: { success: '#6B8A5C', caution: '#C49656', error: '#C25F4A', info: '#6E92AE' },
} as const;

export function palette(mode: Mode, scheme: Scheme) {
  return {
    ...base[scheme],
    accent: accent[mode][scheme],
    crisis: crisis[scheme],
    ...joy[scheme],
    ...semantic[scheme],
    // soft wash for celebratory moments only — low opacity, never under body
    washTop: scheme === 'light' ? '#F1E5D6' : '#221F1B',
    washBottom: base[scheme].canvas,
  };
}

export type Palette = ReturnType<typeof palette>;

export const space = {
  '2xs': 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 72,
} as const;

export const layout = {
  maxContentWidth: 540,
  // Tighter geometry — modern consumer polish, not pillowy.
  radius: { chip: 6, control: 8, card: 12, sheet: 16, full: 9999 },
  minTouchTarget: 44,
  controlHeight: 52,
} as const;

// Whisper-soft shadows; 1px hairline borders do the structural work.
export const shadow = {
  rest: {
    shadowColor: '#0E0D0B',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  raised: {
    shadowColor: '#0E0D0B',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
} as const;

export const type = {
  family: {
    // Companion voice + one display moment per screen — the editorial touch.
    voice: 'InstrumentSerif_400Regular',
    voiceItalic: 'InstrumentSerif_400Regular_Italic',
    // UI / body / headings / buttons — Inter does the structural work.
    ui: 'Inter_400Regular',
    uiMedium: 'Inter_500Medium',
    uiSemibold: 'Inter_600SemiBold',
    uiBold: 'Inter_700Bold',
  },
  // Modern consumer scale — tighter top-end, body floor 16 (a11y locked).
  size: {
    caption: 13,
    body: 16,
    lede: 18,
    h3: 21,
    h2: 26,
    h1: 34,
    display: 46,
  },
  lineHeight: { body: 1.55, heading: 1.15 },
} as const;

// Eased breath, never springy. moti `timing` with ease-out for entries,
// ease-in-out for state changes. Crisis = zero motion (motion sites must
// check `useReducedMotion()` AND a `frozen` prop).
export const motion = {
  duration: { micro: 90, short: 240, medium: 320, celebrate: 600 },
  liftPx: 8,
  press: { scale: 0.97, opacity: 0.85 },
} as const;
