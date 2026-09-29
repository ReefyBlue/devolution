# QuayOps: instructions for Claude

STS quay crane operator simulator that runs in the browser: TypeScript + Three.js, built with Vite, no game engine. The owner works in container terminal operations: use correct terminology (bay/row/tier, spreader, headblock, twistlocks, flippers, trolley, hoist, gantry, boom, lashing bridge, hatch cover, cell guides, outreach, backreach, waterside/landside, ROB, restow) and British spelling.

## Where things stand
- **Step 1 approved 2026-09-27** (all defaults in `docs/STEP1_PROPOSAL.md` §8), then **switched to the browser build** the same day (`docs/STEP1_WEB_ADDENDUM.md`, approved). The addendum replaces the Unity-specific parts of the proposal; everything else in the proposal (conventions, crane behaviour, numbers) still applies.
- **Phase 1 (crane core) built 2026-09-27** and handed to the owner for testing (link and offline file). **Do not start Phase 2 until the owner confirms Phase 1.** Their findings come first.
- **Unreal addendum drafted 2026-09-29** (`docs/STEP1_UNREAL_ADDENDUM.md`): port QuayOps to Unreal Engine 5 + C++ on the owner's laptop. **Not approved yet**; until the owner approves it, the browser build stays the plan.
- **Current phase:** see the status table in `README.md`.
- **Publishing:** `npm run build` also writes `dist/quayops-page.html` (the same app without the document wrapper) for the claude.ai link; republish it to the same artifact URL after each phase: https://claude.ai/artifact/8g7Fshb9orvddLAnkWSzGJ (declares the `downloads` capability for the tuning panel's Export).

## Documents
- `docs/BRIEF.md`: the owner's original brief, verbatim (all four phases, realism targets, working rules). Where it differs from the proposal or the addendum, those win.
- `docs/STEP1_PROPOSAL.md` + `docs/STEP1_WEB_ADDENDUM.md`: the approved design.
- `docs/SCENARIO_FORMAT.md`, `docs/VALIDATION_RULES.md`, `scenarios/Schema/`, `scenarios/deepsea-bay22-mixed.json`: scenario format v1 and the loader spec for Phase 2. Field names are final for v1.

## Commands
- `npm install` once; `npm run dev` for the dev server.
- `npm run check` = type check + lint + unit tests. `npm run smoke` = headless browser smoke run (Playwright). `npm run build` = offline single-file build in `dist/`.
- In a cloud session the preinstalled Chromium is used automatically (`PLAYWRIGHT_BROWSERS_PATH`); on a laptop run `npx playwright install chromium` once.

## Working rules (from the owner, adapted to the browser build)
- Phase gates: finish a phase, verify it (0 type errors, 0 lint warnings, tests green, smoke run PASS, screenshots checked), then **stop** for the owner's test. Never start the next phase without their confirmation.
- Keep modules small and single-purpose. Crane logic never touches Three.js objects; rendering reads the simulation state, so meshes stay swappable.
- Every tunable value (speeds, ramps, sway, thresholds, tolerances) lives in a JSON profile in `config/` and is shown in the in-app tuning panel. No magic numbers in code.
- Prefer clarity over cleverness. Brief English comments. No dead code.
- Only free assets; primitives are fine until Phase 4.
- Target 60 fps on a mid-range laptop; fixed simulation step 0.02 s.
- At the end of every phase, update `README.md` (setup, controls, how to test each phase, known issues) and add one `CHANGELOG.md` entry.
- If unsure about a port-operations detail, ask the owner rather than guessing.

## Git
- Work on branch `claude/quayops-sts-crane-0t64lz`.
