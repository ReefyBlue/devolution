// Small helpers for building placeholder geometry from boxes and cylinders.

import * as THREE from 'three';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 12);

/** A box mesh centred at (x, y, z) with size (sx, sy, sz); shared geometry, scaled. */
export function box(material: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(UNIT_BOX, material);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** A box spanning [x0, x1] × [y0, y1] × [z0, z1]. */
export function span(material: THREE.Material, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): THREE.Mesh {
  return box(material, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}

/** A round strut between two points. */
export function strut(material: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, radius: number): THREE.Mesh {
  const m = new THREE.Mesh(UNIT_CYLINDER, material);
  placeStrut(m, a, b, radius);
  m.castShadow = true;
  return m;
}

const UP = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();

/** Re-aims an existing strut mesh (used for forestays that follow the boom). */
export function placeStrut(m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, radius: number): void {
  dir.subVectors(b, a);
  const len = dir.length();
  m.scale.set(radius, len, radius);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
}

export function standard(colour: number | string, roughness = 0.7, metalness = 0.1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: colour, roughness, metalness });
}
