# Launch readiness — Cairn

Honest status. The app is **submission-shaped and clear of the common
auto-rejection traps**. It is not yet *approvable* — store approval needs a
real backend, the crisis sign-off, real screenshots, and store accounts. This
file is the gap list, not a promise.

## ✅ Built and in the app

- Consent gate: age 17+ attestation + explicit Terms/Privacy/disclaimer accept
  before any data is entered.
- In-app **Privacy Policy, Terms, Medical/AI disclaimer** (Settings + consent).
- **Account & data deletion** (Settings → permanent, immediate) — Apple
  5.1.1(v) / Play data-deletion.
- **Data export** (Settings) — portability.
- **Always-reachable crisis/help** (header + Settings + welcome + consent).
- Health domain hard-gated until clinical/legal sign-off (env flag).
- Crisis copy gated until professional sign-off (env flag).
- Global crash boundary + warm 404.
- Brand: app icon, adaptive icon, splash, favicon (from `assets/brand/logo.svg`).
- Tab nav, all core screens, light-locked warm design system (DESIGN.md).
- Offline-tolerant, AA contrast, 44–54px targets, no streak/dark patterns.

## ⛔ Required before you can actually submit (not code I can finish)

1. **Crisis professional sign-off.** A licensed mental-health professional
   must review crisis detection behavior + copy + routing. Until then keep
   `EXPO_PUBLIC_GATE_CRISIS_REVIEWED=false` in production. (.env in this repo
   has it `true` for LOCAL TESTING ONLY — never ship that.)
2. **Health legal + clinical sign-off** before `EXPO_PUBLIC_GATE_HEALTH_CLEARED`
   is ever true in production. Apple/Play scrutinize health apps hard.
3. **Real backend** (LLM provider with zero-retention terms + Supabase with
   at-rest encryption & RLS). Today it runs on a mock + local store.
4. **Hosted Privacy URL.** Stores require a public privacy policy URL. The copy
   exists in-app and at `/legal/privacy` (works as a web route via
   `expo export -p web`) — host it and put the URL in App Store Connect /
   Play Console.
5. **Real screenshots.** `assets/brand/store/*.png` are on-brand placeholders.
   Capture real device screenshots from the running app (6.7"/6.5" iPhone,
   1080p+ Android) before submission.
6. **Store accounts & metadata:** Apple Developer + Google Play accounts, app
   listing, age rating questionnaire (this is 17+, references mental health),
   Data Safety form (Play) / Privacy Nutrition labels (Apple) — content is in
   `src/legal/content.ts` and the Privacy Policy.
7. **Account model decision.** Currently device-local (no login). If you add
   accounts later, in-app account deletion is already wired — keep it.
8. **Support URL / contact.** `aise@gruve.events` is set in legal copy; add a
   support page or keep email.

## Build & submit (once the above are real)

```bash
npm i -g eas-cli
eas login
eas build --platform all --profile production
eas submit --platform ios     # and --platform android
```

## Edge cases covered in code

Empty/first-run states, loading, save confirmations, gated-mode messaging,
unknown route, runtime crash, no-network-tolerant local store, refusal/empty
LLM output → safe deferral, crisis/red-flag interception, mode-leak prevention
(tested), reduced-motion respect, account deletion confirm (native) / immediate
(web).

## The two product risks every review flagged (still yours, not code)

Unproven demand, and no binding kill ceiling. Building more app does not
retire either. Test with real people, then decide.
