# QuayOps scenario validation rules, v1

> **Draft for review (Step 1). This is the loader specification for Phase 2.** It lists every check the ScenarioLoader runs, its severity and the message it prints. Rule ids are stable: each one gets an EditMode test in Phase 2.

The field reference is [`SCENARIO_FORMAT.md`](SCENARIO_FORMAT.md). The JSON Schema ([`quayops-scenario.v1.schema.json`](../scenarios/Schema/quayops-scenario.v1.schema.json)) catches most of group A in your editor as you type. The loader is the authority: it runs every group, A to I, and collects **every** problem before it reports.

## How the loader reports

```text
read text → pre-pass (syntax, comments, duplicate keys, line:column) → JSON tree
→ strict reader (A: unknown keys, required, types, enums, ranges, patterns, field combinations; "04"/4 normalised)
→ B version → C identity → D vessel layout and addressing → E stowage on arrival → F hatch covers
→ G work queue references → I crane, yard and environment → H dry run of the work queue in order → build the scene
```

| Severity | Effect |
|---|---|
| **error** | The scenario does not load. The scenario browser shows the full list. |
| **warning** | The scenario loads. Warnings are listed in the browser and in the Console. |
| **info** | A note, e.g. where the crane starts. Shown with the warnings. |

- **Message format:** `<JSON path> [box, slot or move]: <what is wrong> — <how to fix it>`. Box context reads `bayPlan[13] ONEU1159375 @ 22-06-86`; move context reads `workQueue[10] M012 hatchcover 22-2`.
- **Line and column:** in the app every message also carries the line and column of the JSON token, e.g. `(line 212:9)`. The prototype prints them only for the pre-pass (A01–A03).
- **Consequential errors:** one fault can cause more than one line (a box that cannot be placed is not simulated later, H29). If `vessel`, `crane` or `yardSide` are too broken to build the vessel geometry, groups D–F and H and the checks of G and I that need the geometry are skipped; group C, the static checks of G and the rest of I still run (A36). A malformed slot is reported once (A12, not again as D28).
- **Where the messages come from:** every message below is the exact output of a prototype of these checks (a Node.js script used to verify the Step 1 files) for a copy of the example [`deepsea-bay22-mixed.json`](../scenarios/deepsea-bay22-mixed.json) with **one** fault put in. Rules on lone 20 ft bays and raised hold floors use a small feeder test scenario instead (lone bay 01, then 40 ft bays 04, 08 … 32). Rows marked *planned wording* are not in the prototype; their wording is a proposal. The final Unity wording may still be polished in Phase 2, but the checks and severities are as listed.
- **Totals:** 225 rules: 183 errors, 37 warnings, 5 info; 4 with planned wording.

## A. Parse and structure

Accepted without any message: an integer written with a zero fraction (`20.0`), and list items of rows, tiers and bays written either as integers or as zero-padded strings (`4` / `"04"`, `82` / `"82"`, `22` / `"022"`). The loader normalises them. `holdRowBaseTier` keys stay 2-digit row strings.

| # | Severity | Check | Message |
|---|---|---|---|
| A01 | error | The file is one JSON object in valid JSON syntax (UTF-8). The message gives line and column. | `deepsea-bay22-mixed.json: JSON syntax error at line 4, column 3: Expected ',' or '}' after property value in JSON at position 82` |
| A02 | error | No comments (`//`, `/* */`). Every comment is reported with line:column. | `workQueue: comment at line 135, column 5 — comments are not allowed in scenario JSON; remove it (put text in a move "note" or scenario.description)` |
| A03 | error | No duplicate keys: plain JSON parsers silently keep the last one. A pre-pass reports every duplicate with line:column. | `bayPlan[1]: duplicate key "size" at line 70, column 92 (first at line 70, column 80) — JSON would silently keep only the last value; remove one` |
| A04 | error | No unknown keys, with a did-you-mean suggestion. Every object in the format is strict. | `workQueue[4].form: unknown key "form" — did you mean "from"?` |
| A05 | error | Every required field present. | `vessel.mooring: missing required field "bowAtQuayMark_m"` |
| A06 | error | Correct JSON type (string, number, integer, boolean, object, array). An integer written with a zero fraction (`20.0`) is accepted, as in JSON Schema. | `vessel.bays.count: expected an integer, found "20"` |
| A07 | error | Enum values. | `yardSide.transport: expected one of "terminalTractor", "agv", found "truck"` |
| A08 | error | Numeric ranges from the schema (minimum, maximum, > 0), e.g. `seaState` 0–9, `apronAboveWaterline_m` > 0. | `environment.seaState: 12 is above the maximum 9` |
| A09 | error | `lashingBridges.levels` is 0–4 tiers. | `vessel.lashingBridges.levels: 5 is above the maximum 4` |
| A10 | error | Array lengths, e.g. `workQueue` ≥ 1 move, `reeferPositions` ≥ 1 block (an empty list is flagged, then treated as absent). | `vessel.reeferPositions: needs at least 1 item(s)` |
| A11 | error | `gustInterval_s` is exactly two numbers > 0, `[min, max]`. | `environment.wind.gustInterval_s: needs at least 2 item(s)` |
| A12 | error | Patterns: slot, container number, operator, colour, UN/LOCODE, IMO, time, ids. A malformed slot is reported here once; the addressing check D28 then stays silent for it. | `bayPlan[7].slot: "22-1-84" does not match the required format /^\d{2,3}-\d{2}-\d{2}$/` |
| A13 | error | `created` is a real calendar date (YYYY-MM-DD). | `scenario.created: "2026-02-30" is not a real calendar date (YYYY-MM-DD)` |
| A14 | error | Strings that must not be empty (`scenario.title`, `vessel.name`, `crane.profile`); ids at most 32 characters. | `scenario.title: must not be empty` |
| A15 | error | List items of rows, tiers and bays: an integer or a zero-padded string (`4` or `"04"`, `82` or `"82"`, `22` or `"022"`). | `vessel.lashingBridges.afterBays[3]: expected a bay number: integer 1–999 or zero-padded string like "22" / "022", found "8"` |
| A16 | error | A list names each row, tier or bay once, after normalising (`8` and `"08"` are the same). | `vessel.reeferPositions[0].rows: lists 8 twice ("08" and 8 are the same number)` |
| A17 | error | Type `HC` (high-cube dry van) needs height `HC`. | `bayPlan[8] EGHU9103722 @ 22-01-82: type "HC" (high-cube dry van) requires height "HC"` |
| A18 | error | Type `DV` (standard dry van) needs height `standard`: a high-cube dry van is written type `HC`, height `HC`. | `bayPlan[1] HLXU8362013 @ 22-00-84: type "DV" is the standard-height dry van — a high-cube dry van is written type "HC", height "HC"` |
| A19 | error | `reeferSetpoint_C` only on type `RF`. | `bayPlan[1] HLXU8362013 @ 22-00-84: reeferSetpoint_C is only allowed on RF containers (this is DV)` |
| A20 | error | `oog` only on type `FR` or `OT`. | `bayPlan[1] HLXU8362013 @ 22-00-84: oog (out of gauge) is only allowed on FR and OT containers (this is DV)` |
| A21 | error | `chassisType` is required with `terminalTractor` … | `yardSide: chassisType is required for terminalTractor transport ("combo2040" or "bombCart")` |
| A22 | error | … and not allowed with `agv`. | `yardSide.chassisType: chassisType is not used with AGVs — remove it` |
| A23 | error | A location has exactly one of `vessel`, `lane`, `buffer`, `coverSeat`, `laydown`. | `workQueue[3].to: names lane and buffer — a location has exactly one of vessel, lane, buffer, coverSeat, laydown` |
| A24 | error | `chassisPosition` only with `lane`. | `workQueue[1].to.chassisPosition: chassisPosition is only allowed with a lane` |
| A25 | error | `tier` only with `buffer`. | `workQueue[3].to.tier: tier is only allowed with a buffer (vessel tiers are part of the slot)` |
| A26 | error | Container moves need `containerId`. | `workQueue[3] M004 discharge: containerId is required for a discharge move` |
| A27 | error | `hatchCoverId` only on `hatchcover` moves. | `workQueue[3] M004 discharge HLXU8362013: hatchCoverId is only allowed on hatchcover moves` |
| A28 | error | A `hatchcover` move needs `hatchCoverId` … | `workQueue[11] M012 hatchcover: hatchCoverId is required for a hatchcover move` |
| A29 | error | … and takes no `containerId` … | `workQueue[11] M012 hatchcover 22-2: containerId is not allowed on a hatchcover move` |
| A30 | error | … and no `twinLift` / `twinContainerId` at all (not even `"twinLift": false`). | `workQueue[11] M012 hatchcover 22-2: twinLift/twinContainerId are not allowed on a hatchcover move` |
| A31 | error | `"twinLift": true` needs `twinContainerId` … | `workQueue[5] M006 discharge MSKU7219043: twinLift needs twinContainerId (the aft 20 ft box)` |
| A32 | error | … and `twinContainerId` needs `"twinLift": true`. | `workQueue[5] M006 discharge MSKU7219043: twinContainerId given without "twinLift": true` |
| A33 | error | `loadList` is required (≥ 1 box) when any move is a `load`. | `loadList: required when the work queue has load moves — list the export boxes that arrive by truck` |
| A34 | error | The crane start is given as exactly one of `startQuayMark_m` or `startAtBay`: not both … | `crane: give the gantry start as startQuayMark_m OR startAtBay, not both — remove one` |
| A35 | error | … and not neither. | `crane: missing gantry start — add "startAtBay" (the bay to start abeam) or "startQuayMark_m" (a quay mark)` |
| A36 | error | When `vessel`, `crane` or `yardSide` are too broken to build the scenario geometry (vessel, crane start and yard share one quay frame: the crane start and the default buffer/laydown marks come from `crane`, the lanes from `yardSide`), one line says so. Groups D–F and H and the checks of G and I that need the geometry are skipped; group C, the static checks of G (containers, statuses, move types, lanes and buffer slots named) and the rest of I (yard positions and overlaps, crane, wind) still run; the yard and crane checks need their own block intact, and the message lists what is still checked. | `(root): scenario geometry not built (it places the vessel, the crane start and the yard on one quay frame) — fix the structural errors in vessel first; until then the checks that need it are skipped (groups D–F and H, parts of G and I); identities, work-queue references, yard, crane and wind are still checked` |

