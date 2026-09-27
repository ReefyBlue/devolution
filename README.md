# QuayOps: STS quay crane operator simulator

A ship-to-shore (STS) quay crane simulator that runs in the browser (TypeScript + Three.js, no game engine). You drive the crane from the cabin: rope-hung spreader with real pendulum sway, precise landing, twistlocks, flippers, trucks under the crane. The core feature is the **scenario system**: vessel, bay plan, work queue, yard side and environment are defined in JSON files, and the simulator loads and plays them. There is no campaign and no economy.

## Status

| Step / phase | State |
|---|---|
| Step 1: proposal | **Approved 2026-09-27**, all defaults. See `docs/STEP1_PROPOSAL.md` |
| Platform | **Browser build approved 2026-09-27** (replaces Unity). See `docs/STEP1_WEB_ADDENDUM.md` |
| Phase 1: crane core | **Built 2026-09-27, waiting for your test** (see *How to test Phase 1*) |
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

- **No install:** open the QuayOps link in current Chrome or Edge, or double-click the offline file `quayops.html`. Click into the 3D view once so the keys go to the crane (sounds also start after this first click or key press).
- **Development** (Node.js 22.12+): `npm install`, then `npm run dev`. `npm run check` runs type check, lint and unit tests; `npm run smoke` runs the headless smoke run (first run `npx playwright install chromium`); `npm run build` writes the offline file `dist/quayops.html` and the page for the link, `dist/quayops-page.html`.

## Controls (Phase 1; bindings in `config/controls.json`)

| Action | Keyboard / mouse | Gamepad (Xbox layout) |
|---|---|---|
| Trolley waterside / landside | W / S | Left stick up / down |
| Gantry −X / +X (left / right facing the water) | A / D | D-pad left / right |
| Hoist raise / lower | ↑ / ↓ | Right stick (push forward = lower) |
| Creep, 10 % (hold) | Left Shift | LB |
| Twistlocks lock / unlock | Space | A |
| Spreader 20 / 40 / 45 ft | 1 / 2 / 3 | D-pad up (longer) / down (shorter) |
| Flippers up / down | F | Y |
| Anti-sway on / off | T | X |
| Boom raise / lower (hold-to-run) | hold B + ↑ / ↓ | hold RB + right stick |
| Look around (cabin) | hold right mouse button and move | hold LT + right stick |
| Camera: cabin / orbit | C | View (Back) |
| Orbit camera | right drag orbits, middle drag pans, wheel zooms | – |
| Tuning panel | F10 | – |

## How to test Phase 1

The test scene: the SPP-65 crane at quay mark 169.8 (abeam bay 14), trolley LS 15.0 m, spreader at +30 m; the feeder *MV QUAYOPS TRAINER* starboard side alongside with 84 boxes on deck in bays 10, 14 and 18; a tractor with a 20/40 combo chassis in lane L1 (LS 8.5 m, between the legs). The HUD's MOVE line gives the current test move.

1. **Cabin view.** You start in the cabin looking down towards the water. Hold the right mouse button (or LT) to look around; C switches to the orbit camera and back.
2. **Drives.** W/S, A/D and ↑/↓ ramp up and down; Shift gives creep. Run each drive into its ends: the trolley slows 12 m before outreach WS 65.0 m and backreach LS 50.5 m, the hoist 7 m below the upper limit +48.0 m, the gantry 3 m before quay marks 13.5 and 286.5. Nothing overruns.
3. **Sway.** Full trolley acceleration and a hard stop swing the spreader, about 9 s per swing at +30 m and longer the lower you go. Hoisting up while it swings makes the swing grow, lowering calms it. T switches the anti-sway on (HUD: ANTI-SWAY ON): the trolley chases the load and the swing is gone within about one period.
4. **Boom.** Park the trolley landside (LS 6.0 m or further), hoist to the top, stand the gantry, then hold B + ↑: 150 s to 80°, then the latch engages (10 s). B + ↓ releases the latch first and lowers. With the trolley out, the HUD says BOOM: PARK TROLLEY.
5. **Test move 1: 14-02-88 to L1 centre.** Press F (flippers down). Trolley to WS 18.3 m (the HUD shows ABEAM BAY 14 ROW 02) and let the swing settle. Lower, creeping the last metres onto the box: the flippers funnel the spreader in over the last 0.5 m, the four corner lamps go green and the HUD shows ALL LANDED. Space locks (LOCKED, a clunk). F again (flippers up), hoist clear of the stack, trolley to LS 8.5 m over the chassis, lower and creep until ALL LANDED, Space unlocks. The HUD shows the placement offset in cm; 5 s later the tractor takes the box away and move 2 comes up with its timer.
6. **Moves 2 to 4** work the same way. Move 4 (17-04-84) is a 20 ft box for the rear of the chassis: press 1 for the 20 ft spreader while hanging clear.
7. **Interlocks and alarms.** Space while the spreader hangs gives LOCK or UNLOCK REFUSED. Landing faster than 0.5 m/s sounds the HARD LANDING alarm. 1/2/3 while landed or locked gives TELESCOPE REFUSED. Lowering after a landing stops on the slack-rope ramp. A twistlock turn needs all four corners landed until it finishes; lifting off mid-turn puts the locks back. A box set down in the wrong chassis position gives WRONG POSITION: pick it again before the tractor leaves (5 s), or the move counts as missed.
8. **Wind.** F10 → *wind (test scene)*: set 20 kn from 90° (from the landside on this quay, which runs north). The hanging spreader drifts towards the water; gusts rise and fall between the mean and the gust speed.
9. **Tuning.** F10 opens every profile with its allowed range; changes apply while you drive. *Copy JSON* (or *Export* in the offline file) gives you the profile file for `config/`.
10. **Frame rate.** Please check the crane feels smooth on your laptop (target 60 fps). In Chrome: DevTools → More tools → Rendering → Frame rendering stats.

## Known issues

- The frame rate can only be judged on your own machine: the automated checks run in a headless browser with software rendering.
- The electronic anti-sway moves the trolley while it damps a swing, so after a hard stop the trolley creeps on a little way with the load. That is how pure sway damping behaves; a position-hold mode could come later if you want it.
- The tractor does not drive off visibly: the box disappears 5 s after it is unlocked on the chassis.
- No contact detection yet: the spreader and a carried box can pass through a stack or the crane structure sideways (Phase 3 turns contacts into faults).
- Deck stack only: no holds, cell guides or lashing bridges yet (they come with the vessel builder in Phase 2).
- A spreader landed on the quay, a hatch cover or the chassis bed shows its corners as landed; locking there is refused.
- On the claude.ai link the browser may block the gamepad, pointer lock or file downloads for the embedded page. *Copy JSON* works there; for the gamepad and *Export*, use the offline file.
- Placeholder primitive graphics (Phase 4 polish).
