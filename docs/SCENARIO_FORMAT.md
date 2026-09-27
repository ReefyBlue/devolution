# QuayOps scenario format, v1

> **Draft for review (Step 1) — finalised in Phase 2.** Field names are final for v1. Defaults, checks and message wording may still change after your review.

A scenario is one JSON file. It holds the vessel alongside and its bay plan on arrival, the load list, the work queue of crane moves in order, the yard side under the crane, the environment, the crane's start state and the rules. This page lists every field.

- Complete example: [`Assets/QuayOps/Scenarios/deepsea-bay22-mixed.json`](../Assets/QuayOps/Scenarios/deepsea-bay22-mixed.json). Apart from the minimal file in [§2](#2-minimal-file), every JSON snippet on this page is an excerpt of that example, and the example messages in [§14](#14-validation) are what the checks report when one fault is put into it.
- JSON Schema: [`Assets/QuayOps/Scenarios/Schema/quayops-scenario.v1.schema.json`](../Assets/QuayOps/Scenarios/Schema/quayops-scenario.v1.schema.json)

**Where files live**

| Where | Folder | Notes |
|---|---|---|
| Editor | `Assets/QuayOps/Scenarios/` | Only top-level `*.json` files are scenarios. `Schema/` holds the schema. |
| Build | `StreamingAssets/QuayOps/Scenarios/` | Copied from the Editor folder at build time. Read-only. |
| Your own | `<persistentDataPath>/Scenarios/` | On Windows: `%USERPROFILE%\AppData\LocalLow\<company>\QuayOps\Scenarios\`. The scenario browser lists these alongside the built-in scenarios. |

**Editor autocomplete.** Put `"$schema": "./Schema/quayops-scenario.v1.schema.json"` at the top of the file. VS Code (and Rider) will then complete field names, show each field's meaning, unit and default on hover, list the allowed enum values, and underline structural mistakes as you type. For a file outside `Assets/QuayOps/Scenarios/`, point `$schema` at the schema with an absolute `file:///…` URL. The simulator ignores `$schema`.

**How problems are reported.** The editor catches structural mistakes only (group A in [§14](#14-validation)). When a scenario is loaded, the ScenarioLoader runs every check (A–I) and reports **all** problems at once, not just the first. Each line gives the JSON path, the box, slot or move concerned, what is wrong and how to fix it:

```text
error    bayPlan[13] ONEU1159375 @ 22-06-86: nothing stowed at 22-06-84 — the box would float
warning  yardSide.lanes[5]: lane L6 at LS 29.50 m is only 0.98 m from the landside rail — its 2.44 m wide footprint comes within 1.5 m of the rail, under the crane legs
```

An error stops the scenario loading. A warning is shown, and the scenario still loads.

**Plain JSON.** Use UTF-8, with no comments and no trailing commas. JSON numbers cannot have leading zeros, so write `"bay": 2`, not `02`. Where two digits matter the value is a string, e.g. `"slot": "02-00-82"` or `"rows": ["04"]`.

**Contents:** [1 Conventions](#1-conventions) · [2 Minimal file](#2-minimal-file) · [3 Top level](#3-top-level) · [4 scenario](#4-scenario) · [5 quay](#5-quay) · [6 vessel](#6-vessel) · [7 bayPlan](#7-bayplan) · [8 loadList](#8-loadlist) · [9 workQueue](#9-workqueue) · [10 yardSide](#10-yardside) · [11 environment](#11-environment) · [12 crane](#12-crane) · [13 rules](#13-rules) · [14 Validation](#14-validation) · [15 Versioning](#15-versioning)

---

## 1. Conventions

### 1.1 Units

| Suffix | Unit | Example field |
|---|---|---|
| `_m` | metre | `beam_m` |
| `_cm` | centimetre | `placementTolerance_cm` |
| `_t` | tonne (1000 kg) | `grossWeight_t` |
| `_s` | second | `travelTime_s` |
| `_kn` | knot | `speed_kn` |
| `_deg` | degree | `fromDirection_deg` |
| `_mps` | metre per second | `hardLanding_mps` |
| `_C` | degree Celsius | `reeferSetpoint_C` |

A field without a suffix is a count, a number (bay, tier), an id, a flag or an enum. The one exception is container `size`, which is in feet (20/40/45).

### 1.2 Quay frame, quay marks, `fromWatersideRail_m`

- **Quay marks** are metres along the quay, from mark 0 to `quay.length_m`. Every position along the quay is a quay mark: vessel bow, crane, buffer, laydowns, soft limits and blocked zones.
- **World axes.** +X points towards increasing quay marks. Y points up, with **Y = 0 at the quay apron / rail head**. +Z points towards the water. Standing on the quay and facing the water, +X is on your right.
- **`fromWatersideRail_m`** is the one transverse coordinate, used everywhere (trolley, lanes, buffer, laydowns, rows). It is the signed distance in metres from the waterside rail centreline: **positive = waterside** (outreach), **negative = landside**. The landside rail is at −30.48 (the crane profile's rail gauge), and the backreach lies beyond it. The HUD shows this position as `WS 32.4 m` / `LS 12.0 m`.

```text
Plan view, starboard side alongside (example vessel, bay 22)            fromWatersideRail_m
          ┌──────────────────────────────────────────────────────┐
  water   │ port rows      16 … 04 02                            │          +47.70 … +29.85
  stern   │ centreline     00                                    │  bow ►   +27.30
          │ starboard rows 01 03 … 15                            │          +24.75 … +6.90
          └──────────────────────────────────────────────────────┘
  ═══════════════════════ fender line ═══════════════════════════════════   +4.50
  ─────────────────────── waterside rail ────────────────────────────────    0.00
                          truck lanes L1 … L6                                −4.5 … −24.5
  ─────────────────────── landside rail ─────────────────────────────────  −30.48
                          backreach: laydown HCL1, buffer QB01               −39.0, −48.0
  ────────────────────────────────────────────────────────────► increasing quay marks (+X)
```

### 1.3 Crane positions

| Quantity | Measured as | Fields |
|---|---|---|
| Gantry position | Quay mark of the crane centreline (midway between the waterside legs) | `crane.startQuayMark_m`, `crane.softLimits`, `crane.blockedZones` |
| Trolley position | `fromWatersideRail_m` of the trolley (rope sheaves) | `crane.startTrolley_m` |
| Hoist height | Height of the spreader underside (twistlock plane) above the quay apron. Negative = below quay level, i.e. in the hold | `crane.startHoistHeight_m` |

For example, landing on a standard box at tier 82 of the example vessel reads hoist height **+11.9 m**.

### 1.4 Vessel orientation and position

- `mooring.sideAlongside` sets the heading. **Starboard side alongside ⇒ the bow points towards increasing quay marks** (+X). Port side alongside ⇒ the bow points towards decreasing quay marks.
- With starboard side alongside the vessel covers quay marks `[bowAtQuayMark_m − loa_m, bowAtQuayMark_m]`; with port side alongside, `[bowAtQuayMark_m, bowAtQuayMark_m + loa_m]`. It must lie within 0 … `quay.length_m`.
- The ship's side alongside is at `fromWatersideRail_m = quay.watersideRailToFenderLine_m + mooring.offFender_m`, and the centreline is at that value + `beam_m` / 2.
- With starboard side alongside, the odd (starboard) rows are on the quay side and the even (port) rows need the most outreach. Port side alongside is the reverse.
- The vessel is static in v1: no list, trim or roll, and no tide change during the scenario.

### 1.5 Bays

- `vessel.bays.count` = N forty-foot bays, numbered **02, 06, 10 … 4N−2** from the bow. A 40 ft bay B spans the 20 ft bays **B−1 (forward)** and **B+1 (aft)**, so the 20 ft bays are every odd number from 01 to 4N−1.

| 40 ft bay | 02 | 06 | 10 | 14 | 18 | 22 | … | 4N−2 |
|---|---|---|---|---|---|---|---|---|
| 20 ft bays (fwd + aft) | 01 + 03 | 05 + 07 | 09 + 11 | 13 + 15 | 17 + 19 | 21 + 23 | … | 4N−3 + 4N−1 |

- Even numbers that are multiples of 4 (04, 08, 24 …) are not bays.
- 20 ft boxes use the odd bays. 40 ft and 45 ft boxes use the even 40 ft bay. A 40 ft box at `22-00-84` takes the space of `21-00-84` + `23-00-84`.
- Wherever a field names a bay as an integer (`overrides[].bay`, `gaps[].afterBay`, `baysWithout`, `afterBays`, `reeferPositions[].bays`), use the 40 ft bay number. It includes its two 20 ft bays.
- **Position along the ship.** Bay 02 is centred `firstBayCentreFromBow_m` aft of the bow. Each following 40 ft bay is `pitch_m` further aft, plus the `length_m` of any `gaps` entry after the preceding bay. The 20 ft bay B−1 is centred 3.067 m forward of B, and B+1 3.067 m aft of it (half a 20 ft box plus half the 76 mm gap).
- Example vessel: bay 22 is the 6th 40 ft bay, 24.0 + 5 × 13.4 = 91.0 m aft of the bow → quay mark 600 − 91.0 = **509.0**. Bay 21 is at quay mark 512.07 and bay 23 at 505.93.

### 1.6 Rows

Rows are counted per bay, separately for the hold (`rowsInHold`) and the deck (`rowsOnDeck`). Row numbers are always written with 2 digits.

| Row count n | Centreline | Starboard | Port | Offset of row r from the centreline |
|---|---|---|---|---|
| odd | `00` | `01`, `03` … n−2 | `02`, `04` … n−1 | ceil(r/2) × `rowPitch_m` |
| even | no row `00` | `01`, `03` … n−1 | `02`, `04` … n | (ceil(r/2) − 0.5) × `rowPitch_m` |

```text
7 rows (odd):   port  06 04 02 00 01 03 05  starboard     row 01 is 2.55 m to starboard
6 rows (even):  port  06 04 02 │ 01 03 05   starboard     row 01 is 1.275 m to starboard
```

- **Pedestal rows.** When the deck has more rows than the hold, the outer deck rows stand on pedestals outboard of the hatch coaming, at the level of the hatch cover top. On the example vessel (17 deck rows, 15 hold rows) these are rows 16 and 15.
- Every other deck row stands on the hatch cover panel that covers the hold row with the same number. Keep the parity of the hold and deck row counts the same so that the rows line up (warning otherwise).

Worked example: 17 deck rows, row pitch 2.55 m, centreline at WS 27.30, starboard side alongside.

| Row | 16 | 04 | 02 | 00 | 01 | 03 | 15 |
|---|---|---|---|---|---|---|---|
| Offset from centreline | 20.40 P | 5.10 P | 2.55 P | 0 | 2.55 S | 5.10 S | 20.40 S |
| `fromWatersideRail_m` | +47.70 | +32.40 | +29.85 | +27.30 | +24.75 | +22.20 | +6.90 |

### 1.7 Tiers and vertical positions

- **Hold tiers** are `firstHoldTier` (default 02), 04, 06 …, `tiersInHold` of them. **Deck tiers** are `firstDeckTier` (default 82), 84, 86 …, `tiersOnDeck` of them. Tiers are always even.
- **A tier number gives the stacking order only.** Heights come from the boxes actually stacked: 2.591 m standard, 2.896 m HC. On deck add a 0.03 m stacking-cone gap between boxes. Where cell guides are fitted there is no gap (always the case in the hold with the defaults; on deck only if `cellGuides.deck` is true).
- **Stacks have no holes.** A box at tier t must stand on a box at tier t−2. The first tier stands on the tank top, the hatch cover or a pedestal.
- Vertical datum (Y above the quay apron):

| Level | Formula | Example vessel |
|---|---|---|
| Keel | −`apronAboveWaterline_m` − `draught_m` | −18.00 |
| Tank top = base of the first hold tier | keel + `tankTopAboveKeel_m` | −16.00 |
| Main deck at side | −`apronAboveWaterline_m` + `deckHeightAboveWaterline_m` | +6.60 |
| Hatch cover underside (hold stacks must stay below it) | main deck + `hatchCoamingHeight_m` | +8.40 |
| Hatch cover top = base of the first deck tier (pedestals too) | underside + cover `thickness_m` | +9.30 |

- Example: with an HC at `22-00-82` and a standard box at `22-00-84`, the tier-84 box spans +12.226 to +14.817, so the spreader lands on it at hoist height +14.82 m. With a standard box at tier 82 instead, the same tier-84 box would sit 0.305 m lower.

### 1.8 Hatch covers and panel ids

- Every 40 ft bay has pontoon hatch covers unless it is listed in `hatchCovers.baysWithout` (open hatch). A panel runs the full length of the bay, so it covers both 20 ft bays.
- **Generated panels.** Each bay gets `panelsAcross` panels (default 3), with ids **`"<bay>-<n>"`**: the 2-digit 40 ft bay number, and n = 1 … panelsAcross **from port to starboard**. So bay 22 has `"22-1"` (port), `"22-2"` (centre) and `"22-3"` (starboard); bay 02 has `"02-1"` and so on. *Open question to you, see STEP1_PROPOSAL §8 q11.*
- **Rows per panel.** The hold rows, ordered port → starboard, are split into contiguous groups as evenly as possible. Leftover rows go one each to the panels nearest the centre, port side first on a tie.

| Hold rows | Panels | Rows per panel, port → stbd | Example (bay 22) |
|---|---|---|---|
| 15 | 3 | 5 / 5 / 5 | `22-1` 14 12 10 08 06 · `22-2` 04 02 00 01 03 · `22-3` 05 07 09 11 13 |
| 16 | 3 | 5 / 6 / 5 | |
| 17 | 3 | 6 / 6 / 5 | |
| 7 | 3 | 2 / 3 / 2 | `22-1` 06 04 · `22-2` 02 00 01 · `22-3` 03 05 |

- **Generated size.** Length = `pitch_m` − 0.4 and width = rows × `rowPitch_m`; thickness and weight come from `hatchCovers`. On the example vessel a panel is 13.0 × 12.75 × 0.9 m and weighs 30 t.
- A panel id is used both as a move's `hatchCoverId` and in `{ "coverSeat": … }`. The hold slots under a panel can only be worked while that panel is off its seat.

### 1.9 Twin-lift addressing

- `"twinLift": true` lifts two 20 ft boxes together on the twin-twenty spreader. The boxes are in the same row and tier, in the two 20 ft bays of one 40 ft bay.
- In `from` / `to`, the vessel slot is written with the **40 ft bay number**: `{ "vessel": "22-00-82" }` means `21-00-82` + `23-00-82`.
- `containerId` is the forward box (the lower odd bay, here 21). `twinContainerId` is the aft box (here 23).
- The full rule list is in [§9.5](#95-twin-lift-rule).

### 1.10 Identifiers

| What | Format | Checked |
|---|---|---|
| Container number | ISO 6346, no spaces: `^[A-Z]{3}[UJZ]\d{7}$`. Owner code + category (U freight container, J detachable equipment, Z trailer/chassis) + 6-digit serial + check digit | Pattern and check digit |
| IMO number | 7 digits, written as a string | (d1×7 + d2×6 + d3×5 + d4×4 + d5×3 + d6×2) mod 10 = d7, e.g. `"9999993"` |
| UN/LOCODE (`pod`) | `^[A-Z]{2}[A-Z2-9]{3}$`, e.g. `NLRTM`, `SGSIN` | Pattern |
| Line operator | `^[A-Z0-9]{2,4}$`, e.g. `MSK`, `CMA` | Pattern. The colour comes from the OperatorPalette |
| Other ids (moves, lanes, laydowns, panels, crane) | Letters, digits, `-`, `_` and `.`; must start with a letter or digit; at most 32 characters | Unique within their kind |
| Scenario id | `^[a-z0-9][a-z0-9-]{2,63}$` | Pattern |

**ISO 6346 check digit.** Letter values are A 10, B 12, C 13, D 14, E 15, F 16, G 17, H 18, I 19, J 20, K 21, L 23, M 24, N 25, O 26, P 27, Q 28, R 29, S 30, T 31, U 32, V 34, W 35, X 36, Y 37, Z 38 (multiples of 11 are skipped); a digit counts as its own value. Multiply character i (i = 0 … 9, counting from the left) by 2^i and add up the results. The check digit is the sum mod 11, then mod 10 (so 10 becomes 0). Example: `CSQU305438` sums to 6185, and 6185 mod 11 = 3, giving **`CSQU3054383`**. When a check digit is wrong, the loader prints the expected one.

---

## 2. Minimal file

This is the smallest valid scenario: one 40 ft HC discharged from deck onto a truck. Every omitted field takes its default.

```json
{
  "$schema": "./Schema/quayops-scenario.v1.schema.json",
  "schemaVersion": 1,
  "scenario": { "id": "minimal-one-move", "title": "Minimal: one discharge" },
  "vessel": {
    "name": "MV MINIMAL",
    "loa_m": 140.0, "beam_m": 25.0, "draught_m": 7.5, "deckHeightAboveWaterline_m": 6.0,
    "mooring": { "sideAlongside": "starboard", "bowAtQuayMark_m": 400.0 },
    "bays": { "count": 8, "firstBayCentreFromBow_m": 20.0,
              "rowsInHold": 7, "rowsOnDeck": 9, "tiersInHold": 5, "tiersOnDeck": 4 }
  },
  "bayPlan": [
    { "slot": "06-00-82", "status": "discharge", "containerId": "MSKU1234565",
      "size": 40, "height": "HC", "type": "HC", "grossWeight_t": 22.5, "operator": "MSK" }
  ],
  "workQueue": [
    { "type": "discharge", "containerId": "MSKU1234565",
      "from": { "vessel": "06-00-82" }, "to": { "lane": "L1" } }
  ],
  "yardSide": {
    "transport": "terminalTractor", "chassisType": "combo2040",
    "lanes": [ { "id": "L1", "fromWatersideRail_m": -8.5 } ]
  },
  "crane": { "profile": "SPP-65", "startQuayMark_m": 366.6 }
}
```

Bay 06 is centred 20.0 + 13.4 = 33.4 m aft of the bow, i.e. at quay mark 400 − 33.4 = 366.6, so the crane starts abeam it.

---

## 3. Top level

In the tables below, **Required/Default** reads as follows: **req** = required; a value = optional, with that default; *opt* = optional with no default (the Meaning column explains what happens if it is omitted).

| Field | Type | Unit | Required/Default | Meaning |
|---|---|---|---|---|
| `$schema` | string | — | *opt* | Editor hint: path or URL of the schema. Ignored by the simulator. |
| `schemaVersion` | integer, `1` | — | **req** | Format version. This build reads 1 only ([§15](#15-versioning)). |
| `scenario` | object | — | **req** | Identity and briefing ([§4](#4-scenario)). |
| `quay` | object | — | *opt* | Berth geometry ([§5](#5-quay)). If omitted, all defaults apply. |
| `vessel` | object | — | **req** | Vessel, structure, bays, covers ([§6](#6-vessel)). |
| `bayPlan` | array | — | **req**, may be `[]` | Boxes on board on arrival ([§7](#7-bayplan)). |
| `loadList` | array | — | required if any `load` move | Export boxes that arrive by truck/AGV ([§8](#8-loadlist)). |
| `workQueue` | array, ≥ 1 item | — | **req** | Crane moves in working order ([§9](#9-workqueue)). |
| `yardSide` | object | — | **req** | Transport, lanes, buffer, laydowns, truck timing ([§10](#10-yardside)). |
| `environment` | object | — | *opt* | Wind, time, weather, sea state ([§11](#11-environment)). If omitted, all defaults apply. |
| `crane` | object | — | **req** | Crane profile and start state ([§12](#12-crane)). |
| `rules` | object | — | *opt* | Tolerances, targets, penalties ([§13](#13-rules)). If omitted, all defaults apply. |

Every object is strict: an unknown key is an error, with a did-you-mean suggestion. A typo never passes silently.

---

## 4. `scenario`

| Field | Type | Unit | Required/Default | Meaning |
|---|---|---|---|---|
| `id` | string `^[a-z0-9][a-z0-9-]{2,63}$` | — | **req** | Scenario id: lower-case letters, digits and hyphens, 3–64 characters. By convention, the file name without `.json`. |
| `title` | string | — | **req** | Title shown in the scenario browser. |
| `description` | string | — | *opt* | Briefing shown in the scenario browser. |
| `author` | string | — | *opt* | Free text. |
| `created` | string `YYYY-MM-DD` | — | *opt* | Creation date. |

```json
"scenario": {
  "id": "deepsea-bay22-mixed",
  "title": "Deep-sea vessel, bay 22: discharge, hatch cover, load",
  "author": "QuayOps",
  "created": "2026-09-26"
}
```

The example's `description` is a short briefing of the call (a few sentences); it is left out here.

---

## 5. `quay`

| Field | Type | Unit | Required/Default | Meaning |
|---|---|---|---|---|
| `length_m` | number > 0 | m | `1000` | Quay length from mark 0. The vessel must lie within 0 … length. |
| `orientation_deg` | number 0–360 | deg | `0` | True bearing of the direction of increasing quay marks. Used to turn the true wind into wind relative to the crane. |
| `watersideRailToFenderLine_m` | number ≥ 0 | m | `4.5` | Distance from the waterside rail centreline to the fender line (fender face). |
| `apronAboveWaterline_m` | number | m | `5.0` | Height of the apron / rail head above the water level, i.e. the tide state. Sets the vessel's height against the quay. |

```json
"quay": { "length_m": 800, "orientation_deg": 160, "watersideRailToFenderLine_m": 4.5, "apronAboveWaterline_m": 5.0 }
```

With `orientation_deg: 160` the water side (+Z) faces 070°. A wind from 250° therefore blows straight off the quay towards the water, pushing loads waterside in the trolley direction.

---

## 6. `vessel`

### 6.1 Particulars

| Field | Type | Unit | Required/Default | Meaning |
|---|---|---|---|---|
| `name` | string | — | **req** | Vessel name. |
| `imo` | string, 7 digits | — | *opt* | IMO number. The check digit is validated. |
| `callSign` | string | — | *opt* | Radio call sign. |
| `voyage` | string | — | *opt* | Voyage number, e.g. `"042W"`. |
| `loa_m` | number > 0 | m | **req** | Length overall. |
| `beam_m` | number > 0 | m | **req** | Moulded beam. |
| `draught_m` | number > 0 | m | **req** | Current draught (waterline to keel). |
| `deckHeightAboveWaterline_m` | number > 0 | m | **req** | Freeboard: height of the main deck at side above the waterline. |
| `mooring` | object | — | **req** | Position alongside ([§6.2](#62-mooring)). |
| `structure` | object | — | *opt* | Hull details ([§6.3](#63-structure)). If omitted, all defaults apply. |
| `bays` | object | — | **req** | Bay layout ([§6.4](#64-bays)). |
| `hatchCovers` | object | — | *opt* | Hatch covers ([§6.5](#65-hatchcovers)). If omitted, every bay gets generated covers. |
| `lashingBridges` | object | — | *opt* | Lashing bridges ([§6.6](#66-lashingbridges)). If omitted, bridges 2 tiers high stand between all bays. |
| `reeferPositions` | array | — | *opt* | Reefer plugs ([§6.7](#67-reeferpositions)). If omitted, reefers are allowed in any slot. |
| `decorativeFill` | object | — | *opt* | Generated ROB boxes ([§6.8](#68-decorativefill)). Off if omitted. |

```json
"vessel": {
  "name": "MV QUAYOPS PIONEER", "imo": "9999993", "callSign": "V7QP9", "voyage": "047E",
  "loa_m": 334.0, "beam_m": 45.6, "draught_m": 13.0, "deckHeightAboveWaterline_m": 11.6,
  "mooring": { "sideAlongside": "starboard", "bowAtQuayMark_m": 600.0 },
  "bays": { "count": 20, "firstBayCentreFromBow_m": 24.0,
            "rowsInHold": 15, "rowsOnDeck": 17, "tiersInHold": 9, "tiersOnDeck": 8 }
}
```

The optional blocks `structure`, `hatchCovers`, `lashingBridges`, `reeferPositions` and `decorativeFill` go in the same object; see §6.3 and §6.5–6.8.

### 6.2 `mooring`

| Field | Type | Unit | Required/Default | Meaning |
|---|---|---|---|---|
| `sideAlongside` | `"port"` / `"starboard"` | — | **req** | Side against the fenders. Starboard ⇒ the bow points towards increasing quay marks. |
| `bowAtQuayMark_m` | number ≥ 0 | m | **req** | Quay mark abeam the bow (forward end of LOA). |
| `offFender_m` | number ≥ 0 | m | `0` | Gap between the fender line and the ship's side. |

```json
"mooring": { "sideAlongside": "starboard", "bowAtQuayMark_m": 600.0, "offFender_m": 0 }
```

### 6.3 `structure`

| Field | Type | Unit | Required/Default | Meaning |
|---|---|---|---|---|
| `tankTopAboveKeel_m` | number ≥ 0 | m | `2.0` | Height of the hold floor (base of the first hold tier) above the keel. |
| `hatchCoamingHeight_m` | number ≥ 0 | m | `1.8` | Height of the coaming above the main deck at side. Cover underside = main deck + coaming. |
| `rowPitch_m` | number ≥ 2.438 | m | `2.55` | Distance between adjacent row centrelines. |
| `firstHoldTier` | even integer 2–98 | — | `2` | Lowest hold tier number. |
| `firstDeckTier` | even integer 2–98 | — | `82` | Lowest deck tier number (some vessels use 80 or 72). |
| `cellGuides` | object | — | *opt* | Where cell guides are fitted. |
| `cellGuides.hold` | boolean | — | `true` | Cell guides in the holds. There is no stacking-cone gap in cell guides. |
| `cellGuides.deck` | boolean | — | `false` | Cell guides on deck (e.g. open-hatch vessels). |

```json
"structure": {
  "tankTopAboveKeel_m": 2.0, "hatchCoamingHeight_m": 1.8, "rowPitch_m": 2.55,
  "firstHoldTier": 2, "firstDeckTier": 82, "cellGuides": { "hold": true, "deck": false }
}
```

### 6.4 `bays`

| Field | Type | Unit | Required/Default | Meaning |
|---|---|---|---|---|
| `count` | integer ≥ 1 | — | **req** | Number of 40 ft bays N: 02, 06 … 4N−2. |
| `firstBayCentreFromBow_m` | number > 0 | m | **req** | Distance from the bow to the centre of bay 02. |
| `pitch_m` | number ≥ 12.192 | m | `13.4` | Distance between consecutive 40 ft bay centres (a gap adds its length on top). |
| `rowsInHold` | integer ≥ 1 | — | **req** | Default number of hold rows. |
| `rowsOnDeck` | integer ≥ 1 | — | **req** | Default number of deck rows, including pedestal rows. |
| `tiersInHold` | integer ≥ 1 | — | **req** | Default number of hold tiers, counted from `firstHoldTier`. |
| `tiersOnDeck` | integer ≥ 1 | — | **req** | Default number of deck tiers, counted from `firstDeckTier`. |
| `overrides` | array | — | *opt* | Per-bay exceptions, e.g. narrower bays forward. |
| `overrides[].bay` | integer, 40 ft bay | — | **req** | The bay this entry applies to (its 20 ft bays included). |
| `overrides[].rowsInHold` | integer ≥ 0 | — | `bays.rowsInHold` | Hold rows in this bay. 0 = no hold stowage. |
| `overrides[].rowsOnDeck` | integer ≥ 0 | — | `bays.rowsOnDeck` | Deck rows in this bay. 0 = no deck stowage. |
| `overrides[].tiersInHold` | integer ≥ 0 | — | `bays.tiersInHold` | Hold tiers in this bay. |
| `overrides[].tiersOnDeck` | integer ≥ 0 | — | `bays.tiersOnDeck` | Deck tiers in this bay. |
| `overrides[].hold20ftAllowed` | boolean | — | `true` | `false` = 40 ft cells only, no 20 ft boxes below deck in this bay. |
| `gaps` | array | — | *opt* | Longitudinal gaps between bays (deckhouse, funnel, plain gap). |
| `gaps[].afterBay` | integer, 40 ft bay | — | **req** | The gap lies aft of this bay. |
| `gaps[].length_m` | number > 0 | m | **req** | Added to the distance between this bay and the next. |
| `gaps[].structure` | `"deckhouse"` / `"funnel"` / `"gap"` | — | `"gap"` | What stands in the gap. |
| `gaps[].heightAboveDeck_m` | number ≥ 0 | m | `0` | Height above the main deck; 0 = flat gap. Give it for a `deckhouse` or `funnel`: without it the structure is drawn flat (warning). |

```json
"bays": {
  "count": 20, "firstBayCentreFromBow_m": 24.0, "pitch_m": 13.4,
  "rowsInHold": 15, "rowsOnDeck": 17, "tiersInHold": 9, "tiersOnDeck": 8,
  "overrides": [
    { "bay": 2, "rowsInHold": 13, "rowsOnDeck": 15, "tiersInHold": 7, "tiersOnDeck": 6, "hold20ftAllowed": false },
    { "bay": 78, "rowsInHold": 13, "tiersInHold": 8 }
  ],
  "gaps": [ { "afterBay": 54, "length_m": 18.0, "structure": "deckhouse", "heightAboveDeck_m": 32.0 } ]
}
```

Bay 02 (in the bow flare) is narrower and shallower and takes 40 ft boxes only in the hold; bay 78 (aft) has a narrower, shallower hold. The deckhouse stands between bays 54 and 58, so bay 58 lies 13.4 + 18.0 m aft of bay 54.

### 6.5 `hatchCovers`

| Field | Type | Unit | Required/Default | Meaning |
|---|---|---|---|---|
| `panelsAcross` | integer ≥ 1 | — | `3` | Generated panels per bay, numbered from port to starboard ([§1.8](#18-hatch-covers-and-panel-ids)). |
| `thickness_m` | number > 0 | m | `0.9` | Thickness of a generated panel. Cover top = base of the first deck tier. |
| `weight_t` | number > 0 | t | `30.0` | Weight of a generated panel. Must not exceed the crane SWL. |
| `baysWithout` | array of 40 ft bays | — | *opt* | Open-hatch bays with no covers; their hold is always accessible. |
| `overrides` | array | — | *opt* | Explicit panel layouts that replace the generated panels of a bay. |
| `overrides[].bay` | integer, 40 ft bay | — | **req** | The bay this layout applies to. |
| `overrides[].panels` | array, ≥ 1 item | — | **req** | The bay's panels. Together they must cover every hold row exactly once. |
| `overrides[].panels[].id` | string (id) | — | **req** | Panel id, unique on the vessel. By convention `"<bay>-<n>"`. |
| `overrides[].panels[].rows` | array of row strings | — | **req** | Hold rows covered by this panel, e.g. `["04","02","00","01","03"]`. |
| `overrides[].panels[].length_m` | number > 0 | m | `pitch_m` − 0.4 | Fore-and-aft length. |
| `overrides[].panels[].width_m` | number > 0 | m | rows × `rowPitch_m` | Athwartships width. |
| `overrides[].panels[].thickness_m` | number > 0 | m | `hatchCovers.thickness_m` | Thickness. |
| `overrides[].panels[].weight_t` | number > 0 | t | `hatchCovers.weight_t` | Weight. |

```json
"hatchCovers": {
  "panelsAcross": 3, "thickness_m": 0.9, "weight_t": 30.0, "baysWithout": [],
  "overrides": [ { "bay": 2, "panels": [
    { "id": "02-1", "rows": ["12", "10", "08", "06", "04", "02"], "length_m": 13.0, "width_m": 15.3, "thickness_m": 0.9, "weight_t": 34.0 },
    { "id": "02-2", "rows": ["00", "01", "03", "05", "07", "09", "11"], "length_m": 13.0, "width_m": 17.85, "thickness_m": 0.9, "weight_t": 38.0 }
  ] } ]
}
```

Bay 02 has two panels (13 hold rows: 6 + 7) instead of the three generated ones; every other bay, bay 22 included, gets the generated `"<bay>-1"` … `"<bay>-3"`.

### 6.6 `lashingBridges`

| Field | Type | Unit | Required/Default | Meaning |
|---|---|---|---|---|
| `levels` | integer 0–3 | tiers | `2` | Bridge height in tiers. 0 = no lashing bridges. |
| `afterBays` | `"all"` or array of 40 ft bays | — | `"all"` | Bays with a bridge aft of them. `"all"` = between every pair of consecutive 40 ft bays not separated by a gap. |

A 45 ft box on deck in a bay with a bridge forward or aft of it must stand at tier ≥ `firstDeckTier` + 2 × `levels`. With the defaults that means tier 86 or higher, so its overhang clears the bridge.

```json
"lashingBridges": { "levels": 2, "afterBays": "all" }
```

### 6.7 `reeferPositions`

| Field | Type | Unit | Required/Default | Meaning |
|---|---|---|---|---|
| `[].location` | `"deck"` / `"hold"` | — | **req** | Where this block of plugs is. |
| `[].bays` | `"all"` or array of 40 ft bays | — | `"all"` | Bays with plugs (each includes its 20 ft bays). |
| `[].rows` | `"all"` or array of row strings | — | `"all"` | Rows with plugs. |
| `[].tiers` | `"all"` or array of even integers | — | `"all"` | Tiers with plugs. |

If `reeferPositions` is present, every RF box must stand in a slot matched by at least one entry (error otherwise). If it is absent, reefers may stand anywhere.

```json
"reeferPositions": [
  { "location": "deck", "bays": "all", "rows": "all", "tiers": [82, 84, 86] },
  { "location": "hold", "bays": [58, 62], "rows": "all", "tiers": "all" }
]
```

### 6.8 `decorativeFill`

| Field | Type | Unit | Required/Default | Meaning |
|---|---|---|---|---|
| `enabled` | boolean | — | `false` | Fill untouched bays with generated boxes. |
| `density` | number 0–1 | — | `0.8` | Fraction of the available slots to fill. |
| `seed` | integer | — | `1` | Random seed; the same seed gives the same stow. |

The fill goes into every 40 ft bay that no bayPlan entry and no move references. The generated boxes are `stay` (ROB) boxes in valid stacks. They are there for looks and collisions and cannot be moved.

```json
"decorativeFill": { "enabled": true, "density": 0.8, "seed": 7 }
```

---

## 7. `bayPlan`

`bayPlan` is the list of boxes on board on arrival. Each entry is a container ([§7.1](#71-container-fields-bayplan-and-loadlist)) plus `slot` and `status` ([§7.3](#73-slot-and-status)). An empty list is allowed.

### 7.1 Container fields (bayPlan and loadList)

| Field | Type | Unit | Required/Default | Meaning |
|---|---|---|---|---|
| `containerId` | string, ISO 6346 | — | **req** | Container number with a correct check digit ([§1.10](#110-identifiers)). Unique across bayPlan + loadList. |
| `size` | `20` / `40` / `45` | ft | **req** | Box length: 6.058 m, 12.192 m or 13.716 m. |
| `height` | `"standard"` / `"HC"` | — | **req** | 2.591 m (8'6") or 2.896 m (9'6"). |
| `type` | `"DV"` / `"HC"` / `"RF"` / `"OT"` / `"TK"` / `"FR"` | — | **req** | Dry van, high-cube dry van (needs height `"HC"`), reefer, open top, tank, flat rack. |
| `grossWeight_t` | number > 0 | t | **req** | Gross mass (VGM). Must satisfy tare ≤ gross ≤ max gross (ContainerCatalog; default 30.48 t). An empty box has gross = tare. |
| `tare_t` | number > 0 | t | per size/type | Tare mass. The default comes from the ContainerCatalog. |
| `operator` | string `^[A-Z0-9]{2,4}$` | — | **req** | Line operator code, e.g. `MSK`, `MSC`, `CMA`, `HLC`, `ONE`, `EMC`, `COS`. The box colour comes from the OperatorPalette. |
| `colour` | string `#RRGGBB` | — | *opt* | Colour override. Without it, the operator's palette colour is used. |
| `pod` | string, UN/LOCODE | — | *opt* | Port of discharge, e.g. `"NLRTM"`. |
| `reeferSetpoint_C` | number −70…40 | °C | *opt* | Reefer setpoint. Only allowed on `RF` boxes. |
| `oog` | object | — | *opt* | Out-of-gauge dimensions. Only allowed on `FR` and `OT` boxes ([§7.2](#72-oog)). |

### 7.2 `oog`

All fields are optional numbers ≥ 0, in cm beyond the standard box envelope. Directions are as stowed on board.

| Field | Type | Unit | Required/Default | Meaning |
|---|---|---|---|---|
| `overHeight_cm` | number ≥ 0 | cm | *opt* | Over-height above the top corner castings. |
| `overWidthPort_cm` | number ≥ 0 | cm | *opt* | Over-width to port. |
| `overWidthStarboard_cm` | number ≥ 0 | cm | *opt* | Over-width to starboard. |
| `overLengthFore_cm` | number ≥ 0 | cm | *opt* | Over-length forward. |
| `overLengthAft_cm` | number ≥ 0 | cm | *opt* | Over-length aft. |

Nothing may be stowed on top of an OOG box. Over-width next to an occupied row gives a warning.

### 7.3 `slot` and `status`

| Field | Type | Unit | Required/Default | Meaning |
|---|---|---|---|---|
| `slot` | string `^\d{2,3}-\d{2}-\d{2}$` | — | **req** | Bay-row-tier on arrival, e.g. `"22-04-84"`. A 20 ft box takes an odd bay, a 40/45 ft box an even (40 ft) bay. |
| `status` | `"discharge"` / `"stay"` / `"restow"` | — | **req** | See the table below. |

| `status` | Meaning | Must be moved by |
|---|---|---|
| `"discharge"` | Import box for this port | One `discharge` move. Warning if there is none. |
| `"stay"` | Remains on board (ROB) | Nothing. A move that references it is an error. |
| `"restow"` | Shifted during this call | `restow` move(s): a direct shift on board, or via the quay (leg 1 to the buffer, leg 2 back on board). Warning if there is none. |

```json
"bayPlan": [
  { "slot": "22-00-86", "status": "discharge", "containerId": "CMAU5693108", "size": 45, "height": "HC", "type": "HC",
    "grossWeight_t": 11.2, "tare_t": 4.8, "operator": "CMA", "pod": "GBFXT" },
  { "slot": "22-02-84", "status": "discharge", "containerId": "MEDU9312764", "size": 40, "height": "HC", "type": "RF",
    "grossWeight_t": 24.6, "operator": "MSC", "pod": "GBFXT", "reeferSetpoint_C": -18 },
  { "slot": "21-00-82", "status": "discharge", "containerId": "MSKU7219043", "size": 20, "height": "standard", "type": "DV",
    "grossWeight_t": 24.1, "operator": "MSK", "pod": "GBFXT" },
  { "slot": "22-02-86", "status": "restow", "containerId": "ONEU2088147", "size": 40, "height": "HC", "type": "HC",
    "grossWeight_t": 14.9, "operator": "ONE", "pod": "SGSIN" },
  { "slot": "22-13-82", "status": "stay", "containerId": "HLXU9401583", "size": 40, "height": "standard", "type": "FR",
    "grossWeight_t": 26.5, "operator": "HLC", "pod": "SGSIN",
    "oog": { "overHeight_cm": 85, "overWidthPort_cm": 0, "overWidthStarboard_cm": 0, "overLengthFore_cm": 0, "overLengthAft_cm": 0 } },
  { "slot": "22-04-82", "status": "discharge", "containerId": "TGHU8771450", "size": 40, "height": "standard", "type": "DV",
    "grossWeight_t": 20.5, "operator": "MSC", "colour": "#7A7D80", "pod": "GBFXT" },
  { "slot": "22-04-84", "status": "discharge", "containerId": "CMAU4829308", "size": 40, "height": "HC", "type": "HC",
    "grossWeight_t": 3.89, "tare_t": 3.89, "operator": "CMA", "pod": "GBFXT" }
]
```

From the top: the 45 ft high cube on top of row 00, a reefer at −18 °C, the forward box of the twin-lift pair, the SGSIN box that overstows GBFXT cargo and is restowed via the quay, an over-height flat rack that stays on board (ROB), a leased box in lessor grey (`colour` override) operated by MSC, and an empty box (gross = tare).

---

## 8. `loadList`

`loadList` holds the export boxes that arrive by terminal tractor or AGV for loading. Each entry has the container fields of [§7.1](#71-container-fields-bayplan-and-loadlist) only: no `slot` and no `status`. The target slot is in the load move. The list is required, with at least one entry, when any move is a `load`. A loadList box may only be used by `load` moves.

```json
"loadList": [
  { "containerId": "CSNU9188028", "size": 40, "height": "HC", "type": "HC", "grossWeight_t": 17.8, "operator": "COS", "pod": "CNNGB" },
  { "containerId": "MRKU6944716", "size": 20, "height": "standard", "type": "DV", "grossWeight_t": 19.6, "operator": "MSK", "pod": "SGSIN" },
  { "containerId": "ONEU8533065", "size": 40, "height": "HC", "type": "RF", "grossWeight_t": 25.9, "operator": "ONE", "pod": "SGSIN", "reeferSetpoint_C": 4 }
]
```

---

## 9. `workQueue`

The moves are listed in the order the crane works them. There must be at least one.

### 9.1 Move fields

| Field | Type | Unit | Required/Default | Meaning |
|---|---|---|---|---|
| `id` | string (id) | — | `"M001"`, `"M002"` … by position | Move id shown on the HUD and in the results. Must be unique. If you mix explicit and default ids, avoid `Mnnn` values that clash with the position defaults. |
| `type` | `"discharge"` / `"load"` / `"restow"` / `"hatchcover"` | — | **req** | Move type ([§9.3](#93-move-matrix)). |
| `containerId` | string, ISO 6346 | — | required unless `hatchcover` | The box to move. Not allowed on `hatchcover` moves. In a twin lift, the forward box. |
| `twinLift` | boolean | — | `false` | Twin-twenty lift ([§9.5](#95-twin-lift-rule)). |
| `twinContainerId` | string, ISO 6346 | — | required if and only if `twinLift` is true | The aft box of a twin lift. |
| `hatchCoverId` | string (panel id) | — | required if and only if `hatchcover` | The panel to move, e.g. `"22-2"`. |
| `from` | Location | — | **req** | Where the spreader picks up ([§9.2](#92-locations)). |
| `to` | Location | — | **req** | Where the spreader sets down. |
| `note` | string | — | *opt* | Instruction shown on the HUD for this move. |

### 9.2 Locations

A Location is an object with **exactly one** of the five keys below. `chassisPosition` is allowed only with `lane`, and `tier` only with `buffer`.

| Kind | Form | Extra field | Meaning |
|---|---|---|---|
| vessel | `{ "vessel": "22-04-84" }` | — | Slot on board. For a twin lift, use the 40 ft bay number. |
| lane | `{ "lane": "L2", "chassisPosition": "rear" }` | `chassisPosition`: `"front"` / `"centre"` / `"rear"`, *opt*. For single 20 ft boxes only; default `yardSide.single20Position` | Chassis or AGV under the crane on this lane. |
| buffer | `{ "buffer": "QB01", "tier": 1 }` | `tier`: integer 1–3 (≤ `maxTiers`), *opt*. Default: next free tier for a set-down, top box for a pick-up | Quay buffer slot. |
| coverSeat | `{ "coverSeat": "22-2" }` | — | The panel's own seat on the coamings. |
| laydown | `{ "laydown": "HCL1" }` | — | Hatch cover laydown on the quay. |

### 9.3 Move matrix

| `type` | `from` → `to` | Subject | Use |
|---|---|---|---|
| `discharge` | vessel → lane | bayPlan box, status `discharge` | Normal discharge onto a chassis/AGV |
| `discharge` | vessel → buffer | bayPlan box, status `discharge` | Discharge to the quay buffer |
| `load` | lane → vessel | loadList box | Normal load from a chassis/AGV |
| `load` | buffer → vessel | loadList box | Load from the quay buffer (the box is staged there at the start, see [§9.4](#94-start-state-and-dry-run)) |
| `restow` | vessel → vessel | bayPlan box, status `restow` | Direct shift on board |
| `restow` | vessel → buffer | bayPlan box, status `restow` | Restow via the quay, leg 1 |
| `restow` | buffer → vessel | bayPlan box, status `restow` | Restow via the quay, leg 2 |
| `hatchcover` | coverSeat → laydown | panel (`hatchCoverId`) | Cover off |
| `hatchcover` | laydown → coverSeat | panel (`hatchCoverId`) | Cover back on its own seat |

Any other combination is an error. Lanes follow their `use`: a `"discharge"` lane only receives discharged boxes, and a `"load"` lane only delivers export boxes.

```json
[
  { "id": "M001", "type": "discharge", "containerId": "CMAU5693108", "from": { "vessel": "22-00-86" }, "to": { "lane": "L1" },
    "note": "45 ft high cube — telescope the spreader to 45 ft" },
  { "type": "restow", "containerId": "ONEU2088147", "from": { "vessel": "22-02-86" }, "to": { "buffer": "QB01", "tier": 1 },
    "note": "Restow via quay, leg 1: SGSIN box overstowing GBFXT cargo — land it on QB01" },
  { "type": "restow", "containerId": "CSNU6340190", "from": { "vessel": "22-01-84" }, "to": { "vessel": "22-05-86" },
    "note": "Restow direct shift on board: CNNGB box onto the starboard panel stack" }
]
```

These are the first three moves of the example. The ids of the second and third default to `M002` and `M003` by position; the example writes them out.

A single 20 ft box loaded from the front of a combo chassis (move 25 of the example):

```json
{ "id": "M025", "type": "load", "containerId": "MRKU6944716", "from": { "lane": "L6", "chassisPosition": "front" },
  "to": { "vessel": "21-04-82" }, "note": "Single 20 ft on the front of the chassis" }
```

### 9.4 Start state and dry run

- bayPlan boxes stand in their slots. All hatch cover panels are on their seats, and the laydowns are empty.
- A loadList box is not on the terminal yet. It arrives under the crane on the lane named in its load move, timed by `yardSide.truckTiming`. If its load move starts at a buffer, the box stands in that buffer slot from the start (staged in queue order).
- A box discharged to a lane leaves on the truck or AGV. A box set down in the buffer stays there.
- The loader then runs the moves in order on an occupancy model (the "dry run", group H in [§14](#14-validation)) and reports each problem at the move where it happens.

### 9.5 Twin-lift rule

1. `"twinLift": true` and `twinContainerId` go together; neither is allowed without the other.
2. Both boxes are 20 ft and the same height. Both come from bayPlan (discharge or restow), or both from loadList (load).
3. On the vessel, both boxes are in the same row and tier, in bays B−1 and B+1 of one 40 ft bay B. The address is written with B, e.g. `"22-00-82"`.
4. `containerId` is the forward box (B−1) and `twinContainerId` the aft box (B+1).
5. The crane needs `crane.twinLiftEnabled: true` and a profile with a twin-twenty spreader.
6. The combined gross weight must not exceed the crane's rated load under spreader.
7. On a lane, both boxes go on one chassis or AGV, with no `chassisPosition`. In the buffer they need a 40 ft slot (`slotSize: 40`).

The schema and validation support twin lifts now. The crane itself handles them from a later phase.

```json
{ "id": "M006", "type": "discharge", "containerId": "MSKU7219043", "twinLift": true, "twinContainerId": "MSKU7205585",
  "from": { "vessel": "22-00-82" }, "to": { "lane": "L4" }, "note": "Twin lift 21-00-82 + 23-00-82 onto one combo chassis" }
```

`MSKU7219043` stands at `21-00-82` (forward) and `MSKU7205585` at `23-00-82` (aft). Both are 20 ft standard dry vans for GBFXT, 46.8 t together.

### 9.6 Hatch cover workflow: cover off → hold work → cover back

The example works the hold of bay 22 under the centre panel `22-2`, which covers hold rows 04 02 00 01 03.

| Step | Moves in the example | What the dry run checks |
|---|---|---|
| 1. Clear the panel | M001–M011: discharge or restow every deck box on rows 04 02 00 01 03 of bays 21, 22 and 23 | Nothing may stand on `22-2`. Pedestal rows (16, 15) and the rows on `22-1` / `22-3` may stay. |
| 2. Cover off | M012: `hatchcover` `22-2`, coverSeat → laydown `HCL1` | The laydown has room (`maxStack`). |
| 3. Hold work | M013–M015 discharge tier 08 of rows 02 00 01; M016–M021 load six export boxes into rows 04 02 00 01 03 | Only the rows under `22-2` are open; `22-1` and `22-3` still close their rows. |
| 4. Cover back | M022: `hatchcover` `22-2`, laydown `HCL1` → coverSeat `22-2` | The panel goes back to its own seat only, and must be on top of the laydown stack. Every hold stack under it must fit below the cover underside. |
| 5. Deck load | M023 (restow leg 2 from QB01) and M024–M030 (loads) onto the panel | The first deck tier over `22-2` needs the panel on its seat. |

```json
[
  { "id": "M011", "type": "discharge", "containerId": "SEGU4155627", "from": { "vessel": "22-03-82" }, "to": { "lane": "L1" },
    "note": "Last deck box on centre panel 22-2" },
  { "id": "M012", "type": "hatchcover", "hatchCoverId": "22-2", "from": { "coverSeat": "22-2" }, "to": { "laydown": "HCL1" },
    "note": "Centre hatch cover (30 t) off to laydown HCL1 — opens hold rows 04 02 00 01 03" },
  { "id": "M014", "type": "discharge", "containerId": "HLXU7703959", "from": { "vessel": "22-00-08" }, "to": { "lane": "L3" } },
  { "id": "M018", "type": "load", "containerId": "ONEU5266480", "from": { "lane": "L3" }, "to": { "vessel": "22-00-08" } },
  { "id": "M022", "type": "hatchcover", "hatchCoverId": "22-2", "from": { "laydown": "HCL1" }, "to": { "coverSeat": "22-2" },
    "note": "Centre hatch cover back on its own seat — land it square on the locators" },
  { "id": "M023", "type": "restow", "containerId": "ONEU2088147", "from": { "buffer": "QB01", "tier": 1 }, "to": { "vessel": "22-02-82" },
    "note": "Restow via quay, leg 2: back on board from QB01" }
]
```

This is an excerpt: the moves between these are in the example.

A panel left on a laydown at the end of the queue gives a warning, since the vessel cannot sail with an open hatch.

---

## 10. `yardSide`

| Field | Type | Unit | Required/Default | Meaning |
|---|---|---|---|---|
| `transport` | `"terminalTractor"` / `"agv"` | — | **req** | Horizontal transport under the crane. |
| `chassisType` | `"combo2040"` / `"bombCart"` | — | required for `terminalTractor`; not allowed for `agv` | `combo2040` = 1 × 40/45 ft or 2 × 20 ft on twistlocks. `bombCart` = cassette-style trailer with guides and no twistlocks. |
| `single20Position` | `"front"` / `"centre"` / `"rear"` | — | `"rear"` | Default position of a single 20 ft box on a chassis or AGV. *Open question to you, see STEP1_PROPOSAL §8 q9.* |
| `lanes` | array, ≥ 1 item | — | **req** | Truck lanes running along the quay. |
| `lanes[].id` | string (id) | — | **req** | Lane id used in moves, e.g. `"L2"`. |
| `lanes[].fromWatersideRail_m` | number | m | **req** | Lane centreline. Negative = landside: between the rails (0 … −30.48) or in the backreach. |
| `lanes[].use` | `"discharge"` / `"load"` / `"both"` | — | `"both"` | Which moves may use the lane. |
| `lanes[].direction` | `"increasing"` / `"decreasing"` | — | `"increasing"` | Driving direction along the quay marks. |
| `quayBuffer` | object | — | *opt* | Quay buffer stack. If absent, there is no buffer. |
| `quayBuffer.slots` | integer ≥ 1 | — | **req** | Number of slots. |
| `quayBuffer.fromWatersideRail_m` | number | m | **req** | Centreline of the buffer row. |
| `quayBuffer.quayMark_m` | number ≥ 0 | m | `crane.startQuayMark_m` | Centre of slot 1. Slot n lies at `quayMark_m` + (n−1) × pitch, towards increasing quay marks. The pitch is 13.4 m for 40 ft slots and 6.8 m for 20 ft slots. |
| `quayBuffer.maxTiers` | integer 1–3 | tiers | `1` | Maximum stack height in the buffer. |
| `quayBuffer.slotSize` | `20` / `40` | ft | `40` | Slot length. A 45 ft box on a 40 ft slot gives a warning. |
| `quayBuffer.idPrefix` | string (id) | — | `"QB"` | Slot ids are the prefix + 2 digits: `QB01`, `QB02` … |
| `hatchCoverLaydowns` | array | — | *opt* | Quay areas for landing hatch cover panels. |
| `hatchCoverLaydowns[].id` | string (id) | — | **req** | Laydown id used in moves, e.g. `"HCL1"`. |
| `hatchCoverLaydowns[].fromWatersideRail_m` | number | m | **req** | Laydown centre, normally in the backreach. |
| `hatchCoverLaydowns[].quayMark_m` | number ≥ 0 | m | `crane.startQuayMark_m` | Laydown centre along the quay. |
| `hatchCoverLaydowns[].maxStack` | integer ≥ 1 | panels | `1` | Maximum number of panels stacked on this laydown. |
| `truckTiming` | object | — | *opt* | When trucks or AGVs arrive. |
| `truckTiming.mode` | `"justInTime"` / `"fixedInterval"` | — | `"justInTime"` | `justInTime`: trucks are called for the next moves. `fixedInterval`: a truck arrives every `interval_s`. |
| `truckTiming.lookAheadMoves` | integer ≥ 1 | moves | `1` | justInTime: trucks are called for the next N moves. |
| `truckTiming.travelTime_s` | number ≥ 0 | s | `60` | justInTime: time from call to arrival under the crane. |
| `truckTiming.interval_s` | number > 0 | s | `90` | fixedInterval: time between arrivals. |
| `truckTiming.jitter_s` | number ≥ 0 | s | `15` | Uniform ± random variation of arrival times. |
| `truckTiming.seed` | integer | — | `1` | Random seed for jitter and stop accuracy. |
| `truckTiming.stopAccuracy_m` | number ≥ 0 | m | `0.30` tractor / `0.03` AGV | Standard deviation of the stop position along the lane. |
| `truckTiming.departDelay_s` | number ≥ 0 | s | `5` | Wait after the spreader unlocks or lifts before the truck drives off. |

```json
"yardSide": {
  "transport": "terminalTractor", "chassisType": "combo2040", "single20Position": "rear",
  "lanes": [
    { "id": "L1", "fromWatersideRail_m": -4.5, "use": "discharge", "direction": "increasing" },
    { "id": "L2", "fromWatersideRail_m": -8.5, "use": "discharge", "direction": "increasing" },
    { "id": "L3", "fromWatersideRail_m": -12.5, "use": "both", "direction": "increasing" },
    { "id": "L4", "fromWatersideRail_m": -16.5, "use": "both", "direction": "increasing" },
    { "id": "L5", "fromWatersideRail_m": -20.5, "use": "load", "direction": "decreasing" },
    { "id": "L6", "fromWatersideRail_m": -24.5, "use": "load", "direction": "decreasing" }
  ],
  "quayBuffer": { "slots": 2, "fromWatersideRail_m": -48.0, "quayMark_m": 509.0, "maxTiers": 1, "slotSize": 40, "idPrefix": "QB" },
  "hatchCoverLaydowns": [ { "id": "HCL1", "fromWatersideRail_m": -39.0, "quayMark_m": 509.0, "maxStack": 1 } ],
  "truckTiming": { "mode": "justInTime", "lookAheadMoves": 2, "travelTime_s": 60, "jitter_s": 15, "seed": 1,
                   "stopAccuracy_m": 0.30, "departDelay_s": 5 }
}
```

Six lanes between the legs: the two nearest the waterside legs receive discharged boxes, the middle two work both ways, and the two landside lanes deliver export boxes, running the other way along the quay. The buffer (QB01, QB02) and the laydown HCL1 are in the backreach, abeam bay 22.

---

## 11. `environment`

| Field | Type | Unit | Required/Default | Meaning |
|---|---|---|---|---|
| `wind` | object | — | *opt* | Wind acting on the spreader and box: lateral force and sway. |
| `wind.speed_kn` | number ≥ 0 | kn | `0` | Mean wind speed. |
| `wind.fromDirection_deg` | number 0–360 | deg | `0` | True direction the wind blows **from** (meteorological convention). Converted to crane-relative wind with `quay.orientation_deg`. |
| `wind.gustSpeed_kn` | number ≥ 0 | kn | = `speed_kn` (no gusts) | Gust peak. Must be ≥ `speed_kn`. |
| `wind.gustInterval_s` | array `[min, max]` | s | `[20, 60]` | Random time between gusts. |
| `timeOfDay` | string `"HH:MM"` (24 h) | — | `"12:00"` | Local time; drives the lighting. |
| `weather` | `"clear"` / `"overcast"` / `"rain"` / `"fog"` | — | `"clear"` | Weather visuals. |
| `visibility_m` | number > 0 | m | from the WeatherPresets asset for that weather | Visibility. |
| `seaState` | integer 0–9 | Douglas | `1` | Sea state. Visual only; the vessel does not move. |

```json
"environment": {
  "wind": { "speed_kn": 20, "fromDirection_deg": 250, "gustSpeed_kn": 27, "gustInterval_s": [20, 60] },
  "timeOfDay": "06:40", "weather": "overcast", "visibility_m": 8000, "seaState": 3
}
```

---

## 12. `crane`

| Field | Type | Unit | Required/Default | Meaning |
|---|---|---|---|---|
| `profile` | string | — | **req** | `profileId` of a CraneProfile asset, e.g. `"SPP-65"` (super post-Panamax, 65 m outreach). An unknown id is an error, and the message lists the known profiles. |
| `id` | string (id) | — | *opt* | Crane number shown on the HUD, e.g. `"QC04"`. |
| `startQuayMark_m` | number ≥ 0 | m | **req** | Gantry start: quay mark of the crane centreline. |
| `startTrolley_m` | number | m | `-15` | Trolley start, `fromWatersideRail_m` (for SPP-65: +65.0 … −50.48). |
| `startHoistHeight_m` | number | m | `30` | Hoist start height: spreader underside above the apron (for SPP-65: −20 … +48). |
| `boomRaisedAtStart` | boolean | — | `false` | The boom starts raised. This needs the trolley parked landside of the boom hinge. |
| `twinLiftEnabled` | boolean | — | `false` | A twin-twenty spreader is available. Required for twin-lift moves. |
| `antiSwayOnAtStart` | boolean | — | `false` | Electronic anti-sway is switched on at the start. |
| `softLimits` | object | — | *opt* | Gantry soft limits for this scenario, inside the rail-end hard limits. |
| `softLimits.minQuayMark_m` | number ≥ 0 | m | *opt* | Lowest quay mark the crane centreline may reach. No lower soft limit if omitted. |
| `softLimits.maxQuayMark_m` | number ≥ 0 | m | *opt* | Highest quay mark the crane centreline may reach. No upper soft limit if omitted. |
| `blockedZones` | array | — | *opt* | Quay stretches the crane must not gantry into, e.g. where a neighbouring crane is working. |
| `blockedZones[].fromQuayMark_m` | number ≥ 0 | m | **req** | Start of the zone. |
| `blockedZones[].toQuayMark_m` | number ≥ 0 | m | **req** | End of the zone (> start). |
| `blockedZones[].reason` | string | — | *opt* | Shown on the HUD, e.g. `"QC05 working bay 38 — keep gantry separation"`. |

```json
"crane": {
  "profile": "SPP-65", "id": "QC04", "startQuayMark_m": 509.0, "startTrolley_m": -15.0, "startHoistHeight_m": 30.0,
  "boomRaisedAtStart": false, "twinLiftEnabled": true, "antiSwayOnAtStart": false,
  "softLimits": { "minQuayMark_m": 449.0, "maxQuayMark_m": 569.0 },
  "blockedZones": [ { "fromQuayMark_m": 425.0, "toQuayMark_m": 485.0, "reason": "QC05 working bay 38 — keep gantry separation" } ]
}
```

QC04 may gantry between quay marks 449 and 569 (bay 22 ± 60 m), except where QC05 works bay 38 (quay mark 455.4): its centreline stays above quay mark 485.

---

## 13. `rules`

The defaults come from the RulesDefaults asset.

| Field | Type | Unit | Required/Default | Meaning |
|---|---|---|---|---|
| `hardLanding_mps` | number > 0 | m/s | `0.5` | Downward speed at first contact above which a landing counts as hard. |
| `placementTolerance_cm` | number > 0 | cm | `5.0` | Maximum position error at set-down. |
| `yawTolerance_deg` | number > 0 | deg | `1.0` | Maximum yaw (skew) error at set-down. |
| `maxSwayAtPlacement_cm` | number > 0 | cm | `10` | Maximum sway amplitude of the spreader at set-down. |
| `moveTimeTargets_s` | object | — | *opt* | Target move time per move type. |
| `moveTimeTargets_s.discharge` | number > 0 | s | `90` | Target for a discharge move. |
| `moveTimeTargets_s.load` | number > 0 | s | `100` | Target for a load move. |
| `moveTimeTargets_s.restow` | number > 0 | s | `120` | Target for a restow move (each leg). |
| `moveTimeTargets_s.hatchcover` | number > 0 | s | `240` | Target for a hatch cover move. |
| `wrongSlot` | `"fail"` / `"penalise"` | — | `"fail"` | Set-down in the wrong slot: `fail` = the move fails; `penalise` = the move counts, with a penalty. |
| `windStopLimit_kn` | number > 0 | kn | `40` | Wind speed above which crane work stops. Exceeding it in `environment` gives a warning. |

```json
"rules": {
  "hardLanding_mps": 0.5, "placementTolerance_cm": 5.0, "yawTolerance_deg": 1.0, "maxSwayAtPlacement_cm": 10,
  "moveTimeTargets_s": { "discharge": 90, "load": 100, "restow": 120, "hatchcover": 240 },
  "wrongSlot": "fail", "windStopLimit_kn": 40
}
```

---

## 14. Validation

There are two layers:

1. **The JSON Schema in your editor** checks structure as you type: group A, and the simple field combinations.
2. **The ScenarioLoader** runs every group, A to I, on load. It is the authority, and it collects **every** problem before reporting.

Each message has the form `<JSON path> <box / slot / move>: <what is wrong> — <how to fix it>`.

| Level | Effect |
|---|---|
| **error (E)** | The scenario does not load. The browser shows the full list. |
| **warning (W)** | The scenario loads. Warnings are listed in the browser and the Console. |

Group A shows typical wording (the loader adds line:column). From group B on, every example message is what a prototype of these checks (used to verify this page) reports for the example scenario with one fault put into it (a wrong check digit, a move out of order, a box added or moved, and so on), so the boxes, slots and moves named are real. The final Unity wording is fixed in Phase 2.

**A. Parse and structure** (all E)
- [ ] Valid JSON: `line 212:9: JSON syntax error — expected "," or "}" after a property value.`
- [ ] No unknown keys: `workQueue[4]: unknown key "form" (line 212:9) — did you mean "from"?`
- [ ] Every required field present: `vessel.mooring: missing required field "bowAtQuayMark_m".`
- [ ] Correct JSON types: `vessel.bays.count: expected an integer, found the string "20".`
- [ ] Enum values: `yardSide.transport: "truck" is not allowed — use "terminalTractor" or "agv".`
- [ ] Ranges: `environment.seaState: 12 is outside 0–9 (Douglas scale).`
- [ ] Patterns (slot, container number, operator, colour, UN/LOCODE, time, date, ids): `bayPlan[4].slot: "22-4-84" is not bay-row-tier like "22-04-84".`
- [ ] Field combinations: type `HC` needs height `HC`; `reeferSetpoint_C` only on RF; `oog` only on FR/OT; `chassisType` required with terminalTractor and not allowed with agv; `twinContainerId` if and only if `twinLift`; hatchcover moves take `hatchCoverId` and no container fields; `loadList` required when there is a load move. Example: `bayPlan[8] EGHU9103722 @ 22-01-82: type "HC" (high-cube dry van) requires height "HC"`

**B. Version** (E)
- [ ] `schemaVersion` present and supported: `schemaVersion: version 2 is not supported by this build (supported: 1)`

**C. Identity** (all E)
- [ ] ISO 6346 format and check digit: `bayPlan[0] CMAU5693109 @ 22-00-86: ISO 6346 check digit is wrong — CMAU569310 needs check digit 8, not 9 (→ CMAU5693108)`
- [ ] IMO check digit: `vessel.imo: IMO 9999994 fails the check digit — last digit should be 3`
- [ ] containerId unique across bayPlan and loadList: `loadList[2] HLXU4926706: duplicate containerId — already used at bayPlan[17]`
- [ ] Move, lane, buffer, laydown and cover ids unique: `workQueue[9].id: duplicate move id "M009" — also used by workQueue[8]`
- [ ] Known crane profile: `crane.profile: unknown crane profile "SPP-70" — known profiles: SPP-65`

**D. Addressing** (all E)
- [ ] Slot format: `workQueue[3].to: slot "2204-84" is not bay-row-tier format like "22-04-84"`
- [ ] Bay exists: `bayPlan[0] CMAU5693108 @ 82-00-82: bay 82 does not exist — the vessel has 40 ft bays 02–78 (20 ft bays 01–79)`
- [ ] Even bay is a 40 ft bay number: `bayPlan[19] ONEU6634020 @ 24-16-82: bay 24 is not a 40 ft bay number — 40 ft bays are 02, 06, 10, … (4n−2); did you mean 22 or 26?`
- [ ] Size matches bay parity: `workQueue[24] M025 load MRKU6944716: workQueue[24].to 22-04-82: a 20 ft box must use an odd bay (21 or 23), not the 40 ft bay 22`
- [ ] Row exists for the hold/deck width of that bay: `bayPlan[7] CSNU6340190 @ 22-18-84: row 18 does not exist on deck of bay 22 (17 rows: 16 … 15)`
- [ ] Tier even and in range: `workQueue[15] M016 load CSNU9188028: workQueue[15].to 22-04-07: tier 07 is odd — tiers are even numbers (02, 04, … in the hold; 82, 84, … on deck)`
- [ ] No 45 ft in the hold: `bayPlan[48] MSCU5560386 @ 22-10-02: 45 ft boxes can never be stowed in the hold (cell guides are 40 ft) — stow it on deck`
- [ ] 20 ft in the hold only if allowed: `bayPlan[48] MSCU5560690 @ 01-00-02: bay 02 does not allow 20 ft boxes in the hold (hold20ftAllowed = false)`

**E. Physical stowage of the initial bay plan** (E unless marked)
- [ ] No overlaps, including a 40 ft box against the 20 ft pair: `bayPlan[48] MSCU5560452 @ 21-05-84: overlaps CMAU8450760 at 22-05-84 (40 ft bay 22 = 20 ft bays 21 + 23) — two boxes in one slot`
- [ ] Every box supported: `bayPlan[13] ONEU1159375 @ 22-06-86: nothing stowed at 22-06-84 — the box would float`
- [ ] No 20 ft box on a 40/45 ft box: `bayPlan[48] MSCU5560215 @ 21-10-84: 20 ft box on top of 40 ft MSCU5803260 — a 20 ft box cannot stand on a 40/45 ft box (no corner castings at mid-length)`
- [ ] A 40 ft box stands on a 40/45 ft box or on BOTH 20 ft boxes (of equal height): `bayPlan[23] MSCU9572132 @ 22-07-84: 40 ft box over a single 20 ft box (TCNU4061273) — nothing at 23-07-82; a 40 ft box needs a 40/45 ft box or BOTH 20 ft boxes below`
- [ ] A 45 ft box stands only on a 40/45 ft box: `bayPlan[49] MSCU8800032 @ 22-07-86: 45 ft box needs a 40 or 45 ft box below, found MSCU8800011 (20 DV) + MSCU8800027 (20 DV)`
- [ ] 45 ft boxes on deck are above lashing-bridge height: `bayPlan[19] ONEU6634020 @ 22-16-82: 45 ft box at tier 82 would hit the lashing bridge forward of bay 22 (2 tiers high) — 45 ft boxes only from tier 86 up in this bay`
- [ ] Hold stack fits under the hatch cover: `bayPlan[56] MSCU6000180 @ 22-06-18: hold stack in bay 22 row 06 reaches 10.06 m, 1.66 m above the hatch cover underside (8.40 m) — 9 tiers incl. 9 high cube do not fit under the cover`
- [ ] Deck stack + box + spreader clears the crane lift height (here with the freeboard set to 40 m): `bayPlan[0] CMAU5693108 @ 22-00-86: deck stack in bay 22 row 00 tops out at 45.84 m; lifting a box over it needs 51.73 m (stack + HC box + spreader/headblock 3 m) > crane lift height 48 m`
- [ ] Outermost occupied row within outreach (here with the vessel 17 m off the fenders): `bayPlan[19] ONEU6634020 @ 22-16-82: row 16 is 65.92 m from the waterside rail (outer box edge) — beyond crane outreach 65 m`
- [ ] Nothing stowed on an OOG box: `bayPlan[27] HLXU9401583 @ 22-13-82: MSCU5560529 is stowed on top of out-of-gauge FR HLXU9401583 — nothing may be stowed on an OOG box`. Over-width next to an occupied row: **W**.
- [ ] RF only in declared reefer positions: `bayPlan[43] SEGU5299172 @ 22-01-06: reefer SEGU5299172 at 22-01-06 is not in a declared reefer position (vessel.reeferPositions) — no power socket there`
- [ ] tare ≤ gross ≤ max gross: `bayPlan[9] CMAU4829308 @ 22-04-84: gross weight 3.2 t is below the tare 3.89 t — an empty box has gross = tare` / `bayPlan[6] MSCU6928472 @ 22-02-82: gross weight 31.2 t exceeds the maximum gross 30.48 t`
- [ ] Vessel within the quay: `vessel.mooring.bowAtQuayMark_m: vessel occupies quay marks 486.00–820.00 m but the quay runs 0–800 m — move the bow mark or lengthen the quay`

**F. Hatch covers** (E unless marked)
- [ ] Panel rows exist: `vessel.hatchCovers.overrides[1].panels[1].rows[5]: panel 22-2: hold row 17 does not exist in bay 22 (15 hold rows)`
- [ ] Each hold row under exactly one panel per covered bay: `vessel.hatchCovers.overrides[1].panels[2].rows[0]: panel 22-3: hold row 03 is already covered by panel 22-2` / `vessel.hatchCovers.overrides[1]: bay 22: hold row 05 is not covered by any panel`
- [ ] Panel ids unique: `vessel.hatchCovers.overrides[0].panels[1].id: hatch cover id "02-1" is already used by vessel.hatchCovers.overrides[0].panels[0]`
- [ ] Explicit dimensions plausible (**W**): `vessel.hatchCovers.overrides[0].panels[0].width_m: panel 02-1 width 9 m does not match its 6 rows × 2.55 m = 15.30 m`
- [ ] Panel weight ≤ crane SWL: `vessel.hatchCovers.overrides[0].panels[0].weight_t: hatch cover 02-1 weighs 70 t, above the crane's rated load under spreader 65 t`

**G. Work queue references** (E unless marked)
- [ ] Container exists: `workQueue[6] M007 discharge MSCU6928474: container MSCU6928474 is not in bayPlan or loadList — did you mean MSCU6928472?`
- [ ] Status fits the move (discharge → `discharge`, restow → `restow`, never `stay`): `workQueue[4] M005 discharge ONEU1159375: ONEU1159375 has status "stay" (ROB) — it must not be moved; change its status to discharge or restow`
- [ ] Load moves take loadList boxes, and loadList boxes appear only in load moves: `workQueue[6] M007 discharge CSNU9188028: CSNU9188028 is an export box from loadList — it can only be used by a load move`
- [ ] from/to kinds allowed for the type ([§9.3](#93-move-matrix)): `workQueue[2] M003 discharge CSNU6340190: discharge cannot go vessel → vessel; allowed: vessel → lane, vessel → buffer`
- [ ] Lane, buffer, laydown and cover ids exist: `workQueue[3] M004 discharge HLXU8362013: workQueue[3].to: lane "L7" does not exist (lanes: L1, L2, L3, L4, L5, L6)`
- [ ] Lane `use` matches: `workQueue[0] M001 discharge CMAU5693108: workQueue[0].to: lane L5 is a load lane — cannot be used for receiving discharged boxes`
- [ ] Twin-lift rules ([§9.5](#95-twin-lift-rule)): `workQueue[5] M006 discharge MSKU7219043+HLXU8362013: twin lift needs two 20 ft boxes (MSKU7219043 is 20 ft, HLXU8362013 is 40 ft)` / `workQueue[5] M006 discharge MSKU7219043+MSKU7205585: twin lift requested but crane.twinLiftEnabled is not true`
- [ ] Every discharge/restow box is moved (**W**): `bayPlan[40] HLXU7703959 @ 22-00-08: status discharge but no move handles it — it will stay on board`
- [ ] Every loadList box is loaded (**W**): `loadList[11] EGHU8029317: export box is never loaded`

**H. Sequence dry run** (E unless marked; the moves are simulated in order)
- [ ] `from` matches where the box is at that moment: `workQueue[12] M013 discharge MRKU6182903: MRKU6182903 is not at 22-02-06 — it is on board at 22-02-08 (lifting it from there)`
- [ ] Nothing stowed on top of the box being lifted: `workQueue[0] M004 discharge HLXU8362013: CMAU5693108 @ 22-00-86 is stowed on top of HLXU8362013 — lift it first`
- [ ] Hold slot not under a panel that is still on its seat: `workQueue[11] M013 discharge MRKU6182903: 22-02-08 is in the hold under hatch cover 22-2, which is still on its seat — add a hatchcover move to lift 22-2 first`
- [ ] Target free and supported at that moment: `workQueue[23] M024 load MSKU3855200: target 22-02-82 is occupied by ONEU2088147 @ 22-02-82` / `workQueue[21] M023 restow ONEU2088147: ONEU2088147 @ 22-02-82: nothing to stand on — hatch cover 22-2 is not on its seat (it is on laydown HCL1)`
- [ ] Panel lifted only when no deck box stands on its rows (bays B−1, B, B+1): `workQueue[10] M012 hatchcover 22-2: cannot lift hatch cover 22-2: deck boxes still stand on it (bays 21/22/23, rows 04,02,00,01,03): SEGU4155627 @ 22-03-82 — discharge or restow them first`
- [ ] Panel returns only to its own seat: `workQueue[21] M022 hatchcover 22-2: workQueue[21].to: cover 22-2 can only come off / go back to its own seat "22-2", not "22-3"`
- [ ] Laydown `maxStack` and buffer `maxTiers` respected: `workQueue[12] M012A hatchcover 18-2: laydown HCL1 is full (1 cover(s), maxStack 1)` / `workQueue[2] M003 restow CSNU6340190: buffer QB01 is full (1 tier(s), maxTiers 1)`
- [ ] Final state passes group E: `final state: HLXU9401583 @ 22-13-82: CMAU1570466 is stowed on top of out-of-gauge FR HLXU9401583 — nothing may be stowed on an OOG box`
- [ ] Vessel closed and restows complete at the end (**W**): `workQueue: hatch cover 22-2 is still on laydown HCL1 at the end — the vessel cannot sail with an open hatch` / `workQueue: restow box ONEU2088147 is left in buffer QB01 at the end — add restow leg 2 (buffer → vessel)`

**I. Crane and yard sanity** (E unless marked)
- [ ] Crane start inside the quay and the soft limits, and not in a blocked zone: `crane.startQuayMark_m: start position: quay mark 470.00 is inside blocked zone 425–485 (QC05 working bay 38 — keep gantry separation)`
- [ ] Every bay, buffer slot and laydown used is reachable within the soft limits and outside blocked zones (here with the blocked zone stretched to 515): `workQueue[0] M001 discharge CMAU5693108: workQueue[0].from bay 22: quay mark 509.00 is inside blocked zone 425–515 (QC05 working bay 38 — keep gantry separation)`
- [ ] Lanes between the rails or in the backreach; a lane within ±1.5 m of a rail (under the legs) is **W**: `yardSide.lanes[5]: lane L6 at LS 29.50 m is only 0.98 m from the landside rail — its 2.44 m wide footprint comes within 1.5 m of the rail, under the crane legs`
- [ ] Buffer and laydowns within trolley range (backreach): `yardSide.hatchCoverLaydowns[0]: laydown HCL1 at LS 52.00 m is beyond the backreach — the trolley reaches LS 50.48 m`
- [ ] Gust ≥ mean wind: `environment.wind.gustSpeed_kn: gust 15 kn is below the mean wind 20 kn`
- [ ] Wind above `windStopLimit_kn` (**W**): `environment.wind.speed_kn: mean wind 45 kn is above the wind stop limit 40 kn — the crane would be stopped`

---

## 15. Versioning

- `schemaVersion` is an integer, and this build accepts `1` only.
- Adding a new **optional** field does not bump the version.
- Breaking changes do bump it: a rename, a removal, a changed meaning or a new required field. The loader then migrates older files in memory and warns.
- An older build reading a file that uses a newer optional field reports `unknown key … (written for a newer QuayOps?)`.

**Files:** example [`deepsea-bay22-mixed.json`](../Assets/QuayOps/Scenarios/deepsea-bay22-mixed.json) · schema [`quayops-scenario.v1.schema.json`](../Assets/QuayOps/Scenarios/Schema/quayops-scenario.v1.schema.json) · design notes [`STEP1_PROPOSAL.md`](STEP1_PROPOSAL.md)