## B. Version

| # | Severity | Check | Message |
|---|---|---|---|
| B01 | error | `schemaVersion` present. | `schemaVersion: missing — add "schemaVersion": 1 at the top of the file` |
| B02 | error | `schemaVersion` supported by this build (v1 reads 1 only). | `schemaVersion: version 2 is not supported by this build (supported: 1)` |
| B03 | warning | A file of an older, still supported version is migrated in memory (from schema v2 on). | `schemaVersion: file written for format version 1 — migrated to version 2 in memory; save it in the new format to silence this` *(planned wording)* |
| B04 | error | An unknown key that a newer build defines gets a hint (optional fields are added without a version bump). | `vessel.bays.isoSizeType: unknown key "isoSizeType" — written for a newer QuayOps? This build reads format version 1` *(planned wording)* |

## C. Identity

| # | Severity | Check | Message |
|---|---|---|---|
| C01 | error | Container number in ISO 6346 format: owner code, category U/J/Z, 6-digit serial, check digit. | `bayPlan[1] HLXU836201 @ 22-00-84: container id is not ISO 6346 format — 3-letter owner code + category U/J/Z + 6-digit serial + check digit, e.g. CSQU3054383` |
| C02 | error | ISO 6346 check digit correct; the message gives the expected digit. | `bayPlan[0] CMAU5693109 @ 22-00-86: ISO 6346 check digit is wrong — CMAU569310 needs check digit 8, not 9 (→ CMAU5693108)` |
| C03 | warning | Equipment category is `U` (freight container); `J` and `Z` are allowed but unusual. | `bayPlan[1] HLXJ8362016 @ 22-00-84: equipment category "J" is not "U" (freight container) — J = detachable equipment, Z = trailer/chassis` |
| C04 | error | `containerId` unique across `bayPlan` and `loadList`. | `loadList[2] HLXU4926706: duplicate containerId — already used at bayPlan[17]` |
| C05 | error | Move ids unique, including the position defaults `M001`, `M002` …. | `workQueue[9].id: duplicate move id "M009" — also used by workQueue[8]` |
| C06 | error | Lane ids unique. | `yardSide.lanes[5].id: duplicate lane id "L5"` |
| C07 | error | Laydown ids unique. | `yardSide.hatchCoverLaydowns[1].id: duplicate laydown id "HCL1"` |
| C08 | warning | Lane, buffer slot and laydown ids do not repeat each other (confusing on the HUD). Panel ids: see F05. | `yardSide: id "L1" is used by a lane and a laydown — confusing on the HUD` |
| C09 | error | Known crane profile; the message lists the known `profileId`s. | `crane.profile: unknown crane profile "SPP-70" — known profiles: SPP-65` |
| C10 | error | IMO number check digit. | `vessel.imo: IMO 9999994 fails the check digit — last digit should be 3` |
| C11 | warning | `scenario.id` equals the file name without `.json`: it is the scenario browser key and the results file stem. | `scenario.id: "deepsea-bay22-mixed" differs from the file name "deepsea-bay22-copy.json" — the id is the scenario browser key and the results file stem; rename the file or the id` |
| C12 | warning | Scenario browser: two files with the same `scenario.id` are both listed and flagged. | `scenario browser: 2 files use scenario.id "deepsea-bay22-mixed" (deepsea-bay22-mixed.json, my-copy.json) — their results would share a file name; change one id` *(planned wording)* |

## D. Vessel layout and addressing

The layout checks (D01–D27) run on the `vessel` block. The addressing checks (D28–D44) run on every `bayPlan` slot and on every vessel slot in a move.

