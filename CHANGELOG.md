# Changelog

One entry per phase.

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
