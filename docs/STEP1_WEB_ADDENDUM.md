# QuayOps: Step 1 addendum, browser build without a game engine

Branch `claude/quayops-sts-crane-0t64lz` · status: **waiting for your go-ahead** · 2026-09-27

**Proposal:** build QuayOps as a 3D simulator that runs in a web browser (TypeScript + Three.js), not in Unity. You install nothing and open a link, and Claude Code can build, run and test every step itself, including from a cloud session. The crane design, realism numbers, scenario format and phase gates stay as approved. Only the Unity-specific parts of `STEP1_PROPOSAL.md` are replaced, as listed in section 2.

Reply "OK" to switch, or "stay with Unity" to keep the approved plan.

---

## 1. Why this fits QuayOps

| Point | Unity (approved plan) | Browser (this addendum) |
|---|---|---|
| What you install | Unity Hub + Editor, Git, uv/Python, Claude Code, MCP bridge | Nothing: Chrome or Edge |
| Who can build and verify | Only Claude Code on your laptop, with the Editor open and the bridge connected | Claude Code anywhere; this cloud session has a headless Chromium with WebGL2 and the Gamepad API (checked 2026-09-27) |
| Crane physics | Custom pendulum and drives (no engine physics) | The same custom code, unchanged |
| Scenario loader | To be written in C# | The JavaScript prototype that already runs all 225 checks against 121 test files becomes the real loader |
| How you run and share it | Unity on your laptop | A private claude.ai link that you can share, plus a single HTML file that runs offline |
| Visual polish | Stronger out of the box | Good (shadows, fog, materials); Phase 4 polish takes more hand work |

**Trade-offs to accept:**
- The frame rate is checked by you on your laptop: the headless browser here renders in software, so it proves correctness, not smoothness.
- There is no visual level editor. The approved plan already built everything from code, so this is no real loss.

## 2. What stays and what changes

**Stays exactly as approved**
- Scenario format v1: the schema, `SCENARIO_FORMAT.md`, `VALIDATION_RULES.md` and the example scenario. Field names and meaning do not change.
- Conventions (proposal §3): quay marks, `fromWatersideRail_m`, bay/row/tier, vertical datum.
- Crane behaviour (proposal §5.3–§5.10): fixed step 0.02 s in the same order; the rope-fall pendulum; wind; both anti-sway types; landing pins, twistlocks, flippers and grip; hoist curve and limits; slowdown zones; boom interlocks; cameras; the key and gamepad layout.
- All 35 answered questions, the realism numbers, the phase gates (stop after each phase for your test), README/CHANGELOG per phase, and asking you about port-operations details.

**Changes (these replace the Unity-specific parts of the proposal)**

| Unity (proposal section) | Browser |
|---|---|
| Unity 6 + URP (§1) | Three.js (WebGL2) for 3D, TypeScript, Vite as the build tool; all free and open source (MIT) |
| Unity project at the repo root, asmdefs (§1–§2) | A web project at the repo root: `src/` modules, `config/`, `scenarios/`, `tests/` (section 3) |
| ScriptableObjects in the Inspector (§4) | JSON profile files in `config/` with the same fields and defaults, plus a live **tuning panel** in the app (F10). You can change any value while driving, then press *Export* to save the profile as a file |
| GameObjects, Rigidbodies, PhysX raycasts (§5.1–§5.2, §5.7) | Plain TypeScript objects. Landing pins and contact checks are exact box-geometry tests against the stow grid, covers, cell guides and lashing bridges, so no physics engine is needed. The containers are drawn as instanced meshes, which keeps thousands of boxes fast |
| Input System asset (§5.11) | Keyboard + Gamepad API; bindings in `config/controls.json`; mouse look with pointer lock; button presses latched until a physics step consumes them |
| UI Toolkit HUD (§5.12) | HTML/CSS overlay with the same layout and fields |
| MCP Editor builders and smoke run (§5.14) | Scene built from code at start-up. Verification: unit tests (Vitest) and a scripted smoke run in headless Chromium (Playwright) that drives the real input path, picks a box and places it on the chassis, plus screenshots that I show you |
| Scenario folders, StreamingAssets, persistentDataPath (§6) | Bundled scenarios in `scenarios/`, built into the app. Your own files open via *Open scenario…* or drag-and-drop, and the app remembers them in the browser. Results **download** as JSON, because a browser cannot write next to the scenario file (a small change from your brief) |
| Unity audio | Web Audio: procedural clicks and alarms now, recorded sounds in Phase 4 |
| World axes (Unity is left-handed) | The quay frame in the docs stays the reference; Three.js is right-handed, so the renderer maps "towards the water" to −Z. It is internal only; scenario files are unaffected |

## 3. Project layout