| # | Severity | Check | Message |
|---|---|---|---|
| D01 | error | `twentyOnlyBays` lists odd numbers only … | `vessel.bays.twentyOnlyBays[1]: 2 is even — twentyOnlyBays lists odd (lone 20 ft) bay numbers` |
| D02 | error | … each once (`1` and `"01"` are the same) … | `vessel.bays.twentyOnlyBays: lists "01" twice (1 and "01" are the same number)` |
| D03 | error | … and every listed bay is reached as a lone bay by the walk from the bow. The hint names the next odd bay the walk reaches after that 40 ft bay, and the layout (with a lone-bay clause only when the walk produced a lone bay) … | `vessel.bays.twentyOnlyBays[1]: bay 05 is never a lone 20 ft bay: walking from the bow it is the aft half of 40 ft bay 04 (03 + 05); did you mean 07? Otherwise list the odd bays before it as well, or remove 05. Layout: 40 ft bays 04–32, lone 20 ft bays 01 (numbering shifted by twentyOnlyBays)` |
| D04 | error | … a lone bay aft of the last 40 ft bay only as the next odd number of the walk. | `vessel.bays.twentyOnlyBays[1]: bay 37 lies beyond the last bay 32 — a lone 20 ft bay aft of the last 40 ft bay must be the next odd number of the walk (35)` |
| D05 | error | Bay references name a bay position (a 40 ft bay or a lone 20 ft bay): `bays.overrides[].bay`, `gaps[].afterBay`, `hatchCovers.baysWithout[]`, `hatchCovers.overrides[].bay`, `lashingBridges.afterBays[]`, `reeferPositions[].bays[]`, `crane.startAtBay`. The message names the nearest positions. | `vessel.lashingBridges.afterBays[0]: bay 24 is not a bay of this vessel (40 ft bays 02–78) — nearest: 22, 26` |
| D06 | error | A 20 ft half is not a bay position (only `crane.startAtBay` accepts one). | `vessel.hatchCovers.baysWithout[0]: bay 21 is the forward 20 ft half of 40 ft bay 22 — refer to the bay position 22` |
| D07 | error | One `bays.overrides` entry per bay. | `vessel.bays.overrides[2].bay: bay 02 is overridden twice` |
| D08 | error | `holdRowBaseTier` keys are 2-digit row strings … | `vessel.bays.overrides[1].holdRowBaseTier.3: key "3" must be a 2-digit row string like "04"` |
| D09 | error | … values even tier numbers … | `vessel.bays.overrides[1].holdRowBaseTier.03: 5 is odd — tier numbers are even (02, 04, … / 82, 84, …)` |
| D10 | error | … for a hold row that exists in that bay … | `vessel.bays.overrides[1].holdRowBaseTier.06: hold row 06 does not exist in bay 04 (5 hold rows)` |
| D11 | error | … not below `firstHoldTier` … | `vessel.bays.overrides[1].holdRowBaseTier.04: base tier 02 is below the first hold tier 04 — the base can only raise the floor` |
| D12 | error | … and not above the top hold tier of the bay. | `vessel.bays.overrides[1].holdRowBaseTier.04: base tier 12 is above the top hold tier 10 of bay 04 — row 04 would have no hold tiers` |
| D13 | error | A gap lies between two bays, not after the last one. | `vessel.bays.gaps[0].afterBay: a gap must lie between two bays, not after the last bay 78` |
| D14 | warning | A `deckhouse` or `funnel` has `heightAboveDeck_m` > 0 (otherwise it is drawn flat). | `vessel.bays.gaps[0]: deckhouse without heightAboveDeck_m — it will be drawn as a flat gap` |
| D15 | error | Tier numbers have two digits: the highest deck tier of every bay (overrides included) ≤ 98. The hint names a `firstDeckTier` that fits. | `vessel.bays.overrides[2]: bay 32: deck tiers 82–100 go above 98 (tier numbers have two digits) — use structure.firstDeckTier 80 or 72` |
| D16 | error | The hold tier range ends below `firstDeckTier`. | `vessel.bays.overrides[2]: bay 32: hold tiers 02–82 run into the deck tiers from 82 — the hold range must end below firstDeckTier; reduce tiersInHold or raise structure.firstDeckTier` |
| D17 | error | The hold tier range stays ≤ 98. | `vessel.bays: every bay: hold tiers 02–100 go above 98 — reduce tiersInHold` |
| D18 | error | The first bay starts aft of the bow … | `vessel.bays.firstBayCentreFromBow_m: bay 02 would start 1.10 m ahead of the bow` |
| D19 | error | … and the aftmost bay ends within LOA. | `vessel.bays: the aftmost bay 78 ends 302.70 m from the bow, beyond LOA 280 m — fewer bays, smaller pitch/gaps or a longer ship` |
| D20 | error | Deck rows × `rowPitch_m` fit the beam (+ 0.5 m). | `vessel.bays.rowsOnDeck: 17 deck rows × 2.55 m = 43.35 m is wider than the beam 40 m` |
| D21 | warning | Hold rows leave at least 1 m per side for the double hull. | `vessel.bays.rowsInHold: 17 hold rows × 2.55 m = 43.35 m leaves under 1 m per side for the double hull (beam 45 m)` |
| D22 | warning | Hold and deck row counts have the same parity, so deck rows line up over hold rows. | `vessel.bays: bay 06: 15 hold rows and 16 deck rows have different parity — deck rows will not line up over hold rows` |
| D23 | warning | `tiersInHold` standard boxes fit between tank top and hatch cover underside. | `vessel.bays: bay 06: 10 standard hold tiers (25.91 m) do not fit the 24.40 m between tank top and hatch cover underside` |
| D24 | warning | The crane can reach the tank top: a box on the lowest hold tier is above the hoist lower limit. | `vessel.structure: picking a box on the tank top needs the spreader at -20.41 m, below the crane's lower limit −20 m` |
| D25 | error | A lashing bridge stands between two bays, not after the last one … | `vessel.lashingBridges.afterBays[0]: a lashing bridge must stand between two bays, not after the last bay 78` |
| D26 | warning | … and a bridge next to a gap (deckhouse, funnel) is unusual. | `vessel.lashingBridges.afterBays[0]: bay 54 is followed by a deckhouse — a lashing bridge there is unusual` |
| D27 | warning | Reefer plug tiers match their `location` (deck tiers for "deck", hold tiers for "hold"). | `vessel.reeferPositions[0].tiers[3]: tier 02 is not a deck tier` |
| D28 | error | Slot in bay-row-tier format, in `bayPlan` and in move locations. A12 normally reports a malformed slot first; D28 is the loader's guard for slots that reach the addressing pass without the A12 format check (e.g. positions generated by decorative fill), so a malformed slot is still reported exactly once. The line shown is A12's, for a move location. | `workQueue[15].to.vessel: "2204-08" does not match the required format /^\d{2,3}-\d{2}-\d{2}$/` |
| D29 | error | Bay numbers start at 01. | `workQueue[15] M016 load CSNU9188028: workQueue[15].to 00-04-08: bay 00 does not exist — bay numbers start at 01` |
| D30 | error | An even bay is one of the 40 ft bays generated by the walk; the message names the nearest ones. | `bayPlan[19] ONEU6634020 @ 24-16-82: bay 24 is not a 40 ft bay of this vessel (40 ft bays 02–78) — nearest 40 ft bays: 22, 26` |
| D31 | error | An odd bay is a lone 20 ft bay or a 20 ft half of a 40 ft bay. | `bayPlan[22] TCNU4061273 @ 81-07-82: bay 81 is not a 20 ft bay of this vessel (40 ft bays 02–78) — nearest 20 ft bays: 79` |
| D32 | error | A 20 ft box uses an odd bay … | `workQueue[24] M025 load MRKU6944716: workQueue[24].to 22-04-82: a 20 ft box must use an odd bay (21 or 23), not the 40 ft bay 22` |
| D33 | error | … a 40/45 ft box the even 40 ft bay … | `bayPlan[12] CSNU7022819 @ 21-06-82: a 40 ft box must use the even 40 ft bay 22, not the 20 ft bay 21` |
| D34 | error | … and never a lone 20 ft bay. | `bayPlan[9] ONEU3010014 @ 01-02-84: a 40 ft box cannot stow in the lone 20 ft bay 01 (twentyOnlyBays)` |
| D35 | error | A twin-lift address uses the 40 ft bay number … | `workQueue[5] M006 discharge MSKU7219043+MSKU7205585: workQueue[5].from 21-00-82: a twin-lift address uses the 40 ft bay number (22-00-82 = 21 + 23), not the 20 ft bay 21` |
| D36 | error | … of a 40 ft bay, not a lone 20 ft bay. | `workQueue[0] M001 discharge ONEU2010010+ONEU2010025: workQueue[0].from 01-00-82: bay 01 is a lone 20 ft bay (twentyOnlyBays) — a twin lift needs the two 20 ft halves of a 40 ft bay` |
| D37 | error | Tiers are even … | `workQueue[15] M016 load CSNU9188028: workQueue[15].to 22-04-07: tier 07 is odd — tiers are even numbers (02, 04, … in the hold; 82, 84, … on deck)` |
| D38 | error | … within the deck tiers of that bay … | `bayPlan[0] CMAU5693108 @ 22-00-98: tier 98 is above the top deck tier of bay 22 (deck tiers 82–96)` |
| D39 | error | … or within its hold tiers. | `workQueue[15] M016 load CSNU9188028: workQueue[15].to 22-04-40: tier 40 is neither a hold tier (02–18) nor a deck tier (82–96) of bay 22` |
| D40 | error | The row exists in the hold or on deck of that bay (widths per bay, overrides included). | `bayPlan[7] CSNU6340190 @ 22-18-84: row 18 does not exist on deck of bay 22 (17 rows: 16 … 15)` |
| D41 | error | In a row with a raised hold floor (`holdRowBaseTier`) tiers below the base tier do not exist. | `bayPlan[9] ONEU3010420 @ 04-04-02: tier 02 does not exist in hold row 04 of bay 04 — the hold floor is raised there (holdRowBaseTier: lowest tier 04)` |
| D42 | error | No 45 ft box in the hold (cell guides are 40 ft). | `bayPlan[49] MSCU5560386 @ 22-10-02: 45 ft boxes can never be stowed in the hold (cell guides are 40 ft) — stow it on deck` |
| D43 | error | 20 ft boxes in the hold only where `hold20ftAllowed` is not false. | `bayPlan[49] MSCU5560690 @ 01-00-02: bay 02 does not allow 20 ft boxes in the hold (hold20ftAllowed = false)` |
| D44 | error | No 45 ft box inside 40 ft cell guides on deck: not where `structure.cellGuides.deck` is true, and not over the hold rows of an open-hatch bay (`hatchCovers.baysWithout`). | `bayPlan[0] CMAU5693108 @ 22-00-86: 45 ft boxes cannot stand in 40 ft cell guides (deck cell guides are fitted on this vessel) — stow it where there are no cell guides` |

