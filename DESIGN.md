# Design System — Cairn

> Memorable thing: **"a warm companion with a face — it remembers me and it's
> genuinely glad I showed up."**
>
> Direction (2026-05-26, v3): **Mature Consumer — premium editorial sans
> with a single warm accent.** References: Apple Family pages, Headspace,
> Stripe Atlas, Notion marketing. Warmth comes from palette and cadence
> (off-white canvas, terracotta accent, generous breath), not from rounded
> letterforms. The companion still sounds like a warm letter — but the
> serif is now Instrument Serif (sharp, editorial), used rarely so it stays
> special. Everything else is Inter, the workhorse of serious consumer
> software.

## Why we replaced v2 (2026-05-26)
v1 was Duolingo warmth (slab buttons, pillowy radii, emoji tabs) — too toy.
v2 was "Quiet Modern" (Fraunces + Nunito + cognac) — both fonts were
soft-shape (optical-soft serif + rounded-soft sans), compounding into
"playful." Founder feedback: looked odd, wanted top-site polish, "like a
family app — mature, greatly designed." Lessons carried forward:
- Warmth via *palette + cadence*, not rounded glyphs.
- Use one editorial moment per screen, not editorial-everywhere.
- Single accent, used with restraint — multi-accent reads brand-confused.

## Ethics lines (carry through every revision)
- **No streak-guilt. No loss-aversion.** Progress is momentum you *build and
  tend* (a growing life-garden), never a counter you are punished for breaking.
- **Crisis stays calm.** Quiet everywhere; the crisis surface goes quieter
  still — calm slate, zero motion, never a celebratory or alarming treatment.
- **Encouragement, not manipulation.** Positive feedback celebrates real
  substance (a kept commitment), never mere app-opening.
- **Health stays gated** (deferred at launch per CEO plan 2026-05-26 —
  Career is the only user-facing mode until Health clears legal/clinical).

## Aesthetic
- **Tone:** mature, considered, composed, alive. The product carries real
  weight (career stakes, eventual health stakes); the chrome respects that.
- **Decoration:** restraint. Warm off-white canvas, one terracotta accent,
  hairline 1px borders doing structural work, shadows so soft they're
  almost suggestion. NEVER cliché purple-on-white, NEVER chunky arcade
  affordances, NEVER emoji-as-icon, NEVER multi-color accents.

## Typography
- **Inter** — workhorse. UI, body, headings (h1–h3), lede, labels, buttons,
  captions. The default of serious consumer tech (Linear, Vercel, Figma,
  Notion at scale). Negative letter-spacing on display/headings tightens
  the rhythm; positive letter-spacing + uppercase on labels gives small
  text typographic weight.
- **Instrument Serif** — the one editorial moment. Used *only* for the
  companion voice (`voice`) and the rare display (`display`). Sharp, clear,
  editorial — none of the optical-soft quirks of Fraunces. Used rarely so
  it stays special; overuse turns the system back to indie-bookshop.
- **Never:** system-ui, Fraunces, Nunito, Outfit, anything rounded-soft.
- **Scale (px):** caption 13 · body 16 · lede 18 · h3 21 · h2 26 · h1 34 ·
  display 46. Body floor 16 (a11y). Line-height body 1.55, headings 1.15.
- **Label variant**: 13px uppercase Inter Medium, +0.4 tracking — the
  premium-consumer-app micro-label pattern (Stripe, Linear, Vercel).

## Color
Off-white canvas + one muted warm accent. Terracotta does all the warmth
work — there is no second accent.
- **Base light:** canvas `#F8F7F4` · card `#FFFFFF` · ink `#0E0D0B` ·
  ink-soft `#5E5A52` · hairline `#E8E4DC`
- **Base dark (parked for future opt-in):** canvas `#0F0E0C` · card `#1A1916`
  · ink `#F2EFEA` · ink-soft `#A39F96` · hairline `#2B2924`
- **Career accent (terracotta):** light `#A24F33` / dark `#C46A4D`. Reads
  museum signage, worn leather notebook — dignified, considered, warm
  without candy.
- **Health accent (parked, deferred):** light `#3A8B72` / dark `#56C2A2`
- **Joy support (sparing):** coral `#C25F4A`, encouragement-green
  `#4A6B3D` (forest, not bright). The green is for *earned* warmth — a
  real kept commitment, never for app-opening.
- **Crisis (calm, serious — NEVER red, NEVER playful):** slate `#3E4754`
- **Semantic (muted):** success `#4A6B3D` · caution `#A87C2E` ·
  error `#B24A38` (form-only, never crisis) · info `#3F6079`
- **Gradient wash:** warm peach→off-white `#F1E5D6 → #F8F7F4` (celebration
  only; low opacity ≤ 60%; never behind body text).