```
<repo root>
├─ README.md · CHANGELOG.md · CLAUDE.md
├─ package.json · tsconfig.json · vite.config.ts
├─ docs/        BRIEF · STEP1_PROPOSAL · STEP1_WEB_ADDENDUM · SCENARIO_FORMAT · VALIDATION_RULES
├─ config/      crane-SPP-65 · drive-gantry · drive-trolley · hoist · boom · spreader · sway ·
│               containers · operator-palette · camera · hud · audio · rules-defaults · controls (.json)
├─ scenarios/   *.json · schema/quayops-scenario.v1.schema.json      (moved from Assets/QuayOps/Scenarios)
├─ src/
│  ├─ core/     quay frame, units, fixed-step loop, ramped axis, slot address, ISO 6346, wind
│  ├─ crane/    gantry, trolley, hoist, boom, sway model, anti-sway, spreader, twistlocks,
│  │            flippers, landing monitor, grip
│  ├─ vessel/   slot geometry, test vessel and stack (Phase 2: vessel builder)
│  ├─ yard/     lanes, chassis (Phase 2: yard builder)
│  ├─ scenario/ loader + checks (ported from the prototype), work queue (Phase 2)
│  ├─ render/   scene, lights, materials, instanced containers, ropes, cameras
│  ├─ input/    keyboard, gamepad, bindings, latches
│  ├─ ui/       HUD, tuning panel, menus
│  └─ audio/
└─ tests/       unit (Vitest) · smoke (Playwright, headless Chromium)
```
Each module is small and single-purpose. The crane logic never touches Three.js objects directly, so meshes can be swapped for proper models later without changing any logic.

## 4. How it runs

| Where | How |
|---|---|
| **Link (default)** | A private claude.ai page with the whole app. You can share it from the page's Share menu, and I update the same link after every phase |
| **Offline file** | The same build as one `quayops.html` file; double-click it to run it in Chrome or Edge without internet |
| **Development** | `npm run dev` (only if you or a local Claude Code session want to work on it on your laptop; needs Node.js) |

If the claude.ai page blocks the gamepad or mouse look (both are browser permissions for embedded pages), the offline file is the fallback. I check this in Phase 1.

## 5. Phase 1 plan (browser)

Each step ends with its own check. I stop after step 9 for your crane-feel test.

1. **Scaffold:** Vite + TypeScript + Three.js, strict type checking, lint, Vitest, Playwright with the preinstalled Chromium; move the scenario files to `scenarios/`. *Check:* the build has 0 type errors and 0 lint warnings, and the empty app renders in the headless browser.
2. **Core maths:** quay frame, ramped drives, slot address and geometry (bay walk incl. lone 20 ft bays), ISO 6346, rope-fall pendulum. *Check:* unit tests, e.g. bay 22 at quay mark 509.0, period 9.17 s ± 1 % at hoist +30 m, no drive ever overruns a stop.
3. **Profiles:** all JSON profiles with the approved defaults, checked when loaded. *Check:* a wrong value gives a clear message.
4. **Scene:** quay, rails and water; the SPP-65 crane built from its profile (sill beams, legs, portal, machinery house, boom, girder, trolley, cabin, headblock, spreader); the feeder hull with the 3 × 6 × 4 deck stack (84 boxes, bays 10/14/18); lane L1 with tractor and chassis. *Check:* screenshots from fixed viewpoints.
5. **Drives and input:** gantry, trolley, hoist and boom with ramps, slowdown zones, creep, limits and interlocks; keyboard and gamepad. *Check:* a scripted run drives every axis into its limits without overrun.
6. **Sway, wind, anti-sway, ropes.** *Check:* the measured period at hoist +30 m and +12 m (9.17 s / 12.51 s) is within 2 %, and the anti-sway decay is logged.
7. **Spreader:** telescope 20/40/45, twistlocks, flippers, landing pins, hard-landing alarm, slack rope, grip and release, corner lamps, sounds. *Check:* the smoke run picks a box, lands it on the chassis in L1, unlocks, and reports PASS.
8. **Cameras, HUD, tuning panel:** cabin view (look down through the floor window) and orbit camera; all HUD fields; F10 panel with export. *Check:* screenshots, no console errors.
9. **Wrap-up:** README, CHANGELOG, the link and the offline file. *Check:* the full test suite and smoke run. Then **I stop for your test**, including the frame rate on your laptop.

**Definition of done:** the approved Phase 1 checklist (proposal §5.15), with "compiles in Unity / MCP smoke run" replaced by "0 type errors, tests green, headless smoke run PASS", and "60 fps on your laptop" confirmed by you.

## 6. Open questions (defaults apply unless you say otherwise)

1. Browser: current **Chrome or Edge** on your laptop. *Default: yes (both support the gamepad and mouse look).*
2. Delivery: private claude.ai link plus the offline HTML file. *Default: both.*
3. Unity documents: keep `STEP1_PROPOSAL.md` as the design record, with this addendum replacing its Unity-specific sections (§1, §2, the ScriptableObject part of §4, §5.1, §5.2, §5.11, §5.12, §5.14 and the file locations in §6). *Default: yes.*
4. The Unity setup on your laptop (Unity Hub and Editor, uv/Python, the MCP bridge) is no longer needed; you can uninstall it. Keep Git and Claude Code only if you want to work on the project locally. *Default: nothing to do.*

## What happens after your OK
I update `CLAUDE.md`, the README and the shared doc to the browser plan, then build Phase 1 in this session following section 5. I stop after step 9 and send you the link and the offline file for your test.