## E. Physical stowage

These rules check the bay plan on arrival. The dry run (group H) applies the same rules to every move target when it is placed, and to the final stow. Heights come from the real boxes (2.591 m standard, 2.896 m high cube), with a 0.03 m stacking-cone gap between two boxes wherever there are no cell guides (on deck, by default) and none inside cell guides (in the hold, by default). OOG over-height counts at the top of a stack (E09, E10). In an open-hatch bay the hold stack continues on deck inside cell guides (E20). `decorativeFill` never produces a message: its generator builds only stacks that pass E02–E09 and E20, including the lashing-bridge rule (E07) and the 45/45 rule (E08).

| # | Severity | Check | Message |
|---|---|---|---|
| E01 | error | No two boxes in one slot, including a 40 ft box against a 20 ft box in one of its halves. | `bayPlan[49] MSCU5560452 @ 21-05-84: overlaps CMAU8450760 at 22-05-84 (40 ft bay 22 = 20 ft bays 21 + 23) — two boxes in one slot` |
| E02 | error | Every box is supported: a box at tier t stands on tier t−2, the tank top (or a raised row base), a hatch cover or a pedestal; in an open-hatch bay the first deck tier over a hold row stands on the top hold tier (E20). | `bayPlan[13] ONEU1159375 @ 22-06-86: nothing stowed at 22-06-84 — the box would float` |
| E03 | error | A 20 ft box does not stand on a 40/45 ft box. | `bayPlan[49] MSCU5560215 @ 21-10-84: 20 ft box on top of 40 ft MSCU5803260 — a 20 ft box cannot stand on a 40/45 ft box (no corner castings at mid-length)` |
| E04 | error | A 40 ft box stands on a 40/45 ft box or on BOTH 20 ft boxes … | `bayPlan[23] MSCU9572132 @ 22-07-84: 40 ft box over a single 20 ft box (TCNU4061273) — nothing at 23-07-82; a 40 ft box needs a 40/45 ft box or BOTH 20 ft boxes below` |
| E05 | error | … of the same height. | `bayPlan[24] MSCU9572132 @ 22-07-84: the two 20 ft boxes below (TCNU4061273 (20 TK), MSCU1184070 (20 HC HC)) have different heights — the 40 ft box would not sit level` |
| E06 | error | A 45 ft box stands only on a 40 or 45 ft box. | `bayPlan[24] MSCU9572132 @ 22-07-84: 45 ft box needs a 40 or 45 ft box below, found TCNU4061273 (20 TK) + MSCU1184070 (20 DV)` |
| E07 | error | A 45 ft box on deck in a bay with a lashing bridge fore or aft stands with its base at or above the bridge top. Bridge top Y = cover top + `levels` × 2.591 m + (`levels` − 1) × 0.03 m, a format v1 constant (the VesselBuilder draws the bridges to exactly that height). The base comes from the real stack below, so the tier alone does not decide. | `bayPlan[19] ONEU6634020 @ 22-16-82: 45 ft box at tier 82 (base 9.30 m) would hit the lashing bridge forward of bay 22 (2 tiers, top 14.51 m) — next to a lashing bridge a 45 ft box needs its base at or above the bridge top` |
| E08 | error | Two 45 ft boxes in adjacent bay positions at the same row and tier collide when 13.716 m > the distance between the bay centres (`pitch_m` 13.4 by default): each overhangs its 40 ft bay by 0.762 m. | `bayPlan[0] CMAU5693108 @ 22-00-86: 45 ft overhang collides with MSCU7200877 (45 HC HC) in bay 26 at the same row and tier — the bay centres are 13.40 m apart but the two boxes need 13.72 m (two 45 ft boxes in adjacent bays need 13.716 m, more than the bay pitch)` |
| E09 | error | A hold stack fits under the hatch cover underside (real box heights, OOG over-height included). Open-hatch bays (`baysWithout`) have no cover and no such limit (E20). | `bayPlan[57] MSCU6000180 @ 22-08-18: hold stack in bay 22 row 08 reaches 10.06 m, 1.66 m above the hatch cover underside (8.40 m) — 9 tiers incl. 9 high cube do not fit under the cover` |
| E10 | error | Lift height: deck stack top + the tallest box of the scenario + CraneProfile `clearanceOverStack_m` (1.0 m) ≤ lift height. OOG over-height counts in both terms: effective height = box height + `overHeight_cm`/100, for the stack top the box creates and for the tallest box. Lift height is measured to the spreader underside, so no spreader or headblock allowance is added. | `bayPlan[55] MSCU7100965 @ 22-10-96: deck stack in bay 22 row 10 tops out at 43.47 m (incl. 120 cm over-height of MSCU7100965); lifting the tallest box of this scenario (MSCU7100965: standard OT 2.591 m + 120 cm over-height = 3.791 m) over it with 1.00 m clearance needs 48.26 m > crane lift height 48 m (to the spreader underside)` |
| E11 | error | Outreach: the centre of the outermost occupied or target row is within the crane outreach (judged at the row centre, where the spreader lands). | `bayPlan[19] ONEU6634020 @ 22-16-82: row 16 centre is 65.20 m from the waterside rail — beyond crane outreach 65 m (outreach is measured to the row centre)` |
| E12 | error | Nothing is stowed on top of an out-of-gauge box … | `bayPlan[27] HLXU9401583 @ 22-13-82: MSCU5560529 is stowed on top of out-of-gauge FR HLXU9401583 — nothing may be stowed on an OOG box` |
| E13 | warning | … and over-width next to an occupied row is flagged. | `bayPlan[27] HLXU9401583 @ 22-13-82: over-width 10 cm to port: row 11 at the same tier is occupied (EGHU5077332) — check clearance` |
| E14 | error | A RUNNING reefer (RF with `reeferSetpoint_C`) stands in a `reeferPositions` slot, if `reeferPositions` is given. An RF without a setpoint (empty or not operating) may stow anywhere, with no message. | `bayPlan[44] SEGU5299172 @ 22-01-06: running reefer SEGU5299172 (setpoint 5 °C) at 22-01-06 is not in a declared reefer position (vessel.reeferPositions) — no power socket there; only reefers without reeferSetpoint_C (empty / not operating) may stow anywhere` |
| E15 | error | Gross ≥ tare (catalogue tare if `tare_t` is omitted) … | `bayPlan[9] CMAU4829308 @ 22-04-84: gross weight 3.2 t is below the tare 3.89 t — an empty box has gross = tare` |
| E16 | error | … and gross ≤ the maximum gross of the ContainerCatalog (30.48 t). | `bayPlan[6] MSCU6928472 @ 22-02-82: gross weight 31.2 t exceeds the maximum gross 30.48 t` |
| E17 | warning | A 45 ft box is practically always high cube. | `bayPlan[0] CMAU5693108 @ 22-00-86: 45 ft box with standard height — 45 ft boxes are practically always high cube` |
| E18 | warning | Reefer setpoint within the usual −35 … +30 °C. | `bayPlan[5] MEDU9312764 @ 22-02-84: reefer setpoint -40 °C is outside the usual −35…+30 °C` |
| E19 | error | The vessel lies within the quay (0 … `quay.length_m`). The hint states the actual combination: the bow points towards increasing quay marks for starboard side alongside with marks increasing to the right and for port side with marks to the left, towards decreasing marks for the other two. | `vessel.mooring.bowAtQuayMark_m: vessel occupies quay marks 470.00–804.00 m but the quay runs 0–800 m — move the bow mark or lengthen the quay (port side alongside, marks increasing to the right: the bow points towards decreasing marks, so the hull lies from bowAtQuayMark_m to bowAtQuayMark_m + LOA)` |
| E20 | error | Open-hatch bays (`hatchCovers.baysWithout`): the stack continues from hold to deck inside cell guides. The first deck tier over a hold row stands on the top hold tier of that row (tier `firstHoldTier` + 2·(`tiersInHold` − 1) must be occupied), heights stack on with no cone gap and no cover-underside limit. Deck rows beyond the hold width stand on pedestals as usual. | `bayPlan[57] MSCU7400828 @ 74-00-82: nothing stowed at 74-00-18 — the box would float (open-hatch bay 74: the first deck tier stands on the top hold tier of its row)` |