## Shape & Depth
- **Radius:** chip 6 · control 8 · card 12 · sheet 16 · pill/avatar 9999.
  Tight, modern, consumer-polished — not pillowy, not sharp.
- **Shadow (whisper-soft, 1px hairlines do the structural work):**
  - rest: `0 1px 2px rgba(14,13,11,0.03)` paired with 1px hairline border
  - raised (buttons/cards under attention): `0 4px 12px rgba(14,13,11,0.06)`
  - **No slab edge.** Buttons are flat with a subtle scale-and-opacity
    press feedback (scale 0.97, opacity 0.85, 90ms ease-out).
- **Buttons:** flat, dignified, full-width-friendly, min height 52px, Inter
  Semibold label. Primary = accent fill on white text. Ghost = 1.25px
  hairline. Soft = card with 1.25px hairline.

## Motion
- **Approach:** eased breath, not springy bounce. Mount = 8px rise + fade
  over 320ms ease-out-quart. Press = scale 0.97 + opacity 0.85 over 90ms.
  Screen transitions = cross-fade with subtle lift. Lists stagger in
  (40ms each).
- **Library:** **moti** (declarative API on top of `react-native-reanimated`
  v3). **NOT framer-motion** — that's web-only and wrong for React Native.
- **Timing tokens (ms):** micro 90 · short 240 · medium 320 · celebrate 600.
- **Easing:** `Easing.out(Easing.quad)` for entries · `Easing.inOut(Easing.quad)`
  for state changes · no springs by default.
- **prefers-reduced-motion:** `useReducedMotion()` (from
  `react-native-reanimated`, wrapped at `@/design/useReducedMotion`)
  short-circuits all enters to instant opacity. Respected at every site.
- **Crisis:** zero motion. Every motion wrapper inside a crisis surface
  must receive `frozen={true}`. Stillness is the signal.

## Signature Components
- **Companion bubble:** mascot glyph + Instrument Serif voice text in
  free-flowing layout. No chat-tail bubble — the serif + alignment + mascot
  carry sender hierarchy without chat-app affordances.
- **Life-garden (replaces "streak"):** the life-arc rendered as a growing,
  tended thing — kept commitments and got-through days become quiet dots
  along a gentle path. Only ever grows or rests; never wilts as punishment.
- **Encouragement chip:** muted forest-green pill. Used only for a real
  kept commitment ("You said you would. You did."). Earned.
- **Mood check-in:** clean 1–5 picker — refined squares with selected-state
  fill, numerals not emoji. The act of picking is the data.
- **Crisis inline:** the one calm, chromeless, motionless place. Slate,
  region-aware help, companion stays present.
- **Tabs:** text labels (no emoji) with a 2px accent underline on the
  active tab. Clean, mature, no chrome.

## Accessibility (hard)
WCAG AA contrast both themes, 44px+ touch targets (controls 52px), visible
labels, screen-reader semantics, low-bandwidth tolerant, one-handed reach.
Verify every accent-on-card and ink-on-canvas pairing.

## Anti-Slop (hard)
No purple gradients. No 3-column icon-circle grid. No centered-everything.
No system font. No harsh drop shadows. No fake-bouncy spam. No streak/flame
guilt. **No emoji tab icons. No slab arcade buttons. No asymmetric chat
tails. No Fraunces/Nunito (replaced).** Cards earn their place. Delete 30%
of copy, then again.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-17 | v1 (quiet editorial warmth) → v1.1 (Duolingo warmth) | Initial system; revised same day, somber read as off-putting |
| 2026-05-17 | Fraunces + Nunito, replaces Outfit | Literary soul + friendly-credible workhorse (v1/v2) |
| 2026-05-17 | "Life-garden" replaces any streak metaphor | Momentum you tend, never punishment |
| 2026-05-26 | v2 "Quiet Modern" (Fraunces + Nunito + cognac) | Founder: "too playful, too toy." Tightened geometry, killed slab buttons + emoji tabs. Kept old fonts. |
| 2026-05-26 | **v3 "Mature Consumer" — Inter + Instrument Serif + terracotta + off-white** | v2 still read odd; the two soft-shape fonts compounded into playful. Inter does structural work; Instrument Serif appears rarely as the editorial touch. Refs: Apple Family / Headspace / Stripe Atlas / Notion. CLAUDE.md hard-lock on "never Inter" lifted per founder directive. |
| 2026-05-26 | Terracotta `#A24F33` accent replaces cognac amber | Cognac still food-brand; terracotta reads museum/leather/considered |
| 2026-05-26 | Labels become uppercase Inter Medium +0.4 tracking | Premium-consumer-app micro-label pattern (Stripe, Linear, Vercel) |
| 2026-05-26 | Health palette parked (CEO plan: Career-only at launch) | Defer Health, keep code behind gate |
