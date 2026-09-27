# QuayOps: original project brief

> The project owner's brief, verbatim (2026-09-26). Decisions taken since are in `docs/STEP1_PROPOSAL.md` (approved 2026-09-27: all defaults, option A). Where the two differ, the approved proposal wins.

## What we're building
A ship-to-shore (STS) quay crane operator simulator in Unity. The crane operation should feel like the STS crane gameplay in Docked (Saber Interactive): cabin view, rope-hung spreader with real sway, precise landing on containers, twistlocks, trucks under the crane. The key difference and the core feature of this project: a scenario system. I define my own vessel, bay plan, work queue, yard-side setup and environment in JSON files, and the simulator loads and plays them. No campaign, no economy — just realistic crane work on my own scenarios.

I work in container terminal operations myself, so use correct terminology and realistic dimensions throughout: bay/row/tier, spreader, twistlocks, flippers, headblock, trolley, hoist, gantry, boom, lashing bridge, hatch cover, cell guides, outreach, backreach, waterside/landside. Container slots use the standard bay-row-tier numbering (odd bays = 20 ft, even bays = 40 ft; rows numbered from centreline outward, even to port, odd to starboard; tiers 02/04/... below deck, 82/84/... on deck).

## Environment and tooling
- Unity 6 (current LTS), Universal Render Pipeline, new Input System package, C#.
- The Unity MCP server is connected in this environment. Use it for everything scene-side: creating the project and scene, building GameObject hierarchies, adding components, setting serialized fields, creating prefabs and ScriptableObject assets, entering/exiting Play Mode, and reading the Console. Write C# scripts to disk, then use MCP to attach and wire them. Do not hand-edit .unity, .prefab, .asset or .meta YAML.
- Before starting, use MCP to confirm the Editor is connected. Report the Unity version, render pipeline, and whether the Input System package is installed. If URP or Input System is missing, install/configure them via MCP or the package manager before anything else.
- After every scene-affecting change, check the Console via MCP and fix compile errors and warnings before reporting back to me.
- Only free/built-in assets. Placeholder primitives (cubes, cylinders) are fine for now; keep meshes swappable so I can replace them with proper models later.
- Everything lives under Assets/QuayOps/ with subfolders: Scripts/ (with subfolders Crane, Scenario, Vessel, Yard, UI, Core), Prefabs/, Scenarios/, ScriptableObjects/, Materials/, Scenes/, Audio/.
- Use assembly definitions (.asmdef) for QuayOps.Runtime and QuayOps.Editor.
- Target 60 fps on a mid-range laptop; keep physics stable at fixed timestep 0.02.

## Realism targets (use these as defaults, expose all in ScriptableObjects)
Super post-Panamax STS crane:
- Rail gauge 30.48 m, outreach 65–70 m from waterside rail, backreach 15–20 m, lift height 45–50 m above rail, clearance under portal ~15 m.
- Gantry speed 45 m/min, trolley speed 240 m/min, hoist speed 90 m/min laden / 180 m/min empty, boom hoist ~5 min full cycle.
- Acceleration/deceleration ramps on every motion (realistic values, e.g. trolley 0.8 m/s², hoist 0.75 m/s², gantry 0.3 m/s²). No instant velocity changes.
- Spreader: telescopic 20/40/45 ft, twin-twenty capable (two 20 ft side by side, later phase), four twistlocks, four flippers, corner landing sensors.
- Containers: 20 ft (6.058 × 2.438 × 2.591 m), 40 ft (12.192 m), 45 ft, high cube 2.896 m. Weights 2.3 t tare up to 30.48 t gross.
- Rope-hung spreader: sway is a real pendulum whose period depends on rope length (hoist height). Anti-sway is a togglable damping system, not default behaviour.

## Phase 1 — Crane core
Build this first and stop for my testing before Phase 2.
1. Crane rig from primitives: sill beams on rails, four legs, portal beams, machinery house, boom (waterside) and girder (landside), trolley on the boom/girder, headblock hanging on 4 ropes, spreader below the headblock, operator cabin attached to the trolley.
2. Motion controllers (each its own small MonoBehaviour):
   - GantryController: crane travels along the quay on rails. Ramped acceleration, hard limits at rail ends, optional soft limits per scenario.
   - TrolleyController: waterside/landside travel along boom + girder. Ramped. Slow-down zones near end stops.
   - HoistController: raise/lower headblock+spreader. Ramped. Laden vs empty speed limits. Slow/creep mode for final approach. Upper limit switch, lower limit at deck/quay level.
   - BoomController: raise/lower boom (raised for vessel arrival, lowered for work). Only allowed when trolley is landside of the boom hinge.
3. SpreaderController: 20/40/45 extend/retract (blocked while locked or while landed on a box), twistlocks lock/unlock (only when all four corner sensors report landed), flippers up/down, sway damping toggle.
4. Physics: spreader hangs on the ropes and swings as a pendulum. Implement it as a custom pendulum model driven from trolley acceleration and rope length, OR with configurable joints — pick whichever is stable at the given speeds and explain the choice. Sway should visibly increase when the trolley accelerates hard and decay slowly. Wind (from scenario) adds a lateral force.
5. Container pick/place: when locked, the container becomes kinematic and follows the spreader. On unlock it stays where it was placed. Detect hard landings via approach velocity at contact.
6. Landing feedback: four per-corner lights on the spreader (red = not landed, green = landed), all-four-landed state, audio click for locks, alarm for hard landing.
7. Cameras: operator cabin view (first person; cabin moves with trolley; can look down through the cabin floor window; mouse/right-stick look), plus a free-orbit debug camera. Key to toggle.
8. Input: keyboard + gamepad via the Input System. Proposed defaults, but keep the map editable:
   - Trolley: W/S or left stick Y
   - Gantry: A/D or D-pad left/right
   - Hoist: Up/Down arrows or right stick Y (or triggers)
   - Creep mode: hold Shift or LB
   - Lock/Unlock: Space or A button
   - Spreader size: 1/2/3 or D-pad up/down
   - Flippers: F or Y
   - Anti-sway toggle: T
   - Camera toggle: C or Back
   - Boom: B (hold) + hoist axis