## F. Hatch covers

Generated panels have no message of their own. A bay with n hold rows gets min(`panelsAcross`, max(1, floor(n / 3))) panels (a narrow bay gets fewer, each still weighing `weight_t`; give narrow bays realistic weights in `hatchCovers.overrides`), and the hold rows are split symmetrically (see SCENARIO_FORMAT §1.6; the prototype prints the split with `--dump-geometry`). These rules check explicit panels (`hatchCovers.overrides`) and the weights.

| # | Severity | Check | Message |
|---|---|---|---|
| F01 | error | A bay is either open-hatch (`baysWithout`) or has cover panels, not both. | `vessel.hatchCovers.overrides[0].bay: bay 02 is listed in baysWithout (open hatch) but also has cover panels` |
| F02 | error | Panel rows exist in the hold of that bay. | `vessel.hatchCovers.overrides[0].panels[1].rows[7]: panel 02-2: hold row 13 does not exist in bay 02 (13 hold rows)` |
| F03 | error | Each hold row is under exactly one panel: not two … | `vessel.hatchCovers.overrides[0].panels[1].rows[6]: panel 02-2: hold row 11 is already covered by panel 02-1` |
| F04 | error | … and not none. | `vessel.hatchCovers.overrides[0]: bay 02: hold row 11 is not covered by any panel` |
| F05 | error | Panel ids unique on the vessel (explicit and generated). | `vessel.hatchCovers.overrides[0].panels[1].id: hatch cover id "02-1" is already used by vessel.hatchCovers.overrides[0].panels[0]` |
| F06 | warning | A panel covers adjacent rows. | `vessel.hatchCovers.overrides[0].panels[0].rows: panel 02-1 covers non-adjacent rows` |
| F07 | warning | Explicit panel length plausible for the bay (bay length − 2.5 … bay length) … | `vessel.hatchCovers.overrides[0].panels[0].length_m: panel 02-1 length 9 m looks implausible for a 13.40 m bay (expected ~13.00 m)` |
| F08 | warning | … width within 1 m of rows × `rowPitch_m` … | `vessel.hatchCovers.overrides[0].panels[0].width_m: panel 02-1 width 9 m does not match its 6 rows × 2.55 m = 15.30 m` |
| F09 | warning | … thickness 0.4–2.0 m … | `vessel.hatchCovers.overrides[0].panels[0].thickness_m: panel 02-1 thickness 2.5 m is outside the usual 0.4–2.0 m` |
| F10 | warning | … weight 5–60 t. | `vessel.hatchCovers.overrides[0].panels[0].weight_t: panel 02-1 weight 4 t is outside the usual 5–60 t` |
| F11 | error | An explicit panel weighs no more than the crane rated load under spreader … | `vessel.hatchCovers.overrides[0].panels[0].weight_t: hatch cover 02-1 weighs 70 t, above the crane's rated load under spreader 65 t` |
| F12 | error | … and neither do the generated panels. | `vessel.hatchCovers.weight_t: generated hatch covers weigh 70 t, above the crane's rated load under spreader 65 t (57 panels: 06-1, 06-2, 06-3, …)` |

## G. Work queue references

Static checks of each move before the dry run: containers, statuses, move types and the places named in `from` and `to`.

