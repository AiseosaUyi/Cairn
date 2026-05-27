/**
 * Character roster — 8 archetype companions the user can choose from.
 *
 * Each character is a focused career-AI persona: HR, recruiter, coach,
 * negotiator, etc. Picking one shapes the agent's voice and the lens it
 * applies to your goals. Future: user can also upload a custom portrait
 * which the image pipeline converts into a coordinated cartoon avatar.
 *
 * ---------------------------------------------------------------------------
 * CREATIVE DIRECTOR — visual style guide all 8 characters must follow.
 * ---------------------------------------------------------------------------
 * This is the requirements doc the founder asked for: a single source the
 * image-generation pipeline (production: DALL-E 3 / Imagen 3 / SDXL) reads
 * to keep the cast visually coordinated. It is intentionally specific so
 * a swap from one image API to another preserves the brand.
 */
export const CHARACTER_STYLE_GUIDE = {
  rendering:
    '3D realistic cartoon, Disney-Pixar style — soft subsurface skin, ' +
    'gentle rim light, shallow depth-of-field, slightly oversized eyes, ' +
    'expressive but composed. NOT anime, NOT clay, NOT flat-2D.',
  composition:
    'Upper torso framing, centered, looking 10° off-camera, gentle confident ' +
    'expression. No raised arms, no props larger than the head. Eyes meet ' +
    'the viewer briefly — warm, not staring.',
  setting:
    'Soft out-of-focus warm-neutral background (#F8F7F4 base with a subtle ' +
    'gradient to a deeper warm tone). NO desks, NO laptops, NO whiteboards. ' +
    'A single professional wardrobe cue is enough (blazer, button-down, ' +
    'simple necklace) — never corporate-stiff suit-and-tie.',
  palette:
    'Coordinated to the Cairn brand: warm off-whites, terracotta (#A24F33) ' +
    'reserved for one accent per portrait (a collar pin, a scarf, a hairband). ' +
    'Skin tones full natural range — no over-saturation, no plastic look.',
  diversity:
    'Across the 8 portraits: range of ethnicities (representative of the ' +
    'global workforce, not US-centric), ages 28-58, genders balanced, ' +
    'body types varied, visible disability welcomed. No two characters ' +
    'share a defining trait stack.',
  prohibitions: [
    'No stock-photo grin (toothy 32-tooth smile).',
    'No "thumbs-up" / "pointing-at-camera" poses.',
    'No corporate-stock-photo "diverse group looking at laptop" energy.',
    'No fantastical elements (no wings, no halos, no robot parts).',
    'No exaggerated proportions (bobbleheads, chibis).',
  ],
} as const;

/** Build the per-character image prompt used by the production image API. */
export function buildImagePrompt(c: Character): string {
  return [
    `Portrait of ${c.name}, a ${c.role}, ${c.appearance}.`,
    `Style: ${CHARACTER_STYLE_GUIDE.rendering}`,
    `Composition: ${CHARACTER_STYLE_GUIDE.composition}`,
    `Setting: ${CHARACTER_STYLE_GUIDE.setting}`,
    `Palette: ${CHARACTER_STYLE_GUIDE.palette}`,
    `Avoid: ${CHARACTER_STYLE_GUIDE.prohibitions.join(' ')}`,
  ].join(' ');
}

export interface Character {
  id: string;
  name: string;
  /** Professional role — shown as the badge on the card. */
  role: string;
  /** One-line essence — shown under the name. */
  vibe: string;
  /** Three sharp skills — shown as bullets on the back of the card. */
  skills: string[];
  /** Region/global tag — used by the filter chips. */
  region: 'Global' | 'NG' | 'US' | 'EU' | 'APAC';
  /** Visual description fed to the image generator. NOT user-facing. */
  appearance: string;
  /** Locked behind future paid tier. */
  premium: boolean;
  /** DiceBear seed used for the placeholder cartoon avatar in dev.
   *  Production: this gets replaced by a stable image URL from the
   *  generated-portrait pipeline. */
  seed: string;
}

