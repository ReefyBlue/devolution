# Changelog

One entry per phase.

## [0.1.0] Phase 1: crane core (built 2026-09-27, waiting for the owner's test)

### Added
- Browser app (TypeScript + Three.js, Vite): offline single file `dist/quayops.html` and the page for the claude.ai link.
- Tuning profiles in `config/*.json` with the approved defaults, checked at load (clear message for a wrong value), and a live tuning panel (F10) with Export / Copy JSON.
- Test scene from `config/test-scene.json`: quay with rails, fenders and quay marks; SPP-65 crane built from its profile; feeder with hatch covers, deckhouse and an 84-box deck stack in bays 10/14/18 (valid ISO 6346 ids, seeded weights, operator colours); tractor and 20/40 chassis in lane L1.
- Drives: gantry, trolley, hoist and boom on ramped axes with slowdown zones, braking guard, creep, hard limits and load-dependent hoist speed (constant power, 180 to 90 m/min); boom interlocks and latch.
- Rope-fall pendulum sway on both axes (period 2π√(ℓ/g), hoisting term, wind force per face with gusts), electronic and rope anti-sway (T).
- Spreader: telescope 20/40/45 ft, twistlocks with lock/unlock interlocks, flippers with capture assist, landing pins with clamp, hard-landing alarm, slack-rope stop, grip and release with placement offset, chassis clearing after 5 s.
- Cabin camera (mouse and gamepad look) and orbit camera (C); HTML HUD with move, timer, last placement, wind, drive readouts, abeam bay/row, spreader state, corner lamps and sway bar; procedural sounds (twistlock clunk, landing thud, hard-landing alarm, refusal buzz, gantry bell).
- Keyboard and Gamepad API input from `config/controls.json`, with button presses latched until a simulation step takes them; fixed 0.02 s step with render interpolation.
- Tests: 61 unit tests (Vitest) and a headless smoke run (Playwright): drives into every limit, sway periods 9.18 / 12.52 s at +30 / +12 m, anti-sway decay, pick 14-02-88 and place it on L1 centre through the gamepad and keyboard paths, HUD, camera toggle and tuning panel.

## [Unreleased]: Step 1 proposal (approved 2026-09-27: all defaults; then browser build instead of Unity)

### Added
- `docs/STEP1_PROPOSAL.md`: Step 0 environment report (Editor/MCP not reachable from the cloud session), project setup, folder structure and assemblies, conventions (quay frame, bay/row/tier), ScriptableObject list, Phase 1 architecture (drives, rope-fall pendulum sway, anti-sway, landing and twistlocks, cameras, input, UI Toolkit HUD, test scene), scenario system preview, risks, 35 open questions with defaults.
- `docs/SCENARIO_FORMAT.md`: scenario format v1 reference for hand-authoring (draft, finalised in Phase 2).
- `docs/VALIDATION_RULES.md`: loader specification for Phase 2: every scenario check (groups A–I) with its severity and an example message.
- `scenarios/Schema/quayops-scenario.v1.schema.json`: JSON Schema (draft 2020-12) for scenario files, `schemaVersion` 1.
- `scenarios/deepsea-bay22-mixed.json`: complete example scenario (deep-sea vessel, bay 22: deck and hold discharge, hatch cover off and on, load, two restows, twin lift, 20 kn wind).
- `docs/STEP1_WEB_ADDENDUM.md`: browser build (TypeScript + Three.js) replacing the Unity-specific parts of the proposal; scenario files moved to `scenarios/`.
- `CLAUDE.md` (status, working rules and commands for Claude Code sessions) and `docs/BRIEF.md` (the original brief, verbatim).
- `README.md`, `CHANGELOG.md`, `.gitignore` (Unity).