| # | Severity | Check | Message |
|---|---|---|---|
| G01 | error | The move's container exists in `bayPlan` or `loadList` (with a did-you-mean). | `workQueue[6] M007 discharge MSCU6928425: container MSCU6928425 is not in bayPlan or loadList — did you mean MSCU6928472?` |
| G02 | error | A `stay` (ROB) box is never moved. | `workQueue[4] M005 discharge ONEU1159375: ONEU1159375 has status "stay" (ROB) — it must not be moved; change its status to discharge or restow` |
| G03 | error | The status fits the move type: a `restow` box moves only by restow moves … | `workQueue[3] M004 discharge ONEU2088147: ONEU2088147 has status "restow" — use restow moves (direct shift vessel → vessel, or via the quay: vessel → buffer / lane, then buffer / lane → vessel)` |
| G04 | error | … a `discharge` box only by a discharge move. | `workQueue[2] M003 restow HLXU8362013: HLXU8362013 has status "discharge" — use a discharge move` |
| G05 | error | A `load` move takes a `loadList` box … | `workQueue[15] M016 load CSNU7022819: CSNU7022819 is a bayPlan box (already on board, status stay) — load moves take export boxes from loadList; to shift it, set its status to restow and use restow moves` |
| G06 | error | … and a `loadList` box is used only by `load` moves. | `workQueue[6] M007 discharge CSNU9188028: CSNU9188028 is an export box from loadList — it can only be used by a load move` |
| G07 | error | `from` → `to` is allowed for the type: discharge vessel → lane \| buffer; load lane → vessel; restow vessel → vessel \| vessel → buffer \| buffer → vessel \| vessel → lane \| lane → vessel; hatchcover coverSeat → laydown \| laydown → coverSeat. | `workQueue[2] M003 discharge CSNU6340190: discharge cannot go vessel → vessel; allowed: vessel → lane, vessel → buffer` |
| G08 | error | Loads come only by truck/AGV: there is no buffer → vessel load. | `workQueue[15] M016 load CSNU9188028: load cannot go buffer → vessel; allowed: lane → vessel` |
| G09 | error | A direct shift on board goes to another slot. | `workQueue[2] M003 restow CSNU6340190: from and to are the same slot 22-01-84` |
| G10 | error | The lane exists. | `workQueue[3] M004 discharge HLXU8362013: workQueue[3].to: lane "L7" does not exist (lanes: L1, L2, L3, L4, L5, L6)` |
| G11 | error | Lane `use` per leg: a vessel → lane leg (discharge, restow leg 1) needs a `discharge` or `both` lane … | `workQueue[0] M001 discharge CMAU5693108: workQueue[0].to: lane L5 is a load lane — a vessel → lane leg (discharge or restow leg 1) needs a "discharge" or "both" lane` |
| G12 | error | … a lane → vessel leg (load, restow leg 2) a `load` or `both` lane. | `workQueue[15] M016 load CSNU9188028: workQueue[15].from: lane L1 is a discharge lane — a lane → vessel leg (load or restow leg 2) needs a "load" or "both" lane` |
| G13 | error | The buffer slot exists (ids `<idPrefix>01` … from `quayBuffer.slots`). | `workQueue[1] M002 restow ONEU2088147: workQueue[1].to: buffer slot "QB09" does not exist (QB01, QB02)` |
| G14 | error | The laydown exists. | `workQueue[11] M012 hatchcover 22-2: workQueue[11].to: laydown "HCL2" does not exist (known: HCL1)` |
| G15 | error | The hatch cover panel exists (with a did-you-mean). | `workQueue[11] M012 hatchcover 22-5: hatch cover "22-5" does not exist — did you mean "22-1"?` |
| G16 | error | A panel comes off and goes back only to its own seat. | `workQueue[21] M022 hatchcover 22-2: workQueue[21].to: cover 22-2 can only come off / go back to its own seat "22-2", not "22-3"` |
| G17 | error | `chassisPosition` only for a single 20 ft box. | `workQueue[0] M001 discharge CMAU5693108: workQueue[0].to: chassisPosition is only for a single 20 ft box` |
| G18 | error | A buffer `tier` is within `maxTiers`. | `workQueue[1] M002 restow ONEU2088147: workQueue[1].to: tier 2 is above maxTiers 1` |
| G19 | error | The unit fits the buffer slot (`slotSize`; a twin needs a 40 ft slot) … | `workQueue[1] M002 restow ONEU2088147: workQueue[1].to: a 40 ft unit does not fit a 20 ft buffer slot` |
| G20 | warning | … a 45 ft box on a 40 ft slot overhangs it. | `workQueue[0] M001 discharge CMAU5693108: workQueue[0].to: a 45 ft box overhangs a 40 ft buffer slot by 0.76 m each end` |
| G21 | error | Twin lift: `crane.twinLiftEnabled` is true (the schema checks this too) … | `workQueue[5] M006 discharge MSKU7219043+MSKU7205585: twin lift requested but crane.twinLiftEnabled is not true` |
| G22 | error | … two 20 ft boxes … | `workQueue[5] M006 discharge MSKU7219043+HLXU8362013: twin lift needs two 20 ft boxes (MSKU7219043 is 20 ft, HLXU8362013 is 40 ft)` |
| G23 | error | … two different boxes … | `workQueue[5] M006 discharge MSKU7219043+MSKU7219043: containerId and twinContainerId are the same box` |
| G24 | error | … of the same height … | `workQueue[5] M006 discharge MSKU7219043+MSKU7205585: twin lift of standard and HC boxes — the tops are not level, the spreader cannot lock both` |
| G25 | error | … both from `bayPlan` or both from `loadList` … | `workQueue[5] M006 discharge MSKU7219043+MRKU6944716: twin lift mixes a bayPlan and a loadList box` |
| G26 | error | … together within the crane rated load under spreader … | `workQueue[5] M006 discharge MSKU7219043+MSKU7205585: twin weight 66.00 t exceeds the rated load 65 t` |
| G27 | error | … end to end in one 40 ft bay: same row and tier, 20 ft bays B−1 and B+1 … | `workQueue[5] M006 discharge MSKU7219043+MSCU1184070: twin lift needs two 20 ft boxes end to end in one 40 ft bay (same row and tier, bays B−1 + B+1): MSKU7219043 is at 21-00-82, MSCU1184070 is at 23-07-82` |
| G28 | error | … with `containerId` the forward box (B−1) and `twinContainerId` the aft box (B+1). | `workQueue[5] M006 discharge MSKU7205585+MSKU7219043: containerId must be the forward box (lower bay 21) and twinContainerId the aft box — MSKU7205585 is at 23-00-82` |
| G29 | info | Twin-lift placement (the real twin lift in Phase 3 and the Phase 2 split alike): one chassis/AGV; the forward box (bay B−1) goes on the chassis end facing the BOW, the aft box on the other end; `chassisPosition` and `single20Position` do not apply. Until Phase 3 the Phase 2 WorkQueue plays a twin lift as two single 20 ft moves, forward box first, and the HUD shows "twin lift split — Phase 3". | `workQueue[5] M006 discharge MSKU7219043+MSKU7205585: twin lift split — Phase 3: the Phase 2 WorkQueue plays it as two single 20 ft moves, MSKU7219043 (forward) first, then MSKU7205585; on lane L4 both go on one chassis/AGV, MSKU7219043 on the end facing the bow` |
| G30 | warning | Every `discharge` and `restow` box is moved … | `bayPlan[41] HLXU7703959 @ 22-00-08: status discharge but no move handles it — it will stay on board` |
| G31 | warning | … and every `loadList` box is loaded. | `loadList[11] EGHU8029317: export box is never loaded` |

## H. Sequence dry run

The loader works through the queue in order on an occupancy model: every box is on board, arriving (a `loadList` box on its truck/AGV), on transport (after restow leg 1 to a lane), in a buffer slot or gone; every panel is on its seat or on a laydown. Each problem is reported at the move where it happens.

