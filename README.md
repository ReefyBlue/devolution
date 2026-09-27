# QuayOps: STS quay crane operator simulator

A ship-to-shore (STS) quay crane simulator that runs in the browser (TypeScript + Three.js, no game engine). You drive the crane from the cabin: rope-hung spreader with real pendulum sway, precise landing, twistlocks, flippers, trucks under the crane. The core feature is the **scenario system**: vessel, bay plan, work queue, yard side and environment are defined in JSON files, and the simulator loads and plays them. There is no campaign and no economy.

## Status

| Step / phase | State |
|---|---|
| Step 1: proposal | **Approved 2026-09-27**, all defaults. See `docs/STEP1_PROPOSAL.md` |
| Platform | **Browser build approved 2026-09-27** (replaces Unity). See `docs/STEP1_WEB_ADDENDUM.md` |
| Phase 1: crane core | In progress |
| Phase 2: scenario system | Not started. Format: `docs/SCENARIO_FORMAT.md`; loader checks: `docs/VALIDATION_RULES.md` |
| Phase 3: operations loop and scoring | Not started |
| Phase 4: polish | Not started |

## Repository layout

| Path | Content |
|---|---|
| `CLAUDE.md` | Instructions Claude Code loads at start: status, working rules, commands |
| `docs/BRIEF.md` | The original project brief, verbatim (all four phases) |
| `docs/STEP1_PROPOSAL.md` · `docs/STEP1_WEB_ADDENDUM.md` | The approved design; the addendum replaces the Unity-specific parts |
| `docs/SCENARIO_FORMAT.md` | Scenario file reference for hand-authoring |
| `docs/VALIDATION_RULES.md` | Loader specification for Phase 2: every scenario check, its severity and an example message |
| `scenarios/` | Scenario files; `scenarios/Schema/` holds the JSON Schema (autocomplete in VS Code) |
| `config/` | Tuning profiles (crane, drives, spreader, sway, containers, controls …) |
| `src/` | The simulator |
| `tests/` | Unit tests and the headless smoke run |

## Running it

- **No install:** open the QuayOps link (published at the end of each phase) in current Chrome or Edge, or double-click the offline file `quayops.html`.
- **Development** (Node.js 22.12+): `npm install`, then `npm run dev`. `npm run check` runs type check, lint and unit tests; `npm run smoke` runs the headless smoke test (first run `npx playwright install chromium`); `npm run build` writes the offline file to `dist/`.

## Controls (Phase 1; bindings in `config/controls.json`)

| Action | Keyboard / mouse | Gamepad |
|---|---|---|
| Trolley waterside / landside | W / S | Left stick Y |
| Gantry | A / D | D-pad left / right |
| Hoist raise / lower | ↑ / ↓ | Right stick Y (push forward = lower) |
| Creep (hold) | Left Shift | LB |
| Twistlocks lock / unlock | Space | A |
| Spreader 20 / 40 / 45 ft | 1 / 2 / 3 | D-pad up / down |
| Flippers | F | Y |
| Anti-sway toggle | T | X |
| Boom (hold + hoist axis) | B + ↑/↓ | RB + right stick Y |
| Look | Mouse, hold right button | LT + right stick |
| Camera toggle (cabin / orbit) | C | View / Back |
| Tuning panel | F10 | – |

## How to test each phase

Filled in at the end of each phase.

## Known issues

- The frame rate can only be judged on your own machine: the automated checks run in a headless browser with software rendering.