export const CHARACTERS: Character[] = [
  {
    id: 'maya',
    name: 'Maya',
    role: 'Career Coach',
    vibe: 'For when you need to make a big move — and want it to land right.',
    skills: [
      'Transitions across industries and functions',
      'Reframing your story for a new audience',
      'Sequencing the next 90 days into one clear path',
    ],
    region: 'Global',
    appearance:
      'Black woman, late 30s, natural curly hair, warm brown skin, soft ' +
      'smile, cream blouse with terracotta neckscarf',
    premium: false,
    seed: 'maya-coach-1',
  },
  {
    id: 'devon',
    name: 'Devon',
    role: 'Insider Recruiter',
    vibe: 'Knows what the hiring manager actually wants — and what the JD hides.',
    skills: [
      'Decodes job descriptions and signals',
      'Maps target-company hiring panels',
      'Tells you which roles you can stretch into',
    ],
    region: 'US',
    appearance:
      'White man, early 40s, salt-and-pepper short hair, glasses, charcoal ' +
      'crewneck sweater, slight knowing half-smile',
    premium: false,
    seed: 'devon-recruiter-1',
  },
  {
    id: 'priya',
    name: 'Priya',
    role: 'Promotion Strategist',
    vibe: 'You stay; the title catches up. Plays the long game at your current company.',
    skills: [
      'Promo packets and scope arguments',
      'Stakeholder mapping and visibility',
      'Reading the room you are actually in',
    ],
    region: 'APAC',
    appearance:
      'South Asian woman, mid 30s, shoulder-length dark hair, navy blazer ' +
      'over white shirt, single terracotta lapel pin',
    premium: false,
    seed: 'priya-promo-1',
  },
  {
    id: 'james',
    name: 'James',
    role: 'Offer Negotiator',
    vibe: "The number on the offer letter isn't the number — let's fix that.",
    skills: [
      'Comp benchmarking with real data',
      'Counter-offer scripts that work',
      'Total comp scope: equity, sign-on, scope',
    ],
    region: 'US',
    appearance:
      'Asian-American man, late 30s, side-parted dark hair, light blue ' +
      'button-down, no tie, calm direct gaze',
    premium: true,
    seed: 'james-negotiator-1',
  },
  {
    id: 'sarah',
    name: 'Sarah',
    role: 'Interview Coach',
    vibe: 'Practices the hostile question you fear most until it bores you.',
    skills: [
      'Behavioral STAR drilling',
      'Technical scoping and case prep',
      'Calming the freeze in the moment',
    ],
    region: 'EU',
    appearance:
      'Latina woman, early 30s, wavy auburn hair, olive blazer, terracotta ' +
      'earrings, encouraging warm expression',
    premium: false,
    seed: 'sarah-interview-1',
  },
  {
    id: 'adi',
    name: 'Adi',
    role: 'Brand Strategist',
    vibe: 'Builds the version of you the right people are looking for.',
    skills: [
      'LinkedIn that sounds human',
      'Portfolio that shows judgment, not polish',
      'Saying less, meaning more',
    ],
    region: 'Global',
    appearance:
      'Middle Eastern man, mid 30s, neat dark beard, round glasses, oatmeal ' +
      'turtleneck, observant gentle smile',
    premium: false,
    seed: 'adi-brand-1',
  },
  {
    id: 'lin',
    name: 'Lin',
    role: 'Founder Mentor',
    vibe: 'For zero-to-one career bets. Equity over title. Optionality over comfort.',
    skills: [
      'Joining at the right stage for you',
      'Reading founders and early teams',
      'Path from operator to founder',
    ],
    region: 'APAC',
    appearance:
      'East Asian woman, late 30s, sleek bob, cream wool coat, single ' +
      'terracotta scarf, quietly confident look',
    premium: true,
    seed: 'lin-founder-1',
  },
  {
    id: 'marcus',
    name: 'Marcus',
    role: 'Executive Coach',
    vibe: "Senior scope, senior politics. For the rooms that don't forgive missteps.",
    skills: [
      'Exec-level positioning and air cover',
      'Board, peer, and skip-level dynamics',
      'Building the bench so you can scale',
    ],
    region: 'NG',
    appearance:
      'Black man, mid 50s, close-cropped greying hair, charcoal blazer over ' +
      'oxford shirt, steady measured expression',
    premium: true,
    seed: 'marcus-exec-1',
  },
];

/** Resolve a character by id — returns null if missing (e.g., stale profile). */
export function findCharacter(id: string | null): Character | null {
  if (!id) return null;
  return CHARACTERS.find((c) => c.id === id) ?? null;
}

/** Resolves the portrait URL for a character.
 *
 * Priority:
 *   1) EXPO_PUBLIC_PORTRAITS_BASE_URL  → CDN-hosted production portraits
 *      (`{base}/{id}.png`). Use this once you push to Vercel Blob /
 *      Cloudflare R2 / equivalent.
 *   2) Local bundled portraits at /assets/characters/<id>.png — these
 *      were generated by scripts/gen-portraits.mjs via Pollinations.ai
 *      and committed to the repo. Served by the static build.
 *
 * `size` is kept for API parity but ignored — local PNGs are fixed-size.
 */
export function avatarUrl(c: Character, _size = 400): string {
  const cdn = process.env.EXPO_PUBLIC_PORTRAITS_BASE_URL;
  if (cdn) return `${cdn.replace(/\/$/, '')}/${c.id}.png`;
  return `/assets/characters/${c.id}.png`;
}
