# QuayOps: instructions for Claude

STS quay crane operator simulator in Unity 6 (URP, Input System, C#). The repo root is the Unity project root. The owner works in container terminal operations: use correct terminology (bay/row/tier, spreader, headblock, twistlocks, flippers, trolley, hoist, gantry, boom, lashing bridge, hatch cover, cell guides, outreach, backreach, waterside/landside, ROB, restow) and British spelling.

## Where things stand
- **Step 1 approved 2026-09-27:** all defaults in `docs/STEP1_PROPOSAL.md` §8 accepted; **option A**: work runs in Claude Code on the Editor machine with a Unity MCP bridge.
- **Next:** re-run Step 0 via MCP (Unity version, active URP asset, Input System version and Active Input Handling, Newtonsoft package, fixed timestep), report it, then implement Phase 1 exactly as `docs/STEP1_PROPOSAL.md` §5 and "What happens after your go-ahead" describe.
- If the Unity MCP tools are missing, stop and say so. Do not write Phase 1 without being able to compile and run it.

## Documents
- `docs/BRIEF.md`: the owner's original brief, verbatim (all four phases, realism targets, working rules). Where it differs from the proposal, the approved proposal wins.
- `docs/STEP1_PROPOSAL.md`: approved design: folders, assemblies, ScriptableObjects with defaults, Phase 1 architecture, definition of done.
- `docs/SCENARIO_FORMAT.md`, `docs/VALIDATION_RULES.md`, `Assets/QuayOps/Scenarios/Schema/`, `Assets/QuayOps/Scenarios/deepsea-bay22-mixed.json`: scenario format v1 and loader spec for Phase 2. Field names are final for v1.

## Working rules (from the owner)
- Use the Unity MCP bridge for everything scene-side: scenes, hierarchies, components, serialized fields, prefabs, ScriptableObject assets, Play Mode, Console. Write C# to disk, then attach and wire via MCP (in practice via the Editor builder menus the proposal defines, run through MCP).
- Never hand-edit `.unity`, `.prefab`, `.asset` or `.meta` YAML.
- After every scene-affecting change, read the Console via MCP and fix all compile errors and warnings before reporting.
- If something cannot be done via MCP, give the owner an exact click list in the Editor; never skip it silently.
- Phase gates: finish a phase, verify it compiles and runs in Play Mode via MCP, then **stop** for the owner's test. Never start the next phase without their confirmation.
- Keep scripts small and single-purpose. Expose every tunable value (speeds, ramps, sway, thresholds, tolerances) through ScriptableObjects or serialized fields.
- Prefer clarity over cleverness. Brief English comments. No dead code.
- Everything lives under `Assets/QuayOps/`, using the approved folder list (including the extras `Editor/`, `Input/`, `UI/`, `Tests/EditMode`).
- Only free or built-in assets; placeholder primitives are fine; keep meshes swappable (logic object + child `Visual`).
- Target 60 fps on a mid-range laptop; fixed timestep 0.02.
- At the end of every phase, update `README.md` (setup, controls, how to test each phase, known issues) and add one `CHANGELOG.md` entry.
- If unsure about a port-operations detail, ask the owner rather than guessing.

## Git
- Work on branch `claude/quayops-sts-crane-0t64lz`. After the first Editor import, commit everything `git status` shows (Packages/, ProjectSettings/, Assets/Settings/, all `.meta` files).
