// Placeholder STS crane built from primitives and sized from the crane profile.
// Logic never touches these objects: update() places them from the simulation's CraneView.

import * as THREE from 'three';
import type { Profiles } from '../config/profiles';
import { CORNERS, type Corner, type CraneView } from '../sim/craneView';
import { box, placeStrut, span, standard, strut } from './primitives';

// Visual proportions of the placeholder rig (not tuning values).
const LEG = 2.2;
const SILL_TOP = 3.0;
const GIRDER_DEPTH = 3.5;
const GIRDER_WIDTH = 1.2;
const GIRDER_X = 2.6;
const APEX_RISE = 26;
const SPREADER_BODY = 5.4;
const ROPE_RADIUS = 0.06;

export interface CabinMount {
  /** Eye point inside the cabin, as a child of the trolley. */
  eye: THREE.Object3D;
}

export class CraneRig implements CabinMount {
  readonly root = new THREE.Group();
  readonly eye = new THREE.Object3D();
  private readonly gantry = new THREE.Group();
  private readonly boomPivot = new THREE.Group();
  private readonly trolley = new THREE.Group();
  private readonly load = new THREE.Group();
  private readonly ends: Record<'left' | 'right', THREE.Group> = { left: new THREE.Group(), right: new THREE.Group() };
  private readonly arms: THREE.Mesh[] = [];
  private readonly flippers: { corner: Corner; pivot: THREE.Group }[] = [];
  private readonly lamps = new Map<Corner, THREE.Mesh>();
  private readonly lockLamp: THREE.Mesh;
  private readonly ropes: THREE.Mesh[] = [];
  private readonly forestays: { mesh: THREE.Mesh; boomPoint: THREE.Object3D }[] = [];
  private readonly apex: THREE.Vector3;
  private readonly sheaveY: number;
  private readonly headblockTop: number;
  private readonly spreaderHeight: number;
  private readonly mat = {
    frame: standard(0x8fa6bb, 0.6, 0.35),
    white: standard(0xeef1f3, 0.6, 0.1),
    dark: standard(0x3b4046, 0.6, 0.4),
    spreader: standard(0xf0b62b, 0.55, 0.25),
    rope: standard(0x2a2d31, 0.5, 0.8),
    glass: new THREE.MeshStandardMaterial({ color: 0x9fc6de, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.35 }),
    lampOff: new THREE.MeshStandardMaterial({ color: 0x7a1f1a, emissive: 0xff2a1a, emissiveIntensity: 1.6 }),
    lampOn: new THREE.MeshStandardMaterial({ color: 0x1f7a3a, emissive: 0x25ff6a, emissiveIntensity: 1.6 }),
    lockOff: new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0x111111 }),
    lockOn: new THREE.MeshStandardMaterial({ color: 0x1f5a7a, emissive: 0x3aa8ff, emissiveIntensity: 1.8 }),
  };

  constructor(profiles: Profiles) {
    const c = profiles.crane;
    const s = profiles.spreader;
    this.sheaveY = c.sheaveHeight_m;
    this.spreaderHeight = s.spreaderHeight_m;
    this.headblockTop = s.spreaderHeight_m + s.headblockHeight_m;
    const gauge = c.railGauge_m;
    const legX = c.clearWidthBetweenLegs_m / 2 + LEG / 2;
    const girderTop = c.sheaveHeight_m + 1;
    const girderBottom = girderTop - GIRDER_DEPTH;
    const hingeZ = -c.boomHingeFromWatersideRail_m;
    const backZ = gauge + c.backreach_m + 4;
    const f = this.mat.frame;

    // Portal: sill beams with bogies, four legs, lower portal beams, upper cross beams.
    for (const z of [0, gauge]) {
      this.gantry.add(span(f, -c.bufferToBuffer_m / 2, c.bufferToBuffer_m / 2, 1.2, SILL_TOP, z - 1, z + 1));
      for (const x of [-c.bufferToBuffer_m / 2 + 2, c.bufferToBuffer_m / 2 - 2]) this.gantry.add(span(this.mat.dark, x - 1.6, x + 1.6, 0.1, 1.2, z - 0.8, z + 0.8));
      for (const x of [-legX, legX]) this.gantry.add(span(f, x - LEG / 2, x + LEG / 2, SILL_TOP, girderBottom, z - LEG / 2, z + LEG / 2));
    }
    for (const x of [-legX, legX]) {
      this.gantry.add(span(f, x - 1, x + 1, c.portalClearance_m, c.portalClearance_m + 2, 0, gauge));
      this.gantry.add(span(f, x - 1, x + 1, girderBottom - 1.5, girderBottom, 0, gauge));
    }
    this.gantry.add(span(f, -legX, legX, girderBottom - 1.5, girderBottom, -1, 1));
    this.gantry.add(span(f, -legX, legX, girderBottom - 1.5, girderBottom, gauge - 1, gauge + 1));

    // Girder (landside of the hinge) and machinery house at its back end.
    for (const x of [-GIRDER_X, GIRDER_X]) this.gantry.add(span(f, x - GIRDER_WIDTH / 2, x + GIRDER_WIDTH / 2, girderBottom, girderTop, hingeZ, backZ));
    this.gantry.add(span(this.mat.white, -6, 6, girderTop, girderTop + 7, backZ - 16, backZ - 2));

    // A-frame apex with struts to the leg tops.
    this.apex = new THREE.Vector3(0, girderTop + APEX_RISE, 2);
    for (const side of [-1, 1]) {
      const top = new THREE.Vector3(side * 1.5, this.apex.y, this.apex.z);
      this.gantry.add(strut(f, new THREE.Vector3(side * legX, girderBottom, 0), top, 0.7));
      this.gantry.add(strut(f, new THREE.Vector3(side * legX, girderBottom, gauge), top, 0.6));
    }

    // Boom: hinged at the waterside, pointing to the water (−Z); rotates about X.
    const boomLength = c.outreach_m + 6 + hingeZ;
    this.boomPivot.position.set(0, (girderTop + girderBottom) / 2, hingeZ);
    for (const x of [-GIRDER_X, GIRDER_X]) {
      this.boomPivot.add(span(f, x - GIRDER_WIDTH / 2, x + GIRDER_WIDTH / 2, -GIRDER_DEPTH / 2, GIRDER_DEPTH / 2, -boomLength, 0));
    }
    this.boomPivot.add(span(f, -GIRDER_X, GIRDER_X, -GIRDER_DEPTH / 2, -GIRDER_DEPTH / 2 + 0.6, -boomLength, -boomLength + 1.5));
    for (const fraction of [0.45, 0.9]) {
      for (const side of [-1, 1]) {
        const point = new THREE.Object3D();
        point.position.set(side * GIRDER_X, GIRDER_DEPTH / 2, -boomLength * fraction);
        this.boomPivot.add(point);
        const mesh = strut(f, new THREE.Vector3(), new THREE.Vector3(0, 1, 0), 0.25);
        this.root.add(mesh);
        this.forestays.push({ mesh, boomPoint: point });
      }
    }
    this.gantry.add(this.boomPivot);

    // Trolley with the operator cabin hanging beside the ropes, waterside of the trolley centre.
    this.trolley.add(span(this.mat.white, -3.6, 3.6, girderTop, girderTop + 3, -4, 4));
    const cabin = new THREE.Group();
    cabin.position.set(5.2, girderBottom - 3.4, -3);
    cabin.add(span(this.mat.white, -1.6, 1.6, 1.2, 3.2, -2.1, 2.1));
    cabin.add(span(this.mat.glass, -1.6, 1.6, 0, 1.2, -2.1, 2.1));
    cabin.add(span(this.mat.dark, -0.4, 0.4, 3.2, girderTop - girderBottom + 3.4, -0.4, 0.4));
    this.eye.position.set(0, 1.55, -0.6);
    cabin.add(this.eye);
    this.trolley.add(cabin);
    this.gantry.add(this.trolley);

    // Headblock and telescopic spreader (with twistlock plane at the load origin).
    this.load.add(span(this.mat.dark, -1.9, 1.9, this.spreaderHeight, this.headblockTop, -1.1, 1.1));
    this.load.add(span(this.mat.spreader, -SPREADER_BODY / 2, SPREADER_BODY / 2, 0.3, 1.0, -1.15, 1.15));
    for (const zSide of [-0.8, 0.8]) {
      const arm = box(this.mat.spreader, 1, 0.35, 0.35, 0, 0.55, zSide);
      this.arms.push(arm);
      this.load.add(arm);
    }
    for (const [key, side] of [['left', -1], ['right', 1]] as const) {
      const end = this.ends[key];
      end.add(span(this.mat.spreader, -0.3, 0.3, 0, 1.0, -1.3, 1.3));
      for (const zSide of [-1, 1] as const) {
        const corner: Corner = `${zSide < 0 ? 'W' : 'L'}${side < 0 ? 'L' : 'R'}` as Corner;
        const cone = box(this.mat.dark, 0.14, 0.18, 0.14, 0, -0.09, (zSide * profiles.containers.castingSpacingWidth_m) / 2);
        end.add(cone);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), this.mat.lampOff);
        lamp.position.set(0, 1.2, zSide * 1.1);
        end.add(lamp);
        this.lamps.set(corner, lamp);
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.3, 1.0, zSide * 1.3);
        pivot.add(box(this.mat.spreader, 0.08, 1.0, 0.8, side * 0.04, -0.5, 0));
        end.add(pivot);
        this.flippers.push({ corner, pivot });
      }
      this.load.add(end);
    }
    this.lockLamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), this.mat.lockOff);
    this.lockLamp.position.set(0, 1.25, 0);
    this.load.add(this.lockLamp);

    for (let i = 0; i < 4; i++) {
      const rope = strut(this.mat.rope, new THREE.Vector3(), new THREE.Vector3(0, 1, 0), ROPE_RADIUS);
      rope.castShadow = false;
      this.ropes.push(rope);
      this.root.add(rope);
    }

    this.root.add(this.gantry, this.load);
  }

  private readonly a = new THREE.Vector3();
  private readonly b = new THREE.Vector3();

  update(v: CraneView): void {
    this.gantry.position.set(v.gantryX, 0, 0);
    this.boomPivot.rotation.x = v.boomAngle;
    this.trolley.position.set(0, 0, v.trolleyZ);
    this.load.position.set(v.load.x, v.load.y, v.load.z);

    // Telescope: end beams at the twistlock centres; arms span from the body to the ends.
    const half = v.castingLength / 2;
    this.ends.left.position.x = -half;
    this.ends.right.position.x = half;
    for (const arm of this.arms) arm.scale.x = 2 * half;

    for (const { corner, pivot } of this.flippers) {
      const side = corner.endsWith('L') ? -1 : 1;
      // Down = hanging below the corner; up = flipped over onto the end beam.
      pivot.rotation.z = side * (1 - v.flippersDown) * Math.PI;
    }
    for (const corner of CORNERS) {
      const lamp = this.lamps.get(corner);
      if (lamp) lamp.material = v.cornerLanded[corner] ? this.mat.lampOn : this.mat.lampOff;
    }
    this.lockLamp.material = v.locked ? this.mat.lockOn : this.mat.lockOff;

    // Four rope falls from the trolley sheaves to the headblock.
    this.ropes.forEach((rope, i) => {
      const dx = i % 2 === 0 ? -1.0 : 1.0;
      const dz = i < 2 ? -0.7 : 0.7;
      this.a.set(v.gantryX + dx, this.sheaveY, v.trolleyZ + dz);
      this.b.set(v.load.x + dx, v.load.y + this.headblockTop, v.load.z + dz);
      placeStrut(rope, this.a, this.b, ROPE_RADIUS);
    });

    this.root.updateMatrixWorld(true);
    const apexWorld = this.apex.clone().add(this.gantry.position);
    for (const stay of this.forestays) {
      stay.boomPoint.getWorldPosition(this.b);
      placeStrut(stay.mesh, apexWorld, this.b, 0.25);
    }
  }
}
