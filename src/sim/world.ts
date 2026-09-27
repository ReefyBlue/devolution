// The static and movable world around the crane: quay, vessel, hatch covers, boxes, truck lane and chassis.

import type { Profiles, TestScene } from '../config/profiles';
import { QuayFrame } from '../core/quayFrame';
import { Chassis } from '../yard/chassis';
import { coverPanels, type CoverPanel } from '../vessel/hatchCovers';
import { SlotGeometry } from '../vessel/slotGeometry';
import { buildTestStack } from '../vessel/testStack';
import { boxBounds, type Container } from './container';

/** Axis-aligned surface something can land on. */
export interface Surface {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  top: number;
  kind: 'quay' | 'deck' | 'cover' | 'chassis' | 'container';
  containerId?: string;
}

export interface CoverSlab {
  panel: CoverPanel;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  bottom: number;
  top: number;
}

/** fromWatersideRail_m of the quay's cope edge (the fenders stand between it and the fender line). */
export const COPE_EDGE_FROM_WATERSIDE_RAIL_M = 3.0;

export class World {
  readonly frame: QuayFrame;
  readonly geometry: SlotGeometry;
  readonly covers: CoverSlab[];
  readonly containers: Container[];
  readonly chassis: Chassis;
  private readonly fixedSurfaces: Surface[];

  constructor(
    readonly scene: TestScene,
    readonly profiles: Profiles,
  ) {
    this.frame = new QuayFrame(scene.quay);
    this.geometry = new SlotGeometry(scene.vessel, this.frame);
    this.covers = this.buildCovers();
    this.containers = buildTestStack(scene, profiles, this.geometry);
    const laneZ = this.frame.worldZ(scene.lane.fromWatersideRail_m);
    const x = this.frame.worldX(scene.crane.startQuayMark_m);
    const dir = (scene.lane.direction === 'increasing') === (scene.quay.marksIncreaseTo === 'right') ? 1 : -1;
    this.chassis = new Chassis(scene.lane.id, x, laneZ, scene.chassis.bedHeight_m, scene.chassis.length_m, dir);
    this.fixedSurfaces = this.buildFixedSurfaces();
  }

  container(id: string): Container | undefined {
    return this.containers.find((c) => c.id === id);
  }

  /** Vessel extent along world X and across (world Z). */
  vesselBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
    const bowX = this.frame.worldX(this.scene.vessel.mooring.bowAtQuayMark_m);
    const sternX = this.geometry.bowPointsPlusX ? bowX - this.scene.vessel.loa_m : bowX + this.scene.vessel.loa_m;
    const sideZ = this.frame.worldZ(this.geometry.sideFromWatersideRail);
    const farZ = this.frame.worldZ(this.geometry.sideFromWatersideRail + this.scene.vessel.beam_m);
    return { minX: Math.min(bowX, sternX), maxX: Math.max(bowX, sternX), minZ: Math.min(sideZ, farZ), maxZ: Math.max(sideZ, farZ) };
  }

  /** Highest surface under (x, z) whose top is at or below `maxTop`, ignoring the listed boxes. */
  surfaceUnder(x: number, z: number, maxTop: number, ignore: ReadonlySet<string>): Surface | null {
    let best: Surface | null = null;
    const consider = (s: Surface): void => {
      if (x < s.minX || x > s.maxX || z < s.minZ || z > s.maxZ || s.top > maxTop) return;
      if (!best || s.top > best.top) best = s;
    };
    this.fixedSurfaces.forEach(consider);
    for (const c of this.containers) {
      if (ignore.has(c.id) || c.location.kind === 'spreader') continue;
      consider({ ...boxBounds(c, this.profiles.containers), kind: 'container', containerId: c.id });
    }
    return best;
  }

  private buildCovers(): CoverSlab[] {
    const v = this.scene.vessel;
    const g = this.geometry;
    const slabs: CoverSlab[] = [];
    for (const pos of g.positions) {
      const length = pos.length_m - 0.4;
      const cx = g.bayWorldX(pos.bay);
      for (const panel of coverPanels(pos.bay, v.bays.rowsInHold, v.panelsAcross, v.structure.rowPitch_m)) {
        // Starboard alongside: starboard offsets point towards the quay (larger world Z).
        const sign = v.mooring.sideAlongside === 'starboard' ? -1 : 1;
        const zA = this.frame.worldZ(g.centrelineFromWatersideRail + sign * panel.starboardMin);
        const zB = this.frame.worldZ(g.centrelineFromWatersideRail + sign * panel.starboardMax);
        slabs.push({
          panel,
          minX: cx - length / 2,
          maxX: cx + length / 2,
          minZ: Math.min(zA, zB),
          maxZ: Math.max(zA, zB),
          bottom: g.coverUndersideY,
          top: g.firstDeckTierBaseY,
        });
      }
    }
    return slabs;
  }

  private buildFixedSurfaces(): Surface[] {
    const q = this.scene.quay;
    const hull = this.vesselBounds();
    const cope = this.frame.worldZ(COPE_EDGE_FROM_WATERSIDE_RAIL_M);
    const c = this.chassis;
    return [
      { minX: 0, maxX: q.length_m, minZ: cope, maxZ: q.landsideDepth_m, top: 0, kind: 'quay' },
      { ...hull, top: this.geometry.mainDeckY, kind: 'deck' },
      ...this.covers.map((s): Surface => ({ minX: s.minX, maxX: s.maxX, minZ: s.minZ, maxZ: s.maxZ, top: s.top, kind: 'cover' })),
      { minX: c.x - c.length / 2, maxX: c.x + c.length / 2, minZ: c.z - 1.25, maxZ: c.z + 1.25, top: c.bedTop, kind: 'chassis' },
    ];
  }
}
