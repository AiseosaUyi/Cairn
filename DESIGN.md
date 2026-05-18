# Design System — TrueSelf

> Memorable thing: **"a warm companion with a face — it remembers me and it's
> genuinely glad I showed up."**
>
> Direction (revised 2026-05-17): **Warm, alive, encouraging.** The earlier
> quiet-editorial direction read too somber for a product whose job is to lift
> people. We keep the literary soul (the companion still *speaks* like a
> letter) but the world around it is friendly, rounded, and tactile —
> Duolingo's warmth and aliveness, deliberately WITHOUT Duolingo's
> loss-aversion dark patterns.

## Ethics lines (unchanged — these gate the playfulness)
- **No streak-guilt. No loss-aversion.** Progress is momentum you *build and
  tend* (a growing life-garden), never a counter you are punished for breaking.
  Missing a day is met with warmth, never a broken-flame guilt screen.
- **Crisis stays calm.** Playful everywhere else; the crisis surface is the one
  place that goes quiet and serious. Calm slate, in-conversation, never a
  celebratory or alarming treatment.
- **Encouragement, not manipulation.** Positive feedback celebrates real
  substance (a kept commitment), never mere app-opening.
- **Health stays gated** until clinical/legal review.

## Aesthetic
- **Tone:** warm, friendly, confident, alive. Soft and rounded, not childish.
  Big tappable shapes, pillowy depth, gentle spring motion, a companion that
  feels present.
- **Decoration:** intentional warmth — soft peach/cream gradient washes, subtle
  grain, generous rounding. NEVER cliché purple-on-white, NEVER flat-cold.

## Typography
- **Companion voice / display / life-garden narrative:** **Fraunces** (soft
  optical serif). The soul. The companion still reads like a warm letter.
- **UI / body / labels / buttons:** **Nunito** (rounded humanist sans). Friendly
  and credible — the "approachable but not a toy" workhorse. Replaces Outfit.
- **Numerals / data:** Nunito tabular.
- **Never:** system-ui, Inter, Outfit-as-primary, anything cold-geometric.
- **Scale (px):** caption 14 · body 17 · lede 19 · h3 23 · h2 30 · h1 38 ·
  display 50. Body never < 16 (a11y). Line-height body 1.55, headings 1.12.

## Color
Warm cream soul + saturated-but-calm joy. One mode accent recolors the world.
- **Base light:** canvas `#FBF6EE` · card `#FFFFFF` · ink `#2A2622` ·
  ink-soft `#7A726A` · hairline `#EDE4D6`
- **Base dark:** canvas `#1C1A17` · card `#262320` · ink `#F2EDE4` ·
  ink-soft `#A89E92` · hairline `#37332D`
- **Career accent (honey/amber):** light `#E8943A` / dark `#F0A451`
- **Health accent (fresh sage-mint):** light `#3FA98A` / dark `#56C2A2`
- **Joy support:** coral `#F2785C` (warmth, highlights), encouragement-green
  `#4CB782` (a kept commitment — earned, not for app-opening)
- **Crisis (calm, serious — NEVER red, NEVER playful):** slate `#46505E`
- **Semantic (muted):** success `#4CB782` · caution `#E0A23A` ·
  error `#D8674F` (form-only, never crisis) · info `#5887A8`
- **Gradient wash:** warm peach→cream `#FBE0C9 → #FBF6EE` (headers/celebration
  moments only; low opacity; never behind body text).

## Shape & Depth
- **Radius:** chip 14 · control 18 · card 24 · sheet 30 · pill/avatar 9999.
  Pillowy by default — rounding signals safety and friendliness here.
- **Shadow (soft, layered, never harsh):**
  - rest: `0 2px 8px rgba(42,38,34,0.06)`
  - raised (buttons/cards): `0 6px 20px rgba(42,38,34,0.10)`
  - chunky button base: a 3–4px solid bottom edge in a darker accent shade
    (the Duolingo "pressable slab" feel) — pressing flattens it.
- **Buttons:** large, chunky, full-width-friendly, min height 54px, bold Nunito
  label, accent fill with the solid bottom-edge depth; press = translate down +
  edge collapse (tactile, satisfying, never bouncy-annoying).

## Motion
- **Approach:** gentle spring. Things arrive with a soft settle, not a bounce
  circus. Celebratory feedback on real wins (a confetti-light shimmer, a
  garden sprout), calm everywhere ambient.
- **Spring:** damping 18, stiffness 170 (soft settle). Duration fallbacks:
  micro 120 · short 240 · medium 360 · celebrate 700.
- **prefers-reduced-motion:** all springs → instant opacity; celebrations →
  a single static state. Respected at every call site.
- **Crisis:** zero motion. Stillness is the signal.

## Signature Components
- **Companion bubble:** large soft card, Fraunces voice text, a small warm
  character glyph for Mara (honey) / Tomi (sage). The companion has presence.
- **Life-garden (replaces "streak"):** the life-arc rendered as a growing,
  tended thing — kept commitments and got-through days become sprouts/blooms
  along a gentle path. It only ever grows or rests; it never wilts as
  punishment. Words first, the growth is the quiet backdrop.
- **Encouragement chip:** soft coral/green pill that celebrates a real kept
  commitment with warmth ("You said you would. You did. 🌱-style, earned").
- **Mood check-in:** big friendly 1–5 pickers as soft pill toggles, warm
  copy, never clinical.
- **Crisis inline:** the one place the system goes calm — slate, quiet, no
  chrome, region-aware help, companion stays present.

## Accessibility (hard — unchanged)
WCAG AA contrast both themes, 44px+ targets (controls 54px), visible labels,
screen-reader semantics, low-bandwidth tolerant, one-handed reach. Warmth
never costs contrast: test every accent-on-card pairing.

## Anti-Slop (hard)
No purple gradients. No 3-column icon-circle grid. No centered-everything. No
system font. No harsh drop shadows. No fake-bouncy spam. No streak/flame
guilt. Cards earn their place. Delete 30% of copy, then again.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-17 | Initial system (quiet editorial warmth) | /design-consultation |
| 2026-05-17 | **Revised → warm/alive/encouraging** | Somber read as off-putting; adopt Duolingo warmth, keep all ethics lines (no loss-aversion, calm crisis) |
| 2026-05-17 | Fraunces (voice) + Nunito (UI), replaces Outfit | Literary soul + friendly-credible workhorse |
| 2026-05-17 | "Life-garden" replaces any streak metaphor | Momentum you tend, never punishment for missing |
