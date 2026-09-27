// The quay frame: quay marks along the quay, fromWatersideRail_m across it, Y up from the apron.
// Three.js is right-handed, so "towards the water" is world −Z and the observer's right (facing the water) is +X.

export type MarksDirection = 'right' | 'left';

export interface QuayGeometry {
  length_m: number;
  /** Which way quay marks increase for someone on the quay facing the water. */
  marksIncreaseTo: MarksDirection;
  /** True bearing of increasing quay marks. */
  orientation_deg: number;
  watersideRailToFenderLine_m: number;
  apronAboveWaterline_m: number;
}

export class QuayFrame {
  constructor(readonly quay: QuayGeometry) {}

  /** World X of a real quay mark. */
  worldX(quayMark: number): number {
    return this.quay.marksIncreaseTo === 'right' ? quayMark : this.quay.length_m - quayMark;
  }

  /** Real quay mark of a world X. */
  quayMark(worldX: number): number {
    return this.quay.marksIncreaseTo === 'right' ? worldX : this.quay.length_m - worldX;
  }

  /** World Z of a fromWatersideRail_m position (+ waterside, − landside). */
  worldZ(fromWatersideRail: number): number {
    return -fromWatersideRail;
  }

  fromWatersideRail(worldZ: number): number {
    return -worldZ;
  }

  /** True bearing that world +X points to. */
  bearingOfPlusX(): number {
    return this.quay.marksIncreaseTo === 'right' ? this.quay.orientation_deg : this.quay.orientation_deg + 180;
  }

  /**
   * Splits a meteorological wind (blowing FROM `fromDirection_deg`) into its components along world +X
   * (gantry axis) and towards the water (+fromWatersideRail, trolley axis), in the same unit as `speed`.
   */
  windComponents(speed: number, fromDirection_deg: number): { alongX: number; towardsWater: number } {
    const travel = ((fromDirection_deg + 180) * Math.PI) / 180;
    const plusX = (this.bearingOfPlusX() * Math.PI) / 180;
    const water = plusX - Math.PI / 2;
    return {
      alongX: speed * Math.cos(travel - plusX),
      towardsWater: speed * Math.cos(travel - water),
    };
  }
}
