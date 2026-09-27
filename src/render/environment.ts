// Sky, light, water and the quay: apron, cope and fenders, crane rails, truck lane markings, quay marks.

import * as THREE from 'three';
import { COPE_EDGE_FROM_WATERSIDE_RAIL_M, type World } from '../sim/world';
import { textSprite } from './labels';
import { span, standard } from './primitives';

/** How far the quay and the terminal continue past the berth ends and behind the apron, m (visual only). */
const SURROUNDINGS_M = 1500;

export interface Environment {
  sun: THREE.DirectionalLight;
}

export function buildEnvironment(scene: THREE.Scene, world: World): Environment {
  const q = world.scene.quay;
  const frame = world.frame;
  const sky = new THREE.Color(0xb7cfe2);
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, 350, 1600);

  scene.add(new THREE.HemisphereLight(0xdbe8f5, 0x5c5a52, 1.1));
  const sun = new THREE.DirectionalLight(0xfff2de, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -130;
  sc.right = 130;
  sc.top = 130;
  sc.bottom = -130;
  sc.near = 10;
  sc.far = 500;
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);

  const concrete = standard(0xb8b3a8, 0.95, 0);
  const face = standard(0x8d877c, 0.95, 0);
  const steel = standard(0x6d747a, 0.4, 0.7);
  const rubber = standard(0x1c1d1f, 0.9, 0);
  const white = standard(0xf2f2ee, 0.8, 0);
  const yellow = standard(0xe8c23a, 0.8, 0);

  // The quay continues past both berth ends; water only on the waterside, the terminal behind the apron.
  const copeZ = frame.worldZ(COPE_EDGE_FROM_WATERSIDE_RAIL_M);
  const back = q.landsideDepth_m;
  const x0 = -SURROUNDINGS_M;
  const x1 = q.length_m + SURROUNDINGS_M;
  const waterY = -q.apronAboveWaterline_m;
  const water = span(standard(0x2b5566, 0.22, 0.15), x0, x1, waterY - 0.1, waterY, copeZ - SURROUNDINGS_M * 2, copeZ + 1);
  water.castShadow = false;
  scene.add(water);
  scene.add(span(concrete, x0, x1, -0.6, 0, copeZ, back));
  scene.add(span(face, x0, x1, waterY - 6, -0.6, copeZ, copeZ + 2));
  const yard = span(standard(0x77736c, 0.95, 0), x0, x1, -0.6, -0.02, back, back + SURROUNDINGS_M);
  yard.castShadow = false;
  scene.add(yard);

  // Fenders every 15 m between the cope edge and the fender line.
  const fenderZ = frame.worldZ(q.watersideRailToFenderLine_m);
  for (let x = x0 + 7.5; x < x1; x += 15) {
    scene.add(span(rubber, x - 1.2, x + 1.2, -3.5, -0.6, fenderZ, copeZ));
  }

  // Crane rails: waterside at Z 0, landside at the rail gauge.
  const gauge = world.profiles.crane.railGauge_m;
  for (const fwr of [0, -gauge]) {
    const z = frame.worldZ(fwr);
    scene.add(span(steel, x0, x1, 0, 0.12, z - 0.08, z + 0.08));
  }

  // Truck lane markings.
  const laneZ = frame.worldZ(world.scene.lane.fromWatersideRail_m);
  for (const edge of [-1.9, 1.9]) scene.add(span(white, x0, x1, 0, 0.02, laneZ + edge - 0.08, laneZ + edge + 0.08));

  // Quay mark ticks every 10 m at the cope edge, numbers every 20 m.
  for (let mark = 0; mark <= q.length_m; mark += 10) {
    const x = frame.worldX(mark);
    scene.add(span(yellow, x - 0.1, x + 0.1, 0, 0.03, copeZ, copeZ + (mark % 50 === 0 ? 2.5 : 1.2)));
    if (mark % 20 === 0) {
      const label = textSprite(String(mark), 1.4, '#20262c');
      label.position.set(x, 0.9, copeZ + 3.6);
      scene.add(label);
    }
  }

  return { sun };
}

/** Keeps the sun's shadow box centred on the working area. */
export function followWithShadows(env: Environment, x: number, z: number): void {
  env.sun.position.set(x - 120, 220, z + 90);
  env.sun.target.position.set(x, 0, z);
}
