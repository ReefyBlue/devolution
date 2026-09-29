# QuayOps: Step 1 addendum, Unreal Engine 5 build

Branch `claude/quayops-sts-crane-0t64lz` · status: **draft, waiting for your decision and the Godot project** · 2026-09-29 (revised: laptop setup, §3.3)

**Proposal:** move QuayOps from the browser (TypeScript + Three.js) to **Unreal Engine 5 with C++**, built and tested by Claude Code on your laptop (Intel i7, RTX 4060, 64 GB RAM, 1 TB). The browser build from Phase 1 is the starting point: its crane logic, numbers, tuning profiles and tests are ported to C++ one to one. The crane design, realism numbers, scenario format v1 and phase gates stay as approved. This addendum replaces the browser-specific parts of `STEP1_WEB_ADDENDUM.md`, as listed in section 2.

**Which project is converted:** you asked for a conversion *from Godot*. The only repository this session can reach, `ReefyBlue/devolution`, holds no Godot project, and nothing in its history mentions Godot. It holds QuayOps, first planned for Unity and then built for the browser. This addendum therefore converts **QuayOps as it stands after Phase 1**. You told me on 2026-09-29 that a Godot project is on your laptop and that you will upload it. Once it is on GitHub, I will add a section on what to take from it, and the port plan and agent plan may change.

---

## 1. Why Unreal, and what it costs

| Point | Browser (approved, Phase 1 built) | Unreal (this addendum) |
|---|---|---|
| Visual quality | Good; Phase 4 polish takes a lot of hand work | Much stronger: Lumen lighting, shadows, sky and fog, water, weather, and the free Fab/Quixel asset library for Phase 4 |
| What you install | Nothing | **Unreal 5 (Epic Games Launcher) and the Claude desktop app.** Claude Code on the laptop installs the rest: Visual Studio 2022 build tools, Git + Git LFS (about 100 GB on disk in total; section 3.3) |
| Who can build and verify | Claude Code anywhere, including cloud sessions | Only Claude Code on your laptop. Cloud sessions can still work on documents and scenario files |
| Crane physics | Custom pendulum and drives | The same custom code in C++. No Chaos physics for the crane |
| Controls | Browser gamepad and pointer lock (can be blocked on the claude.ai link) | Native keyboard, mouse and XInput gamepad; no browser limits |
| Files | Results download as JSON | Results and exported profiles are written straight to disk, next to the scenario file as your brief asked |
| How you run and share it | claude.ai link + one offline HTML file | Run from the editor, or a packaged Windows build (a zip of a few hundred MB) |
| Frame rate check | Only you could measure it | Claude Code measures it on your laptop with Unreal's profiler |

**Trade-offs to accept:**
- **No claude.ai link and no offline HTML file.** Colleagues get a Windows zip instead.
- **Your laptop becomes the only build machine.** It needs to be switched on, with a local Claude Code session running, whenever work is done.
- **The Phase 1 C++ port redoes work** that already runs in the browser. The benefit shows from Phase 2 on (vessel and yard visuals) and above all in Phase 4.
- **Binary assets:** Unreal stores maps, materials and meshes as binary `.uasset` files that Claude cannot read or diff. The design below keeps them to a minimum (section 3.2).

## 2. What stays and what changes

**Stays exactly as approved**
- Scenario format v1: the schema, `SCENARIO_FORMAT.md`, `VALIDATION_RULES.md` and the example scenario. Field names and meaning do not change.
- Conventions (proposal §3): quay frame, quay marks, `fromWatersideRail_m`, bay/row/tier, vertical datum.
- Crane behaviour (proposal §5.3–§5.10, as built in Phase 1): fixed step 0.02 s in the same order, rope-fall pendulum, wind, both anti-sway types, landing pins, twistlocks, flippers and grip, hoist curve and limits, slowdown zones, boom interlocks, cameras, the key and gamepad layout.
- **The JSON tuning profiles in `config/`**, with the same fields, defaults and ranges, and the live tuning panel on F10.
- All answered questions, the realism numbers, the phase gates, README/CHANGELOG per phase, and asking you about port-operations details.

**Changes (these replace the browser-specific parts of the web addendum)**

