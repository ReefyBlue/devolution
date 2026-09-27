// Terminal tractor with a 20/40 combo chassis in the truck lane.

import * as THREE from 'three';
import type { Chassis } from '../yard/chassis';
import { span, standard } from './primitives';

export function buildTractorAndChassis(ch: Chassis): THREE.Group {
  const group = new THREE.Group();
  const frame = standard(0x2c3136, 0.7, 0.4);
  const tyre = standard(0x151617, 0.9, 0);
  const tractorPaint = standard(0xe39b21, 0.6, 0.2);
  const glass = standard(0x2b3b47, 0.2, 0.5);
  const half = ch.length / 2;

  // Chassis bed with cone rails, rear bogie and landing legs.
  group.add(span(frame, -half, half, ch.bedTop - 0.35, ch.bedTop, -1.2, 1.2));
  group.add(span(frame, -half, half, ch.bedTop - 0.05, ch.bedTop, -1.25, -1.1));
  group.add(span(frame, -half, half, ch.bedTop - 0.05, ch.bedTop, 1.1, 1.25));
  const wheel = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16);
  wheel.rotateX(Math.PI / 2);
  const rearAxles = [-half + 1.3, -half + 2.6];
  for (const x of rearAxles) {
    for (const z of [-1.0, 1.0]) {
      const w = new THREE.Mesh(wheel, tyre);
      w.position.set(x, 0.5, z);
      w.castShadow = true;
      group.add(w);
    }
  }
  group.add(span(frame, 1.5, 1.8, 0, ch.bedTop - 0.35, -0.9, -0.7));
  group.add(span(frame, 1.5, 1.8, 0, ch.bedTop - 0.35, 0.7, 0.9));

  // Tractor unit coupled at the front (gooseneck end).
  const tx = half + 1.6;
  group.add(span(tractorPaint, tx - 1.8, tx + 2.2, 0.6, 1.2, -1.2, 1.2));
  group.add(span(tractorPaint, tx + 0.6, tx + 2.4, 1.2, 3.2, -1.2, 1.2));
  group.add(span(glass, tx + 2.35, tx + 2.45, 2.2, 3.0, -1.0, 1.0));
  for (const x of [tx - 1.1, tx + 1.8]) {
    for (const z of [-1.0, 1.0]) {
      const w = new THREE.Mesh(wheel, tyre);
      w.position.set(x, 0.5, z);
      group.add(w);
    }
  }

  group.position.set(ch.x, 0, ch.z);
  group.rotation.y = ch.direction === 1 ? 0 : Math.PI;
  return group;
}
