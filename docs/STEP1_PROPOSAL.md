# QuayOps: Step 0 report and Step 1 proposal

Branch `claude/quayops-sts-crane-0t64lz` · status: **approved 2026-09-27** (all defaults accepted, option A) · revised 2026-09-27

Other Step 1 files on this branch:

| File | Content |
|---|---|
| `docs/SCENARIO_FORMAT.md` | Every scenario field with examples, for writing scenarios by hand |
| `docs/VALIDATION_RULES.md` | The loader specification: every check (groups A–I), its severity and an example message |
| `Assets/QuayOps/Scenarios/Schema/quayops-scenario.v1.schema.json` | JSON Schema (draft 2020-12). It gives autocomplete and hover help in VS Code/Rider |
| `Assets/QuayOps/Scenarios/deepsea-bay22-mixed.json` | A complete example: your scenario (b) |
| `README.md` · `CHANGELOG.md` | Setup, controls, how to test, known issues · one entry per phase |
| `.gitignore` | Unity ignore rules |

**Decision (2026-09-27):** defaults OK for all 35 questions in section 8; proceed with **option A** (Claude Code on the Editor machine with a Unity MCP bridge). Next: the one-time setup in §0, then the Step 0 re-run via MCP and Phase 1.

---

## 0. Step 0: environment report