| # | Severity | Check | Message |
|---|---|---|---|
| H01 | error | The box is where `from` says at that moment (the move is still simulated from its real slot) … | `workQueue[12] M013 discharge MRKU6182903: MRKU6182903 is not at 22-02-06 — it is on board at 22-02-08 (lifting it from there)` |
| H02 | error | … and has not already left the vessel. | `workQueue[30] M031 discharge CMAU5693108: CMAU5693108 is not at 22-00-86 — it is already gone (discharged by M001 to lane L1)` |
| H03 | error | Nothing is stowed on top of the box being lifted. | `workQueue[0] M004 discharge HLXU8362013: CMAU5693108 @ 22-00-86 is stowed on top of HLXU8362013 — lift it first` |
| H04 | error | A hold slot is worked only while the panel above it is off its seat: lifting … | `workQueue[11] M013 discharge MRKU6182903: 22-02-08 is in the hold under hatch cover 22-2, which is still on its seat — add a hatchcover move to lift 22-2 first` |
| H05 | error | … and setting down. | `workQueue[15] M016 load CSNU9188028: 22-08-02 is in the hold under hatch cover 22-1, which is on its seat — lift 22-1 first` |
| H06 | error | The target slot is free at that moment. | `workQueue[23] M024 load MSKU3855200: target 22-02-82 is occupied by ONEU2088147 @ 22-02-82` |
| H07 | error | The target is supported at that moment (every rule of group E applies to the target): … | `workQueue[17] M021 load CMAU7344105: CMAU7344105 @ 22-00-10: nothing stowed at 22-00-08 — the box would float` |
| H08 | error | … stowage goes bottom-up … | `workQueue[18] M018 load ONEU5266480: CMAU7344105 already stands above 22-00-08 — stow bottom-up` |
| H09 | error | … a first deck tier needs its hatch cover panel on its seat … | `workQueue[21] M023 restow ONEU2088147: ONEU2088147 @ 22-02-82: nothing to stand on — hatch cover 22-2 is not on its seat (it is on laydown HCL1)` |
| H10 | error | … and a hold stack must stay below the hatch cover underside. | `workQueue[20] M021 load CMAU7344105: hold stack in row 00 would reach 9.87 m, above the hatch cover underside 8.40 m — the cover could not close` |
| H11 | error | A panel is lifted only when no deck box stands on its rows in the bay and its 20 ft bays (B−1, B, B+1). | `workQueue[10] M012 hatchcover 22-2: cannot lift hatch cover 22-2: deck boxes still stand on it (bays 21/22/23, rows 04,02,00,01,03): SEGU4155627 @ 22-03-82 — discharge or restow them first` |
| H12 | error | A panel is lifted from its seat only while it is on it … | `workQueue[12] M012B hatchcover 22-2: hatch cover 22-2 is not on its seat (it is on laydown HCL1)` |
| H13 | error | … and put back from the laydown where it lies … | `workQueue[21] M022 hatchcover 22-2: hatch cover 22-2 is not on laydown HCL2 (it is on laydown HCL1)` |
| H14 | error | … from the top of the laydown stack … | `workQueue[22] M022 hatchcover 22-2: hatch cover 22-2 is under 18-2 on laydown HCL1 — lift the top cover first` |
| H15 | error | … and closes only over hold stacks that fit under it. | `workQueue[21] M022 hatchcover 22-2: cannot close hatch cover 22-2: hold stack in row 00 reaches 9.87 m, above the cover underside 8.40 m` |
| H16 | error | The laydown has room (`maxStack`). | `workQueue[12] M012A hatchcover 18-2: laydown HCL1 is full (1 cover(s), maxStack 1)` |
| H17 | error | The buffer slot has room (`maxTiers`) … | `workQueue[2] M003 restow CSNU6340190: buffer QB01 is full (1 tier(s), maxTiers 1)` |
| H18 | error | … a set-down `tier` is the next free tier … | `workQueue[1] M002 restow ONEU2088147: tier 2 is not the next free tier of buffer QB01 (that is tier 1)` |
| H19 | error | … 20 ft units stack only on 20 ft units, 40/45 ft on 40/45 ft. | `workQueue[5] M006 discharge MSKU7219043: cannot stack a 20 ft unit on the 40 ft unit in buffer QB01` |
| H20 | error | A pick from the buffer finds the box in that slot … | `workQueue[22] M023 restow ONEU2088147: ONEU2088147 is not in buffer QB02 — it is in buffer QB01 tier 1` |
| H21 | error | … on top of the stack … | `workQueue[22] M023 restow ONEU2088147: ONEU2088147 is not on top of buffer QB01 — lift the box above it first` |
| H22 | error | … at the `tier` given. | `workQueue[22] M023 restow ONEU2088147: ONEU2088147 is at tier 1 of buffer QB01, not tier 2` |
| H23 | error | Restow leg 2 from a lane follows a leg 1 vessel → lane (the box waits on the truck/AGV); leg 2 comes back on any lane whose `use` is `load` or `both`. | `workQueue[22] M023 restow ONEU2088147: ONEU2088147 cannot come from lane L3: it is in buffer QB01 tier 1 — restow leg 2 from a lane needs leg 1 vessel → lane first` |
| H24 | error | A `loadList` box is delivered and loaded once. | `workQueue[30] M031 load CMAU1570466: CMAU1570466 cannot come from lane L3: it is on board at 22-00-84` |
| H25 | error | The final stow passes group E. | `final state: HLXU9401583 @ 22-13-82: CMAU1570466 is stowed on top of out-of-gauge FR HLXU9401583 — nothing may be stowed on an OOG box` |
| H26 | warning | Every panel is back on its seat at the end (the vessel cannot sail with an open hatch). | `workQueue: hatch cover 22-2 is still on laydown HCL1 at the end — the vessel cannot sail with an open hatch` |
| H27 | warning | No restow box is left in the buffer … | `workQueue: restow box ONEU2088147 is left in buffer QB01 at the end — add restow leg 2 (buffer → vessel)` |
| H28 | warning | … or on a truck/AGV at the end. | `workQueue: restow box ONEU2088147 is left on a truck/AGV (lane L1, M002) at the end — add restow leg 2 (lane → vessel)` |
| H29 | warning | A move whose box could not be placed by an earlier error is skipped, with a note. | `workQueue[0] M001 discharge CMAU5693108: not simulated — the box state is unknown after an earlier error` |

## I. Crane, yard and environment

Yard footprints across the quay: a lane band (the chassis/box footprint, not the painted lane) is 2.44 m wide (± 1.22 m about its centreline) and runs the full length of the crane span; a buffer slot is one box wide and one box long (its `slotSize`); a laydown takes the widest and longest panel the dry run lands there. Crane legs and gantry bogies take each rail centreline ± 1.5 m (waterside rail at 0, landside rail at −30.48 m for the 30.48 m gauge).

