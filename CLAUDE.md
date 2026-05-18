# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

TrueSelf is an Expo (SDK 52) + expo-router + TypeScript mobile app: a warm AI
companion with two modes (Career, Health). It runs end-to-end with **zero
credentials** via a mock LLM + local SQLite, so it is always demoable.

## Commands

Package manager is **bun** (committed `bun.lock`; `.npmrc` sets
`node-linker=hoisted` so pnpm also works — never mix lockfiles).

```bash
bun install
bun start              # Expo dev server (press w=web, i=iOS, a=Android)
bunx expo start --web --clear   # web, cache cleared (most reliable for quick visual checks)
bun run typecheck      # tsc --noEmit — run before considering work done
bun run test           # jest-expo: the safety eval suites
bun run test -- -t "crisis-detection"   # a single suite by name
bun scripts/gen-assets.mjs              # regenerate icon/splash/favicon/store frames from assets/brand/logo.svg
```

`bunx expo install --fix` after dependency changes (pins to SDK 52). `bun run
test` invokes jest-expo — **not** `bun test` (Bun's own runner won't read the preset).

## Architecture (the parts that need multiple files to understand)

**Two layers: `app/` is UI/routing, `src/` is the engine.** UI never talks to
the LLM or store directly — it goes through `src/companion/turn.ts`.

- **Routing — "mode-as-place".** `app/index.tsx` routes
  welcome → consent → onboarding → `/[mode]`. `app/[mode]/_layout.tsx` is a
  `Tabs` shell wrapped in `ThemeProvider` for that mode. The active mode
  recolors the whole app; **switching modes is deliberate and lives only in
  the You tab — never add it as a tab.** `[mode]` is `career` | `health`.

- **The turn pipeline (`src/companion/turn.ts`)** is the spine. Order matters
  and is load-bearing: classify crisis → persist user turn → hybrid memory
  retrieval (`src/memory/retrieval.ts`) → build system prompt
  (`src/companion/playbook.ts`) → `completeSafe` (`src/llm/integrity.ts`
  wraps `src/llm/provider.ts`) → health guardrail if `sensitive` → record
  risk event (`src/safety/observability.ts`) → persist companion turn.

- **Memory (`src/memory/`)** is a single mode-tagged store, not siloed DBs.
  `store.ts` has a `MemoryStore` interface with a local (expo-sqlite, default)
  adapter and a Supabase stub; `snapshot(mode)` enforces the no-cross-mode-leak
  policy (covered by a test). `retrieval.ts` = pinned facts + recency +
  semantic (pluggable embedder; deterministic local default).

- **Provider/data are swappable by env**, default to offline mock/local so the
  app always runs. See `.env.example`.

- **Design system is code.** `src/design/tokens.ts` (transcribed from
  `DESIGN.md`) → `theme.tsx` (per-mode palette, light-locked) → `Text.tsx`
  (variants) and `components/ui.tsx` (Screen/Card/Button/CompanionBubble/
  CrisisInline). Always change `DESIGN.md` + tokens together; don't hardcode
  colors/sizes in screens.

## Safety gates — do not bypass

`src/safety/gates.ts` reads `EXPO_PUBLIC_GATE_CRISIS_REVIEWED` and
`EXPO_PUBLIC_GATE_HEALTH_CLEARED` (default **false**). These block crisis copy
and the entire Health domain from user exposure until real
professional/legal/clinical sign-off. The repo `.env` sets them **true for
LOCAL TESTING ONLY** — never ship that; production keeps them false until
sign-off (see `LAUNCH.md`). The safety eval suites in `__tests__/safety.test.ts`
gate the corresponding features and must stay green.

## Design hard locks (do not violate without re-review)

- Nunito for UI/body, Fraunces for the companion voice — never system-ui/Inter/Outfit.
- Warm light only (no dark; `theme.tsx` is light-locked) — direction is
  "warm, alive, encouraging": Duolingo's warmth, **never** its streak-guilt /
  loss-aversion. Progress = the life-garden (tend, never punish).
- Crisis state = calm in-conversation slate, no motion, never panic-red, never playful.
- WCAG AA, 44px+ touch targets (controls 54px), low-bandwidth/offline tolerant.
- Companion is nameless by default ("your companion"); the name is user-set in
  onboarding/Settings and threaded via `profile.ts` → `playbook.ts` → UI.

## Context

Product/strategy artifacts (office-hours design doc, CEO plan, eng test plan)
live in `~/.gstack/projects/TrueSelf/`. `LAUNCH.md` is the honest
store-submission gap list. Two product risks remain open and are not code:
unproven demand, and no binding kill ceiling.