| Checked | Result |
|---|---|
| Unity MCP tools in this session | **None.** No Unity tools, no MCP resources and no Unity connector |
| Unity Editor / Unity Hub | **Not installed.** This session runs in a Linux cloud container (4 CPU, 15 GB RAM, no display) |
| .NET SDK / Mono (compiling C# outside Unity) | Not installed |
| Node 22 + ajv | Available. Used to check the JSON Schema and scenario files against it |
| Repository | Holds only the Step 1 files. There is no Unity project yet |

**Result: the MCP/Editor connection is NOT confirmed.** I could not check the Unity version, render pipeline or Input System from here. Unity MCP bridges (e.g. MCP for Unity by CoplayDev) talk to a *running local Editor* over localhost, so they cannot reach this container.

**Two ways forward**

| | Option A (recommended) | Option B |
|---|---|---|
| Setup | Claude Code runs on your machine, next to the Unity 6 Editor and an MCP bridge | This cloud session continues |
| I do | Everything in your brief: scripts, then MCP for scene work, Console checks and Play Mode checks | C#, JSON and docs only |
| You do | One-time setup (below), then test the crane feel | Every Editor step from click lists, pasting Console output back to me |
| Risk | Low: each step is compiled and run before I report | **High for Phase 1**: about 50 scripts written without compiling, and drive and sway tuning never run in Play Mode |

**Option A: what you do once**
1. Unity Hub ▸ Installs ▸ Install Editor ▸ the current **Unity 6 LTS** (6000.x) with build support for your OS.
2. Create the project and check out this branch (section 1.1).
3. Install your Unity MCP bridge (e.g. MCP for Unity by CoplayDev) as a package in the project, following its README (usually Package Manager ▸ + ▸ *Install package from git URL…*). Then register it with Claude Code on that machine, either from the bridge's setup window or with `claude mcp add …` as its README shows. Some bridges need Python/uv; their setup window checks for this.
4. Install Claude Code (desktop app or CLI) on the same machine. Start it in the project folder with the Editor open, run `/mcp` and check that the Unity server shows *connected*.
5. Tell Claude: *"Re-run Step 0 via MCP, then continue with Phase 1 per docs/STEP1_PROPOSAL.md and my answers."* The Step 0 re-run reports the Unity version, the active URP asset, the Input System version and Active Input Handling, the Newtonsoft package and the fixed timestep.

## 1. Project setup

The **Unity project is the repo root**: `Assets/`, `Packages/` and `ProjectSettings/` sit at the top level next to `README.md` and `docs/`. MCP cannot create a project because it runs inside an open Editor, so you create it once with Unity Hub.

### 1.1 Create the project and check out this branch
1. Unity Hub ▸ **New project** ▸ Unity 6 LTS ▸ template **Universal 3D** ▸ name `QuayOps` ▸ choose a location where the project folder will be new and empty. Leave Unity Version Control/Cloud off, because we use Git. Click **Create**.
2. Once the Editor has opened, **close it**.
3. In a terminal in the new project folder:
   ```
   git init
   git remote add origin https://github.com/ReefyBlue/devolution.git
   git fetch origin
   git checkout -t origin/claude/quayops-sts-crane-0t64lz
   ```
   This works because no template file has the same path as a file on the branch. If git ever reports *"untracked working tree files would be overwritten"*, move the named file aside and repeat.
4. Reopen the project from Hub. Unity imports the branch files and creates their `.meta` files.
5. Optional clean-up: delete the template's tutorial assets (`Assets/TutorialInfo/`, `Assets/Readme.asset`, if present). Leave `Assets/InputSystem_Actions.inputactions` in place: the template may register it as project-wide actions, and we simply use our own asset. **Keep `Assets/Settings/`**: it holds the URP pipeline and renderer assets.
6. First commit from the Editor machine: commit **everything `git status` shows** after the first import: `Packages/`, `ProjectSettings/`, `Assets/Settings/**`, the template's `InputSystem_Actions.inputactions`, scenes and **all** `.meta` files. The `.gitignore` already keeps the generated folders out.

### 1.2 Packages
| Package | Id | Why |
|---|---|---|
| Universal RP | `com.unity.render-pipelines.universal` | Comes with the template |
| Input System | `com.unity.inputsystem` | Comes with the template. Check Project Settings ▸ Player ▸ *Active Input Handling* = **Input System Package (New)** |
| Newtonsoft Json | `com.unity.nuget.newtonsoft-json` | Unity's official package. Package Manager ▸ + ▸ *Install package by name…* |
| Test Framework | `com.unity.test-framework` | Comes with the template. Runs the EditMode tests |
| UI Toolkit | built in | HUD |
| *Not used* | Cinemachine, ProBuilder | Two simple cameras do not need Cinemachine. ProBuilder comes in Phase 4 only |

**Why not JsonUtility:** it fills missing fields with defaults silently, so it cannot tell "absent" from `0`. That means it cannot report missing required fields or apply documented defaults. It also ignores unknown keys, so typos pass unnoticed. It has no dictionaries, nullables or "exactly one of" objects (our `from`/`to` Location), and its errors carry no line:column. A Newtonsoft `JToken` keeps line info on every node, and that feeds the error messages. `Newtonsoft.Json.Schema` is AGPL/commercial, so we do not use it; the loader does its own validation.

**Project settings to confirm via MCP in the Step 0 re-run:** Fixed Timestep 0.02 s (the Unity default); Asset Serialization = Force Text and Visible Meta Files (both defaults); VSync on, target 60 fps.

### 1.3 `.gitignore`
The `.gitignore` is already on the branch. It ignores `Library/`, `Temp/`, `Obj/`, `Logs/`, `UserSettings/`, `Build(s)/`, IDE and solution files (Unity regenerates them), and `Assets/QuayOps/Scenarios/Results~/` (result exports in the Editor, §6). The build adds the scenarios to StreamingAssets without writing anything under `Assets/` (§6). **`.meta` files are committed.** Git LFS is not needed while we use primitives; add it in Phase 4 for audio and models.

## 2. Folder structure, assemblies, namespaces

```
<repo root = Unity project root>
├─ README.md · CHANGELOG.md · .gitignore
├─ docs/                      STEP1_PROPOSAL.md · SCENARIO_FORMAT.md · VALIDATION_RULES.md
├─ Packages/ · ProjectSettings/            (created by Unity; never hand-edited)
└─ Assets/
   ├─ Settings/               URP pipeline + renderer assets from the template (stay here)
   ├─ InputSystem_Actions.inputactions     template input asset (stays here; not used by QuayOps)
   └─ QuayOps/
      ├─ Scripts/             QuayOps.Runtime.asmdef (covers all subfolders)
      │  └─ Core/ Crane/ (+ Profiles/) Scenario/ Vessel/ Yard/ UI/
      ├─ Editor/              QuayOps.Editor.asmdef: builders, setup, verifiers, build hook   ◄ proposed extra: OK?
      ├─ Tests/EditMode/      QuayOps.Tests.EditMode.asmdef                                   ◄ proposed extra: OK?
      ├─ Input/               QuayOpsControls.inputactions                                    ◄ proposed extra: OK?
      ├─ UI/                  Hud.uxml · Hud.uss · QuayOpsRuntimeTheme.tss · PanelSettings     ◄ proposed extra: OK?
      ├─ Prefabs/             Crane/ Containers/ Vessel/ Yard/
      ├─ Scenarios/           *.json (the browser lists top-level *.json only)
      │  ├─ Schema/           quayops-scenario.v1.schema.json (for editors; not a scenario)
      │  └─ Results~/         result exports in the Editor (Phase 3; "~" = not imported by Unity)
      ├─ ScriptableObjects/   Crane/ Containers/ Rules/ Visuals/ Audio/ Yard/ Scoring/
      ├─ Materials/
      ├─ Scenes/
      └─ Audio/
```
`Scripts/UI/` holds C# code. `QuayOps/UI/` holds the UXML/USS/TSS assets. `Assets/Settings/` (URP) and the template input asset stay outside `Assets/QuayOps/`.

| Assembly | Location | Platforms | References |
|---|---|---|---|
| `QuayOps.Runtime` | `Scripts/` | all | `Unity.InputSystem`, `Unity.RenderPipelines.Core.Runtime`, `Unity.RenderPipelines.Universal.Runtime`; `Newtonsoft.Json.dll` is auto-referenced (precompiled) |
| `QuayOps.Editor` | `Editor/` | Editor only | `QuayOps.Runtime`, `Unity.InputSystem`, `Unity.RenderPipelines.Core.Runtime`, `Unity.RenderPipelines.Universal.Runtime` |
| `QuayOps.Tests.EditMode` *(proposed)* | `Tests/EditMode/` | Editor only | Override References on: precompiled `nunit.framework.dll` and `Newtonsoft.Json.dll`; plus `QuayOps.Runtime`, `QuayOps.Editor`, `UnityEngine.TestRunner`, `UnityEditor.TestRunner`; define constraint `UNITY_INCLUDE_TESTS` |

- **Namespaces** follow the folders: `QuayOps.Core`, `.Crane`, `.Scenario`, `.Vessel`, `.Yard`, `.UI`, `.Editor`, `.Tests`. Inside `QuayOps.*`, the base class for custom inspectors is written as `UnityEditor.Editor`, because our `QuayOps.Editor` namespace shadows it.
- **Written to disk by me:** `.cs`, `.asmdef`, `.inputactions` (JSON), `.uxml`, `.uss`, `.tss`, `.json`.
- **Created only by Editor scripts run through MCP, never by hand:** `.asset`, `.mat`, `.prefab`, `.unity`, `PanelSettings`. Unity itself creates all `.meta` files.

## 3. Conventions

### 3.1 Units
Everything runs in SI internally. Scenario field names carry the unit as a suffix: `_m` metres, `_cm` centimetres, `_t` tonnes, `_s` seconds, `_kn` knots, `_deg` degrees, `_mps` m/s, `_C` °C. On the HUD, drive speeds are in m/min (the spec-sheet unit), wind is in kn and m/s, and positions are in m with one decimal.

### 3.2 Quay frame (world)
- **Axes:** Y is up, and **Y = 0 is the quay apron / rail head**. **+Z points towards the water.** **+X runs along the quay to the right of someone standing on the quay and facing the water** (Unity is left-handed).
- **Quay marks:** `quay.marksIncreaseTo` says which way the marks increase for that observer: `"right"` (default; world X = mark) or `"left"` (world X = `quay.length_m` − mark). Every quay-mark field (`bowAtQuayMark_m`, `startQuayMark_m`, soft limits, blocked zones, buffer and laydown `quayMark_m`) is always a **real** quay mark, and the HUD shows real marks.
- **Bearings:** `quay.orientation_deg` is the true bearing of increasing quay marks. World +X points to that bearing (`"right"`) or to it + 180° (`"left"`); the water (+Z) lies at the world +X bearing − 90°.
- **Rails:** the waterside rail centreline is at Z = 0 and the landside rail at Z = −30.48 (rail gauge).
- **`fromWatersideRail_m`** is the single signed transverse coordinate used everywhere: trolley, lanes, buffer, laydowns and rows. Positive = waterside (outreach side), negative = landside. The HUD shows it as `WS 32.4 m` / `LS 12.0 m`.

```
 Not to scale. Cross-section looking along world +X (= increasing quay marks in the example); the water is on the left.

  ◄══════════════ boom ═══════════════════╤═════════════════ girder ════════════════════════════════════╗
                  ▣ trolley ► cabin       ┆ boom hinge                                                  ║
                  ┆ 4 ropes               ║                                   ║                         ║
                  ▭ headblock + spreader  ║ WS legs                    LS legs║                         ║ backreach
       ┌───────────────────┐              ║═══════ portal beam, ~15 m clear ══║
       │ ▯▯▯▯ deck ▯▯▯▯▯▯▯ │              ║                                   ║
  ~~~~~│       vessel      │▌ fenders     ║   ▭    ▭    ▭    ▭    ▭    ▭      ║        ▭         ▭
  ~~~~~└───────────────────┘▌═════════════╩═══════ quay apron, Y = 0 ═════════╩══════════════════════════
  Z: +65.0     +27.3      +4.5           0.0   −4.5 … −24.5                −30.48    −39.0     −48.0  −50.48
     outreach  ship CL    fender       WS rail   truck lanes               LS rail   HCL1      QB01   backreach
     end       (example)  line                                                                        end
  ◄── +Z, water side: "WS n.n m" (+) ─────┼─ landside: "LS n.n m" (−) ──►
```

### 3.3 Crane positions
- **Gantry position:** the quay mark of the crane centreline, i.e. midway between the waterside legs, measured along the quay.
- **Trolley position:** `fromWatersideRail_m` of the rope sheaves. The range is +65.0 (outreach) to −50.48 (rail gauge + 20 m backreach).
- **Hoist height:** the spreader underside (twistlock plane) above the quay apron. Negative means below quay level, i.e. in the hold. For example, landing on a standard box at tier 82 of the example vessel reads **+11.9 m**.

### 3.4 Vessel orientation
- **Heading, in world terms:** starboard side alongside ⇒ the **bow points to world +X** (your right when you face the water); port side alongside ⇒ the bow points to world −X. Only when the marks increase to the right does that mean "bow towards increasing quay marks".
- **Extent in quay marks:** bow towards increasing marks (starboard + `"right"`, or port + `"left"`) ⇒ `[bowAtQuayMark_m − loa_m, bowAtQuayMark_m]`; otherwise `[bowAtQuayMark_m, bowAtQuayMark_m + loa_m]`.
- The ship's side lies at `Z = quay.watersideRailToFenderLine_m + mooring.offFender_m`, and the centreline at that value + beam/2. With starboard side alongside, the odd (starboard) rows are on the quay side and the even (port) rows need the outreach.
- The vessel is static in v1: no list, trim, roll or surge.

### 3.5 Bay / row / tier
- **Bays:** `bays.count` = N forty-foot bays. The layout walks from the bow over the odd numbers 01, 03, 05 …: an odd bay listed in the optional `bays.twentyOnlyBays` is a **lone 20 ft bay** (`pitch_m`/2 long) and the walk moves on by 2; otherwise the odd bays b and b+2 form the **40 ft bay b+1** (`pitch_m` long) and the walk moves on by 4. Without lone bays that gives 02, 06, 10 … 4N−2; `twentyOnlyBays: [1]` gives 01, 04, 08, 12 … An even bay is valid only if the walk generates it (the loader names the nearest valid ones); an odd bay if it is a lone bay or one half of a 40 ft bay. 20 ft boxes use odd bays; 40 and 45 ft boxes use even bays.
- **Bay position:** the first position is centred at `firstBayCentreFromBow_m`; each next centre = previous centre + (previous length + next length)/2, plus the `length_m` of any `gaps` entry (deckhouse/funnel) after the previous position. The 20 ft halves of a 40 ft bay sit at its centre ∓ 3.067 m (6.058/2 + half the 76 mm gap between two 20s).
- **Rows** are counted per bay, separately for hold and deck, and are always 2 digits; r = row number. *Odd count:* row 00 is on the centreline, 01, 03 … go to starboard and 02, 04 … to port, offset `ceil(r/2) × rowPitch_m`. *Even count:* there is no row 00, offset `(ceil(r/2) − 0.5) × rowPitch_m` (with 6 rows, row 01 is 1.275 m to starboard).
- **Tiers** give stacking order only: hold 02, 04 … (`firstHoldTier`), deck 82, 84 … (`firstDeckTier`); every bay's highest tier must be ≤ 98 and the hold range must end below the deck range. Heights come from stacking the real boxes (2.591 m standard, 2.896 m HC), with a 0.03 m stacking-cone gap between boxes stowed without cell guides (on deck, by default) and none in cell guides (in the hold, by default; see `cellGuides`). The optional `overrides[].holdRowBaseTier` raises the lowest hold tier of single rows (tank top / hopper in the fore and aft holds).
- **Vertical datum:** keel = −(apron above waterline) − draught; tank top (hold tier 02 stands here) = keel + `tankTopAboveKeel_m`; main deck at side = −(apron above waterline) + `deckHeightAboveWaterline_m`; hatch cover underside = main deck + coaming; cover top = underside + thickness = base of deck tier 82. Rows outside the hatch stand on pedestals at the same level.
- **Slot string:** `^\d{2,3}-\d{2}-\d{2}$`, e.g. `22-04-84`.

**Worked example: `deepsea-bay22-mixed.json`.** Starboard side alongside, marks increase to the right, bow at quay mark 600, apron 5.0 m above waterline; no lone 20 ft bays, bay 02 is 24.0 m from the bow, pitch 13.4, rows 15 in the hold and 17 on deck, row pitch 2.55.

| Item | Calculation | Result |
|---|---|---|
| Bay 22 (6th 40 ft bay) | 24.0 + 5 × 13.4 = 91.0 m from bow | quay mark **509.0** |
| Bays 21 / 23 | 509.0 ± 3.067 (bow is +X, so 21 is at the higher mark) | 512.07 / 505.93 |
| Ship's side / centreline | 4.5 + 0 / 4.5 + 45.6/2 | WS 4.50 / **WS 27.30** |
| Tank top / main deck | −5.0 − 13.0 + 2.0 / −5.0 + 11.6 | −16.00 / +6.60 |
| Cover underside / deck tier 82 base | 6.60 + 1.8 / 8.40 + 0.9 | +8.40 / **+9.30** |

17 deck rows (odd count, row 00 on the centreline):
```
 port (waterside here) ◄ 16 14 12 10 08 06 04 02 00 01 03 05 07 09 11 13 15 ► starboard (quay side here)
```
| Row | 16 | 04 | 02 | 00 | 01 | 03 | 15 |
|---|---|---|---|---|---|---|---|
| Offset from CL | 20.40 P | 5.10 P | 2.55 P | 0 | 2.55 S | 5.10 S | 20.40 S |
| `fromWatersideRail_m` | +47.70 | +32.40 | +29.85 | +27.30 | +24.75 | +22.20 | +6.90 |

## 4. ScriptableObjects (data only, one per concern)

Assets are created by the Editor menu *QuayOps ▸ Create ▸ Default Profiles* (run via MCP) with the defaults below, and can then be tuned in the Inspector. The assets live in `ScriptableObjects/<folder>/` (folder in brackets); the class scripts live with their users: `Scripts/Crane/Profiles/` (crane, drive, spreader, sway and camera profiles, registry), `Scripts/Core/` (catalogue, palette, audio cues), `Scripts/UI/` (HUD), `Scripts/Scenario/` (rules, weather, scoring, faults), and the two visuals sets in `Scripts/Vessel/` and `Scripts/Yard/`.

**Phase 1**

| Asset (folder) | Purpose | Key fields (defaults) |
|---|---|---|
| `CraneProfile` SPP-65 (Crane/) | One crane type | `profileId` "SPP-65"; rail gauge 30.48; outreach 65.0; backreach 20.0; lift height 48.0 (to the spreader underside); `liftBelowRail` 20.0; portal clearance 15.0; clear width between legs 18.3; buffer-to-buffer 27.0; trolley sheave axis (pendulum pivot) 53.5; boom hinge WS +4.0; boom park trolley ≤ −6.0; rated load under spreader 65 t; `inServiceWindLimit_kn` 40 (≈ 20.6 m/s, crane design limit, §5.5); `clearanceOverStack_m` 1.0 (lift-height check, §6); refs to the profiles below |
| `DriveProfile` Gantry (Crane/) | Gantry drive | 0.75 m/s (45 m/min); accel/decel 0.3 m/s²; creep 10 %; end slowdown zone 3 m @ 20 % (§5.9); stick response curve (linear) |
| `DriveProfile` Trolley (Crane/) | Trolley drive | 4.0 m/s (240 m/min); accel/decel 0.8 m/s²; end slowdown zone 12 m @ 20 % (§5.9); creep 10 % |
| `HoistDriveProfile` (Crane/) | Hoist drive | 1.5 m/s rated (90 m/min @ 65 t); 3.0 m/s empty (180 m/min); accel/decel 0.75 m/s²; speed-vs-load curve (constant power, §5.8); creep 10 %; upper pre-limit zone 7.0 m @ 20 % (§5.9); slack-rope stop decel 1.5 m/s² |
| `BoomDriveProfile` (Crane/) | Boom hoist | working 0°, raised 80°; 150 s each way (≈ 5 min cycle, question 11); 5 s soft start/stop; latch 10 s |
| `SpreaderProfile` (Crane/) | Telescopic spreader | mass 11 t; headblock 4 t; headblock 1.4 m + spreader 1.2 m high, so the headblock sheave axis is 2.6 m above the twistlock plane (§5.4); telescope 0.2 m/s per end (20↔40 ≈ 15 s, 40↔45 ≈ 4 s); twistlock turn 0.6 s; flippers 2 s; landing-pin travel 0.15 m (ray from 0.3 m above the twistlock plane, §5.7); flipper capture ±0.25 m; twin-twenty capable (used in a later phase) |
| `SwayProfile` (Crane/) | Pendulum and wind | natural damping `c` 0.02 s⁻¹ (half-life ≈ 70 s); 4 sub-steps; minimum ℓ 0.5 m; air density 1.225; Cd 1.2; bare spreader area 6 / 2 m² (side/end); max angle clamp 25°; anti-sway type Electronic / Rope damping / Both; electronic gain k 0.6 s⁻¹; rope damping 0.25 s⁻¹ (half-life ≈ 5.5 s) |
| `CameraSettings` (Visuals/) | Cameras | cabin FOV 60°, yaw ±150°, pitch +20°…−89°, start −55°; mouse 0.15°/px, stick 120°/s; orbit distance 8–300 m |
| `ContainerCatalog` (Containers/) | Box data | L × W × H: 20 ft 6.058, 40 ft 12.192, 45 ft 13.716 × 2.438 × 2.591 (HC 2.896); default tare (20 DV 2.3, 40 DV 3.75, 40 HC 3.9, 45 HC 4.8, 20 RF 3.0, 40 RF 4.5, 20 TK 3.6, 20/40 OT 2.3/3.9, 20/40 FR 2.7/4.8 t); max gross per size/type, all 30.48 t initially (question 20); corner casting centres 5.853 / 11.985 / 13.509 × 2.259 m; prefab per type |
| `OperatorPalette` (Containers/) | Line code → colour | MSK light blue, HLC orange, ONE magenta, EMC green, CMA dark blue, COS blue, MSC ochre; unknown → grey (all approximate, editable) |
| `AudioCueSet` (Audio/) | Sound cues | lock click, unlock click, hard-landing alarm, limit alarm, gantry warning bell; a procedural beep is used where no clip is set |
| `HudSettings` (Visuals/) | HUD | refresh 10 Hz; sway colours green < 0.10 m, amber < 0.30 m, red ≥ 0.30 m; speed unit m/min |
| `RulesDefaults` (Rules/) | Defaults for the scenario `rules` block | hard landing 0.5 m/s; placement 5.0 cm; yaw 1.0°; max sway at placement 10 cm; move targets 90/100/120/240 s; wrong slot "fail"; wind stop 40 kn (terminal policy; it can only tighten the crane's limit, §5.5) |

**Format defaults are fixed, not a ScriptableObject.** The scenario format's own defaults (vessel structure, bay pitch, hatch covers, lashing bridges, stacking gap, yard, environment) are **constants of schema v1** in code (`FormatDefaultsV1`, in `Scripts/Scenario/`). They equal the schema `default`s and change only with a new `schemaVersion`, so a scenario file means the same on every machine. Only `RulesDefaults` and the crane profiles are Inspector-tunable. A scenario that omits `rules` (or a field of it) uses the current `RulesDefaults`: that is where you tune the feel (question 35).

**Phase 2 and Phase 3**

| Asset (folder) | Phase | Purpose | Key fields (defaults) |
|---|---|---|---|
| `CraneProfileRegistry` (Crane/) | 2 | `profileId` → CraneProfile | list; the loader error names the known ids |
| `VesselVisuals` (Visuals/) | 2 | Look of the vessel | hull, hatch cover, lashing bridge, cell-guide, pedestal, deckhouse and funnel prefabs + materials |
| `YardVisuals` (Yard/) | 2 | Look of the yard | terminal tractor, 20/40 combo chassis, bomb cart, AGV; bed heights (≈ 1.4 m); buffer and laydown markings |
| `WeatherPresets` (Visuals/) | 2 | Weather | default visibility (clear 20 km, overcast 15 km, rain 3 km, fog 300 m); read now, visuals in Phase 4 |
| `ScoringProfile` (Scoring/) | 3 | Score | penalty per fault severity; time vs target weighting; GMPH weight |
| `FaultCatalog` (Scoring/) | 3 | Faults | code, severity, message template (hard landing, sway at placement, wrong slot, unlock not landed, collisions, limit hits, blocked zone) |

## 5. Phase 1 architecture

### 5.1 Scripts
Small single-purpose MonoBehaviours; the pure maths lives in plain C# classes *(pc)* so it can be unit-tested. One line each:

| Folder | Script | Job |
|---|---|---|
| Core | `Units` | Unit conversions (kn, m/min, t) and HUD number formatting |
| | `QuayFrame` | Quay mark / `fromWatersideRail_m` ↔ world X/Z (both mark directions); WS/LS formatting |
| | `RampedAxis` *(pc)* | Velocity towards command at accel/decel limits; speed caps, slowdown zones and braking guard `v ≤ √(2·a·d)`, both evaluated one step ahead, plus a final clamp at the stop, so no limit is overrun (§5.9) |
| | `CraneInput` | The only reader of the Input System: holds the `InputActionAsset`, looks up the actions by name (names in the static class `CraneActions`), exposes axes, held modifiers and latched button presses (§5.11) |
| | `SlotAddress` | Parse/format `BB-RR-TT`, bay parity rules, 40 ↔ 20 ft bay mapping |
| | `ContainerUnit` | On each box: id, size, height, type, gross weight, location, corner-casting points |
| | `Iso6346` | Check digit (generated test ids now, loader later) |
| | `WindField` | Wind vector in the quay frame, steady + gusts (Inspector in Phase 1, scenario in Phase 2) |
| Crane | `CraneSimLoop` | The only crane `FixedUpdate`; calls `Tick(dt)` on each part in a fixed order (§5.3) and holds the computed state |
| | `GantryController` | Gantry drive; rail-end hard limits, soft limits, warning bell while travelling |
| | `TrolleyController` | Trolley drive; end slowdown zones; boom-hinge limit |
| | `HoistController` | Hoist drive; load-dependent speed, creep, upper pre-limit/limit, lower limit, slack-rope stop |
| | `BoomController` | Boom raise/lower state machine, interlocks, latch |
| | `SwayModel` *(pc)* | Two-axis variable-length pendulum (§5.4) |
| | `AntiSwayController` | Electronic correction on trolley/gantry acceleration and/or rope damping (§5.6) |
| | `LoadSuspension` | Computes the candidate pose of headblock + spreader under the sheaves from ℓ and the sway angles (kept level); moves it with `MovePosition` after the landing clamp (§5.3) |
| | `SpreaderController` | Operator commands → telescope, twistlocks, flippers, with interlocks |
| | `SpreaderTelescope` | 20/40/45 ft extension |
| | `Twistlocks` | Lock/unlock state machine (0.6 s turn) |
| | `Flippers` | Four flippers up/down, capture assist |
| | `CornerLandingSensor` | One per corner: landing-pin raycast from the candidate pose (§5.7) |
| | `LandingMonitor` | Four sensors → landed / all-landed, first-contact speed, hard-landing event, slack rope |
| | `ContainerGrip` | Attach on lock (adds a kinematic Rigidbody if the box has none), release on unlock; reports placement and offset |
| | `RopeRenderer` | Four LineRenderers, sheaves → headblock, updated in `LateUpdate` |
| | `SpreaderLights` | Four corner lamps (red/green) + lock lamp |
| | `CraneAudio` | Plays the AudioCueSet cues |
| | `CabinCamera` / `OrbitDebugCamera` / `CameraSwitcher` | First-person look with limits / free orbit, pan, zoom around the spreader / toggle |
| UI | `HudController` | Binds the UIDocument to crane state (text 10 Hz), sway bar, corner lights, current test move |
| Vessel | `VesselLayout` | Serialisable vessel data, same field names as the scenario |
| | `SlotGeometry` *(pc)* | Bay walk (incl. lone 20 ft bays), slot → position (gaps, rows, tier stacking); reused by the Phase 2 VesselBuilder |
| | `TestStackSpawner` | Phase 1 placeholder hull + deck stack at real slot positions |
| | `AbeamLocator` | "Abeam bay NN / row RR" under the spreader |
| Yard | `TruckLane` | Lane at a `fromWatersideRail_m` position, with driving direction |
| | `ChassisTarget` | 20/40 combo chassis: cones for 40 and 20 front/centre/rear, landing surface, placement offset/yaw |
| Scenario | `FormatDefaultsV1` · `TestMoves` | Fixed format constants (§4) · the Phase 1 move list on a component (§5.13); the loader comes in Phase 2 |
| Editor | `DefaultAssetsCreator` | *QuayOps ▸ Create ▸ Default Profiles*, incl. PanelSettings with the theme (§5.12) |
| | `PhysicsLayersSetup` | *QuayOps ▸ Setup ▸ Layers & Physics* (§5.2) |
| | `CraneRigBuilder` | *QuayOps ▸ Build ▸ STS Crane from Profile*: primitive rig from a CraneProfile, saved as a prefab |
| | `TestSceneBuilder` | *QuayOps ▸ Build ▸ Phase 1 Test Scene* |
| | `Phase1SmokeRun` | *QuayOps ▸ Verify ▸ Phase 1 Smoke Run*: in Play Mode, a virtual gamepad drives a scripted pick and place through the real input path; logs PASS/FAIL per step (§5.14) |
| Tests | EditMode | Slot parsing/parity and 17-row offsets; bay walk (`twentyOnlyBays` [1] ⇒ 01, 04, 08); bay 22 → quay mark 509.0; `RampedAxis` at dt 0.02 never exceeds accel, never exceeds the zone cap once past zone entry + braking distance, crawls into the stop and never overruns it (§5.9); ℓ at hoist +30 m = 20.9 m and period 9.17 s ± 1 %; ISO 6346 (`CSQU3054383` valid) |

### 5.2 Crane GameObject hierarchy
Each part is a logic GameObject with a child `Visual` that holds the primitive mesh, so meshes can be swapped without touching logic or colliders. The moving crane parts are sibling kinematic Rigidbodies with interpolation on, which keeps them smooth at 60 fps with 50 Hz physics and avoids nested bodies.
```
STS_Crane_SPP-65               CraneSimLoop · profile ref (root sits at the quay-frame origin)
├─ Gantry                      Rigidbody (kinematic) · GantryController
│  └─ Structure                sill beams WS/LS ► legs ×4 ► portal beams ► girder ► machinery house
│     └─ BoomHinge             BoomController
│        └─ Boom               (rotates; latch point)
├─ Trolley                     Rigidbody (kinematic) · TrolleyController
│  ├─ Sheaves                  pendulum pivot
│  └─ Cabin                    floor window ► CabinCamera
├─ HoistLoad                   Rigidbody (kinematic) · LoadSuspension · RopeRenderer · SwayModel host
│  ├─ Headblock
│  └─ Spreader                 SpreaderController · Telescope · Twistlocks · Flippers · LandingMonitor · ContainerGrip
│     ├─ End_Left              (−X; seen from the cabin facing the water) ► Corner_WL, Corner_LL
│     └─ End_Right             (+X) ► Corner_WR, Corner_LR
│                              each corner: CornerLandingSensor · twistlock · flipper · SpreaderLight
└─ Audio                       CraneAudio
```
- **Boxes are never dynamic.** A box referenced by a move carries a kinematic Rigidbody; ROB and decorative boxes are static colliders. **Any box can be picked:** on lock, `ContainerGrip` adds a kinematic Rigidbody if the box has none (static ROB and decorative boxes included), with interpolation on while it is gripped. Headblock and spreader are kinematic. On release a box stays kinematic where it is.
- **Physics layers:** *QuayOps ▸ Setup ▸ Layers & Physics* (run in Bootstrap via MCP) adds, through `SerializedObject` on the TagManager, `CraneStructure`, `CraneLoad` (headblock + spreader), `CarriedBox`, `Stow` (boxes at rest), `Vessel` (hull, covers, lashing bridges, cell guides), `Transport` (chassis/AGV) and `Quay`, and reads them back. It confirms the fixed timestep 0.02 (set through `SerializedObject` on the TimeManager only if it differs), calls `AssetDatabase.SaveAssets` and reads both back. There is no collision-matrix step: every detection query (landing pins, contact sweeps) is layer-masked, and masked queries ignore the matrix. Casts use `QueryTriggerInteraction.Ignore`.
- **Contact detection** (Phase 3 faults): every fixed step, `Physics.BoxCastNonAlloc` sweeps the spreader (+ carried box) volume along its computed motion against `Stow`, `Vessel` and `Transport` and returns all hits. The swept box is shrunk by a 15 mm skin, so resting clearances to neighbours and cell guides are not reported. Hits are filtered by collider and normal: the downward face is ignored while landing inside the flipper capture zone, and so is anything touched while ALL LANDED. A hit at distance 0 is an ongoing contact: its fault is logged once per collider, and the impact speed for the fault severity comes only from the first non-overlapping hit.

### 5.3 Order within one fixed step (0.02 s)
1. Read the operator commands from `CraneInput`: axes and held modifiers as last sampled in `Update`, button presses from their latches, which only this step clears (§5.11).
2. Anti-sway correction from the current θ, θ̇ (if on).
3. Gantry, trolley, boom and hoist drives advance (`RampedAxis`), giving the pivot accelerations, ℓ and ℓ̇.
4. `SwayModel` integrates both axes (4 sub-steps).
5. `LoadSuspension` computes the **candidate** load pose.
6. The corner sensors cast from the candidate pose, not from the transform, because `MovePosition` only lands in the next physics step (§5.7).
7. `LandingMonitor` applies the landing clamp to the candidate pose and updates landed / hard-landing / slack-rope state. A landing grounds the pendulum.
8. `LoadSuspension` moves the load to the clamped pose with `MovePosition`/`MoveRotation`: cast, clamp, then move.
9. Twistlocks, flippers and telescope advance their state machines, and `ContainerGrip` moves a carried box.

Every step after the drives reads `CraneSimLoop`'s computed state, never `transform` or `rb.position`. The gripped box uses `RigidbodyInterpolation.Interpolate`. Camera look and `RopeRenderer` run in `LateUpdate` (the ropes from the interpolated transforms), the HUD in `Update`.

### 5.4 Sway: custom pendulum (not ConfigurableJoints)
The load is modelled as **two planar pendulums**, one for the trolley direction (θ) and one for the gantry direction (φ). The pivot is the trolley sheave axis, and the length is the **rope fall ℓ** from the trolley sheave axis to the headblock sheave axis:

**ℓ = 53.5 (sheave height) − hoist height − 2.6 (headblock sheave axis above the twistlock plane)**, clamped at ℓ ≥ 0.5 m.

The four falls hang vertical and parallel, so they form a parallelogram: headblock, spreader and box **translate without tilting**. A centre of gravity below the headblock therefore does not change the period, and the suspended mass m (headblock + spreader + box) appears only in the wind term. Both axes use the same form:
```
θ̈ = ( −g·sin θ − a_p·cos θ − 2·ℓ̇·θ̇ + (F_w / m)·cos θ ) / ℓ − c·θ̇
```
| Term | Meaning |
|---|---|
| `a_p` | Pivot acceleration: the trolley drive for θ, the gantry drive for φ. Hard acceleration builds sway |
| `2·ℓ̇·θ̇` | Hoisting up while swinging increases the angle; lowering reduces it, as you feel on a real crane |
| `F_w / m` | Wind force over the suspended mass (15 t headblock + spreader, plus the box) |
| `c` | Small natural damping from rope and air losses (0.02 s⁻¹), so sway decays slowly |

| Hoist height (m) | +48 (upper limit) | +30 (start) | +12 (≈ landing on tier 82, example) | −5 | −20 (lower limit) |
|---|---|---|---|---|---|
| Rope fall ℓ (m) | 2.9 | 20.9 | 38.9 | 55.9 | 70.9 |
| Period T = 2π√(ℓ/g) (s) | 3.42 | 9.17 | 12.51 | 15.00 | 16.89 |

- **Integration:** semi-implicit Euler with 4 sub-steps (5 ms). Stability is not the issue (ω·h ≤ 0.022 even at ℓ = 0.5 m); the sub-steps keep it **accurate** when |ℓ̇|/ℓ is large, i.e. hoisting fast on a few metres of rope.
- **Load attitude:** the load is moved level by ℓ·sin θ and ℓ·sin φ.
- **Size of the effect:** full trolley acceleration from rest (0.8 m/s² for 5 s) leaves ≈ 9.2° (≈ 3.4 m) of residual sway at hoist +30 m and ≈ 8.9° (≈ 6.0 m) at +12 m unless the operator catches it. The worst case for any duration is 2·atan(a/g) = 9.3°.
- **Lift-off:** when lifting from a landed position, the pendulum starts from the real horizontal offset between sheaves and load (θ₀ = asin(offset/ℓ)). An off-centre lift therefore swings.
- **Reeving:** this assumes vertical parallel falls. Trapezoidal or cross-reeved ropes (a mechanical anti-sway) behave differently; question 5.

**Why custom beats ConfigurableJoints**
- Rope length changes every frame at up to 3 m/s. PhysX joints with moving limits, up to 70 m of rope and big mass ratios (a kinematic trolley vs 45 t of load) jitter or gain energy.
- The custom model has the period right by construction, is deterministic and frame-rate independent, and costs a few multiplications. Anti-sway and the HUD read θ and θ̇ exactly, and every term is exposed in `SwayProfile`.
- Drives are speed-controlled (stiff), so sway does not push the trolley back. This matches real drives.
- *Trade-off:* sideways contact is detected, not simulated. A spreader driven into a stack does not bounce off it.

### 5.5 Wind
- **Force:** F = ½·ρ·Cd·A·v² per axis, where A is the box's projected area for the crane-relative wind (bare spreader areas when empty). Gusts rise and fall within `gustInterval_s`. The static offset is ℓ·F/(m·g), so it grows with rope length and shrinks with mass.
- **Example:** 20 kn (10.3 m/s) on the long side of a 40 ft box gives ≈ 2.5 kN; a 27 kn gust ≈ 4.5 kN.

| Static offset | Hoist +30 m (ℓ 20.9) | Hoist +12 m (ℓ 38.9) |
|---|---|---|
| Empty 40' + spreader + headblock (18.8 t), 20 kn | 0.28 m | 0.52 m |
| 30 t box (45 t suspended), 20 kn | 0.12 m | 0.22 m |
| Empty 40', 27 kn gust | 0.51 m | 0.95 m |

- **Wind stop:** the crane's `inServiceWindLimit_kn` (design, 40 kn) and the scenario's `rules.windStopLimit_kn` (terminal policy): the lower one applies, and the loader warns if the rules value is above the crane's. Mean wind or 3-s gust, and the pre-alarm: question 12.
- **True wind → quay frame:** world +X points to `quay.orientation_deg` (marks to the right) or to it + 180° (marks to the left); the water (+Z) lies at the world +X bearing − 90°. In the example, orientation 160° with marks to the right puts the water at 070°, so wind from 250° blows from landside straight along the boom (offshore).

### 5.6 Anti-sway (question 4)
Either or both can be fitted. They are toggled with T, are **off at start** (your brief) and show on the HUD.
- **(a) Electronic, drive-based (proposed default).** This works like the ABB/Siemens systems. The drive adds `a_AS = k·ℓ·θ̇` (k = 0.6 s⁻¹) to the operator's acceleration command, within the drive's accel limit. The trolley and gantry visibly "chase" the load; at hoist +30 m a 9° sway falls below 1° within one period (9.2 s).
- **(b) Mechanical/hydraulic rope anti-sway, as fitted on many STS cranes.** It damps sway with the trolley standing still: an extra `−c_AS·θ̇` term on the pendulum (c_AS = 0.25 s⁻¹, sway half-life ≈ 5.5 s = 2·ln2/0.25).

### 5.7 Landing, twistlocks, flippers, pick/place
- **Corner sensors** are landing pins with 0.15 m travel. Each ray starts 0.3 m above the twistlock plane (more than the 0.06 m the hoist can travel in one step, plus margin) and is 0.3 + 0.15 = 0.45 m long; the 0.3 m offset is subtracted from the hit distance. The rays are cast from the step's candidate pose, and the landing clamp is applied to that pose before `MovePosition` (§5.3). While a box is locked on, they cast from that box's bottom corner castings instead, so "landed" then means the box is seated and the load is off the ropes. This is the same interlock as landing pins plus slack-rope/load cell.
- **Contact** stops the spreader descending (the vertical clamp) and lights that corner green. **ALL LANDED** means all four corners are down, and the pendulum is grounded (sway zeroed).
- **Lock** is allowed only when all four corners have landed on the castings of one box, the spreader length matches the box and the locks are open. It takes 0.6 s and plays a click.
- **Unlock** is allowed only when ALL LANDED is on (box seated). Otherwise it is refused and logged (a Phase 3 fault).
- **Telescope** is blocked while locked or while any corner is landed.
- **Flippers** go up or down in 2 s. When down and within ±0.25 m, they ease the spreader into alignment over the last 0.5 m of lowering. They must be up in cell guides (warning in Phase 2, fault in Phase 3).
- **Hard landing:** a downward speed at first contact (hoist + pendulum) above `hardLanding_mps` (0.5) sounds the alarm, flashes the HUD and logs an event.
- **Slack rope:** after landing, a lowering command ramps to zero at 1.5 m/s² and holds. Hoisting up stays free.
- **Grip:** any box can be picked. On lock, `ContainerGrip` adds a kinematic Rigidbody if the box has none (static ROB and decorative boxes included), and the box is driven with the spreader each step, with interpolation on while gripped. It is not parented, so there are no nested bodies. The hoist speed limit switches to the new load.
- **Release:** on unlock, the box stays exactly where it is (no physics settling). It is registered to what is under it (nearest vessel slot, chassis position or quay), and the HUD shows Δ position in cm and yaw in degrees.

### 5.8 Hoist speed and limits
**Speed vs load (question 10):** the hoist runs at constant power between the rated load and an empty spreader, capped at 180 m/min (spreader + headblock = 15 t):

| Load under spreader (t) | 0–25 | 30.48 | 40 | 50 | 65 (rated) |
|---|---|---|---|---|---|
| Max hoist speed (m/min) | 180 | 158 | 131 | 111 | 90 |

- **Creep:** 10 % while held. **Upper:** the pre-limit switch sits 7.0 m below the upper limit. The ramp down to 20 % (0.6 m/s) starts there and takes 5.76 m from full empty speed; the hoist then crawls to the final stop at lift height +48.0 m (§5.9).
- **Lower (question 8):** landing and the slack-rope stop stop the hoist on a box, chassis, cover or the quay. The hard lower limit sits at −`liftBelowRail` = −20.0 m so the spreader can reach the hold (tank top −16.0 m in the example).

### 5.9 Gantry, trolley, boom interlocks
**Slowdown zones mean the same on every drive.** The zone entry is a pre-limit switch where the ramp down to the zone cap starts. Each zone is longer than the braking distance from full speed to the cap, so the drive always crawls at the cap over the last metres. On top, the braking guard v ≤ √(2·a·d) to the hard stop holds everywhere. Zone entry and braking guard are evaluated one step ahead, with d − v·dt, and the position is finally clamped at the stop, so no stop is ever overrun. An EditMode test checks this (§5.1).

| Drive | Zone @ cap | Braking full speed → cap | Crawl at the cap | Cap → stop |
|---|---|---|---|---|
| Trolley (4.0 m/s, 0.8 m/s²) | 12 m @ 20 % (0.8 m/s) | 9.6 m | 2.00 m (2.5 s) | 0.40 m |
| Hoist, upper (3.0 m/s, 0.75 m/s²) | 7.0 m @ 20 % (0.6 m/s) | 5.76 m | 1.00 m (1.7 s) | 0.24 m |
| Gantry (0.75 m/s, 0.3 m/s²) | 3 m @ 20 % (0.15 m/s) | 0.90 m | 2.06 m (13.8 s) | 0.04 m |

- **Gantry:** 45 m/min at 0.3 m/s², stopping in 0.94 m. Hard limits are at the rail ends minus half the buffer-to-buffer width; soft limits and blocked zones come from the scenario (Phase 2). The warning bell sounds while travelling.
- **Trolley:** 240 m/min at 0.8 m/s², range +65.0 to −50.48, a slowdown zone at each end.
- **Boom** (B/RB held + hoist axis, hold-to-run): moves only with the trolley parked ≤ −6.0 m (landside of the hinge), the spreader at the upper limit and the gantry stopped. It goes 0 → 80° in 150 s with ramped start and stop; the latch engages at 80°, and lowering releases it first. While the boom is not fully down, the trolley is limited to ≤ −6.0 m. Gantry travel with the boom up is allowed.

### 5.10 Cameras
- **Cabin:** a child of the trolley's cabin. FOV 60°, yaw ±150°, pitch +20° down to −89°, so you can look straight down through the floor window. It starts at −55°, facing the water. Look with the mouse or right stick (bindings below).
- **Orbit debug:** targets the spreader. RMB-drag orbits, MMB-drag pans, the wheel zooms (8–300 m).
- **Switching:** `CameraSwitcher` toggles the two views with C or View/Back. The crane stays drivable in both.

### 5.11 Input (`Input/QuayOpsControls.inputactions`, map "Crane")
| Action | Keyboard / mouse | Gamepad | Note |
|---|---|---|---|
| Trolley | W (waterside) / S (landside) | Left stick Y (up = waterside) | |
| Gantry | A (−X) / D (+X) | D-pad left / right | D = right = +X when facing the water |
| Hoist | ↑ raise / ↓ lower | Right stick Y, **push forward = lower** | Question 6 |
| Creep (hold) | Left Shift | LB | 10 % on hoist, trolley, gantry |
| Lock / unlock (toggle) | Space | A (South) | Interlocked, §5.7 |
| Spreader 20 / 40 / 45 | 1 / 2 / 3 | D-pad up = longer, down = shorter | |
| Flippers (toggle all) | F | Y (North) | |
| Anti-sway toggle | T | X (West), *proposed* | |
| Boom (hold + hoist axis) | B + ↑/↓ | **hold RB + right stick Y** | Question 7; the B button stays free |
| Look | Mouse, hold right button | **hold LT + right stick** | Hoist input is ignored while LT is held |
| Camera toggle | C | View / Back | |

`CraneInput` has a `[SerializeField] InputActionAsset controls`. In `OnEnable` it finds these actions by name once (the names live in one static class), logs **one** clear error listing any missing action, and enables the "Crane" map (disabled again in `OnDisable`). There is no generated C# class and no importer setting to change; the bindings stay editable in the asset.

**Button presses are latched.** Presses of Lock, Flippers, AntiSway, the spreader sizes and Camera toggle, and the press/release edges of the Boom modifier, are held in counters or flags: set by `performed` callbacks or in `Update`, cleared only when `CraneSimLoop` consumes them in a fixed step, so a tap between two physics steps is never lost or doubled. Axes and held modifiers (Creep, Boom, Look) use the last sampled value.

### 5.12 HUD: UI Toolkit
I chose UI Toolkit (UIDocument + UXML + USS): layout and styles live in files you can tweak without code, they scale cleanly with PanelSettings, and `ListView` is ready for the Phase 2 scenario browser and the Phase 3 fault list. uGUI would only come in later if world-space panels are needed. The theme is the hand-written `UI/QuayOpsRuntimeTheme.tss` (`@import url("unity-theme://default");`); `DefaultAssetsCreator` assigns it to `PanelSettings.themeStyleSheet` and sets the scale mode and reference resolution. Corner lights are laid out as seen from the cabin facing the water: top = waterside (WL, WR), bottom = landside (LL, LR).
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ QC04 · SPP-65 · CABIN                     WIND 20 kn · 10.3 m/s · from LS   │
│                                           gusts 27 kn          stop 40 kn   │
│                                                                             │
│                              (camera view)                                  │
│                                                                             │
│ ▲ HARD LANDING 0.8 m/s                                                      │
│ MOVE  22-04-84 ─► L1           MSKU1234565 · 40' HC · 24.6 t                │
│ TIMER 01:12 / target 01:30     last placement Δ 3.1 cm · 0.4°               │
├───────────────┬────────────────┬───────────────┬──────────────┬─────────────┤
│ HOIST +12.4 m │ TROLLEY        │ GANTRY        │ SPREADER 40' │  WL ●   ● WR│
│ ▼ 18 m/min    │ WS 32.4 m      │ 509.0 m       │ LOCKED       │  LL ●   ● LR│
│ LOAD 24.6 t   │ → WS 96 m/min  │ ■ 0 m/min     │ FLIPPERS UP  │ ALL LANDED  │
│ CREEP         │ ABEAM BAY 22   │ BOOM DOWN     │ ANTI-SWAY    │ SWAY 0.12 m │
│               │       ROW 04   │               │ OFF          │ ▮▮▯▯▯▯      │
└───────────────┴────────────────┴───────────────┴──────────────┴─────────────┘
```
In Phase 1 the MOVE line comes from the test scene's `TestMoves` list (§5.13): it shows the current target before the lift, the timer runs from move start, and the next move comes up after unlock. From Phase 2 on it shows the current work-queue move.

### 5.13 Test scene (`Scenes/Phase1_CraneTest.unity`, built by `TestSceneBuilder`)
| Element | Content |
|---|---|
| Quay | 300 m apron (X 0–300, Z +4.5 to −60), rails at Z 0 / −30.48, water plane at Y −5.0, quay-mark ticks every 10 m (increasing to the right), sun + URP volume |
| Crane | SPP-65 at quay mark 169.8 (abeam bay 14), trolley LS 15.0, hoist +30 m (ℓ 20.9 m, period 9.2 s), boom down; gantry range 13.5–286.5 m |
| Hull (placeholder feeder) | LOA 160, beam 25.0, draught 9.0, freeboard 5.5 m (main deck +0.5 m above the quay); starboard side alongside, bow at quay mark 230 (stern 70), centreline WS 17.0; 9 bays 02…34, bay 02 at 20.0 m, pitch 13.4; 18 m deckhouse after bay 30 (quay marks 109.5–91.5), bay 34 behind it at 84.8 |
| Deck stack: 3 bays × 6 rows × 4 tiers at real slot positions | Bays 10 / 14 / 18 at quay marks 183.2 / 169.8 / 156.4. Rows 05 03 01 02 04 06 at WS 10.63 / 13.18 / 15.73 / 18.28 / 20.83 / 23.38. Tiers 82–88 on hatch-cover slabs: first tier base +3.2 m (deck +0.5, coaming 1.8, cover 0.9), stack top +13.7 m (4 standard) to +14.9 m (4 HC). Bay 10: 24 × 40' DV. Bay 14: 24 × 40' DV/HC mixed. Bay 18: 20' pairs in 17/19 at tiers 82–84 with 40' on top at 86–88. 84 boxes in total, valid generated ISO ids, seeded weights 2.3–30 t, operator colours |
| Truck lane | L1 at LS 8.5 m (between the legs), one stationary tractor + 20/40 combo chassis at quay mark 169.8 with cone positions for 40 and 20 front/centre/rear. 5 s after an unlock on the chassis the box is cleared (the tractor leaves, an empty one pulls in) |
| `TestMoves` | A small list on a component, editable in the Inspector: 14-02-88 → L1, 18-04-88 → L1, 18-04-86 → L1, 17-04-84 → L1 (20', rear) … The HUD shows the target before the lift; the timer runs from move start; the next move comes up after unlock |
| Wind | `WindField` at 0 kn (set speed, direction and gusts in the Inspector to try wind) |

### 5.14 How MCP is used
1. I write C#, asmdef, UXML/USS/TSS and input assets to disk. MCP then refreshes and **reads the Console**, and I fix every error and warning before moving on.
2. The rig, the test scene and the default assets are built by **Editor builder menus executed through MCP** (`DefaultAssetsCreator`, `PhysicsLayersSetup`, `CraneRigBuilder`, `TestSceneBuilder`), not wired step by step with MCP calls. The result is reproducible from the CraneProfile and is rebuilt with one menu item after a profile change (question 34). There is no hand-written YAML.
3. MCP reads back the hierarchy and components to confirm the wiring.
4. MCP enters **Play Mode** and runs *QuayOps ▸ Verify ▸ Phase 1 Smoke Run*. At start the smoke run makes a temporary copy of the input settings, `var tmp = Object.Instantiate(InputSystem.settings)`, sets `backgroundBehavior` = IgnoreFocus and `editorInputBehaviorInPlayMode` = AllDeviceInputAlwaysGoesToGameView on it and assigns it (`InputSystem.settings = tmp`). The original is restored in a `finally` block and on `EditorApplication.playModeStateChanged` (ExitingPlayMode), and the project asset is never saved; *Run In Background* is on. The virtual gamepad therefore works with the Editor in the background. MCP reads the Console for PASS/FAIL and exceptions, and exits Play Mode.
5. EditMode tests run via MCP if your bridge supports it; otherwise I give you the Test Runner clicks. Anything the bridge cannot do comes to you as an exact click list.

### 5.15 Definition of done: Phase 1
- [ ] The project compiles with **0 errors and 0 warnings** from the QuayOps assemblies, and the EditMode tests are green.
- [ ] Phase1_CraneTest opens. Play Mode holds 60 fps on a mid-range laptop (Stats/Profiler) with a fixed timestep of 0.02.
- [ ] Gantry, trolley and hoist ramp up and down. Limits and slowdown zones hold without overrun, creep works and the boom interlocks hold.
- [ ] Sway period matches 2π√(ℓ/g) within 2 %. Sway grows with hard trolley acceleration and decays slowly, and anti-sway on/off behaves as agreed.
- [ ] You can work the `TestMoves`: pick a box from the deck stack (4 green → lock → lift), land it on the chassis in L1, unlock it, and it stays. The HUD shows the target, the timer, Δ cm and yaw.
- [ ] A hard landing above 0.5 m/s sounds the alarm. Unlock while not landed is refused.
- [ ] Cabin and orbit cameras switch. All HUD fields update.
- [ ] The smoke run reports PASS. README.md (setup, controls, how to test, known issues) and CHANGELOG.md are updated.

## 6. Scenario system preview (built in Phase 2)
The full field reference is in `docs/SCENARIO_FORMAT.md`, and every loader check with its message is in `docs/VALIDATION_RULES.md`. The schema is `Assets/QuayOps/Scenarios/Schema/quayops-scenario.v1.schema.json`; put `"$schema": "./Schema/quayops-scenario.v1.schema.json"` in a scenario to get autocomplete. The example is `Assets/QuayOps/Scenarios/deepsea-bay22-mixed.json`. Write only what differs from the defaults; an explicit value pins it.

| Block | Required | Holds |
|---|---|---|
| `schemaVersion` | yes | integer, `1` |
| `scenario` | yes | id (= file name, results file stem and browser key), title, description, author, created |
| `quay` | – | length, direction of increasing quay marks, orientation (true bearing of increasing marks), rail-to-fender-line distance, apron above waterline (tide) |
| `vessel` | yes | name, IMO, LOA/beam/draught/deck height; mooring (side alongside, bow quay mark, off fender); structure; bays (count, lone 20 ft bays, first bay centre, pitch, rows/tiers hold/deck, overrides incl. raised hold row bases, gaps); hatch covers; lashing bridges; reefer positions; decorative fill |
| `bayPlan` | yes (may be empty) | boxes on arrival: slot + status `discharge` / `stay` (ROB) / `restow` + container fields |
| `loadList` | if any load move | export boxes that arrive by truck/AGV |
| `workQueue` | yes, ≥ 1 | ordered moves: `discharge`, `load` (lane → vessel only), `restow` (on board, via the buffer or via a lane), `hatchcover`; `from`/`to` = exactly one of `vessel`, `lane`, `buffer`, `coverSeat`, `laydown`; twin lift |
| `yardSide` | yes | tractor + chassis or AGV, lanes, quay buffer, hatch-cover laydowns, truck timing |
| `environment` | – | wind + gusts, time of day, weather, visibility, sea state (visual only) |
| `crane` | yes | profile id, crane id, start (`startQuayMark_m` **or** `startAtBay`; the resolved mark is also the default `quayMark_m` of the buffer and laydowns), trolley/hoist start, boom / anti-sway / twin-lift flags, soft limits, blocked zones |
| `rules` | – | hard landing, placement and yaw tolerance, max sway at placement, move time targets, wrong slot fail/penalise, wind stop |

**Example contents.** The fictional MV QUAYOPS PIONEER (about 8,500 TEU, LOA 334 m, beam 45.6 m, 17 rows on deck), starboard side alongside; the crane starts abeam bay 22 (`startAtBay`). 30 moves in bay 22 (12 discharge, one of them a twin lift, so 13 boxes; 3 restow legs; 2 hatch cover; 13 load): deck discharge including a 45' HC, a reefer and a twin lift; a direct restow on board and a restow via QB01; hatch cover 22-2 to HCL1 and back; hold discharge and hold load, then deck load. ROB boxes stay on the outer panels and pedestal rows, including an open top, a flat rack with over-height and an empty reefer (no setpoint) in the hold. Six one-way lanes. Wind 20 kn from 250° gusting 27 kn, 06:40, overcast; `rules` only raises the hatch cover target to 300 s.

**File locations**

| What | Where |
|---|---|
| Bundled scenarios, Editor | `Assets/QuayOps/Scenarios/*.json` (top level only), read directly |
| Bundled scenarios, build | A `BuildPlayerProcessor.PrepareForBuild` hook calls `ctx.AddAdditionalPathToStreamingAssets(file, "QuayOps/Scenarios/" + Path.GetFileName(file))` for each top-level `Scenarios/*.json` (for a single file the second argument is the destination file path), plus the schema file with the target `"QuayOps/Scenarios/Schema/quayops-scenario.v1.schema.json"`. Never the whole folder: that would bundle `Schema/` and the `.meta` files differently. The player reads them from StreamingAssets (read-only). Nothing is written under `Assets/` |
| Your own scenarios | `<persistentDataPath>/Scenarios/` (Windows: `%USERPROFILE%\AppData\LocalLow\<company>\QuayOps\Scenarios`) |
| Schema copy | Written on first run (Editor and builds) to `<persistentDataPath>/Scenarios/Schema/`, read from `StreamingAssets/QuayOps/Scenarios/Schema/` in builds and from `Assets/QuayOps/Scenarios/Schema/` in the Editor, so `"$schema": "./Schema/quayops-scenario.v1.schema.json"` keeps working in copied files |
| Results (Phase 3) | `<scenarioId>.result-<yyyyMMdd-HHmm>.json`. Editor, bundled scenario → `Assets/QuayOps/Scenarios/Results~/` (not imported, not bundled, not listed); your scenario → `<persistentDataPath>/Scenarios/Results/`; build, bundled scenario → `<persistentDataPath>/Results/` |

The browser lists top-level `*.json` only, so schema and result folders never show up as scenarios. `scenario.id` is the results file stem and the browser key: the loader warns if it differs from the file name, and the browser flags two files with the same id.

**Loader pipeline**
```
read text → JsonTextReader pre-pass (syntax, comments, every duplicate key, line:col) → Newtonsoft JToken (line:col kept)
→ strict DTO reader (unknown keys + did-you-mean, missing required, types (20.0 is a valid integer), "04"/4 list
normalisation, defaults) → semantic checks C–G, I → sequence dry run H → build (VesselBuilder, YardBuilder, WorkQueue)
```
- The loader collects **every** issue. Errors block loading, warnings are shown, info lines report e.g. *"crane starts abeam bay 22 (quay mark 509.00)"* with a bay → quay mark table, or a twin-lift split.
- Each message = JSON path + context + a plain-English fix.
- An EditMode test keeps the DTO field names and the JSON Schema in sync, and validates the example files.

One row per group; `docs/VALIDATION_RULES.md` has every rule with its severity and a message. The messages below are real output of a prototype of these checks for the example scenario with one fault put in (rules A04, B02, C02, D40, E02, F03, G02, H11 and I06 there). In Unity each message also carries the line:column of its JSON token.

| Group | Checks | Example message |
|---|---|---|
| A Structure | JSON syntax; comments and duplicate keys (all, with line:col) are errors; unknown keys, missing required, type (20.0 accepted as an integer), enum, range, pattern; `DV` needs height `standard` (a high-cube dry van is `HC`/`HC`); no `twinLift` on hatch cover moves | `workQueue[4].form: unknown key "form" — did you mean "from"?` |
| B Version | `schemaVersion` missing or unsupported | `schemaVersion: version 2 is not supported by this build (supported: 1)` |
| C Identity | ISO 6346 + check digit; duplicate container/move/lane/buffer/laydown/cover ids; unknown crane profile; `scenario.id` ≠ file name (warning) | `bayPlan[0] CMAU5693109 @ 22-00-86: ISO 6346 check digit is wrong — CMAU569310 needs check digit 8, not 9 (→ CMAU5693108)` |
| D Addressing | Slot format; bay exists in the bay walk (an invalid even bay names the nearest 40 ft bays); size ↔ bay parity; row exists for hold/deck width; tier in range, ≤ 98, hold range below deck range, not below a raised row base; no 45 ft in hold; 20 ft in hold only if allowed | `bayPlan[7] CSNU6340190 @ 22-18-84: row 18 does not exist on deck of bay 22 (17 rows: 16 … 15)` |
| E Stowage | Overlaps, incl. two 45 ft in adjacent 40 ft bays (same row and tier) when 13.716 m > pitch; support; 20-on-40 rules; 45 ft vs lashing bridges; hold stack under cover; deck stack top + tallest box + `clearanceOverStack_m` ≤ lift height (OOG over-height counts in both terms); outermost row centre within outreach; nothing on OOG; running reefers (with setpoint) only in reefer positions; weights; vessel on the quay | `bayPlan[13] ONEU1159375 @ 22-06-86: nothing stowed at 22-06-84 — the box would float` |
| F Hatch covers | Panel rows exist; each hold row covered by exactly one panel; ids unique; dimensions plausible (warning); weight ≤ SWL | `vessel.hatchCovers.overrides[0].panels[1].rows[6]: panel 02-2: hold row 11 is already covered by panel 02-1` |
| G References | Container exists; status fits the move type; load = loadList box, lane → vessel only; restow legs incl. via a lane (lane `use` per leg); from/to kinds; ids exist; twin-lift rules (split info until Phase 3); boxes never moved (warning) | `workQueue[4] M005 discharge ONEU1159375: ONEU1159375 has status "stay" (ROB) — it must not be moved; change its status to discharge or restow` |
| H Dry run | Box is where `from` says; nothing on top; hold closed by cover; target free and supported; covers lift only when clear (incl. 20 ft bays B±1) and return to own seat; laydown/buffer capacity | `workQueue[10] M012 hatchcover 22-2: cannot lift hatch cover 22-2: deck boxes still stand on it (bays 21/22/23, rows 04,02,00,01,03): SEGU4155627 @ 22-03-82 — discharge or restow them first` |
| I Crane/yard | Start inside quay and soft limits, not in a blocked zone; lanes between the rails or in the backreach; lane, buffer and laydown footprints clear of the crane legs (rail ± 1.5 m) and not overlapping each other; laydown/buffer in reach; gusts ≥ speed, gust interval min ≤ max; `rules.windStopLimit_kn` above the crane's in-service limit (warning, the lower applies); wind above the stop limit (warning); apron height outside 1.5–8 m (warning) | `crane.startQuayMark_m: start position: quay mark 470.00 is inside blocked zone 425–485 (QC05 working bay 38 — keep gantry separation)` |

**Versioning**
- `schemaVersion` is an integer, and this build accepts `1` only. The format defaults (§4) belong to the version; new **optional** fields do not bump it.
- Breaking changes (rename, removal, a changed meaning or default, a new required field) bump it. The loader then carries an in-memory migration from older versions and warns.
- An older build given a file that uses a newer optional field reports *"unknown key … (written for a newer QuayOps?)"*.

## 7. Risks and known limitations
| Item | Consequence / plan |
|---|---|
| No MCP or Editor in this cloud session | Nothing has been verified in Unity yet. Phase 1 must run on the Editor machine (option A) |
| Bay layout | Lone 20 ft bays (`twentyOnlyBays`) and raised hold row bases (`holdRowBaseTier`) are supported. Still missing: per-bay lengths (every 40 ft bay is `pitch_m` long, a lone bay half that), 45 ft cells in the hold and pallet-wide boxes (question 31) |
| Vessel is static | No list, trim, roll, surge or draught change; tide is fixed per scenario; sea state is visual only |
| No cover-on-cover on board in v1 | Hatch covers go to quay laydowns only (they may be stacked there up to `maxStack`) |
| Twin lift before Phase 3 | The Phase 2 work queue splits a twin-lift move into two single 20 ft moves (forward box first) and shows "twin lift split — Phase 3", so scenario (b) plays end to end in Phase 2. In the split and in the real Phase 3 twin lift, both boxes go on one chassis or AGV: the forward box (B−1) on the end facing the bow, the aft box on the other; `chassisPosition` and `single20Position` do not apply |
| No headblock trim/list/skew, no torsional sway | Spreader stays level and square to the quay; boxes are on a static vessel parallel to the quay |
| Two independent planar pendulums | Accurate below about 15°, clamped at 25°; vertical parallel falls assumed (question 5); no rope stretch or bounce |
| Contact is detected, not simulated | No bounce off stacks. Cell guides get a capture zone in Phase 2 that clamps sway to the cell clearance, not full contact physics |
| Performance at deep-sea scale | 4,000+ boxes with decorative fill: one shared material per operator colour (SRP Batcher friendly, no MaterialPropertyBlocks), static simplified colliders. The GPU Resident Drawer is left to Phase 2, with its prerequisites: Forward+, URP asset *GPU Resident Drawer* = Instanced Drawing, Graphics *BatchRendererGroup Variants* = Keep All, static batching off |
| Audio | No free clip library, so procedural clicks and beeps until Phase 4 |
| MCP bridge features vary | Menu execution, Console, Play Mode, Test Runner and importer settings vary by bridge; gaps become click lists for you (question 2) |

## 8. Open questions
**Answered 2026-09-27: defaults OK for every question, and option A for question 1.** Each default below is therefore the decision.

**(a) Blocking**
1. How do we proceed: **A** (local Claude Code + Editor + MCP bridge) or **B** (cloud only, with click lists)? *Default: A.*
2. Which Unity 6 LTS (exact 6000.x.y) and which MCP bridge? Can the bridge run menu items, change importer settings, run the Test Runner and enter Play Mode with the Editor in the background? *Default: the newest Unity 6 LTS that Hub offers, with MCP for Unity.*
3. Your "mid-range laptop" (OS, CPU, GPU) and the build target? *Default: Windows 11, integrated-class GPU, Windows standalone only.*

**(b) Crane feel**

4. Which anti-sway do your cranes have: electronic drive-based, mechanical/hydraulic rope damping, or both (§5.6)? *Default: electronic, off at start.*
5. Rope reeving: vertical parallel falls (§5.4), or trapezoidal / cross-reeved (mechanical anti-sway)? *Default: vertical parallel.*
6. Hoist stick: push forward = **lower** (like a real master controller), or forward = raise? Stick only; ↑ always raises. *Default: forward = lower.*
7. Gamepad: boom = hold RB + right stick Y, look = hold LT + right stick, B button free (the alternative: hoist on the triggers, right stick always look)? *Default: the RB/LT modifiers.*
8. You wrote "lower limit at deck/quay level": landing and the slack-rope stop stop the hoist there; the hard lower limit sits at −20 m so the spreader can reach the hold. OK? *Default: yes.*
9. Placement tolerance 5 cm / 1.0°, hard landing 0.5 m/s, max sway at placement 10 cm? *Default: these values.*
10. Hoist speed vs load: constant power (§5.8; a 30.48 t box hoists at 158 m/min), or two-step (any box 90, empty 180 m/min)? *Default: constant power.*
11. Boom "~5 min full cycle": up + down (2.5 min each way), or 5 min one way? *Default: 2.5 min each way.*
12. Wind stop on the mean wind or on the 3-s gust, and at what pre-alarm level? *Default: stop on a 3-s gust ≥ 40 kn, pre-alarm at 30 kn.*

**(c) Stowage and schema**

13. Twin-twenty = two 20 ft **end to end** in one 40 ft bay (`22-00-82` = 21-00-82 + 23-00-82). Is that what you meant by "side by side"? (Tandem lifts — two 40 ft across rows — are not planned.) *Default: yes.*
14. Do your vessels have 20 ft-only bays (numbering 01, 04, 08 …) and raised hold row bases? v1 now supports both as optional fields. *Default: supported, optional.*
15. Do quay marks increase to your right when you face the water? *Default: right; `marksIncreaseTo: "left"` exists.*
16. Single 20 ft on a 20/40 combo chassis: front (the gooseneck end, towards the tractor), centre or rear? And your bomb-cart practice (terminal chassis with corner guides, no twistlocks: 1 × 40/45 or 2 × 20 in guides)? *Default: rear.*
17. Hatch covers: landing place (backreach laydown; also between the legs?), cover-on-cover on board, lift order (wing panels before the centre?), spreader mode (40 ft on the lifting pockets, or a cover-lifting beam)? *Default: backreach laydown, any order, 40 ft mode, no cover-on-cover in v1.*
18. Panel ids `"22-1"` … `"22-3"` numbered port → starboard? *Default: yes.*
19. The flat-rack in scenario (c): empty/collapsed, or loaded OOG? *Default: loaded, over-width only, normal spreader.*
20. Max gross: a 30.48 t cap, or per-size ratings (32.5 t 40 ft, 36 t 20 ft tank)? *Default: per size in ContainerCatalog, all 30.48 t initially.*
21. ISO size-type code (22G1, 45G1, 45R1 …) as an extra field? *Default: later, as an optional `isoSizeType`, no version bump.*
22. Accept `"ROB"` as an alias of `"stay"`? *Default: no.*
23. ROB context boxes: real ids for every stay box, or let the loader generate valid ids when `containerId` is omitted on stay boxes? *Default: required, plus Phase 2 Editor commands "Fix ISO 6346 check digits" and "Generate container ids".*
24. One-way traffic under the crane and door direction (doors aft; reefer machinery end): track and check? *Default: one-way, doors tracked from the lane direction, no check in v1.*

**(d) Operations: answer now or at the Phase 3 gate**

25. Who corrects an off-spot chassis: the driver on the operator's forward/back signal, or the crane by gantrying? *Default: the driver, on a signal key.*
26. SATL/coning stop at the lane for deck boxes (box held about 1–1.5 m above the chassis while lashers work)? *Default: yes, Phase 3.*
27. Dual cycling? *Default: not in v1.*
28. GMPH counting: a twin lift = 1 move / 2 boxes; hatch covers and restows reported separately? *Default: yes.*
29. Straddle or shuttle carriers landing boxes on the apron? *Default: not in v1.*
30. Stack-weight limits? *Default: not in v1.*
31. 45 ft cells in the hold, pallet-wide boxes? *Default: no.*
32. Is the quay buffer served only by this STS? *Default: yes.*

**(e) Project**

33. Extra folders `Editor/`, `Input/`, `UI/`, `Tests/EditMode` and the tests asmdef OK (`Assets/Settings/` and the template input asset stay outside `Assets/QuayOps/`)? *Default: yes.*
34. OK to build the rig, test scene and default assets with Editor builder menus run via MCP (reproducible from CraneProfile) instead of step-by-step MCP wiring (§5.14)? *Default: yes.*
35. Scenario format defaults fixed per schema version, with only the rules defaults tunable (§4)? *Default: fixed, rules tunable.*

## What happens after your go-ahead
Phase 1, on your Editor machine. Each step ends with MCP checks: Console clean (0 errors, 0 warnings) plus the step's own check.

1. **Bootstrap:** re-run Step 0 via MCP (versions, packages, Active Input Handling, fixed timestep), install Newtonsoft, create folders and asmdefs, then run *QuayOps ▸ Setup ▸ Layers & Physics* via MCP (layers, fixed timestep 0.02, save). *Check:* Console clean, layers and timestep read back.
2. **Core maths:** `Units`, `QuayFrame`, `RampedAxis`, `SlotAddress`, `SlotGeometry`, `Iso6346`, `WindField`, plus the EditMode tests. *Check:* tests green via MCP.
3. **Profiles:** ScriptableObject classes plus *Create ▸ Default Profiles*, which also creates the PanelSettings with `QuayOpsRuntimeTheme.tss`. *Check:* assets exist, their values and the theme are read back.
4. **Rig and scene:** `CraneRigBuilder` → crane prefab; `TestSceneBuilder` → quay, hull, 3 × 6 × 4 stack, lane, chassis and `TestMoves`. *Check:* hierarchy dump, Console.
5. **Drives and input:** gantry, trolley, hoist, boom, `CraneSimLoop`, `CraneInput`, `.inputactions`. *Check:* the Play Mode smoke run drives every axis into its limits without overrun.
6. **Sway, wind and anti-sway,** plus ropes. *Check:* measured period at hoist +30 m and +12 m (9.17 s and 12.51 s) within 2 %; anti-sway decay logged.
7. **Spreader:** telescope, twistlocks, flippers, sensors, landing monitor, grip, lights and audio. *Check:* the smoke run picks a box and places it on the chassis, with PASS.
8. **Cameras and HUD** (UXML/USS/TSS). *Check:* Play Mode, no warnings; screenshot if your bridge can take one.
9. **Wrap-up:** fps check, README.md and CHANGELOG.md. *Check:* full test run and smoke run. Then **I stop for your crane-feel test.**
