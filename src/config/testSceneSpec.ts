// The Phase 1 test scene (config/test-scene.json): quay, feeder, deck stack, truck lane, test moves, wind.

import { int, list, num, obj, oneOf, text } from './spec';

const SLOT = /^\d{2,3}-\d{2}-\d{2}$/;

export const TEST_SCENE_SPEC = obj({
  quay: obj({
    length_m: num(100, 5000, 'm', 1),
    marksIncreaseTo: oneOf('right', 'left'),
    orientation_deg: num(0, 360, '°', 1),
    watersideRailToFenderLine_m: num(0, 20, 'm', 0.1),
    apronAboveWaterline_m: num(0.5, 15, 'm', 0.1),
    landsideDepth_m: num(20, 300, 'm', 1),
  }),
  vessel: obj({
    name: text(/^.{1,60}$/),
    loa_m: num(50, 450, 'm', 1),
    beam_m: num(10, 70, 'm', 0.1),
    draught_m: num(2, 25, 'm', 0.1),
    deckHeightAboveWaterline_m: num(1, 30, 'm', 0.1),
    mooring: obj({ sideAlongside: oneOf('port', 'starboard'), bowAtQuayMark_m: num(0, 5000, 'm', 0.1), offFender_m: num(0, 20, 'm', 0.1) }),
    structure: obj({
      tankTopAboveKeel_m: num(0.5, 5, 'm', 0.1),
      hatchCoamingHeight_m: num(0, 5, 'm', 0.1),
      rowPitch_m: num(2.438, 3, 'm', 0.01),
      firstHoldTier: int(2, 98),
      firstDeckTier: int(2, 98),
      hatchCoverThickness_m: num(0.2, 3, 'm', 0.1),
    }),
    bays: obj({
      count: int(1, 60),
      firstBayCentreFromBow_m: num(5, 100, 'm', 0.1),
      pitch_m: num(12.192, 20, 'm', 0.1),
      rowsInHold: int(1, 30),
      rowsOnDeck: int(1, 30),
      tiersInHold: int(1, 20),
      tiersOnDeck: int(1, 12),
      twentyOnlyBays: list(int(1, 199)),
      gaps: list(obj({ afterBay: int(1, 199), length_m: num(1, 60, 'm', 0.1), structure: oneOf('deckhouse', 'funnel', 'gap'), heightAboveDeck_m: num(0, 60, 'm', 0.1) })),
    }),
    panelsAcross: int(1, 6),
  }),
  deckStack: obj({
    rows: list(int(0, 30), 1),
    firstTier: int(2, 98),
    seed: int(1, 1_000_000),
    weightByTier_t: list(obj({ min: num(1, 40, 't', 0.1), max: num(1, 40, 't', 0.1) }), 1),
    operators: list(text(/^[A-Z0-9]{2,4}$/), 1),
    bays: list(obj({ bay: int(2, 198), tiers: list(oneOf('20DV', '40DV', '40HC'), 1) }), 1),
  }),
  lane: obj({ id: text(/^[A-Za-z0-9-]{1,8}$/), fromWatersideRail_m: num(-60, 20, 'm', 0.1), direction: oneOf('increasing', 'decreasing') }),
  chassis: obj({ bedHeight_m: num(0.5, 2.5, 'm', 0.05), length_m: num(12.2, 15, 'm', 0.1), clearDelay_s: num(0, 60, 's', 1) }),
  crane: obj({ startQuayMark_m: num(0, 5000, 'm', 0.1), startTrolley_m: num(-60, 90, 'm', 0.1), startHoistHeight_m: num(-20, 60, 'm', 0.1) }),
  testMoves: list(obj({ from: text(SLOT), to: text(/^[A-Za-z0-9-]{1,8}$/), chassisPosition: oneOf('front', 'centre', 'rear') }), 1),
  wind: obj({
    speed_kn: num(0, 80, 'kn', 1),
    fromDirection_deg: num(0, 360, '°', 5),
    gustSpeed_kn: num(0, 100, 'kn', 1),
    gustIntervalMin_s: num(1, 300, 's', 1),
    gustIntervalMax_s: num(1, 300, 's', 1),
    seed: int(1, 1_000_000),
  }),
});