| # | Severity | Check | Message |
|---|---|---|---|
| I01 | info | Where the gantry starts: abeam a bay (`startAtBay`, or a `startQuayMark_m` that matches a bay centre) … | `crane.startAtBay: crane starts abeam bay 22 (quay mark 509.00)` |
| I02 | info | … within a bay, off its centre … | `crane.startQuayMark_m: crane starts at quay mark 505.00, within bay 22 (4.00 m from its centre at quay mark 509.00)` |
| I03 | info | … or not abeam any bay. | `crane.startQuayMark_m: crane starts at quay mark 700.00, not abeam any bay (nearest: bay 01 at quay mark 579.07)` |
| I04 | info | A bay → quay mark table for the bays the scenario uses. Columns: bay, kind, bay centre from the bow (m), quay mark, world X. The prototype prints it with `--dump-geometry`. | `22 40 ft 91.00 509.00 509.00` *(table row)* |
| I05 | error | `startAtBay` names a bay of the vessel (a bay position or a 20 ft half). | `crane.startAtBay: bay 24 is not a bay of this vessel (40 ft bays 02–78) — nearest: 22, 26` |
| I06 | error | The start lies on the quay, within the soft limits and outside every blocked zone. | `crane.startQuayMark_m: start position: quay mark 470.00 is inside blocked zone 425–485 (QC05 working bay 38 — keep gantry separation)` |
| I07 | error | Every bay a move works (the panel's bay for a hatchcover move) is reachable: on the quay, within the soft limits, outside blocked zones … | `workQueue[0] M001 discharge CMAU5693108: workQueue[0].from bay 22: quay mark 509.00 is inside blocked zone 425–515 (QC05 working bay 38 — keep gantry separation)` |
| I08 | error | … and so is every quay buffer slot … | `yardSide.quayBuffer: buffer slot QB01: quay mark 580.00 is above the crane soft limit 569 — the crane cannot reach it` |
| I09 | error | … and every laydown. | `yardSide.hatchCoverLaydowns[0]: laydown HCL1: quay mark 440.00 is below the crane soft limit 449 — the crane cannot reach it` |
| I10 | error | Lanes, buffer and laydowns stay clear of the fender line (footprint included) … | `yardSide.lanes[0]: lane L1 at WS 4.00 m reaches the fender line (4.5 m) — it would be under the ship's side` |
| I11 | error | … and within the backreach (judged at the centre). | `yardSide.hatchCoverLaydowns[0]: laydown HCL1 at LS 52.00 m is beyond the backreach — the trolley reaches LS 50.48 m` |
| I12 | warning | A lane on the waterside apron (outside the legs) is unusual. | `yardSide.lanes[0]: lane L1 at WS 3.00 m is on the waterside apron outside the legs — unusual for a truck lane` |
| I13 | error | Crane legs and gantry bogies take each rail centreline ± 1.5 m. A lane footprint (2.44 m band) that overlaps that zone at either rail runs into the crane leg / gantry line … | `yardSide.lanes[5]: lane L6 at LS 29.50 m runs into the crane leg / gantry line at the landside rail: its 2.44 m wide footprint crosses the rail centreline (legs and gantry bogies take the rail ± 1.5 m) — move it to LS 27.76 m or further waterside, or to LS 33.20 m or further landside` |
| I14 | error | … and so does a quay buffer slot (box width) … | `yardSide.quayBuffer: quay buffer at LS 31.00 m runs into the crane leg / gantry line at the landside rail: its 2.44 m wide footprint crosses the rail centreline (legs and gantry bogies take the rail ± 1.5 m) — move it to LS 27.76 m or further waterside, or to LS 33.20 m or further landside` |
| I15 | error | … and a laydown, checked after the dry run with the widest panel landed there. | `yardSide.hatchCoverLaydowns[0]: laydown HCL1 (widest panel 22-2, 12.75 m wide) at LS 34.00 m runs into the crane leg / gantry line at the landside rail: its 12.75 m wide footprint crosses the rail centreline (legs and gantry bogies take the rail ± 1.5 m) — move it to LS 22.61 m or further waterside, or to LS 38.36 m or further landside` |
| I16 | warning | A lane, buffer or laydown footprint whose edge ends within a further 0.5 m of that zone is close to the legs. | `yardSide.lanes[5]: lane L6 at LS 27.50 m is close to the crane leg / gantry line at the landside rail: its 2.44 m wide footprint ends 0.26 m outside the rail ± 1.5 m zone — keep 0.5 m clear (LS 27.26 m or further waterside)` |
| I17 | error | Lanes run the full length of the crane span: two lane bands (± 1.22 m) must not overlap … | `yardSide.lanes[1]: lanes L1 and L2 overlap: their centrelines are 2.00 m apart but each lane band (chassis/box footprint) is 2.44 m wide (± 1.22 m), and lanes run the full length of the crane span — put the centrelines at least 3.5 m apart` |
| I18 | warning | … and lane centrelines should be at least 3.5 m apart (tractor/chassis units side by side). | `yardSide.lanes[1]: lanes L1 and L2 are only 2.70 m apart — tractor/chassis units need ≥ 3.5 m between lane centrelines` |
| I19 | error | A quay buffer slot lies clear of every lane band … | `yardSide.quayBuffer: quay buffer at LS 26.00 m overlaps lane L6 (LS 24.50 m): lanes run the full length of the crane span, so a buffer slot (2.44 m wide) must lie clear of every lane band (± 1.22 m) — put it at least 2.44 m from the lane centreline` |
| I20 | error | … and so does a laydown (the widest panel landed there). | `yardSide.hatchCoverLaydowns[0]: laydown HCL1 (widest panel 22-2, 12.75 m wide) at LS 22.00 m overlaps lane L5 (LS 20.50 m): lanes run the full length of the crane span, so a laydown must lie clear of every lane band (± 1.22 m) — move it` |
| I21 | error | A laydown does not overlap a buffer slot or another laydown both along the quay (panel length; slot box length) and across it (panel width; box width). | `yardSide.hatchCoverLaydowns[0]: laydown HCL1 (widest panel 22-2, 12.75 m wide) at LS 46.00 m, QM 509.00 overlaps buffer slot QB01 (40 ft at LS 48.00 m, QM 509.00) along the quay and across it — move the laydown or the buffer` |
| I22 | error | Soft limits: min below max … | `crane.softLimits: minQuayMark_m 570 must be below maxQuayMark_m 569` |
| I23 | error | … both on the quay. | `crane.softLimits.maxQuayMark_m: 900 is off the quay (0–800 m)` |
| I24 | error | Blocked zone: `fromQuayMark_m` below `toQuayMark_m`. | `crane.blockedZones[0]: fromQuayMark_m must be below toQuayMark_m` |
| I25 | error | Trolley start within the trolley range of the profile (backreach end … outreach). | `crane.startTrolley_m: 70 m is outside the trolley range LS 50.48 … WS 65 m` |
| I26 | error | Hoist start within the hoist range of the profile. | `crane.startHoistHeight_m: 50 m is outside the hoist range −20 … 48 m` |
| I27 | error | Boom raised at start needs the trolley in the boom park position, landside of the boom hinge (SPP-65: hinge WS +4.0, park at LS 6.0 m or further landside; STEP1_PROPOSAL §4). | `crane.startTrolley_m: boom raised at start needs the trolley in the boom park position, landside of the boom hinge (WS 4.0): LS 6.0 m or further landside, found LS 3.0 m` |
| I28 | error | `twinLiftEnabled` needs a profile with a twin-twenty spreader. | `crane.twinLiftEnabled: crane profile SPP-50 has no twin-twenty spreader` *(planned wording)* |
| I29 | error | Gust ≥ mean wind. | `environment.wind.gustSpeed_kn: gust 15 kn is below the mean wind 20 kn` |
| I30 | error | `gustInterval_s` is `[min, max]` with min ≤ max. | `environment.wind.gustInterval_s: min 60 s is greater than max 20 s — write [min, max]` |
| I31 | warning | Wind stop precedence: the effective limit is the lower of the CraneProfile `inServiceWindLimit_kn` (crane design, 40 kn for SPP-65) and `rules.windStopLimit_kn` (terminal policy; RulesDefaults 40 kn when omitted). A rules value above the crane limit has no effect. | `rules.windStopLimit_kn: 45 kn is above the in-service wind limit 40 kn of crane profile SPP-65 — the crane limit applies; rules may only tighten it` |
| I32 | warning | Mean wind above the effective limit: the crane would be stopped … | `environment.wind.speed_kn: mean wind 45 kn is above the effective wind stop limit 40 kn (the lower of crane SPP-65 40 kn and rules.windStopLimit_kn 40 kn from RulesDefaults) — the crane would be stopped` |
| I33 | warning | … gusts above it: expect wind stops. | `environment.wind.gustSpeed_kn: gusts of 27 kn exceed the effective wind stop limit 25 kn (the lower of crane SPP-65 40 kn and rules.windStopLimit_kn 25 kn) — expect wind stops` |
| I34 | warning | Apron height above the water level within the usual 1.5–8 m (tide state). | `quay.apronAboveWaterline_m: 9 m apron above the water level is outside the usual 1.5–8 m — check the tide state` |
| I35 | warning | Fog means visibility below 1000 m. | `environment.visibility_m: fog with 8000 m visibility — fog means < 1000 m` |
| I36 | warning | `interval_s` is used only with `fixedInterval` truck timing … | `yardSide.truckTiming.interval_s: interval_s is only used in fixedInterval mode — ignored with justInTime` |
| I37 | warning | … and the jitter is smaller than the travel time. | `yardSide.truckTiming.jitter_s: jitter ±60 s is not smaller than the travel time 60 s` |