| Browser (web addendum section) | Unreal |
|---|---|
| TypeScript + Three.js + Vite (§2) | **Unreal Engine 5** (the current release from the Epic launcher, pinned in the project file) and **C++**. No Blueprint logic: C++ files are text, so Claude can write, review and diff every line |
| Web project at the repo root (§3) | An Unreal project in `unreal/`, next to the shared `docs/`, `config/` and `scenarios/` (section 3) |
| Plain TypeScript crane logic | A **pure C++ simulation module** (`QuayOpsSim`) with no actors and no rendering, ported file by file from `src/core`, `src/crane`, `src/vessel`, `src/yard`, `src/sim` and `src/config` |
| Three.js meshes, instanced boxes (§2) | Actors and components that **read** the simulation state each frame. Primitives from Unreal's built-in shapes; containers as instanced static meshes (thousands of boxes stay fast) |
| Keyboard + Gamepad API, `config/controls.json` (§2) | Enhanced Input. The input mapping is **built at start-up from `config/controls.json`**, so bindings stay in JSON. Key names in that file change to Unreal's names (`W`, `SpaceBar`, `Gamepad_LeftY` …); it is the only profile whose contents change |
| HTML/CSS HUD and lil-gui tuning panel (§2) | HUD and F10 tuning panel written in C++ with Slate (Unreal's UI code layer), same layout and fields. *Export* writes the profile straight into `config/` |
| Web Audio (§2) | Unreal audio: short free (CC0) sound clips for clicks and alarms now, recorded motor sounds in Phase 4 |
| Vitest unit tests + Playwright smoke run (§2) | **Unreal Automation tests** (the 67 unit tests ported) and a **functional smoke test** that drives the real input path, picks a box and places it on the chassis. Both run from the command line without clicking in the editor |
| claude.ai link + offline file (§4) | Run in the editor (Play) or a packaged Windows build |
| World axes: Three.js right-handed, "towards the water" = −Z | Unreal is left-handed with Z up and centimetres. The mapping is direct and needs no mirroring: **Unreal X = quay Z (towards the water), Unreal Y = quay X (along the quay), Unreal Z = quay Y (up)**, × 100 for cm. The simulation keeps metres in double precision; only the rendering converts. Scenario files are unaffected |

## 3. Project layout and way of working

### 3.1 Layout

```
<repo root>
├─ README.md · CHANGELOG.md · CLAUDE.md
├─ docs/        BRIEF · STEP1_PROPOSAL · STEP1_WEB_ADDENDUM · STEP1_UNREAL_ADDENDUM · SCENARIO_FORMAT · VALIDATION_RULES
├─ config/      the JSON tuning profiles (shared, unchanged except controls.json key names)
├─ scenarios/   *.json · Schema/                                    (shared, unchanged)
├─ unreal/
│  ├─ QuayOps.uproject
│  ├─ Config/   DefaultEngine.ini · DefaultGame.ini · DefaultInput.ini (text files)
│  ├─ Source/
│  │  ├─ QuayOpsSim/   pure C++, no actors: core (quay frame, units, fixed step, ramped axis, slot
│  │  │                address, ISO 6346, wind) · crane · vessel · yard · scenario (Phase 2) ·
│  │  │                config (JSON profiles + range checks) · Tests/ (automation tests)
│  │  └─ QuayOps/      game module: crane rig, vessel, yard and container actors · cameras ·
│  │                   input · HUD · tuning panel · audio · Tests/ (functional smoke test)
│  ├─ Content/  only what Unreal needs as binary assets: one empty map, one base material,
│  │            sound clips; Phase 4 models
│  └─ Scripts/  editor Python that creates those few assets, plus build/test/package scripts
└─ (browser build: src/ · tests/ · package.json … kept as the reference until the Unreal
   Phase 1 passes your test, then removed; the tag browser-phase1 keeps it)
```

The rule from `CLAUDE.md` stays: **crane logic never touches Unreal actors or meshes.** `QuayOpsSim` depends only on Unreal's Core and Json modules, so meshes stay swappable and the logic stays testable without a level.

### 3.2 Code first, editor optional
- **Everything is built from code at start-up**, as in the browser build: crane rig from its profile, quay, vessel, deck stack, lanes. The map file is empty apart from a game mode.
- **The few binary assets** (the empty map, the base material, imported sound clips) are **created by editor Python scripts** in `unreal/Scripts/`, run from the command line. They can be rebuilt at any time and are never edited by hand.
- **Git:** `.gitignore` for `Binaries/`, `Intermediate/`, `Saved/`, `DerivedDataCache/`; Git LFS for `*.uasset` and `*.umap`.
- **Verification without clicking:** Claude Code builds with Unreal's command-line build tool, runs the automation and smoke tests with the editor's command-line mode, takes screenshots, and reads the logs. The editor stays free for you.
- **Editor MCP plugin: optional.** A community Unreal MCP plugin would let Claude Code look at and change the open editor directly. The code-first plan does not need it; it can be added later, for example for Phase 4 set dressing.

### 3.3 Laptop setup: what you do, what Claude Code does

A session running in the cloud cannot reach your laptop, so the setup is done by **a Claude Code session running on the laptop itself**. You only do the steps that need your account, your password or a click on a Windows security prompt.

**You (about 30 minutes, mostly download time)**
1. Install the **Epic Games Launcher**, sign in, and install the current **Unreal Engine 5** release (Library ▸ Engine Versions ▸ +). In its options you can untick Android, iOS and Linux support to save space.
2. Install the **Claude desktop app** and sign in with the same account you use here. If it asks for Git for Windows, install that too (git-scm.com, default options).
3. Create an empty folder, e.g. `C:\QuayOps`. In the desktop app, start a **local** Claude Code session in that folder (on this computer, not in the cloud) and paste: *"Set up this laptop for QuayOps on Unreal as in section 3.3 of docs/STEP1_UNREAL_ADDENDUM.md in ReefyBlue/devolution, branch claude/quayops-sts-crane-0t64lz."*
4. Click **Yes** on the Windows security prompts (administrator rights) when the installers ask.

**Claude Code on the laptop**
1. Installs what is missing with `winget`: Git, Git LFS and the Visual Studio 2022 Build Tools with the C++ workload that Unreal's documentation lists for the installed engine version (MSVC, Windows SDK, .NET).
2. Clones this repository and branch into that folder and switches Git LFS on.
3. Finds the Unreal installation, and checks the RTX 4060 driver and that Unreal will use the RTX 4060 rather than the built-in Intel graphics.
4. Runs **Step 0** (section 4): builds and starts an empty C++ project from the command line, and writes the report.
5. Stops and reports. The port itself starts only after you have approved this addendum.

To follow along from your phone or another computer, that local session can also be opened in the Claude app while it runs on the laptop (Remote Control).

### 3.4 Checks for every phase (replace the browser checks)

| Browser | Unreal |
|---|---|
| 0 type errors, 0 lint warnings | 0 errors and **0 warnings** from the QuayOps modules (warnings treated as errors), code formatted with clang-format |
| Vitest green | Automation tests green (`unreal/Scripts/test`) |
| Playwright smoke run PASS | Functional smoke test PASS (`unreal/Scripts/smoke`) |
| Screenshots in headless Chromium | Screenshots from fixed viewpoints on your laptop, which I look at and show you |
| 60 fps confirmed by you | **Frame times measured by Claude Code** with Unreal's CSV profiler at the target settings; you still judge how it feels |

**60 fps target:** your RTX 4060 laptop is stronger than the "mid-range laptop" in the brief. I measure at *High* scalability on your laptop and also at *Medium* as a stand-in for a weaker machine. Lighting settings (Lumen, shadows) live in the project's config files, not in code.

## 4. Port plan: Phase 1 on Unreal

This re-platforms Phase 1; it does **not** start Phase 2. Each step ends with its own check, and I stop after step 8 for your crane-feel test.

0. **Step 0 on your laptop** (after the setup in section 3.3): report the Unreal version, Visual Studio/MSVC and Windows SDK, Git LFS, Claude Code and GPU driver; build and run an empty C++ project from the command line. *Check:* a written report, as in proposal §0.
1. **Scaffold:** `unreal/` project, the two modules, config files, `.gitignore`/`.gitattributes`, the Python asset scripts, build/test/package scripts. *Check:* builds with 0 warnings; the empty map runs; one automation test passes from the command line.
2. **Simulation core in C++:** core maths, JSON profiles with range checks, drives, sway, wind, anti-sway, spreader, landing, grip, test moves. *Check:* the 67 unit tests pass with the same numbers (bay 22 at quay mark 509.0; sway period 9.17 s at +30 m). In addition, **golden traces**: the browser simulation records every state value for scripted input sequences (drives into limits, a hard stop, a full pick and place), and the C++ simulation must replay them within a tight tolerance. That proves the port behaves exactly like the build you tested.
3. **Scene:** quay, rails, water; the SPP-65 crane from its profile; feeder, hatch covers and the 84-box deck stack; lane L1 with tractor and chassis; lighting and sky. *Check:* screenshots from the same viewpoints as the browser build, side by side.
4. **Input and cameras:** Enhanced Input from `config/controls.json`, gamepad, cabin view (look down through the floor window) and orbit camera. *Check:* a scripted run drives every axis into its limits without overrun.
5. **HUD, tuning panel, audio.** *Check:* screenshots; every field updates; *Export* writes a valid profile.
6. **Smoke test:** drives into every limit, sway periods at +30 m and +12 m within 2 %, anti-sway decay, pick 14-02-88 and place it on L1 centre through the real input path. *Check:* PASS.
7. **Performance:** frame-time capture of the test scene at High and Medium. *Check:* 60 fps held.
8. **Wrap-up:** README (setup, controls, how to test, known issues), CHANGELOG entry, packaged Windows build. Then **I stop for your test**.

**Definition of done:** the approved Phase 1 checklist (proposal §5.15), with the checks from section 3.4.

**Your Phase 1 browser test still matters.** A short test of the crane feel (drives, sway, landing) on the existing link tells us what to fix, and every fix goes straight into the C++ port. Nothing is fixed twice.

## 5. How many AI agents are needed

**One Claude Code session on your laptop is enough to build everything.** It can start helper agents (subagents) by itself for work that can run in parallel; you do not install or manage them. More agents do not make every step faster: your laptop runs one Unreal build and one editor at a time, and each extra agent uses more of your Claude plan's usage.

**Roles**

| Agent | Job | When |
|---|---|---|
| **Lead** (your Claude Code session) | Plans, owns the build and the editor, integrates, runs every check, reports to you | Always, 1 |
| **Porter / builder** | Writes a self-contained block of C++ from a precise spec (e.g. "port `src/crane/swayModel.ts` and its tests"), in its own git worktree | Steps with independent modules |
| **Test writer** | Ports and writes automation tests, golden traces and the smoke test, separately from the code under test | Every phase |
| **Reviewer** | Independent code review with fresh eyes before each owner test (as the pre-test review in Phase 1 did) | End of every phase |
| **Cloud session** (optional) | Documents, scenario files and specs that do not need Unreal, e.g. from your phone | When useful |

**Per phase**

| Phase | Agents working at the same time | Why |
|---|---|---|
| Phase 1 port | **1 lead + up to 3** (2 porters, 1 test writer), then 1 reviewer | The simulation module splits cleanly: core + vessel + yard, crane, tests |
| Phase 2 scenario system | **1 lead + up to 3** (loader with its 225 checks, vessel/yard builders, tests), then 1 reviewer | The loader and the builders are independent until they meet in the work queue |
| Phase 3 operations and scoring | **1 lead + 1–2**, then 1 reviewer | Faults, scoring and truck timing all touch the same simulation loop; mostly sequential |
| Phase 4 polish | **1 lead + 1**, then 1 reviewer | Visuals need your eye more than extra agents |

**Recommendation:** 1 lead always; at most 4 agents at the same time; typically 1–2. Parallel agents only write code and tests; the lead runs every build and every check, so nothing unverified reaches you.

## 6. Open questions (defaults apply unless you say otherwise)

1. **Source project:** QuayOps as it stands after Phase 1 (no Godot project found). *Default: yes.*
2. **Repository:** the Unreal project goes into `unreal/` in this repository, on this branch. The browser build stays as the reference until the Unreal Phase 1 passes your test, then it is removed and kept under the tag `browser-phase1`. *Default: yes.*
3. **Unreal version:** the current Unreal Engine 5 release from the Epic launcher, pinned in `QuayOps.uproject`; no engine source build. *Default: yes.*
4. **Editor MCP plugin:** not needed for Phase 1 (code first, command-line checks). *Default: not installed now; considered again for Phase 4.*
5. **Phase 1 browser test:** a short crane-feel test on the existing link before the port starts. *Default: yes, findings go into the C++ port.*
6. **Delivery:** play in the editor, plus a packaged Windows build after every phase. *Default: both.*
7. **Git LFS** for the few binary assets, on GitHub's free LFS quota. That is enough for Phases 1–3; Phase 4 models may need more. *Default: yes.*
8. **AI agents:** as in section 5. *Default: 1 lead, at most 4 at the same time.*

## What happens after your OK
1. In this cloud session: I update `CLAUDE.md` (Unreal commands, checks and working rules) and the README, and write the golden-trace recorder for the browser simulation. It runs in Node, so it can be done here.
2. On your laptop: you install Unreal and the Claude desktop app; a local Claude Code session does the rest of the setup and Step 0 (section 3.3).
3. I port Phase 1 following section 4, stop after step 8, and hand you the build for your test.
