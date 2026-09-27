# QuayOps scenario format, v1

> **Draft for review (Step 1), finalised in Phase 2.** Field names are final for v1. Defaults and message wording may still change after your review.

A scenario is one JSON file: the vessel alongside with its bay plan on arrival, the export boxes, the work queue of crane moves in order, the yard side under the crane, the environment, the crane's start state and the rules. This page lists every field. Every check the loader runs, with its message, is in [`VALIDATION_RULES.md`](VALIDATION_RULES.md).

- **Example:** [`deepsea-bay22-mixed.json`](../Assets/QuayOps/Scenarios/deepsea-bay22-mixed.json), scenario (b): bay 22 of a deep-sea vessel, 30 moves.
- **Schema:** [`quayops-scenario.v1.schema.json`](../Assets/QuayOps/Scenarios/Schema/quayops-scenario.v1.schema.json). Put `"$schema": "./Schema/quayops-scenario.v1.schema.json"` at the top of a file: VS Code and Rider then complete field names, show each field's meaning, unit and default on hover, and underline structural mistakes as you type. The simulator ignores `$schema`.

| What | Where |
|---|---|
| Bundled scenarios | Editor: `Assets/QuayOps/Scenarios/*.json` (top level). A build copies each of these files to `StreamingAssets/QuayOps/Scenarios/` (read-only) and the schema to `StreamingAssets/QuayOps/Scenarios/Schema/`. |
| Your own scenarios | `<persistentDataPath>/Scenarios/` (Windows: `%USERPROFILE%\AppData\LocalLow\<company>\QuayOps\Scenarios\`), listed next to the bundled ones. |
| Schema | `Assets/QuayOps/Scenarios/Schema/`. On first run the game also writes it to `<persistentDataPath>/Scenarios/Schema/`, copied from `StreamingAssets/QuayOps/Scenarios/Schema/` in a build and from `Assets/QuayOps/Scenarios/Schema/` in the Editor, so the `$schema` line works in copied files too. |
| Results (Phase 3) | `<scenarioId>.result-<yyyyMMdd-HHmm>.json`. Editor, bundled scenario: `Assets/QuayOps/Scenarios/Results~/` (the `~` keeps Unity from importing it). Your scenario: `<persistentDataPath>/Scenarios/Results/`. Build, bundled scenario: `<persistentDataPath>/Results/`. The scenario browser lists top-level `*.json` files only, so schema and result folders never show up as scenarios. |

**Plain JSON.** UTF-8. Comments, trailing commas and duplicate keys are errors. JSON numbers cannot have leading zeros: write `"bay": 2`, not `02`. Where two digits matter the value is a string: `"slot": "02-00-82"`. **Lists** of rows, tiers and bays accept both forms: rows `"04"` or `4`, tiers `82` or `"82"`, bays `22`, `"22"` or `"022"`. This page writes rows as strings and tiers and bays as integers. An integer written as `20.0` is accepted.

**Defaults.** Write only what differs from the defaults; an explicit value pins it. The defaults in the tables below are fixed constants of format v1 and change only with a new `schemaVersion`, so a file means the same on every machine. The one exception is `rules`: an omitted rules field comes from the RulesDefaults asset, which you tune in the Inspector.

**Snippets.** Each JSON snippet is labelled. *Excerpt*: copied from the example file and identical to it, though keys and list items may be left out. *Illustrative*: not from the example, but schema-valid. A check script verifies both.

**Contents:** [1 Conventions](#1-conventions) · [2 Minimal file](#2-minimal-file) · [3 Top level](#3-top-level) · [4 scenario](#4-scenario) · [5 quay](#5-quay) · [6 vessel](#6-vessel) · [7 bayPlan](#7-bayplan) · [8 loadList](#8-loadlist) · [9 workQueue](#9-workqueue) · [10 yardSide](#10-yardside) · [11 environment](#11-environment) · [12 crane](#12-crane) · [13 rules](#13-rules) · [14 How problems are reported](#14-how-problems-are-reported) · [15 Versioning](#15-versioning)

## 1. Conventions
**Units.** Field names carry the unit: `_m` metre, `_cm` centimetre, `_t` tonne, `_s` second, `_kn` knot, `_deg` degree, `_mps` metre per second, `_C` degree Celsius. A field without a suffix is a count, a bay/row/tier number, an id, a flag or an enum. The one exception is container `size`, in feet (20/40/45).

### 1.1 Quay frame, quay marks, `fromWatersideRail_m`
- **Quay marks** are metres along the quay, from 0 to `quay.length_m`. Every position along the quay is written as a **real** quay mark: vessel bow, crane start, soft limits, blocked zones, buffer and laydowns. The HUD shows real marks.
- **World axes.** Y up, **Y = 0 at the quay apron / rail head**. +Z towards the water. +X to the right of someone standing on the quay and facing the water.
- **`fromWatersideRail_m`** is the one transverse coordinate (trolley, rows, lanes, buffer, laydowns): the signed distance from the waterside rail centreline, **+ waterside** (outreach), **− landside**. The landside rail is at −30.48 (rail gauge), the backreach beyond it. The HUD shows `WS 32.4 m` / `LS 12.0 m`.
- **Crane positions.** Gantry = quay mark of the crane centreline (midway between the waterside legs); trolley = `fromWatersideRail_m` of the rope sheaves; hoist height = spreader underside (twistlock plane) above the quay apron, negative below quay level (in the hold). Landing on a standard box at tier 82 of the example vessel reads **+11.9 m**.

> **Which way do the marks run? `quay.marksIncreaseTo`.** Stand on the quay facing the water. `"right"` (default): the marks increase to your right, and world X = quay mark. `"left"`: they increase to your left, and world X = `quay.length_m` − quay mark. `quay.orientation_deg` is always the true bearing of increasing marks: world +X points to that bearing (`"right"`) or to it + 180° (`"left"`), and the water side lies at the world +X bearing − 90°.

### 1.2 Vessel orientation and position
- **Heading, in world terms:** starboard side alongside ⇒ the **bow points to world +X** (your right as you face the water); port side alongside ⇒ world −X. In quay marks: the bow points towards increasing marks for starboard + `"right"` and for port + `"left"`; towards decreasing marks for the other two.
- **Extent:** bow towards increasing marks ⇒ quay marks `[bowAtQuayMark_m − loa_m, bowAtQuayMark_m]`, otherwise `[bowAtQuayMark_m, bowAtQuayMark_m + loa_m]`, within 0 … `quay.length_m`.
- The ship's side is at `fromWatersideRail_m` = `watersideRailToFenderLine_m` + `offFender_m`, the centreline at that + `beam_m`/2. Starboard side alongside puts the odd (starboard) rows on the quay side; the even (port) rows need the outreach.
- The vessel is static in v1: no list, trim, roll or tide change.

### 1.3 Bays
- **Numbering walk.** `bays.count` = N forty-foot bays. The layout walks from the bow over the odd numbers 01, 03, 05 …: a number listed in `bays.twentyOnlyBays` is a **lone 20 ft bay** (`pitch_m`/2 long) and the walk goes on at the next odd number; otherwise b and b+2 form the **40 ft bay b+1** (`pitch_m` long) and the walk goes on at b+4. It stops after N 40 ft bays; a lone bay aft of the last 40 ft bay must be the next odd number.

| `twentyOnlyBays` | Bay positions from the bow | 20 ft bays |
|---|---|---|
| none (default) | 02, 06, 10 … 4N−2 | 01 + 03, 05 + 07 … |
| `[1]` | 01 (lone), 04, 08, 12 … | 01; 03 + 05, 07 + 09 … |

- 20 ft boxes use odd bays; 40 and 45 ft boxes use the even 40 ft bay: `22-00-84` takes the space of `21-00-84` + `23-00-84`. An even number the walk does not generate (e.g. 24 on the example vessel) is not a bay; the loader names the nearest ones.
- **Bay references.** Fields that name a bay (`bays.overrides[].bay`, `gaps[].afterBay`, `hatchCovers.baysWithout`, `hatchCovers.overrides[].bay`, `lashingBridges.afterBays`, `reeferPositions[].bays`, `crane.startAtBay`) take a **bay position**: a 40 ft bay (its two 20 ft halves included) or a lone 20 ft bay. `startAtBay` also accepts a 20 ft half.
- **Position.** The first bay position is centred `firstBayCentreFromBow_m` aft of the bow. Each next centre = previous centre + (previous length + next length)/2, plus the `length_m` of a `gaps` entry after the previous position; 40 ft bays are therefore `pitch_m` apart. The halves of 40 ft bay B are centred 3.067 m forward (B−1) and aft (B+1) of B.
- **Example:** bay 22 is the 6th bay, 24.0 + 5 × 13.4 = 91.0 m aft of the bow, so quay mark 600 − 91.0 = **509.0**. Bay 21 is at quay mark 512.07, bay 23 at 505.93.

### 1.4 Rows
Rows are counted per bay, separately for the hold (`rowsInHold`) and the deck (`rowsOnDeck`), and are always written with 2 digits. r = row number.

| Row count | Centreline | Starboard | Port | Offset of row r from the centreline |
|---|---|---|---|---|
| odd | `00` | `01`, `03` … | `02`, `04` … | ceil(r/2) × `rowPitch_m` |
| even | no row `00` | `01`, `03` … | `02`, `04` … | (ceil(r/2) − 0.5) × `rowPitch_m` (6 rows: row 01 is 1.275 m to starboard) |

Deck rows beyond the hold width stand on **pedestals** outboard of the coaming, at hatch cover top level (rows 16 and 15 on the example vessel: 17 deck rows over 15 hold rows). Every other deck row stands on the panel covering the hold row with the same number, so keep the hold and deck row counts of the same parity (warning otherwise). Example, 17 deck rows at 2.55 m, centreline at WS 27.30: row 16 at WS 47.70, row 02 at 29.85, row 01 at 24.75, row 15 at 6.90.

### 1.5 Tiers and vertical positions
- **Tiers** are even: hold `firstHoldTier` (02), 04 … (`tiersInHold` of them); deck `firstDeckTier` (82), 84 … (`tiersOnDeck`). Tier numbers have two digits: the highest tier of every bay, overrides included, must be ≤ 98, and the hold range must end below `firstDeckTier`. A ship with many deck tiers uses `firstDeckTier` 80 or 72.
- **A tier number gives the order only.** Heights come from the boxes actually stacked: 2.591 m standard, 2.896 m high cube, plus a **0.03 m stacking-cone gap between two boxes wherever there are no cell guides** (on deck, by default). Inside cell guides there is no gap (in the hold, by default; see `structure.cellGuides`).
- **No holes:** a box at tier t stands on tier t−2. The first tier stands on the tank top, a hatch cover or a pedestal.
- **Open-hatch bays** (`hatchCovers.baysWithout`): over the hold rows the stack runs on from hold to deck inside cell guides. The first deck tier of a hold row stands on the top hold tier of that row (tier `firstHoldTier` + 2 × (`tiersInHold` − 1), 18 on the example vessel; it must be occupied); heights stack on continuously with no stacking-cone gap, and there is no cover-underside limit. Deck rows beyond the hold width stand on pedestals as usual.
- **Raised hold floor:** `bays.overrides[].holdRowBaseTier` gives the lowest hold tier of single rows (tank top or hopper in the fore and aft holds). That tier stands (base tier − `firstHoldTier`)/2 × 2.591 m above the tank top; lower tiers do not exist in that row.

| Level (Y above the quay apron) | Formula | Example vessel |
|---|---|---|
| Keel | −`apronAboveWaterline_m` − `draught_m` | −18.00 |
| Tank top = base of the first hold tier | keel + `tankTopAboveKeel_m` | −16.00 |
| Main deck at side | −`apronAboveWaterline_m` + `deckHeightAboveWaterline_m` | +6.60 |
| Hatch cover underside (hold stacks stay below it, except in open-hatch bays) | main deck + `hatchCoamingHeight_m` | +8.40 |
| Cover top = base of the first deck tier and of pedestal rows | underside + cover `thickness_m` | +9.30 |

### 1.6 Hatch covers and panel ids
- Every bay with hold rows has pontoon hatch covers unless it is listed in `hatchCovers.baysWithout` (open hatch, [§1.5](#15-tiers-and-vertical-positions)). A panel runs the full length of its bay, over both 20 ft bays.
- **Generated panels:** min(`panelsAcross`, max(1, floor(hold rows / 3))) per bay, so a narrow bay gets fewer (with the default 3: 7 hold rows → 2 panels, 5 → 1). Ids **`"<bay>-<n>"`** with n = 1 … from **port to starboard**: bay 22 has `"22-1"` (port), `"22-2"` (centre), `"22-3"` (starboard). *Open question 18 in STEP1_PROPOSAL.*
- **Rows per panel, symmetric split** with that panel count: the hold rows, port → starboard, are cut into contiguous groups. base = floor(rows / panels), remainder r. Odd panel count: the centre panel gets base + r. Even panel count: the remainder goes one row each to the two centre panels, pair by pair; a single row left over (odd row count, row 00) goes to the port-side centre panel.

| Hold rows / `panelsAcross` | Rows per panel, port → starboard |
|---|---|
| 15 / 3 | 5 / 5 / 5; bay 22: `22-1` 14 12 10 08 06 · `22-2` 04 02 00 01 03 · `22-3` 05 07 09 11 13 |
| 17 / 3 · 16 / 3 · 13 / 3 | 5 / 7 / 5 · 5 / 6 / 5 · 4 / 5 / 4 |
| 13 / 2 · 7 / 3 · 5 / 3 | 7 / 6 · 4 / 3 (2 panels) · 5 (1 panel) |
| 14 / 4 · 15 / 4 | 3 / 4 / 4 / 3 · 3 / 5 / 4 / 3 |

- **Generated size:** length = bay length − 0.4 m (`pitch_m` − 0.4; a lone bay `pitch_m`/2 − 0.4), width = rows × `rowPitch_m`; thickness and weight from `hatchCovers`. On the example vessel: 13.0 × 12.75 × 0.9 m, 30 t. Every generated panel weighs `weight_t`, however narrow; give narrow bays realistic weights with `hatchCovers.overrides`.
- A panel id is used as a move's `hatchCoverId` and in `{ "coverSeat": … }`. Hold slots under a panel can be worked only while that panel is off its seat.

### 1.7 Identifiers
| What | Format | Checked |
|---|---|---|
| Container number | ISO 6346, no spaces: `^[A-Z]{3}[UJZ]\d{7}$`: owner code, category (U freight container, J detachable equipment, Z trailer/chassis), 6-digit serial, check digit | Pattern; check digit (the loader prints the right one) |
| IMO number | 7 digits as a string | (d1×7 + d2×6 + d3×5 + d4×4 + d5×3 + d6×2) mod 10 = d7, e.g. `"9999993"` |
| UN/LOCODE (`pod`) | `^[A-Z]{2}[A-Z2-9]{3}$`, e.g. `NLRTM` | Pattern |
| Line operator | `^[A-Z0-9]{2,4}$`, e.g. `MSK`; the colour comes from the OperatorPalette | Pattern |
| Other ids (moves, lanes, laydowns, panels, crane) | Letters, digits, `-`, `_`, `.`; starts with a letter or digit; ≤ 32 characters | Unique within their kind |

**ISO 6346 check digit.** Letter values: A 10, B 12, C 13, D 14, E 15, F 16, G 17, H 18, I 19, J 20, K 21, L 23, M 24, N 25, O 26, P 27, Q 28, R 29, S 30, T 31, U 32, V 34, W 35, X 36, Y 37, Z 38 (multiples of 11 skipped); a digit counts as itself. Multiply character i (i = 0 … 9 from the left) by 2^i and add up; the check digit is the sum mod 11, then mod 10. `CSQU305438` sums to 6185, 6185 mod 11 = 3, so **`CSQU3054383`**.

## 2. Minimal file
The smallest useful scenario: one 40 ft high cube discharged from deck onto a truck. Everything omitted takes its default.

*Illustrative* (a complete scenario; it passes every check):
```json
{
  "$schema": "./Schema/quayops-scenario.v1.schema.json",
  "schemaVersion": 1,
  "scenario": { "id": "minimal-one-move", "title": "Minimal: one discharge" },
  "vessel": {
    "name": "MV MINIMAL", "loa_m": 140.0, "beam_m": 25.0, "draught_m": 7.5, "deckHeightAboveWaterline_m": 6.0,
    "mooring": { "sideAlongside": "starboard", "bowAtQuayMark_m": 400.0 },
    "bays": { "count": 8, "firstBayCentreFromBow_m": 20.0, "rowsInHold": 7, "rowsOnDeck": 9, "tiersInHold": 5, "tiersOnDeck": 4 }
  },
  "bayPlan": [ { "slot": "06-00-82", "status": "discharge", "containerId": "MSKU1234565",
                 "size": 40, "height": "HC", "type": "HC", "grossWeight_t": 22.5, "operator": "MSK" } ],
  "workQueue": [ { "type": "discharge", "containerId": "MSKU1234565", "from": { "vessel": "06-00-82" }, "to": { "lane": "L1" } } ],
  "yardSide": { "transport": "terminalTractor", "chassisType": "combo2040", "lanes": [ { "id": "L1", "fromWatersideRail_m": -8.5 } ] },
  "crane": { "profile": "SPP-65", "startAtBay": 6 }
}
```

Save it as `minimal-one-move.json` (the file name equals `scenario.id`). The loader reports `crane starts abeam bay 06 (quay mark 366.60)`: bay 06 is 20.0 + 13.4 = 33.4 m aft of the bow at quay mark 400.

## 3. Top level
In the tables, **Default** reads: **req** = required; a value = optional with that default; *opt* = optional without a default (the Meaning column says what happens if it is omitted).

| Field | Type | Default | Meaning |
|---|---|---|---|
| `$schema` | string | *opt* | Editor hint: path or URL of the schema. Ignored by the simulator. |
| `schemaVersion` | integer `1` | **req** | Format version; this build reads 1 only ([§15](#15-versioning)). |
| `scenario` | object | **req** | Identity and briefing ([§4](#4-scenario)). |
| `quay` | object | *opt* | Berth geometry ([§5](#5-quay)); all defaults if omitted. |
| `vessel` | object | **req** | Vessel, structure, bays, covers ([§6](#6-vessel)). |
| `bayPlan` | array | **req**, may be `[]` | Boxes on board on arrival ([§7](#7-bayplan)). |
| `loadList` | array | required, ≥ 1 box, if any move is a `load` | Export boxes that arrive by truck/AGV ([§8](#8-loadlist)). |
| `workQueue` | array, ≥ 1 | **req** | Crane moves in working order ([§9](#9-workqueue)). |
| `yardSide` | object | **req** | Transport, lanes, buffer, laydowns, truck timing ([§10](#10-yardside)). |
| `environment` | object | *opt* | Wind, time, weather, sea state ([§11](#11-environment)); all defaults if omitted. |
| `crane` | object | **req** | Crane profile and start state ([§12](#12-crane)). |
| `rules` | object | *opt* | Tolerances, targets, penalties ([§13](#13-rules)); RulesDefaults if omitted. |

Every object is strict: an unknown key is an error, with a did-you-mean suggestion.

## 4. `scenario`
| Field | Type | Default | Meaning |
|---|---|---|---|
| `id` | string `^[a-z0-9][a-z0-9-]{2,63}$` | **req** | Lower-case letters, digits and hyphens, 3–64 characters. It is the scenario browser key and the stem of the results file name, so keep it equal to the file name without `.json` (the loader warns if it differs; the browser flags two files with the same id). |
| `title` | string | **req** | Title in the scenario browser. |
| `description`, `author` | string | *opt* | Briefing in the scenario browser; author (free text). |
| `created` | string `YYYY-MM-DD` | *opt* | Creation date. |

*Excerpt* (the example's `description` is a few sentences of briefing, left out here):
```json
"scenario": { "id": "deepsea-bay22-mixed", "title": "Deep-sea vessel, bay 22: discharge, hatch cover, load", "author": "QuayOps", "created": "2026-09-26" }
```

## 5. `quay`
| Field | Type | Default | Meaning |
|---|---|---|---|
| `length_m` | number > 0 | `1000` | Quay length from mark 0. The vessel must lie within 0 … length. |
| `marksIncreaseTo` | `"right"` / `"left"` | `"right"` | Direction of increasing quay marks for someone on the quay facing the water ([§1.1](#11-quay-frame-quay-marks-fromwatersiderail_m)). |
| `orientation_deg` | number 0–360 | `0` | True bearing of increasing quay marks. Turns the true wind into wind relative to the crane. |
| `watersideRailToFenderLine_m` | number ≥ 0 | `4.5` | Waterside rail centreline to the fender line (fender face). |
| `apronAboveWaterline_m` | number > 0 | `5.0` | Apron / rail head above the water level, i.e. the tide state; sets the vessel's height against the quay. Warning outside 1.5–8 m. |

*Excerpt:*
```json
"quay": { "length_m": 800, "orientation_deg": 160, "watersideRailToFenderLine_m": 4.5, "apronAboveWaterline_m": 5 }
```

Marks increase to the right (default), so world +X points to 160° and the water side faces 070°. The 250° wind of the example therefore blows straight off the quay towards the water, pushing loads waterside along the trolley direction.

## 6. `vessel`
### 6.1 Particulars and `mooring`
| Field | Type | Default | Meaning |
|---|---|---|---|
| `name` | string | **req** | Vessel name. |
| `imo` | string, 7 digits | *opt* | IMO number; the check digit is validated. |
| `callSign`, `voyage` | string | *opt* | Radio call sign; voyage number, e.g. `"047E"`. |
| `loa_m`, `beam_m`, `draught_m` | number > 0 | **req** | Length overall; moulded beam; current draught (waterline to keel). |
| `deckHeightAboveWaterline_m` | number > 0 | **req** | Freeboard: main deck at side above the waterline. |
| `mooring` | object | **req** | Position alongside: the three fields below. |
| `mooring.sideAlongside` | `"port"` / `"starboard"` | **req** | Side against the fenders. Starboard ⇒ bow to world +X ([§1.2](#12-vessel-orientation-and-position)). |
| `mooring.bowAtQuayMark_m` | number ≥ 0 | **req** | Real quay mark abeam the bow (forward end of LOA). |
| `mooring.offFender_m` | number ≥ 0 | `0` | Gap between the fender line and the ship's side. |

The sub-objects `structure`, `bays`, `hatchCovers`, `lashingBridges`, `reeferPositions` and `decorativeFill` follow in §6.2–§6.5; of them only `bays` is required. Omitted `hatchCovers` = generated covers on every bay; omitted `lashingBridges` = bridges 2 tiers high between all bays; omitted `reeferPositions` = reefers anywhere; omitted `decorativeFill` = off.

*Excerpt:*
```json
"vessel": {
  "name": "MV QUAYOPS PIONEER", "imo": "9999993", "callSign": "V7QP9", "voyage": "047E",
  "loa_m": 334, "beam_m": 45.6, "draught_m": 13, "deckHeightAboveWaterline_m": 11.6,
  "mooring": { "sideAlongside": "starboard", "bowAtQuayMark_m": 600, "offFender_m": 0 }
}
```

### 6.2 `structure`
| Field | Type | Default | Meaning |
|---|---|---|---|
| `tankTopAboveKeel_m` | number ≥ 0 | `2.0` | Hold floor (base of the first hold tier) above the keel. |
| `hatchCoamingHeight_m` | number ≥ 0 | `1.8` | Coaming above the main deck at side; cover underside = main deck + coaming. |
| `rowPitch_m` | number ≥ 2.438 | `2.55` | Distance between adjacent row centrelines. |
| `firstHoldTier` | even integer 2–98 | `2` | Lowest hold tier number. |
| `firstDeckTier` | even integer 2–98 | `82` | Lowest deck tier number (80 or 72 on ships with many deck tiers). |
| `cellGuides` | object | *opt* | Where cell guides are fitted: no stacking-cone gap inside them ([§1.5](#15-tiers-and-vertical-positions)). |
| `cellGuides.hold` | boolean | `true` | Cell guides in the holds. |
| `cellGuides.deck` | boolean | `false` | Cell guides on deck (e.g. an open-hatch vessel). 40 ft guides: no 45 ft box in them. |

The example writes these fields out with their default values, as a reference.

### 6.3 `bays`
| Field | Type | Default | Meaning |
|---|---|---|---|
| `count` | integer 1–250 | **req** | Number of 40 ft bays N ([§1.3](#13-bays)). Lone 20 ft bays come on top. |
| `firstBayCentreFromBow_m` | number > 0 | **req** | Bow to the centre of the first bay position (02, or lone bay 01). |
| `pitch_m` | number ≥ 12.192 | `13.4` | Length of a 40 ft bay position (a lone 20 ft bay: half of it). |
| `twentyOnlyBays` | array of odd bays, ≥ 1 | *opt* | Lone 20 ft bays; shifts the numbering aft of them ([§1.3](#13-bays)). Each must be reached by the walk. |
| `rowsInHold`, `rowsOnDeck` | integer ≥ 1 | **req** | Default rows in the hold / on deck (pedestal rows included). |
| `tiersInHold`, `tiersOnDeck` | integer ≥ 1 | **req** | Default tiers, counted from `firstHoldTier` / `firstDeckTier`. |
| `overrides` | array | *opt* | Per-bay exceptions, e.g. narrower bays forward, raised hold floors. |
| `overrides[].bay` | bay position | **req** | The bay this entry applies to. |
| `overrides[].rowsInHold`, `.rowsOnDeck`, `.tiersInHold`, `.tiersOnDeck` | integer ≥ 0 | the `bays` value | Counts for this bay; 0 = no stowage there. |
| `overrides[].hold20ftAllowed` | boolean | `true` | `false` = 40 ft cells only: no 20 ft boxes below deck in this bay. |
| `overrides[].holdRowBaseTier` | object `{ "RR": tier }` | *opt* | Raised hold floor: row string → lowest hold tier of that row (even, ≥ `firstHoldTier`) ([§1.5](#15-tiers-and-vertical-positions)). |
| `gaps` | array | *opt* | Longitudinal gaps between bay positions. |
| `gaps[].afterBay` | bay position | **req** | The gap lies aft of this bay (not the last one). |
| `gaps[].length_m` | number > 0 | **req** | Added to the distance between this bay and the next. |
| `gaps[].structure` | `"deckhouse"` / `"funnel"` / `"gap"` | `"gap"` | What stands in the gap. |
| `gaps[].heightAboveDeck_m` | number ≥ 0 | `0` | Height above the main deck. Give it for a deckhouse or funnel, which is drawn flat without it (warning). |

*Excerpt:*
```json
"bays": {
  "count": 20, "firstBayCentreFromBow_m": 24, "pitch_m": 13.4, "rowsInHold": 15, "rowsOnDeck": 17, "tiersInHold": 9, "tiersOnDeck": 8,
  "overrides": [ { "bay": 2, "rowsInHold": 13, "rowsOnDeck": 15, "tiersInHold": 7, "tiersOnDeck": 6, "hold20ftAllowed": false }, { "bay": 78, "rowsInHold": 13, "tiersInHold": 8 } ],
  "gaps": [ { "afterBay": 54, "length_m": 18, "structure": "deckhouse", "heightAboveDeck_m": 32 } ]
}
```

Bay 02 in the bow flare is narrower and shallower and takes only 40 ft boxes in the hold; bay 78 has a narrower, shallower hold. The deckhouse stands between bays 54 and 58, so bay 58 lies 13.4 + 18.0 m aft of bay 54.

*Illustrative* (a 160 m feeder, not the example):
```json
"bays": {
  "count": 8, "twentyOnlyBays": [1], "firstBayCentreFromBow_m": 14.0, "rowsInHold": 7, "rowsOnDeck": 9, "tiersInHold": 5, "tiersOnDeck": 4,
  "overrides": [ { "bay": 1, "rowsInHold": 3, "rowsOnDeck": 5, "tiersInHold": 3 }, { "bay": 4, "rowsInHold": 5, "rowsOnDeck": 7, "holdRowBaseTier": { "04": 4, "03": 4 } } ]
}
```

A lone 20 ft bay 01 in the narrow forward hold, then 40 ft bays 04 (03 + 05), 08 … 32. Bay 04 is centred 14.0 + (6.7 + 13.4)/2 = 24.05 m aft of the bow. In its hold, rows 04 and 03 start at tier 04, 2.591 m above the tank top (hopper), so `04-04-02` and `04-03-02` do not exist.

### 6.4 `hatchCovers`
| Field | Type | Default | Meaning |
|---|---|---|---|
| `panelsAcross` | integer ≥ 1 | `3` | Generated panels per bay, port → starboard, symmetric row split; fewer in a narrow bay (at most one per 3 hold rows, [§1.6](#16-hatch-covers-and-panel-ids)). |
| `thickness_m` | number > 0 | `0.9` | Generated panel thickness. Cover top = base of the first deck tier. |
| `weight_t` | number > 0 | `30.0` | Weight of each generated panel, whatever its width; must not exceed the crane's rated load under spreader. Use `overrides` for realistic weights in narrow bays. |
| `baysWithout` | array of bay positions | *opt* | Open-hatch bays without covers: the hold is always accessible, and the deck tiers over the hold rows stand on the hold stacks ([§1.5](#15-tiers-and-vertical-positions)). |
| `overrides` | array | *opt* | Explicit panel layouts that replace the generated panels of a bay. |
| `overrides[].bay` | bay position | **req** | The bay this layout applies to. |
| `overrides[].panels` | array, ≥ 1 | **req** | The bay's panels; together they cover every hold row exactly once. |
| `overrides[].panels[].id` | string (id) | **req** | Panel id, unique on the vessel; by convention `"<bay>-<n>"`. |
| `overrides[].panels[].rows` | array of rows | **req** | Hold rows under this panel, e.g. `["04", "02", "00", "01", "03"]`. |
| `overrides[].panels[].length_m`, `.width_m` | number > 0 | bay length − 0.4; rows × `rowPitch_m` | Fore-and-aft length; athwartships width. |
| `overrides[].panels[].thickness_m`, `.weight_t` | number > 0 | the `hatchCovers` value | Thickness; weight. |

*Excerpt* (bay 02: two explicit panels of 6 + 7 rows; every other bay, bay 22 included, gets the generated `"<bay>-1"` … `"<bay>-3"`):
```json
"hatchCovers": { "panelsAcross": 3, "thickness_m": 0.9, "weight_t": 30, "baysWithout": [], "overrides": [ { "bay": 2, "panels": [
    { "id": "02-1", "rows": ["12", "10", "08", "06", "04", "02"], "length_m": 13, "width_m": 15.3, "thickness_m": 0.9, "weight_t": 34 },
    { "id": "02-2", "rows": ["00", "01", "03", "05", "07", "09", "11"], "length_m": 13, "width_m": 17.85, "thickness_m": 0.9, "weight_t": 38 } ] } ] }
```

### 6.5 `lashingBridges`, `reeferPositions`, `decorativeFill`
| `lashingBridges` field | Type | Default | Meaning |
|---|---|---|---|
| `levels` | integer 0–4 | `2` | Bridge height in standard tiers (top height below); 0 = no lashing bridges. |
| `afterBays` | `"all"` or array of bay positions | `"all"` | Bridges aft of these bays. `"all"` = aft of every bay position that is followed by another bay without a gap in between. |

| `reeferPositions[]` field | Type | Default | Meaning |
|---|---|---|---|
| `location` | `"deck"` / `"hold"` | **req** | Where this block of plugs is. |
| `bays` | `"all"` or array of bay positions | `"all"` | Bays with plugs (a 40 ft bay includes its 20 ft bays). |
| `rows` | `"all"` or array of rows | `"all"` | Rows with plugs. |
| `tiers` | `"all"` or array of tiers | `"all"` | Tiers with plugs. |

| `decorativeFill` field | Type | Default | Meaning |
|---|---|---|---|
| `enabled` | boolean | `false` | Fill untouched bays with generated boxes. |
| `density` | number 0–1 | `0.8` | Fraction of the available slots to fill. |
| `seed` | integer | `1` | Random seed; the same seed gives the same stow. |

- **Lashing bridges and 45 ft boxes:** a bridge top stands at Y = cover top + `levels` × 2.591 + (`levels` − 1) × 0.03 m, a fixed rule of format v1; the VesselBuilder draws the bridges to exactly that height (+14.51 m on the example vessel). In a bay with a bridge forward or aft of it, a 45 ft box on deck needs its base at or above the bridge top, so its overhang clears the bridge: with 2 levels and no deck cell guides, tier 86 or higher on a cover or pedestal.
- **Running reefers only:** if `reeferPositions` is given, every RF box **with** `reeferSetpoint_C` (a running reefer) must stand in a slot matched by one entry. An RF box without a setpoint (empty or not operating) may stow anywhere. An empty list is an error; leave the field out instead.
- **Decorative fill** puts `stay` (ROB) boxes into every bay that no bayPlan entry or move references, for looks and collisions; no move can reference them (the crane can still grip one: in Phase 3 that is a wrong-box fault). It builds only valid stacks: support, hold height under the covers, no 45 ft box inside lashing-bridge height next to a bridge, and no two 45 ft boxes in the same row and tier of adjacent bays (13.716 m is more than the 13.4 m pitch).

*Excerpt:*
```json
"lashingBridges": { "levels": 2, "afterBays": "all" },
"reeferPositions": [ { "location": "deck", "bays": "all", "rows": "all", "tiers": [82, 84, 86] }, { "location": "hold", "bays": [58, 62], "rows": "all", "tiers": "all" } ],
"decorativeFill": { "enabled": true, "density": 0.8, "seed": 7 }
```

## 7. `bayPlan`
The boxes on board on arrival (the list may be empty). An entry is the container fields plus `slot` and `status`; `loadList` entries ([§8](#8-loadlist)) have the container fields only.

| Field | Type | Default | Meaning |
|---|---|---|---|
| `slot` | string `^\d{2,3}-\d{2}-\d{2}$` | **req** | Bay-row-tier on arrival, e.g. `"22-04-84"`: an odd bay for a 20 ft box, the even 40 ft bay for 40/45 ft. |
| `status` | `"discharge"` / `"stay"` / `"restow"` | **req** | `discharge`: import box, moved by one discharge move. `stay`: remains on board (ROB); no move may touch it. `restow`: shifted during this call by restow moves. A discharge or restow box that no move handles gives a warning. |
| `containerId` | ISO 6346 | **req** | Container number with a correct check digit ([§1.7](#17-identifiers)); unique across bayPlan and loadList. |
| `size`, `height` | `20` / `40` / `45`; `"standard"` / `"HC"` | **req** | Length in feet: 6.058, 12.192 or 13.716 m (45 ft on deck only, never in 40 ft cell guides); height 2.591 m (8'6") or high cube 2.896 m (9'6"). |
| `type` | `"DV"` / `"HC"` / `"RF"` / `"OT"` / `"TK"` / `"FR"` | **req** | Dry van (height `standard` only), high-cube dry van (height `HC` only; a HC dry van is always written type `HC`, height `HC`), reefer, open top, tank, flat rack. |
| `grossWeight_t` | number > 0 | **req** | Gross mass (VGM): tare ≤ gross ≤ max gross (ContainerCatalog, 30.48 t). An empty box has gross = tare. |
| `tare_t` | number > 0 | per size/type | Tare; the default comes from the ContainerCatalog. |
| `operator` | string `^[A-Z0-9]{2,4}$` | **req** | Line operator code, e.g. `MSK`; sets the box colour from the OperatorPalette. |
| `colour`, `pod` | string `#RRGGBB`; UN/LOCODE | *opt* | Colour override (e.g. a leased box in lessor grey); port of discharge, e.g. `"NLRTM"`. |
| `reeferSetpoint_C` | number −70…40 | *opt* | RF only. With a setpoint the reefer is running and needs a plug ([§6.5](#65-lashingbridges-reeferpositions-decorativefill)); without, it is empty or not operating. |
| `oog` | object | *opt* | FR and OT only: out of gauge, in cm beyond the box envelope as stowed. Nothing may be stowed on top of an OOG box. |
| `oog.overHeight_cm` | number ≥ 0 | *opt* | Above the top corner castings; counts in the lift-height check ([§12](#12-crane)) and, in the hold, against the hatch cover underside. |
| `oog.overWidthPort_cm`, `.overWidthStarboard_cm` | number ≥ 0 | *opt* | To port / to starboard; warning if the next row at that tier is occupied. |
| `oog.overLengthFore_cm`, `.overLengthAft_cm` | number ≥ 0 | *opt* | Forward / aft. |

*Excerpt:*
```json
"bayPlan": [
  { "slot": "22-00-86", "status": "discharge", "containerId": "CMAU5693108", "size": 45, "height": "HC", "type": "HC", "grossWeight_t": 11.2, "tare_t": 4.8, "operator": "CMA", "pod": "GBFXT" },
  { "slot": "22-02-84", "status": "discharge", "containerId": "MEDU9312764", "size": 40, "height": "HC", "type": "RF", "grossWeight_t": 24.6, "operator": "MSC", "pod": "GBFXT", "reeferSetpoint_C": -18 },
  { "slot": "22-02-86", "status": "restow", "containerId": "ONEU2088147", "size": 40, "height": "HC", "type": "HC", "grossWeight_t": 14.9, "operator": "ONE", "pod": "SGSIN" },
  { "slot": "22-13-82", "status": "stay", "containerId": "HLXU9401583", "size": 40, "height": "standard", "type": "FR", "grossWeight_t": 26.5, "operator": "HLC", "pod": "SGSIN", "oog": { "overHeight_cm": 85 } },
  { "slot": "22-04-82", "status": "discharge", "containerId": "TGHU8771450", "size": 40, "height": "standard", "type": "DV", "grossWeight_t": 20.5, "operator": "MSC", "colour": "#7A7D80", "pod": "GBFXT" },
  { "slot": "22-06-02", "status": "stay", "containerId": "MNBU3184266", "size": 40, "height": "HC", "type": "RF", "grossWeight_t": 4.7, "tare_t": 4.7, "operator": "MSK", "pod": "CNSHA" }
]
```
From the top: the 45 ft high cube on top of row 00; a running reefer at −18 °C (deck tiers 82–86 have plugs); an SGSIN box overstowing GBFXT cargo, restowed via the quay; a flat rack with 85 cm over-height that stays on board; a leased box in lessor grey operated by MSC; an empty reefer (no setpoint, gross = tare) in the hold of bay 22, which has no plugs.

## 8. `loadList`
Export boxes that arrive under the crane by terminal tractor or AGV: container fields only, no `slot` and no `status` (the target slot is in the load move). Required, with at least one box, when any move is a `load`; a loadList box may be used only by `load` moves.

*Excerpt:*
```json
"loadList": [
  { "containerId": "MRKU6944716", "size": 20, "height": "standard", "type": "DV", "grossWeight_t": 19.6, "operator": "MSK", "pod": "SGSIN" },
  { "containerId": "ONEU8533065", "size": 40, "height": "HC", "type": "RF", "grossWeight_t": 25.9, "operator": "ONE", "pod": "SGSIN", "reeferSetpoint_C": 4 }
]
```

## 9. `workQueue`
The moves in the order the crane works them (at least one). **Start state and dry run:** bayPlan boxes stand in their slots, every panel is on its seat, the buffer and laydowns are empty. A loadList box arrives on the lane of its load move, timed by `yardSide.truckTiming`. A box discharged to a lane leaves on the truck or AGV; after restow leg 1 to a lane it waits on the truck or AGV for leg 2; a box set down in the buffer stays there. The loader runs the moves in order on an occupancy model (the dry run) and reports each problem at the move where it happens.

| Field | Type | Default | Meaning |
|---|---|---|---|
| `id` | string (id) | `"M001"`, `"M002"` … by position | Shown on the HUD and in the results; unique. Avoid explicit `Mnnn` ids that clash with the position defaults. |
| `type` | `"discharge"` / `"load"` / `"restow"` / `"hatchcover"` | **req** | See the move matrix ([§9.1](#91-move-matrix)). |
| `containerId` | ISO 6346 | **req**, except `hatchcover` | The box; not allowed on hatchcover moves. In a twin lift, the forward box. |
| `twinLift` | boolean | `false` | Twin-twenty lift ([§9.2](#92-twin-lift)). Not allowed at all on hatchcover moves, not even `false`. |
| `twinContainerId` | ISO 6346 | required if and only if `twinLift` is true | The aft box of a twin lift. |
| `hatchCoverId` | panel id | required if and only if `hatchcover` | The panel to move, e.g. `"22-2"`. |
| `from`, `to` | Location | **req** | Where the spreader picks up and sets down. |
| `note` | string | *opt* | Instruction shown on the HUD. |

A **Location** is an object with exactly one of these keys:

| Location | Extra field | Meaning |
|---|---|---|
| `{ "vessel": "22-04-84" }` | — | Slot on board; a twin lift uses the 40 ft bay number. |
| `{ "lane": "L2", "chassisPosition": "rear" }` | `chassisPosition`: `"front"` / `"centre"` / `"rear"` ([§10](#10-yardside)), single 20 ft only; default `yardSide.single20Position` | Chassis or AGV under the crane on that lane. |
| `{ "buffer": "QB01", "tier": 1 }` | `tier`: 1–3, ≤ `maxTiers`; default the next free tier (set-down) or the top box (pick-up) | Quay buffer slot. |
| `{ "coverSeat": "22-2" }` | — | The panel's own seat on the coamings. |
| `{ "laydown": "HCL1" }` | — | Hatch cover laydown on the quay. |

### 9.1 Move matrix
| `type` | `from` → `to` | Subject |
|---|---|---|
| `discharge` | vessel → lane · vessel → buffer | bayPlan box, status `discharge` |
| `load` | lane → vessel **only**: export boxes arrive by truck or AGV | loadList box |
| `restow` | vessel → vessel (direct shift on board) · vessel → buffer, later buffer → vessel (via the quay buffer) · vessel → lane, later lane → vessel (via the quay on a tractor or AGV; leg 2 comes back on any lane whose use is load or both) | bayPlan box, status `restow` |
| `hatchcover` | coverSeat → laydown (cover off) · laydown → coverSeat (back on its own seat) | panel `hatchCoverId` |

Any other combination is an error. Lanes follow their `use` per leg: a vessel → lane leg (discharge, restow leg 1) needs a `discharge` or `both` lane, a lane → vessel leg (load, restow leg 2) a `load` or `both` lane.

*Excerpt* (M002 is restow leg 1 via the buffer, M003 a direct shift):
```json
[
  { "id": "M001", "type": "discharge", "containerId": "CMAU5693108", "from": { "vessel": "22-00-86" }, "to": { "lane": "L1" }, "note": "45 ft high cube — telescope the spreader to 45 ft" },
  { "id": "M002", "type": "restow", "containerId": "ONEU2088147", "from": { "vessel": "22-02-86" }, "to": { "buffer": "QB01", "tier": 1 } },
  { "id": "M003", "type": "restow", "containerId": "CSNU6340190", "from": { "vessel": "22-01-84" }, "to": { "vessel": "22-05-86" } },
  { "id": "M012", "type": "hatchcover", "hatchCoverId": "22-2", "from": { "coverSeat": "22-2" }, "to": { "laydown": "HCL1" } },
  { "id": "M025", "type": "load", "containerId": "MRKU6944716", "from": { "lane": "L6", "chassisPosition": "front" }, "to": { "vessel": "21-04-82" } }
]
```

### 9.2 Twin lift
- `"twinLift": true` with `twinContainerId` lifts two 20 ft boxes **end to end** in one 40 ft bay: same row and tier, bays B−1 and B+1. The vessel address uses B: `"22-00-82"` = `21-00-82` + `23-00-82`. `containerId` is the forward box (B−1), `twinContainerId` the aft box (B+1).
- Both boxes are 20 ft and the same height, both from bayPlan or both from loadList, together within the crane's rated load. In the buffer they need a 40 ft slot. `crane.twinLiftEnabled` must be true.
- **On a lane** both go on one chassis or AGV: the forward box (B−1) on the end facing the bow, the aft box on the other end; `chassisPosition` and `single20Position` do not apply. In the example the bow is at world +X and the lanes run towards increasing marks, so the forward box goes on the front (gooseneck) end.
- **Until Phase 3** the WorkQueue plays a twin lift as two single 20 ft moves, forward box first, to the same two places, and the HUD shows "twin lift split — Phase 3"; the loader prints an info line. The example therefore plays end to end in Phase 2.

*Excerpt:*
```json
{ "id": "M006", "type": "discharge", "containerId": "MSKU7219043", "twinLift": true, "twinContainerId": "MSKU7205585", "from": { "vessel": "22-00-82" }, "to": { "lane": "L4" } }
```

### 9.3 Hatch cover workflow
The example works the hold of bay 22 under the centre panel `22-2` (hold rows 04 02 00 01 03):

| Step | Moves | The dry run checks |
|---|---|---|
| 1 Clear the panel | M001–M011: every deck box on rows 04 02 00 01 03 of bays 21, 22 and 23 discharged or restowed | Nothing stands on `22-2`; pedestal rows and the other panels may stay loaded. |
| 2 Cover off | M012: `22-2` coverSeat → laydown `HCL1` | The laydown has room (`maxStack`). |
| 3 Hold work | M013–M015 discharge tier 08 of rows 02 00 01; M016–M021 load six export boxes | Only the rows under `22-2` are open. |
| 4 Cover back | M022: laydown `HCL1` → coverSeat `22-2` | Own seat only; top of the laydown stack; every hold stack under it fits below the cover underside. |
| 5 Deck load | M023 (restow leg 2 from `QB01`), M024–M030 | The first deck tier over `22-2` needs the panel on its seat. |

A panel still on a laydown at the end gives a warning: the vessel cannot sail with an open hatch.

## 10. `yardSide`
| Field | Type | Default | Meaning |
|---|---|---|---|
| `transport` | `"terminalTractor"` / `"agv"` | **req** | Horizontal transport under the crane. |
| `chassisType` | `"combo2040"` / `"bombCart"` | required for `terminalTractor`, not allowed for `agv` | `combo2040`: 1 × 40/45 ft or 2 × 20 ft on twistlocks. `bombCart`: terminal (yard) chassis with corner guides and no twistlocks, 1 × 40/45 ft or 2 × 20 ft in the guides. |
| `single20Position` | `"front"` / `"centre"` / `"rear"` | `"rear"` | Where a single 20 ft box sits. **front** = the end towards the tractor unit (gooseneck end), i.e. the end facing the lane's driving direction; for an AGV, the end facing its driving direction. *Open question 16 in STEP1_PROPOSAL.* |
| `lanes` | array, ≥ 1 | **req** | Truck lanes along the quay. |
| `lanes[].id`, `.fromWatersideRail_m` | string (id); number | **req** | Lane id used in moves (e.g. `"L2"`); lane centreline, between the rails (0 … −30.48) or in the backreach. |
| `lanes[].use` | `"discharge"` / `"load"` / `"both"` | `"both"` | Legs allowed: `discharge` = vessel → lane, `load` = lane → vessel. |
| `lanes[].direction` | `"increasing"` / `"decreasing"` | `"increasing"` | Driving direction along the quay marks; the front of the chassis or AGV faces it. |
| `quayBuffer` | object | *opt* | Quay buffer for discharges and restows via the quay; no buffer if absent. Never a source for loads. |
| `quayBuffer.slots`, `.fromWatersideRail_m` | integer ≥ 1; number | **req** | Number of slots; centreline of the buffer row. |
| `quayBuffer.quayMark_m` | number ≥ 0 | resolved crane start | Centre of slot 1; slot n lies (n−1) × 13.4 m (40 ft slots) or 6.8 m (20 ft) towards increasing marks. |
| `quayBuffer.maxTiers`, `.slotSize`, `.idPrefix` | integer 1–3; `20` / `40`; string (id) | `1`; `40`; `"QB"` | Stack height; slot length in feet (a 45 ft box on a 40 ft slot: warning); slot id prefix (+ 2 digits: `QB01`, `QB02` …). |
| `hatchCoverLaydowns` | array | *opt* | Quay areas where hatch cover panels are landed. |
| `hatchCoverLaydowns[].id`, `.fromWatersideRail_m` | string (id); number | **req** | Laydown id used in moves (e.g. `"HCL1"`); centre, normally in the backreach. |
| `hatchCoverLaydowns[].quayMark_m`, `.maxStack` | number ≥ 0; integer ≥ 1 | resolved crane start; `1` | Centre along the quay; panels stacked on it. |
| `truckTiming` | object | *opt* | When trucks or AGVs arrive. |
| `truckTiming.mode` | `"justInTime"` / `"fixedInterval"` | `"justInTime"` | justInTime: trucks are called for the next `lookAheadMoves` moves and arrive `travelTime_s` later. fixedInterval: one arrives every `interval_s`. |
| `truckTiming.lookAheadMoves`, `.travelTime_s` | integer ≥ 1; number ≥ 0 | `1`; `60` | justInTime settings. |
| `truckTiming.interval_s` | number > 0 | `90` | fixedInterval setting. |
| `truckTiming.jitter_s`, `.seed` | number ≥ 0; integer | `15`; `1` | Uniform ± variation of arrivals; random seed (also for stop accuracy). |
| `truckTiming.stopAccuracy_m` | number ≥ 0 | `0.30` tractor, `0.03` AGV | Standard deviation of the stop position along the lane. |
| `truckTiming.departDelay_s` | number ≥ 0 | `5` | Wait after the spreader unlocks or lifts before driving off. |

*Excerpt* (two of the six lanes):
```json
"yardSide": {
  "transport": "terminalTractor", "chassisType": "combo2040", "single20Position": "rear",
  "lanes": [ { "id": "L1", "fromWatersideRail_m": -4.5, "use": "discharge", "direction": "increasing" },
             { "id": "L6", "fromWatersideRail_m": -24.5, "use": "load", "direction": "increasing" } ],
  "quayBuffer": { "slots": 2, "fromWatersideRail_m": -48, "quayMark_m": 509, "maxTiers": 1, "slotSize": 40, "idPrefix": "QB" },
  "hatchCoverLaydowns": [ { "id": "HCL1", "fromWatersideRail_m": -39, "quayMark_m": 509, "maxStack": 1 } ],
  "truckTiming": { "mode": "justInTime", "lookAheadMoves": 2, "travelTime_s": 60, "jitter_s": 15, "seed": 1, "stopAccuracy_m": 0.3, "departDelay_s": 5 }
}
```
L1–L2 receive discharged boxes, L3–L4 work both ways, L5–L6 deliver export boxes. All six run one way towards increasing marks; with the bow at world +X the chassis rear, and so the doors, face aft. Buffer and laydown are in the backreach abeam bay 22.

**Footprints.** A lane counts as its chassis/box footprint, 2.44 m wide (not the painted lane width), a buffer slot as wide as a box, a laydown as wide as the widest panel landed on it. A footprint that overlaps a rail centreline ± 1.5 m (crane legs and gantry bogies) is an error; one whose edge comes within a further 0.5 m gets a warning. Lanes run the full length of the crane span, so a lane's band (centreline ± 1.22 m) must not overlap another lane, a buffer slot or a laydown; a buffer slot and a laydown (or two laydowns) must not overlap both along the quay and across it (errors).

*Illustrative* (fixed-interval arrivals):
```json
"truckTiming": { "mode": "fixedInterval", "interval_s": 120, "jitter_s": 20, "seed": 3 }
```

## 11. `environment`
| Field | Type | Default | Meaning |
|---|---|---|---|
| `wind` | object | *opt* | Wind on the spreader and box: lateral force and sway. |
| `wind.speed_kn` | number ≥ 0 | `0` | Mean wind speed. |
| `wind.fromDirection_deg` | number 0–360 | `0` | True direction the wind blows **from**; turned into crane-relative wind with `quay.orientation_deg` and `marksIncreaseTo`. |
| `wind.gustSpeed_kn` | number ≥ 0 | = `speed_kn`, no gusts | Gust peak, ≥ `speed_kn`. |
| `wind.gustInterval_s` | `[min, max]`, two numbers > 0 | `[20, 60]` | Random time between gusts; min ≤ max. |
| `timeOfDay`, `weather` | `"HH:MM"` (24 h); `"clear"` / `"overcast"` / `"rain"` / `"fog"` | `"12:00"`; `"clear"` | Local time (drives the lighting); weather visuals. |
| `visibility_m` | number > 0 | per weather | Visibility (WeatherPresets asset); fog means < 1000 m. |
| `seaState` | integer 0–9 | `1` | Douglas scale, visual only; the vessel does not move. |

*Excerpt:*
```json
"environment": { "wind": { "speed_kn": 20, "fromDirection_deg": 250, "gustSpeed_kn": 27, "gustInterval_s": [20, 60] }, "timeOfDay": "06:40", "weather": "overcast", "visibility_m": 8000, "seaState": 3 }
```

## 12. `crane`
| Field | Type | Default | Meaning |
|---|---|---|---|
| `profile` | string | **req** | `profileId` of a CraneProfile asset, e.g. `"SPP-65"`: outreach 65 m, backreach 20 m, lift height 48 m to the spreader underside, rated load 65 t. An unknown id is an error that lists the known ones. |
| `id` | string (id) | *opt* | Crane number on the HUD, e.g. `"QC04"`. |
| `startAtBay` | bay number | exactly one of the two is **req** | Start abeam this bay's centre: a bay position or a 20 ft half. The loader prints the quay mark. |
| `startQuayMark_m` | number ≥ 0 | (see above) | Start at this real quay mark of the crane centreline. |
| `startTrolley_m` | number | `-15` | `fromWatersideRail_m` of the trolley at start: + waterside, − landside. SPP-65: WS 65.0 … LS 50.48. |
| `startHoistHeight_m` | number | `30` | Spreader underside above the apron at start. SPP-65: −20 … +48. |
| `boomRaisedAtStart` | boolean | `false` | Boom starts raised; needs the trolley in the boom park position, landside of the boom hinge (SPP-65: LS 6.0 m or further). |
| `twinLiftEnabled`, `antiSwayOnAtStart` | boolean | `false` | Twin-twenty spreader available (required for twin-lift moves); the crane's anti-sway system (type per CraneProfile / SwayProfile) switched on at start. |
| `softLimits` | object | *opt* | Gantry soft limits for this scenario, inside the rail-end hard limits. |
| `softLimits.minQuayMark_m`, `.maxQuayMark_m` | number ≥ 0 | *opt* | Lowest / highest quay mark of the crane centreline; no limit on a side that is omitted. |
| `blockedZones` | array | *opt* | Quay stretches the crane must not gantry into, e.g. where a neighbouring crane works. |
| `blockedZones[].fromQuayMark_m`, `.toQuayMark_m`; `.reason` | number ≥ 0; string | **req**; *opt* | Start and end of the zone (from < to); reason shown on the HUD. |

The resolved start mark is also the default `quayMark_m` of the quay buffer and the hatch cover laydowns. The loader checks reach against the profile: the outreach at the centre of the outermost row worked, and deck stack top + tallest box of the scenario + `clearanceOverStack_m` (1.0 m) ≤ lift height. Out-of-gauge over-height counts in both terms: the effective height of a box is its height + `overHeight_cm`/100 (the example's flat rack: 2.591 + 0.85 = 3.44 m).

*Excerpt:*
```json
"crane": {
  "profile": "SPP-65", "id": "QC04", "startAtBay": 22, "startTrolley_m": -15, "startHoistHeight_m": 30,
  "boomRaisedAtStart": false, "twinLiftEnabled": true, "antiSwayOnAtStart": false,
  "softLimits": { "minQuayMark_m": 449, "maxQuayMark_m": 569 },
  "blockedZones": [ { "fromQuayMark_m": 425, "toQuayMark_m": 485, "reason": "QC05 working bay 38 — keep gantry separation" } ]
}
```
QC04 starts abeam bay 22 (quay mark 509.0) and may gantry between 449 and 569, but stays above 485 while QC05 works bay 38 (quay mark 455.4).

## 13. `rules`
Omitted fields come from the RulesDefaults asset, tunable in the Inspector (factory values below); write a field to pin it for this scenario.

| Field | Type | Default | Meaning |
|---|---|---|---|
| `hardLanding_mps` | number > 0 | `0.5` | Downward speed at first contact above which a landing is hard. |
| `placementTolerance_cm`, `yawTolerance_deg` | number > 0 | `5.0`; `1.0` | Maximum position and yaw (skew) error at set-down. |
| `maxSwayAtPlacement_cm` | number > 0 | `10` | Maximum spreader sway amplitude at set-down. |
| `moveTimeTargets_s` | object | *opt* | Target per move type: `discharge` `90`, `load` `100`, `restow` `120` (each leg), `hatchcover` `240`. |
| `wrongSlot` | `"fail"` / `"penalise"` | `"fail"` | Set-down in the wrong slot: the move fails, or counts with a penalty. |
| `windStopLimit_kn` | number > 0 | `40` | Terminal wind-stop policy. The effective limit is the **lower** of this and the CraneProfile `inServiceWindLimit_kn` (crane design, 40 kn for SPP-65): rules can only tighten it. |

*Excerpt* (the 20 kn wind makes cover handling slower):
```json
"rules": { "moveTimeTargets_s": { "hatchcover": 300 } }
```

## 14. How problems are reported
Your editor checks structure as you type. On load, the ScenarioLoader runs every check (groups A–I) and reports **all** problems at once, each with the JSON path, the box, slot or move, what is wrong and how to fix it. An **error** stops the scenario loading, a **warning** is shown and the scenario loads, an **info** line is a note:

```text
ERROR   bayPlan[13] ONEU1159375 @ 22-06-86: nothing stowed at 22-06-84 — the box would float
ERROR   workQueue[4] M005 discharge ONEU1159375: ONEU1159375 has status "stay" (ROB) — it must not be moved; change its status to discharge or restow
WARNING scenario.id: "deepsea-bay22-mixed" differs from the file name "deepsea-bay22-copy.json" — the id is the scenario browser key and the results file stem; rename the file or the id
INFO    crane.startAtBay: crane starts abeam bay 22 (quay mark 509.00)
```

Every rule, with its severity and message, is in [VALIDATION_RULES.md](VALIDATION_RULES.md).

## 15. Versioning
- `schemaVersion` is an integer; this build reads `1` only. The format defaults belong to the version.
- New **optional** fields do not bump it. Breaking changes (a rename, a removal, a changed meaning or default, a new required field) do; the loader then migrates older files in memory, with a warning.
- An older build given a file with a newer optional field reports the unknown key and asks whether the file was written for a newer QuayOps.
