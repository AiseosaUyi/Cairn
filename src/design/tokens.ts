/**
 * Design tokens — single source of truth, transcribed from DESIGN.md.
 *
 * Direction: warm, alive, encouraging. Duolingo's warmth (chunky tactile
 * shapes, friendly rounding, joyful accents, gentle spring) WITHOUT its
 * loss-aversion. The companion still speaks like a warm letter (Fraunces);
 * the world around it is friendly and tactile (Nunito).
 */

export type Mode = 'career' | 'health';
export type Scheme = 'light' | 'dark';

const base = {
  light: {
    canvas: '#FBF6EE',
    card: '#FFFFFF',
    ink: '#2A2622',
    inkSoft: '#7A726A',
    hairline: '#EDE4D6',
  },
  dark: {
    canvas: '#1C1A17',
    card: '#262320',
    ink: '#F2EDE4',
    inkSoft: '#A89E92',
    hairline: '#37332D',
  },
} as const;

// One accent PER MODE — recolors the world (mode-as-place).
const accent: Record<Mode, Record<Scheme, string>> = {
  career: { light: '#E8943A', dark: '#F0A451' }, // honey / amber
  health: { light: '#3FA98A', dark: '#56C2A2' }, // fresh sage-mint
};

// Darker shade of the accent for the chunky button bottom edge (the
// satisfying "pressable slab" depth).
const accentEdge: Record<Mode, Record<Scheme, string>> = {
  career: { light: '#B86E22', dark: '#C07B2E' },
  health: { light: '#2E7E66', dark: '#3C8C73' },
};

// Crisis: calm, serious, NEVER red, NEVER playful.
const crisis = { light: '#46505E', dark: '#9AA6B4' } as const;

const joy = {
  light: { coral: '#F2785C', encourage: '#4CB782' },
  dark: { coral: '#F58E74', encourage: '#63C795' },
} as const;

const semantic = {
  light: { success: '#4CB782', caution: '#E0A23A', error: '#D8674F', info: '#5887A8' },
  dark: { success: '#63C795', caution: '#EBB45C', error: '#E47E68', info: '#7AA3C0' },
} as const;

export function palette(mode: Mode, scheme: Scheme) {
  return {
    ...base[scheme],
    accent: accent[mode][scheme],
    accentEdge: accentEdge[mode][scheme],
    crisis: crisis[scheme],
    ...joy[scheme],
    ...semantic[scheme],
    // warm gradient wash — celebration/headers only, never behind body text
    washTop: scheme === 'light' ? '#FBE0C9' : '#2E2A24',
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
  // pillowy: rounding signals safety + friendliness here
  radius: { chip: 14, control: 18, card: 24, sheet: 30, full: 9999 },
  minTouchTarget: 44,
  controlHeight: 54, // chunky, Duolingo-grade
} as const;

// Soft, layered, never harsh. RN-shaped (iOS shadow + Android elevation).
export const shadow = {
  rest: {
    shadowColor: '#2A2622',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#2A2622',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

export const type = {
  family: {
    // Companion voice / display / life-garden narrative — the soul.
    voice: 'Fraunces_500Medium',
    voiceBold: 'Fraunces_600SemiBold',
    // UI / body / labels / buttons — friendly + credible. Never system-ui.
    ui: 'Nunito_500Medium',
    uiSemibold: 'Nunito_600SemiBold',
    uiBold: 'Nunito_700Bold',
  },
  size: {
    caption: 14,
    body: 17, // never below 16 (a11y)
    lede: 19,
    h3: 23,
    h2: 30,
    h1: 38,
    display: 50,
  },
  lineHeight: { body: 1.55, heading: 1.12 },
} as const;

// Gentle spring; soft settle, not a bounce circus. Crisis = zero motion.
export const motion = {
  spring: { damping: 18, stiffness: 170, mass: 1 },
  duration: { micro: 120, short: 240, medium: 360, celebrate: 700 },
} as const;