9. HUD (uGUI or UI Toolkit, your call, explain): hoist height, trolley position (m from waterside rail), gantry position, spreader size, lock state, corner sensor lights, sway indicator, current target move (from/to slot), move timer, wind. Keep it clean and readable.
10. A test scene with one crane, a flat quay, a simple placeholder vessel hull with a 3×6×4 stack of containers, and one truck lane. Enough to feel the crane.

Deliverable for Phase 1: I can open the scene, press Play, drive the crane, pick a container from the vessel, land it on the truck lane, and unlock. No scenario loading yet.

## Phase 2 — Scenario system
Scenarios are JSON files in Assets/QuayOps/Scenarios/ and are the main feature.

Design a versioned schema (include "schemaVersion") covering:
- vessel: name, LOA, beam, draught, freeboard/deck height above waterline, number of bays, rows, tiers below deck and on deck, hatch cover layout (which bays have covers, cover dimensions), lashing bridge positions, cell guide presence, mooring position relative to crane rails.
- bayPlan: list of containers on arrival. Each container: slot as bay-row-tier (e.g. "23-04-84"), size (20/40/45), height (standard/HC), ISO type (DV, HC, RF, OT, TK, FR), gross weight, container ID (valid ISO 6346 format with check digit), operator/colour, status (discharge / stay / restow).
- workQueue: ordered moves. Each move: type (discharge / load / restow / hatchcover), from (vessel slot | truck lane | quay buffer), to (vessel slot | truck lane | quay buffer), container ID, optional twin-lift flag. Loads must reference containers that arrive by truck.
- yardSide: number of truck lanes under the crane and their positions, transport type (AGV or terminal tractor + chassis), chassis type (20/40 combo, bomb cart), whether a quay buffer stack exists and its size, truck arrival timing rules.
- environment: wind speed and direction, gusts, time of day, weather visuals (clear/overcast/rain/fog), sea state (visual only).
- crane: which crane profile (ScriptableObject) to use, start position, twin-lift enabled, anti-sway enabled by default or not.
- rules: hard-landing threshold, placement tolerance (cm), move time targets, whether wrong-slot placement fails the move or just penalises.

Implement:
- ScenarioLoader with strict validation (schema version, slot format, duplicate IDs, moves referencing missing containers, physically impossible stacks) and readable error messages listing every problem, not just the first.
- VesselBuilder that generates the hull, hatch covers, lashing bridges and cell guide markers from the vessel data, and spawns containers in the correct world positions from bay-row-tier.
- YardBuilder for truck lanes, buffer stack, and truck/AGV spawners.
- WorkQueue manager that feeds the current move to the HUD and validates completion (right container, right target, within tolerance).
- An in-game scenario browser (main menu scene): lists JSON files in the Scenarios folder and a user folder in persistentDataPath, shows a summary (vessel name, move count, wind), loads on select.
- Three example scenarios: (a) small feeder, 1 bay, 12 discharge moves, calm wind; (b) deep-sea vessel, mixed discharge + load bay with hatch cover move, 20 knots wind; (c) restow-only scenario with reefers and one flat-rack.
- A short SCENARIO_FORMAT.md documenting every field with an example, so I can write scenarios by hand.

## Phase 3 — Operations loop and scoring
- Trucks/AGVs arrive at lanes according to the work queue and the yardSide timing rules. Containers must be placed on the chassis/AGV within tolerance (position and yaw) or the move fails. Twin-lift support if enabled.
- Move timer per move, gross moves per hour (GMPH) live on HUD, shift summary at the end.
- Fault detection with clear on-screen and log feedback: hard landing (impact velocity above threshold), excessive sway at placement, wrong slot, unlock while not landed, spreader collision with hatch cover / lashing bridge / cell guides / neighbouring containers, trolley/hoist limit hits, gantry into a blocked zone.
- End-of-scenario summary screen: moves completed, GMPH, average move time, fault list with timestamps, score. Export the summary as JSON next to the scenario.
- Save/resume of an in-progress scenario is nice-to-have, not required.

## Phase 4 — Polish (only after 1–3 are accepted)
- Replace primitives with simple modelled meshes or ProBuilder shapes; container textures with operator colours and correct markings.
- Audio: motors, rope creak, twistlock clunk, alarms, wind.
- Weather visuals, day/night lighting.
- Replay of a completed move from the debug camera.

## How I want you to work
- Step 0: confirm the MCP/Editor connection and report versions as described above.
- Step 1: propose the folder structure, the ScriptableObject list, and the full scenario JSON schema with one complete example file. Ask me anything unclear. Wait for my go-ahead.
- Then implement Phase 1 completely, verify it compiles and runs in Play Mode via MCP, and stop. Do not start Phase 2 until I confirm the crane feels right — I will test it myself.
- Same gate between every phase.
- Keep scripts small and single-purpose. Expose every tunable value (speeds, ramps, sway, thresholds, tolerances) through ScriptableObjects or serialized fields so I can tweak in the Inspector without code changes.
- Prefer clarity over cleverness. Brief English comments. No dead code.
- Maintain a README.md at the project root with: setup steps, controls, how to test each phase, and known issues. Update it at the end of every phase.
- Maintain a CHANGELOG.md with one entry per phase.
- If something can't be done via MCP, tell me exactly what to click in the Editor instead of silently skipping it.
- If you're unsure about a port-operations detail, ask me rather than guessing.
