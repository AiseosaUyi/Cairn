# TrueSelf

An AI companion that remembers you. Mode-based: **Career** (with Mara) or
**Health** (with Tomi) — focused experts on one shared engine. The bond is the
retention lever; it's earned by real coaching substance.

Built from the locked plan in `~/.gstack/projects/TrueSelf/` and `DESIGN.md`.

## Run it (no credentials needed)

**Recommended: bun** — Expo-supported, fastest, no RN footguns.

```bash
bun install
bun start            # Expo dev server → press i / a / w
bun run typecheck
bun run test         # runs jest-expo (NOT `bun test`, which is Bun's own runner)
```

**pnpm** also works (a `.npmrc` with `node-linker=hoisted` is included — RN/Metro
can't resolve pnpm's default symlinked layout without it):

```bash
pnpm install
pnpm start
pnpm typecheck
pnpm test
```

`npm` still works too (`npm install && npm start`). Use one and commit only its
lockfile (`bun.lockb` / `pnpm-lock.yaml` / `package-lock.json`) — don't mix.

The app runs end-to-end today on a **mock LLM** and a **local SQLite store**.
Add real adapters by copying `.env.example` → `.env` and filling values.

## What's wired

| Workstream | Status |
|---|---|
| Design system (DESIGN.md → code) | done — `src/design/*` |
| Mode-as-place navigation | done — `app/[mode]/*` |
| Memory engine (single mode-tagged store, hybrid retrieval) | done — `src/memory/*` |
| LLM provider + output-integrity | done (mock; real adapter = stub) — `src/llm/*` |
| Daily ritual + state-sensing + disengagement-decay | done — `src/companion/*` |
| Coached-step completion + life-arc artifact | done — `src/companion/{coaching,lifearc}.ts` |
| Crisis (calm inline) + health guardrails | done, **GATED** — `src/safety/*` |
| Runtime safety: risk scoring + kill switch + triage | done — `src/safety/observability.ts` |
| Safety eval suites (recall-gated) | done — `__tests__/safety.test.ts` |

## Safety gates (read before flipping)

`EXPO_PUBLIC_GATE_CRISIS_REVIEWED` and `EXPO_PUBLIC_GATE_HEALTH_CLEARED`
default **false**. They stay false until a qualified professional / legal +
clinical review signs off (CEO-plan hard gate). Crisis support resources still
render pre-review because a person's safety overrides a gate; the final
reviewed copy does not ship until the gate opens. Health mode is fully blocked
until cleared.

## Not done in this pass (honest)

- Real LLM + Supabase adapters (interfaces + stubs in place; drop-in by env).
- Self-hosted woff2 fonts for low-bandwidth NG (using @expo-google-fonts now).
- Phase 0 external legal/clinical workstream — out of code by design.
- The two standing risks from review remain yours: unproven demand, and no
  binding kill ceiling. Neither is a code task.
