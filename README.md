# QuayOps: STS quay crane operator simulator

A ship-to-shore (STS) quay crane simulator for Unity 6 (URP, Input System, C#). You drive the crane from the cabin: rope-hung spreader with real pendulum sway, precise landing, twistlocks, flippers, trucks under the crane. The core feature is the **scenario system**: vessel, bay plan, work queue, yard side and environment are defined in JSON files, and the simulator loads and plays them. There is no campaign and no economy.

## Status

| Step / phase | State |
|---|---|
| Step 0: Editor/MCP check | **Pending.** The first session ran in a cloud container with no Unity Editor and no Unity MCP. Next: re-run it via MCP on the Editor machine (see `docs/STEP1_PROPOSAL.md` §0) |
| Step 1: proposal | **Approved 2026-09-27:** all defaults accepted, option A (local Claude Code + Unity Editor + MCP bridge). See `docs/STEP1_PROPOSAL.md` |
| Phase 1: crane core | Not started |
| Phase 2: scenario system | Not started. Draft format: `docs/SCENARIO_FORMAT.md`; loader checks: `docs/VALIDATION_RULES.md` |
| Phase 3: operations loop and scoring | Not started |
| Phase 4: polish | Not started |

## Repository layout

The repository root **is** the Unity project root (`Assets/`, `Packages/`, `ProjectSettings/` at the top level).

| Path | Content |
|---|---|
| `CLAUDE.md` | Instructions Claude Code loads at start: status, working rules, where the documents are |
| `docs/BRIEF.md` | The original project brief, verbatim (all four phases) |
| `docs/STEP1_PROPOSAL.md` | Step 0 report, folder structure, ScriptableObjects, Phase 1 architecture, answered questions |
| `docs/SCENARIO_FORMAT.md` | Scenario file reference for hand-authoring (draft, finalised in Phase 2) |
| `docs/VALIDATION_RULES.md` | Loader specification for Phase 2: every scenario check (groups A–I), its severity and an example message |
| `Assets/QuayOps/Scenarios/Schema/quayops-scenario.v1.schema.json` | JSON Schema: autocomplete and hover help in VS Code/Rider |
| `Assets/QuayOps/Scenarios/deepsea-bay22-mixed.json` | Complete example scenario (deep-sea vessel, bay 22, mixed discharge/load with a hatch cover move, 20 kn) |

## Setup

Prerequisites (Windows 11 or a recent macOS, about 15 GB free disk):

| Program | Why | Get it |
|---|---|---|
| Git | Checks out this branch, commits the project | git-scm.com (Windows: Git for Windows, which also gives Claude Code its Bash shell) |
| Unity Hub + **Unity 6 LTS** (6000.x) | The Editor; free Unity Personal licence with a Unity account | unity.com/download; install the Editor from the Hub (the Visual Studio Community module is optional) |
| uv | Runs the MCP for Unity server; fetches Python 3.10+ itself if needed | docs.astral.sh/uv |
| Claude Code | Drives the Editor through MCP; needs a paid Claude plan (Pro, Max, Team or Enterprise) | Windows PowerShell: `irm https://claude.ai/install.ps1 \| iex`; macOS: `curl -fsSL https://claude.ai/install.sh \| bash` (the Claude desktop app works too) |
| VS Code (optional) | Hand-writing scenarios with schema autocomplete | code.visualstudio.com |

The MCP for Unity bridge is not a separate download: it is added to the Unity project in step 6.

1. Unity Hub ▸ **New project** ▸ Unity 6 LTS ▸ template **Universal 3D** ▸ choose a new, empty folder ▸ **Create**. Close the Editor once it has opened.
2. In that folder:
   ```
   git init
   git remote add origin https://github.com/ReefyBlue/devolution.git
   git fetch origin
   git checkout -t origin/claude/quayops-sts-crane-0t64lz
   ```
3. Reopen the project from Hub.
4. Package Manager ▸ **+** ▸ *Install package by name…* ▸ `com.unity.nuget.newtonsoft-json`.
5. Project Settings ▸ Player ▸ *Active Input Handling* = **Input System Package (New)**.
6. Package Manager ▸ **+** ▸ *Install package from git URL…* ▸ `https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main` (MCP for Unity). Then *Window ▸ MCP for Unity ▸ Configure All Detected Clients* registers it with Claude Code.
7. Start Claude Code in the project folder with the Editor open and run `/mcp`: the Unity server must show as connected. Then ask it to re-run Step 0 via MCP and implement Phase 1 (see `CLAUDE.md`).

## Controls (proposed for Phase 1; the input map stays editable)

| Action | Keyboard / mouse | Gamepad |
|---|---|---|
| Trolley waterside / landside | W / S | Left stick Y |
| Gantry | A / D | D-pad left / right |
| Hoist raise / lower | ↑ / ↓ | Right stick Y |
| Creep (hold) | Left Shift | LB |
| Twistlocks lock / unlock | Space | A |
| Spreader 20 / 40 / 45 ft | 1 / 2 / 3 | D-pad up / down |
| Flippers | F | Y |
| Anti-sway toggle | T | X (proposed) |
| Boom (hold + hoist axis) | B + ↑/↓ | RB + right stick Y (proposed) |
| Look | Mouse (hold right button) | LT + right stick (proposed) |
| Camera toggle (cabin / orbit) | C | View / Back |

## How to test each phase

Filled in at the end of each phase.

## Known issues

- Step 0 could not be run: no Unity Editor or Unity MCP in the cloud session that produced Step 1. Nothing has been compiled or run in Unity yet.
