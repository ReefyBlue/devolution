# QuayOps: Step 0 report and Step 1 proposal

Branch `claude/quayops-sts-crane-0t64lz` · status: **waiting for your go-ahead** · 2026-09-26

Other Step 1 files on this branch:

| File | Content |
|---|---|
| `docs/SCENARIO_FORMAT.md` | Every scenario field with examples, for writing scenarios by hand |
| `Assets/QuayOps/Scenarios/Schema/quayops-scenario.v1.schema.json` | JSON Schema (draft 2020-12). It gives autocomplete and hover help in VS Code/Rider |
| `Assets/QuayOps/Scenarios/deepsea-bay22-mixed.json` | A complete example: your scenario (b) |
| `.gitignore` | Unity ignore rules |

To reply, answer section 8. "Defaults OK" is a valid answer to any question.

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
3. Install your Unity MCP bridge (e.g. MCP for Unity by CoplayDev) as a package in the project, following its README (usually Package Manager ▸ + ▸ *Add package from git URL…*). Then register it with Claude Code on that machine, either from the bridge's setup window or with `claude mcp add …` as its README shows. Some bridges need Python/uv; their setup window checks for this.
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
6. Commit `Packages/`, `ProjectSettings/` and the new `.meta` files from that machine. This is the first commit made from the Editor side.

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
The `.gitignore` is already on the branch. It ignores `Library/`, `Temp/`, `Obj/`, `Logs/`, `UserSettings/`, `Build(s)/`, IDE and solution files (Unity regenerates them), and `Assets/StreamingAssets/QuayOps/`, which is copied at build time. **`.meta` files are committed.** Git LFS is not needed while we use primitives; add it in Phase 4 for audio and models.

## 2. Folder structure, assemblies, namespaces

```
<repo root = Unity project root>
├─ README.md · CHANGELOG.md · .gitignore
├─ docs/                      STEP1_PROPOSAL.md · SCENARIO_FORMAT.md
├─ Packages/ · ProjectSettings/            (created by Unity; never hand-edited)
└─ Assets/
   ├─ Settings/               URP pipeline + renderer assets from the template (kept there)
   └─ QuayOps/
      ├─ Scripts/             QuayOps.Runtime.asmdef (covers all subfolders)
      │  └─ Core/ Crane/ Scenario/ Vessel/ Yard/ UI/
      ├─ Editor/              QuayOps.Editor.asmdef: builders, verifiers, build hook
      ├─ Tests/EditMode/      QuayOps.Tests.EditMode.asmdef          ◄ proposed extra: OK?
      ├─ Input/               QuayOpsControls.inputactions           ◄ proposed extra folder: OK?
      ├─ UI/                  Hud.uxml · Hud.uss · PanelSettings      ◄ proposed extra folder: OK?
      ├─ Prefabs/             Crane/ Containers/ Vessel/ Yard/
      ├─ Scenarios/           *.json (the browser lists top-level *.json only)
      │  └─ Schema/           quayops-scenario.v1.schema.json (for editors; not a scenario)
      ├─ ScriptableObjects/   Crane/ Containers/ Rules/ Visuals/ Audio/
      ├─ Materials/
      ├─ Scenes/
      └─ Audio/
```
`Scripts/UI/` holds C# code. `QuayOps/UI/` holds the UXML/USS assets.

| Assembly | Location | Platforms | References |
|---|---|---|---|
| `QuayOps.Runtime` | `Scripts/` | all | `Unity.InputSystem`, `Unity.RenderPipelines.Universal.Runtime`, `Newtonsoft.Json.dll` (auto-referenced precompiled) |
| `QuayOps.Editor` | `Editor/` | Editor only | `QuayOps.Runtime`, `Unity.InputSystem` |
| `QuayOps.Tests.EditMode` *(proposed)* | `Tests/EditMode/` | Editor only | `QuayOps.Runtime`, `QuayOps.Editor`, `UnityEngine.TestRunner`, `UnityEditor.TestRunner`, `nunit.framework.dll`; define constraint `UNITY_INCLUDE_TESTS` |

- **Namespaces** follow the folders: `QuayOps.Core`, `.Crane`, `.Scenario`, `.Vessel`, `.Yard`, `.UI`, `.Editor`, `.Tests`. Inside `QuayOps.*`, the base class for custom inspectors is written as `UnityEditor.Editor`, because our `QuayOps.Editor` namespace shadows it.
- **Written to disk by me:** `.cs`, `.asmdef`, `.inputactions` (JSON), `.uxml`, `.uss`, `.json`.
- **Created only by Editor scripts run through MCP, never by hand:** `.asset`, `.mat`, `.prefab`, `.unity`, `PanelSettings`. Unity itself creates all `.meta` files.

## 3. Conventions

### 3.1 Units
Everything runs in SI internally. Scenario field names carry the unit as a suffix: `_m` metres, `_cm` centimetres, `_t` tonnes, `_s` seconds, `_kn` knots, `_deg` degrees, `_mps` m/s, `_C` °C.

On the HUD, drive speeds are in m/min (the spec-sheet unit), wind is in kn and m/s, and positions are in m with one decimal.

### 3.2 Quay frame (world)
- **Axes:** Y is up, and **Y = 0 is the quay apron / rail head**. **+X runs along the quay** in the direction of increasing quay marks (metres). **+Z points towards the water.** Unity is left-handed, so someone standing on the quay and looking at the water has +X on their right.
- **Rails:** the waterside rail centreline is at Z = 0 and the landside rail at Z = −30.48 (rail gauge).
- **`fromWatersideRail_m`** is the single signed transverse coordinate used everywhere: trolley, lanes, buffer, laydowns and rows. Positive = waterside (outreach side), negative = landside. The HUD shows it as `WS 32.4 m` / `LS 12.0 m`.

```
 Not to scale. Cross-section looking along +X (towards increasing quay marks); the water is on the left.

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
- The heading follows from `sideAlongside`. **Starboard side alongside:** the bow points +X and the vessel occupies quay marks `[bowAtQuayMark_m − loa_m, bowAtQuayMark_m]`. **Port side alongside:** the bow points −X, over `[bowAtQuayMark_m, bowAtQuayMark_m + loa_m]`.
- The ship's side lies at `Z = quay.watersideRailToFenderLine_m + mooring.offFender_m`, and the centreline at that value + beam/2.
- With starboard side alongside, the odd (starboard) rows are on the quay side and the even (port) rows need the outreach.
- The vessel is static in v1: no list, trim, roll or surge.

### 3.5 Bay / row / tier
- **Bays:** `bays.count` = N forty-foot bays, numbered **02, 06, 10 … 4N−2** from the bow. A 40 ft bay B covers the 20 ft bays B−1 (forward) and B+1 (aft), so the 20 ft bays are 01 … 4N−1. An even bay not ≡ 2 (mod 4), e.g. 04 or 24, is invalid. 20 ft boxes use odd bays; 40 and 45 ft boxes use even bays.
- **Bay position:** bay 02 sits at `firstBayCentreFromBow_m`. Each following 40 ft bay adds `pitch_m`, plus the `length_m` of any `gaps` entry (deckhouse/funnel) after the preceding bay. 20 ft bays sit at the 40 ft bay centre ∓ 3.067 m (6.058/2 + half the 76 mm gap between two 20s).
- **Rows** are counted per bay, separately for hold and deck, and are always 2 digits. *Odd count:* row 00 is on the centreline, 01, 03 … go to starboard and 02, 04 … to port, offset `ceil(n/2) × rowPitch_m`. *Even count:* there is no row 00, offset `(ceil(n/2) − 0.5) × rowPitch_m` (with 6 rows, row 01 is 1.275 m to starboard).
- **Tiers** give stacking order only: hold 02, 04 … (`firstHoldTier`), deck 82, 84 … (`firstDeckTier`). Heights come from stacking the real boxes (2.591 m standard, 2.896 m HC), with a 0.03 m stacking-cone gap between boxes stowed without cell guides (on deck, by default) and none in cell guides (in the hold, by default; see `cellGuides`).
- **Vertical datum:** keel = −(apron above waterline) − draught; tank top (hold tier 02 stands here) = keel + `tankTopAboveKeel_m`; main deck at side = −(apron above waterline) + `deckHeightAboveWaterline_m`; hatch cover underside = main deck + coaming; cover top = underside + thickness = base of deck tier 82. Rows outside the hatch stand on pedestals at the same level.
- **Slot string:** `^\d{2,3}-\d{2}-\d{2}$`, e.g. `22-04-84`.

**Worked example: `deepsea-bay22-mixed.json`.** Starboard side alongside, bow at quay mark 600, apron 5.0 m above waterline; bay 02 is 24.0 m from the bow, pitch 13.4, rows 15 in the hold and 17 on deck, row pitch 2.55.

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

Assets are created by the Editor menu *QuayOps ▸ Create ▸ Default Profiles* (run via MCP) with the defaults below, and can then be tuned in the Inspector.

**Phase 1**

| Asset (folder) | Purpose | Key fields (defaults) |
|---|---|---|
| `CraneProfile` SPP-65 (Crane/) | One crane type | `profileId` "SPP-65"; rail gauge 30.48; outreach 65.0; backreach 20.0; lift height 48.0; `liftBelowRail` 20.0; portal clearance 15.0; clear width between legs 18.3; buffer-to-buffer 27.0; rope sheave (pivot) height 53.5; boom hinge WS +4.0; boom park trolley ≤ −6.0; rated load under spreader 65 t; in-service wind limit 40 kn (≈ 20.6 m/s); refs to the profiles below |
| `DriveProfile` Gantry (Crane/) | Gantry drive | 0.75 m/s (45 m/min); accel/decel 0.3 m/s²; creep 10 %; end zone 3 m @ 20 %; stick response curve (linear) |
| `DriveProfile` Trolley (Crane/) | Trolley drive | 4.0 m/s (240 m/min); accel/decel 0.8 m/s²; end slowdown zone 8 m @ 20 %; creep 10 % |
| `HoistDriveProfile` (Crane/) | Hoist drive | 1.5 m/s rated (90 m/min @ 65 t); 3.0 m/s empty (180 m/min); accel/decel 0.75 m/s²; speed-vs-load curve (constant power, §5.8); creep 10 %; upper pre-limit zone 6.0 m @ 20 %; slack-rope stop decel 1.5 m/s² |
| `BoomDriveProfile` (Crane/) | Boom hoist | working 0°, raised 80°; 150 s each way (≈ 5 min cycle); 5 s soft start/stop; latch 10 s |
| `SpreaderProfile` (Crane/) | Telescopic spreader | mass 11 t; headblock 4 t; heights 1.4 / 1.2 m; telescope 0.2 m/s per end (20↔40 ≈ 15 s, 40↔45 ≈ 4 s); twistlock turn 0.6 s; flippers 2 s; landing-pin ray 0.15 m; flipper capture ±0.25 m; twin-twenty capable (used in a later phase) |
| `SwayProfile` (Crane/) | Pendulum and wind | natural damping `c` 0.02 s⁻¹ (half-life ≈ 70 s); 4 sub-steps; air density 1.225; Cd 1.2; bare spreader area 6 / 2 m² (side/end); max angle clamp 25°; anti-sway mode Drive/Damping; anti-sway gain 0.6 s⁻¹ |
| `ContainerCatalog` (Containers/) | Box data | L × W × H: 20 ft 6.058, 40 ft 12.192, 45 ft 13.716 × 2.438 × 2.591 (HC 2.896); default tare (20 DV 2.3, 40 DV 3.75, 40 HC 3.9, 45 HC 4.8, 20 RF 3.0, 40 RF 4.5, 20 TK 3.6, 20/40 OT 2.3/3.9, 20/40 FR 2.7/4.8 t); max gross 30.48 t; corner casting centres 5.853 / 11.985 / 13.509 × 2.259 m; prefab per type |
| `OperatorPalette` (Containers/) | Line code → colour | MSK light blue, HLC orange, ONE magenta, EMC green, CMA dark blue, COS blue, MSC ochre; unknown → grey (all approximate, editable) |
| `CameraSettings` (Visuals/) | Cameras | cabin FOV 60°, yaw ±150°, pitch +20°…−89°, start −55°; mouse 0.15°/px, stick 120°/s; orbit distance 8–300 m |
| `HudSettings` (Visuals/) | HUD | refresh 10 Hz; sway colours green < 0.10 m, amber < 0.30 m, red ≥ 0.30 m; speed unit m/min |
| `AudioCueSet` (Audio/) | Sound cues | lock click, unlock click, hard-landing alarm, limit alarm, gantry warning bell; a procedural beep is used where no clip is set |
| `RulesDefaults` (Rules/) | Defaults for the scenario `rules` block | hard landing 0.5 m/s; placement 5.0 cm; yaw 1.0°; max sway at placement 10 cm; move targets 90/100/120/240 s; wrong slot "fail"; wind stop 40 kn |

**Phase 2**

| Asset | Purpose | Key fields (defaults) |
|---|---|---|
| `CraneProfileRegistry` | `profileId` → CraneProfile | list; the loader error names the known ids |
| `VesselDefaults` | Structure defaults | tank top 2.0; coaming 1.8; row pitch 2.55; tiers 02 / 82; cell guides hold on, deck off; bay pitch 13.4; covers 3 across, 0.9 m, 30 t; lashing bridges 2 tiers; stacking gap deck 0.03 / hold 0 |
| `VesselVisuals` | Look of the vessel | hull, hatch cover, lashing bridge, cell-guide, pedestal, deckhouse and funnel prefabs + materials |
| `YardVisuals` | Look of the yard | terminal tractor, 20/40 combo chassis, bomb cart, AGV; bed heights (≈ 1.4 m); buffer and laydown markings |
| `WeatherPresets` | Weather | default visibility (clear 20 km, overcast 15 km, rain 3 km, fog 300 m); read now, visuals in Phase 4 |

**Phase 3**

| Asset | Purpose | Key fields |
|---|---|---|
| `ScoringProfile` | Score | penalty per fault severity; time vs target weighting; GMPH weight |
| `FaultCatalog` | Faults | code, severity, message template (hard landing, sway at placement, wrong slot, unlock not landed, collisions, limit hits, blocked zone) |

## 5. Phase 1 architecture

### 5.1 Scripts
Small single-purpose MonoBehaviours; the pure maths lives in plain C# classes *(pc)* so it can be unit-tested. One line each:

| Folder | Script | Job |
|---|---|---|
| Core | `Units` | Unit conversions (kn, m/min, t) and HUD number formatting |
| | `QuayFrame` | Quay mark / `fromWatersideRail_m` ↔ world X/Z; WS/LS formatting |
| | `RampedAxis` *(pc)* | Velocity towards command at accel/decel limits; speed caps, slowdown zones, braking guard `v ≤ √(2·a·d)` so no limit is overrun |
| | `CraneInput` | The only reader of the Input System; exposes axes, buttons, modifiers |
| | `SlotAddress` | Parse/format `BB-RR-TT`, bay parity rules, 40 ↔ 20 ft bay mapping |
| | `ContainerUnit` | On each box: id, size, height, type, gross weight, location, corner-casting points |
| | `Iso6346` | Check digit (generated test ids now, loader later) |
| | `WindField` | Wind vector in the quay frame, steady + gusts (Inspector in Phase 1, scenario in Phase 2) |
| Crane | `CraneSimLoop` | The only crane `FixedUpdate`; calls `Tick(dt)` on each part in a fixed order (§5.3) |
| | `GantryController` | Gantry drive; rail-end hard limits, soft limits, warning bell while travelling |
| | `TrolleyController` | Trolley drive; end slowdown zones; boom-hinge limit |
| | `HoistController` | Hoist drive; load-dependent speed, creep, upper pre-limit/limit, lower limit, slack-rope stop |
| | `BoomController` | Boom raise/lower state machine, interlocks, latch |
| | `SwayModel` *(pc)* | Two-axis variable-length pendulum (§5.4) |
| | `AntiSwayController` | Anti-sway correction on trolley/gantry acceleration, or damping mode |
| | `LoadSuspension` | Places headblock + spreader under the sheaves from rope length and sway angles (`MovePosition`, kept level); landing clamps it |
| | `SpreaderController` | Operator commands → telescope, twistlocks, flippers, with interlocks |
| | `SpreaderTelescope` | 20/40/45 ft extension |
| | `Twistlocks` | Lock/unlock state machine (0.6 s turn) |
| | `Flippers` | Four flippers up/down, capture assist |
| | `CornerLandingSensor` | One per corner: downward landing-pin raycast |
| | `LandingMonitor` | Four sensors → landed / all-landed, first-contact speed, hard-landing event, slack rope |
| | `ContainerGrip` | Attach on lock, release on unlock; reports placement and offset |
| | `RopeRenderer` | Four LineRenderers, sheaves → headblock |
| | `SpreaderLights` | Four corner lamps (red/green) + lock lamp |
| | `CraneAudio` | Plays the AudioCueSet cues |
| | `CabinCamera` / `OrbitDebugCamera` / `CameraSwitcher` | First-person look with limits / free orbit, pan, zoom around the spreader / toggle |
| UI | `HudController` | Binds the UIDocument to crane state (text 10 Hz), sway bar, corner lights |
| Vessel | `VesselLayout` | Serialisable vessel data, same field names as the scenario |
| | `SlotGeometry` *(pc)* | Slot → position (pitch, gaps, rows, tier stacking); reused by the Phase 2 VesselBuilder |
| | `TestStackSpawner` | Phase 1 placeholder hull + deck stack at real slot positions |
| | `AbeamLocator` | "Abeam bay NN / row RR" under the spreader |
| Yard | `TruckLane` | Lane at a `fromWatersideRail_m` position, with driving direction |
| | `ChassisTarget` | 20/40 combo chassis: cones for 40 and 20 front/centre/rear, landing surface, placement offset/yaw |
| Scenario | – | Empty until Phase 2 |
| Editor | `DefaultAssetsCreator` | *QuayOps ▸ Create ▸ Default Profiles* |
| | `CraneRigBuilder` | *QuayOps ▸ Build ▸ STS Crane from Profile*: primitive rig from a CraneProfile, saved as a prefab |
| | `TestSceneBuilder` | *QuayOps ▸ Build ▸ Phase 1 Test Scene* |
| | `Phase1SmokeRun` | *QuayOps ▸ Verify ▸ Phase 1 Smoke Run*: in Play Mode, a virtual gamepad drives a scripted pick and place through the real input path; logs PASS/FAIL per step |
| Tests | EditMode | Slot parsing/parity and 17-row offsets; bay 22 → quay mark 509.0; ramp never exceeds accel and never overruns a limit; pendulum period at 20 m = 8.97 s ± 1 %; ISO 6346 (`CSQU3054383` valid) |

### 5.2 Crane GameObject hierarchy
Each part is a logic GameObject with a child `Visual` that holds the primitive mesh, so meshes can be swapped without touching logic or colliders. The moving parts are sibling kinematic Rigidbodies with interpolation on, which keeps them smooth at 60 fps with 50 Hz physics and avoids nested bodies.
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
The spreader and a carried box also have slightly inflated **trigger** colliders. These detect contact with stacks, covers, cell guides and lashing bridges, which feeds the Phase 3 faults.

### 5.3 Order within one fixed step (0.02 s)
1. Read the cached operator commands from `CraneInput` (sampled in `Update`).
2. Anti-sway correction from the current θ, θ̇ (if on).
3. Gantry, trolley, boom and hoist drives advance (`RampedAxis`), giving the pivot accelerations, L and L̇.
4. `SwayModel` integrates both axes (4 sub-steps).
5. `LoadSuspension` computes the load pose and moves it with `MovePosition`/`MoveRotation`.
6. The corner sensors cast from **that computed pose**, not from the transform, because `MovePosition` only lands in the next physics step.
7. `LandingMonitor` updates landed / hard-landing / slack-rope state. A landing grounds the pendulum.
8. Twistlocks, flippers and telescope advance their state machines, and `ContainerGrip` moves a carried box.

Camera look runs in `LateUpdate` and the HUD in `Update`.

### 5.4 Sway: custom pendulum (not ConfigurableJoints)
The load is modelled as **two planar pendulums**, one for the trolley direction (θ) and one for the gantry direction (φ). The pivot is at the trolley rope sheaves. The effective length L = rope length + headblock + spreader (+ half the box), measured to the load centre of gravity (CoG). Both axes use the same form:
```
θ̈ = ( −g·sin θ − a_p·cos θ − 2·L̇·θ̇ + (F_w / m)·cos θ ) / L − c·θ̇
```
| Term | Meaning |
|---|---|
| `a_p` | Pivot acceleration: the trolley drive for θ, the gantry drive for φ. Hard acceleration builds sway |
| `2·L̇·θ̇` | Hoisting up while swinging increases the angle; lowering reduces it, as you feel on a real crane |
| `F_w / m` | Wind force over the suspended mass (spreader + headblock + box) |
| `c` | Small natural damping from rope and air losses (0.02 s⁻¹), so sway decays slowly |

- **Integration:** semi-implicit Euler with 4 sub-steps (5 ms). This is stable for any L ≥ 3 m.
- **Load attitude:** 4-rope reeving forms a parallelogram, so the spreader **translates without tilting**. It is moved level by L·sin θ.
- **Period:** T = 2π√(L/g), which gives 6.3 s at 10 m, 9.0 s at 20 m, 12.7 s at 40 m and 14.2 s at 50 m.
- **Size of the effect:** full trolley acceleration from rest (0.8 m/s² for 5 s) on 20 m of rope leaves up to ≈ 9° (≈ 3.2 m) of residual sway unless the operator catches it.
- **Lift-off:** when lifting from a landed position, the pendulum starts from the real horizontal offset between sheaves and load (θ₀ = asin(offset/L)). An off-centre lift therefore swings.

**Why custom beats ConfigurableJoints**
- Rope length changes every frame at up to 3 m/s. PhysX joints with moving limits, 50 m lever arms and big mass ratios (a kinematic trolley vs 45 t of load) jitter or gain energy.
- The custom model has the period right by construction, is deterministic and frame-rate independent, and costs a few multiplications. Anti-sway and the HUD read θ and θ̇ exactly, and every term is exposed in `SwayProfile`.
- Drives are speed-controlled (stiff), so sway does not push the trolley back. This matches real drives.
- *Trade-off:* sideways contact is detected, not simulated. A spreader driven into a stack does not bounce off it.

### 5.5 Wind
- **Force:** F = ½·ρ·Cd·A·v² per axis, where A is the box's projected area for the crane-relative wind (bare spreader areas when empty). Gusts rise and fall within `gustInterval_s`.
- **Example (20 kn = 10.3 m/s on the long side of a 40 ft):** the force is ≈ 2.5 kN. At L = 30 m this gives about **0.40 m** of offset for an empty box + spreader + headblock (18.8 t) and **0.17 m** for a 30 t box. A 27 kn gust gives about 0.73 m empty. Empties swing more than full boxes.
- **Converting true wind to the quay frame:** `quay.orientation_deg` is the true bearing of +X, and the water (+Z) lies at orientation − 90°. In the example, orientation 160° puts the water at 070°, so wind from 250° blows from landside straight along the boom.

### 5.6 Anti-sway: two options (question 3)
- **(a) Electronic, drive-based (proposed).** This works like the ABB/Siemens systems. The drive adds `a_AS = k·L·θ̇` (k = 0.6 s⁻¹) to the operator's acceleration command, within the drive's accel limit. The trolley and gantry visibly "chase" the load, and sway dies within about one period.
- **(b) Simple damping.** An extra `−c_AS·θ̇` term on the pendulum. It is simpler, but the load calms with the trolley standing still, which is less realistic.

Both are toggled with T, are **off at start** (your brief) and show on the HUD.

### 5.7 Landing, twistlocks, flippers, pick/place
- **Corner sensors** are landing pins: 0.15 m rays down from each spreader corner. While a box is locked on, they cast from that box's bottom corner castings instead, so "landed" then means the box is seated and the load is off the ropes. This is the same interlock as landing pins plus slack-rope/load cell.
- **Contact** stops the spreader descending (the vertical clamp) and lights that corner green. **ALL LANDED** means all four corners are down, and the pendulum is grounded (sway zeroed).
- **Lock** is allowed only when all four corners have landed on the castings of one box, the spreader length matches the box and the locks are open. It takes 0.6 s and plays a click.
- **Unlock** is allowed only when ALL LANDED is on (box seated). Otherwise it is refused and logged (a Phase 3 fault).
- **Telescope** is blocked while locked or while any corner is landed.
- **Flippers** go up or down in 2 s. When down and within ±0.25 m, they ease the spreader into alignment over the last 0.5 m of lowering. They must be up in cell guides (warning in Phase 2, fault in Phase 3).
- **Hard landing:** a downward speed at first contact (hoist + pendulum) above `hardLanding_mps` (0.5) sounds the alarm, flashes the HUD and logs an event.
- **Slack rope:** after landing, a lowering command ramps to zero at 1.5 m/s² and holds. Hoisting up stays free.
- **Grip:** on lock, the box becomes kinematic and is driven with the spreader each step. It is not parented, so there are no nested bodies. The hoist speed limit switches to the new load.
- **Release:** on unlock, the box stays exactly where it is (no physics settling). It is registered to what is under it (nearest vessel slot, chassis position or quay), and the HUD shows Δ position in cm and yaw in degrees.

### 5.8 Hoist speed and limits
**Speed vs load (question 8):** the hoist runs at constant power between the rated load and an empty spreader, capped at 180 m/min (spreader + headblock = 15 t):

| Load under spreader (t) | 0–25 | 30.48 | 40 | 50 | 65 (rated) |
|---|---|---|---|---|---|
| Max hoist speed (m/min) | 180 | 158 | 131 | 111 | 90 |

- **Creep:** 10 % while held.
- **Upper:** a pre-limit zone of 6.0 m, which is the braking distance from 3.0 m/s at 0.75 m/s², capped at 20 %. The final stop is at lift height +48.0 m.
- **Lower:** −`liftBelowRail` = −20.0 m, which reaches the tank top of deep holds (−16.0 m in the example). In practice, landing stops the hoist first.

### 5.9 Gantry, trolley, boom interlocks
- **Gantry:** 45 m/min at 0.3 m/s², stopping in 0.94 m. Hard limits are at the rail ends minus half the buffer-to-buffer width; soft limits and blocked zones come from the scenario (Phase 2). The warning bell sounds while travelling.
- **Trolley:** 240 m/min at 0.8 m/s², range +65.0 to −50.48. End zones cap speed at 20 % for the last 8 m. Getting from 4.0 to 0.8 m/s takes 9.6 m, so the braking guard starts slowing about 2 m before the zone.
- **Boom** (B/RB held + hoist axis, hold-to-run): moves only with the trolley parked ≤ −6.0 m (landside of the hinge), the spreader at the upper limit and the gantry stopped. It goes 0 → 80° in 150 s with ramped start and stop; the latch engages at 80°, and lowering releases it first. While the boom is not fully down, the trolley is limited to ≤ −6.0 m. Gantry travel with the boom up is allowed.

### 5.10 Cameras
- **Cabin:** a child of the trolley's cabin. FOV 60°, yaw ±150°, pitch +20° down to −89°, so you can look straight down through the floor window. It starts at −55°, facing the water. Look with the mouse or right stick (bindings below).
- **Orbit debug:** targets the spreader. RMB-drag orbits, MMB-drag pans, the wheel zooms (8–300 m).
- **Switching:** `CameraSwitcher` toggles the two views with C or View/Back. The crane stays drivable in both.

### 5.11 Input (`Input/QuayOpsControls.inputactions`, map "Crane"; C# wrapper generated)
| Action | Keyboard / mouse | Gamepad | Note |
|---|---|---|---|
| Trolley | W (waterside) / S (landside) | Left stick Y (up = waterside) | |
| Gantry | A (−X) / D (+X) | D-pad left / right | D = right = +X when facing the water |
| Hoist | ↑ raise / ↓ lower | Right stick Y, **push forward = lower** | Question 4 |
| Creep (hold) | Left Shift | LB | 10 % on hoist, trolley, gantry |
| Lock / unlock (toggle) | Space | A (South) | Interlocked, §5.7 |
| Spreader 20 / 40 / 45 | 1 / 2 / 3 | D-pad up = longer, down = shorter | |
| Flippers (toggle all) | F | Y (North) | |
| Anti-sway toggle | T | X (West), *proposed* | |
| Boom (hold + hoist axis) | B + ↑/↓ | **hold RB + right stick Y** | Question 5; the B button stays free |
| Look | Mouse, hold right button | **hold LT + right stick** | Hoist input is ignored while LT is held |
| Camera toggle | C | View / Back | |

Enabling the wrapper is the importer checkbox *Generate C# Class*. If your MCP bridge cannot set importer options, it is one Inspector click and I will tell you exactly where.

### 5.12 HUD: UI Toolkit
I chose UI Toolkit (UIDocument + UXML + USS): layout and styles live in files you can tweak without code, they scale cleanly with PanelSettings, and `ListView` is ready for the Phase 2 scenario browser and the Phase 3 fault list. uGUI would only come in later if world-space panels are needed. Corner lights are laid out as seen from the cabin facing the water: top = waterside (WL, WR), bottom = landside (LL, LR).
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
In Phase 1 the MOVE line shows the **last lift**: the from-slot is recorded at lock, the to-position at unlock, and the timer runs from lock to unlock. From Phase 2 onward it shows the current work-queue move.

### 5.13 Test scene (`Scenes/Phase1_CraneTest.unity`, built by `TestSceneBuilder`)
| Element | Content |
|---|---|
| Quay | 300 m apron (X 0–300, Z +4.5 to −60), rails at Z 0 / −30.48, water plane at Y −5.0, quay-mark ticks every 10 m, sun + URP volume |
| Crane | SPP-65 at quay mark 169.8 (abeam bay 14), trolley LS 15.0, hoist +30 m, boom down; gantry range 13.5–286.5 m |
| Hull (placeholder box) | LOA 160, beam 25.0, draught 9.0, deck 10.0 m above WL; starboard side alongside, bow at quay mark 230, centreline WS 17.0; bays 02…38, bay 02 at 20.0 m, pitch 13.4 |
| Deck stack: 3 bays × 6 rows × 4 tiers at real slot positions | Bays 10 / 14 / 18 at quay marks 183.2 / 169.8 / 156.4. Rows 05 03 01 02 04 06 at WS 10.63 / 13.18 / 15.73 / 18.28 / 20.83 / 23.38. Tiers 82–88 on hatch-cover slabs, first tier base +7.7 m. Bay 10: 24 × 40' DV. Bay 14: 24 × 40' DV/HC mixed. Bay 18: 20' pairs in 17/19 at tiers 82–84 with 40' on top at 86–88. 84 boxes in total, valid generated ISO ids, seeded weights 2.3–30 t, operator colours |
| Truck lane | L1 at LS 8.5 m (between the legs), one stationary tractor + 20/40 combo chassis at quay mark 169.8 with cone positions for 40 and 20 front/centre/rear |
| Wind | `WindField` at 0 kn (set speed, direction and gusts in the Inspector to try wind) |

### 5.14 How MCP is used
1. I write C#, asmdef, UXML/USS and input assets to disk. MCP then refreshes and **reads the Console**, and I fix every error and warning before moving on.
2. Assets, prefabs and the scene come from the Editor menus above, **executed through MCP**. There is no hand-written YAML.
3. MCP reads back the hierarchy and components to confirm the wiring.
4. MCP enters **Play Mode**, runs *QuayOps ▸ Verify ▸ Phase 1 Smoke Run*, reads the Console for PASS/FAIL and exceptions, and exits Play Mode.
5. EditMode tests run via MCP if your bridge supports it; otherwise I give you the Test Runner clicks.

Anything the bridge cannot do comes to you as an exact click list.

### 5.15 Definition of done: Phase 1
- [ ] The project compiles with **0 errors and 0 warnings** from the QuayOps assemblies, and the EditMode tests are green.
- [ ] Phase1_CraneTest opens. Play Mode holds 60 fps on a mid-range laptop (Stats/Profiler) with a fixed timestep of 0.02.
- [ ] Gantry, trolley and hoist ramp up and down. Limits and slowdown zones hold, creep works and the boom interlocks hold.
- [ ] Sway period matches 2π√(L/g) within 2 %. Sway grows with hard trolley acceleration and decays slowly, and anti-sway on/off behaves as agreed.
- [ ] You can pick a box from the deck stack (4 green → lock → lift), land it on the chassis in L1, unlock it, and it stays. The HUD shows Δ cm and yaw.
- [ ] A hard landing above 0.5 m/s sounds the alarm. Unlock while not landed is refused.
- [ ] Cabin and orbit cameras switch. All HUD fields update.
- [ ] The smoke run reports PASS. README.md (setup, controls, how to test, known issues) and CHANGELOG.md are updated.

## 6. Scenario system preview (built in Phase 2)
The full field reference is in `docs/SCENARIO_FORMAT.md`. The schema is `Assets/QuayOps/Scenarios/Schema/quayops-scenario.v1.schema.json`; put `"$schema": "./Schema/quayops-scenario.v1.schema.json"` in a scenario to get autocomplete. The example is `Assets/QuayOps/Scenarios/deepsea-bay22-mixed.json`.

| Block | Required | Holds |
|---|---|---|
| `schemaVersion` | yes | integer, `1` |
| `scenario` | yes | id, title, description, author, created |
| `quay` | – | length, orientation (true bearing of increasing quay marks), rail-to-fender-line distance, apron above waterline (tide) |
| `vessel` | yes | name, IMO, LOA/beam/draught/deck height; mooring (side alongside, bow quay mark, off fender); structure; bays (count, first bay centre, pitch, rows/tiers hold/deck, overrides, gaps); hatch covers; lashing bridges; reefer positions; decorative fill |
| `bayPlan` | yes (may be empty) | boxes on arrival: slot + status `discharge` / `stay` (ROB) / `restow` + container fields |
| `loadList` | if any load move | export boxes that arrive by truck/AGV |
| `workQueue` | yes, ≥ 1 | ordered moves `discharge` / `load` / `restow` / `hatchcover`; `from`/`to` = exactly one of `vessel`, `lane`, `buffer`, `coverSeat`, `laydown`; twin lift |
| `yardSide` | yes | tractor + chassis or AGV, lanes, quay buffer, hatch-cover laydowns, truck timing |
| `environment` | – | wind + gusts, time of day, weather, visibility, sea state (visual only) |
| `crane` | yes | profile id, crane id, start position, boom / anti-sway / twin-lift flags, soft limits, blocked zones |
| `rules` | – | hard landing, placement and yaw tolerance, max sway at placement, move time targets, wrong slot fail/penalise, wind stop |

**Example contents.** The fictional MV QUAYOPS PIONEER (about 8,500 TEU, LOA 334 m, beam 45.6 m, 17 rows on deck), starboard side alongside. 30 moves in bay 22 (12 discharge, one of them a twin lift, so 13 boxes; 3 restow legs; 2 hatch cover; 13 load): deck discharge including a 45' HC, a reefer and a twin lift; a direct restow on board and a restow via QB01; hatch cover 22-2 to HCL1 and back; hold discharge and hold load, then deck load. ROB boxes stay on the outer panels and pedestal rows, including an open top and a flat rack with over-height. Wind 20 kn from 250° gusting 27 kn, 06:40, overcast.

**File locations**

| Where | Path |
|---|---|
| Editor | `Assets/QuayOps/Scenarios/*.json`, read directly |
| Build | `StreamingAssets/QuayOps/Scenarios/`, copied by a build preprocessor in the Editor asmdef (read-only) |
| Your own scenarios | `<persistentDataPath>/Scenarios/` (Windows: `%USERPROFILE%\AppData\LocalLow\<company>\QuayOps\Scenarios`) |
| Results (Phase 3) | Next to the scenario if that folder is writable (Editor, user folder), else `<persistentDataPath>/Results/` |

**Loader pipeline**
```
read text → Newtonsoft JToken (line:col kept) → strict DTO reader (unknown keys + did-you-mean,
missing required, types, defaults) → semantic checks C–G, I → sequence dry run H → build
(VesselBuilder, YardBuilder, WorkQueue)
```
- The loader collects **every** issue. Errors block loading; warnings are shown.
- Each message = JSON path + context + a plain-English fix.
- An EditMode test keeps the DTO field names and the JSON Schema in sync, and validates the example files.

From group C on, the example messages are real output of a prototype of these checks for the example scenario with one fault put in (see `SCENARIO_FORMAT.md` §14 for one per check).

| Group | Checks | Example messages |
|---|---|---|
| A Structure | JSON syntax, unknown keys, missing required, type, enum, range, pattern | `workQueue[4]: unknown key "form" (line 212:9) — did you mean "from"?` |
| B Version | `schemaVersion` missing or unsupported | `schemaVersion 2: this build reads version 1 only — update QuayOps.` |
| C Identity | ISO 6346 + check digit; duplicate container/move/lane/buffer/laydown/cover ids; unknown crane profile | `bayPlan[0] CMAU5693109 @ 22-00-86: ISO 6346 check digit is wrong — CMAU569310 needs check digit 8, not 9 (→ CMAU5693108)` |
| D Addressing | Slot format, bay exists, even bay is a 40 ft bay no., size ↔ bay parity, row exists for hold/deck width, tier in range, no 45 ft in hold, 20 ft in hold only if allowed | `bayPlan[7] CSNU6340190 @ 22-18-84: row 18 does not exist on deck of bay 22 (17 rows: 16 … 15)` |
| E Stowage | Overlaps, support, 20-on-40 rules, 45 ft vs lashing bridges, hold stack under cover, deck stack under lift height, outreach, nothing on OOG, reefer positions, weights, vessel on the quay | `bayPlan[13] ONEU1159375 @ 22-06-86: nothing stowed at 22-06-84 — the box would float` |
| F Hatch covers | Panel rows exist; each hold row covered by exactly one panel; ids unique; dimensions plausible (warning); weight ≤ SWL | `vessel.hatchCovers.overrides[1].panels[2].rows[0]: panel 22-3: hold row 03 is already covered by panel 22-2` |
| G References | Container exists; status fits the move type; load boxes come from loadList; from/to kinds allowed; ids exist; lane `use`; twin-lift rules; boxes never moved (warning) | `workQueue[4] M005 discharge ONEU1159375: ONEU1159375 has status "stay" (ROB) — it must not be moved; change its status to discharge or restow` |
| H Dry run | Box is where `from` says; nothing on top; hold closed by cover; target free and supported; covers lift only when clear (incl. 20 ft bays B±1) and return to own seat; laydown/buffer capacity | `workQueue[10] M012 hatchcover 22-2: cannot lift hatch cover 22-2: deck boxes still stand on it (bays 21/22/23, rows 04,02,00,01,03): SEGU4155627 @ 22-03-82 — discharge or restow them first` |
| I Crane/yard | Start inside quay and soft limits, not in a blocked zone; lanes between the rails or in the backreach; laydown/buffer in reach; gusts ≥ speed; wind above stop limit (warning) | `crane.startQuayMark_m: start position: quay mark 470.00 is inside blocked zone 425–485 (QC05 working bay 38 — keep gantry separation)` |

**Versioning**
- `schemaVersion` is an integer, and this build accepts `1` only.
- New **optional** fields do not bump it.
- Breaking changes (rename, removal, a changed meaning or a new required field) bump it. The loader then carries an in-memory migration from older versions and warns.
- An older build given a file that uses a newer optional field reports *"unknown key … (written for a newer QuayOps?)"*.

## 7. Risks and known limitations
| Item | Consequence / plan |
|---|---|
| No MCP or Editor in this cloud session | Nothing has been verified in Unity yet. Phase 1 must run on the Editor machine (option A) |
| No 20-ft-only bays in v1 | Every bay is a 40 ft bay with its two odd 20 ft bays. A lone 20 ft bay is modelled as a 40 ft bay that only takes 20s |
| Vessel is static | No list, trim, roll, surge or draught change; tide is fixed per scenario |
| No cover-on-cover in v1 | Hatch covers go to quay laydowns only |
| Sea state is visual only | No vessel motion |
| Twin lift comes in a later phase | The schema and validation support it now; handling comes in Phase 3 |
| No headblock trim/list/skew, no torsional sway | Spreader stays level and square to the quay; boxes are on a static vessel parallel to the quay |
| Two independent planar pendulums | Accurate below about 15°, clamped at 25°; no rope stretch or bounce |
| Contact is detected, not simulated | No bounce off stacks. Cell guides get a capture zone in Phase 2 that clamps sway to the cell clearance, not full contact physics |
| Performance at deep-sea scale | 4,000+ boxes with decorative fill: GPU instancing plus simplified colliders in Phase 2 |
| Audio | No free clip library, so procedural clicks and beeps until Phase 4 |
| MCP bridge features vary | Menu execution, Console, Play Mode and importer settings vary by bridge; gaps become click lists for you |

## 8. Open questions
Each question has a **default**, so "defaults OK" is a complete answer.

**(a) Blocking**
1. How do we proceed: **A** (local Claude Code + Editor + MCP bridge) or **B** (cloud only, with click lists)? *Default: A.*
2. Which Unity 6 LTS version is installed (exact 6000.x.y)? *Default: the newest Unity 6 LTS that Hub offers.*

**(b) Crane feel**

3. Anti-sway: electronic drive-based (trolley/gantry chase the load), or simple extra damping? *Default: electronic, off at start.*
4. Hoist stick convention: push forward = **lower** (like a real master controller), or forward = raise? This applies to the stick only; ↑ always raises. *Default: forward = lower.*
5. Gamepad layout: boom = hold RB + right stick Y, look = hold LT + right stick, B button free. The alternative is hoist on the triggers with the right stick always look. *Default: the first.*
6. Lower hoist limit: 20 m below the rail, to reach hold bottoms (tank top at −16 m on the example vessel). *Default: 20 m.*
7. Placement tolerance 5 cm / 1.0°, hard landing 0.5 m/s, max sway at placement 10 cm. *Default: these values.*
8. Hoist speed vs load: the constant-power curve in §5.8 (a 30 t box hoists at 158 m/min), or your two-step rule (any box 90, empty 180 m/min)? *Default: constant power.*

**(c) Schema and operations**

9. Where does a single 20 ft go on a 20/40 combo chassis: front, centre or rear? And is it the same for bomb carts in your terminal? *Default: rear, settable per scenario.*
10. Where are hatch covers landed? The proposal is laydowns in the backreach, and laydowns between the legs are also allowed (warning if under a leg). Do you also want cover-on-cover on board? *Default: quay laydowns only in v1.*
11. Hatch cover panel ids `"22-1"`, `"22-2"`, `"22-3"` numbered port → starboard? *Default: yes.*
12. The flat-rack in scenario (c): empty/collapsed, or loaded OOG? Over-height needs an over-height frame. *Default: loaded, over-width only, lifted with the normal spreader; over-height frame later.*
13. ISO size-type codes (22G1, 45G1, 45R1, 22T1, 42P1): an optional extra field, or type + height only? *Default: type + height in v1; an optional `isoSizeType` can be added later without a version bump.*
14. Accept `"ROB"` as an alias of `"stay"`? *Default: `stay` only (one spelling); the alias can be added without a version bump.*
15. Is the quay buffer worked only by this STS (no RTG, straddle carrier or reach stacker serving it)? *Default: yes.*
16. SATL/cone handling at the lane: in Phase 3, should the box be held about 1–1.5 m above the chassis while lashers remove or fit cones? *Default: yes in Phase 3, deck boxes only, stop time set in the scenario.*
17. Vessel list/trim plus headblock trim/list/skew in a later phase? *Default: after Phase 4.*

**(d) Project**

18. Are the extra folders (`Tests/EditMode`, `Input/`, `UI/`) and the tests asmdef OK? *Default: yes.*

## What happens after your go-ahead
Phase 1, on your Editor machine. Each step ends with MCP checks: Console clean (0 errors, 0 warnings) plus the step's own check.

1. **Bootstrap:** re-run Step 0 via MCP (versions, packages, Active Input Handling, fixed timestep), install Newtonsoft, create asmdefs and folders. *Check:* Console clean.
2. **Core maths:** `Units`, `QuayFrame`, `RampedAxis`, `SlotAddress`, `SlotGeometry`, `Iso6346`, `WindField`, plus the EditMode tests. *Check:* tests green via MCP.
3. **Profiles:** ScriptableObject classes plus *Create ▸ Default Profiles*. *Check:* assets exist and their values are read back.
4. **Rig and scene:** `CraneRigBuilder` → crane prefab; `TestSceneBuilder` → quay, hull, 3 × 6 × 4 stack, lane and chassis. *Check:* hierarchy dump, Console.
5. **Drives and input:** gantry, trolley, hoist, boom, `CraneSimLoop`, `CraneInput`, `.inputactions`. *Check:* Play Mode smoke run drives every axis into its limits.
6. **Sway, wind and anti-sway,** plus ropes. *Check:* measured period at two rope lengths within 2 %; anti-sway decay logged.
7. **Spreader:** telescope, twistlocks, flippers, sensors, landing monitor, grip, lights and audio. *Check:* the smoke run picks a box and places it on the chassis, with PASS.
8. **Cameras and HUD** (UXML/USS). *Check:* Play Mode, no warnings; screenshot if your bridge can take one.
9. **Wrap-up:** fps check, README.md and CHANGELOG.md. *Check:* full test run and smoke run. Then **I stop for your crane-feel test.**
