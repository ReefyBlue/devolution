// Orbit camera around the spreader: right drag orbits, middle drag pans, the wheel zooms. It follows the
// spreader, so the view keeps its angle and distance while the crane moves.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Profiles } from '../config/profiles';

export class OrbitCamera {
  readonly camera = new THREE.PerspectiveCamera(55, 1, 0.3, 4000);
  readonly controls: OrbitControls;
  private readonly followed = new THREE.Vector3();
  private readonly delta = new THREE.Vector3();

  constructor(
    element: HTMLElement,
    private readonly settings: Profiles['camera'],
    start: THREE.Vector3,
  ) {
    this.controls = new OrbitControls(this.camera, element);
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
    this.followed.copy(start);
    this.setPose(new THREE.Vector3(start.x + 35, start.y + 15, start.z + 45), start);
  }

  setPose(position: THREE.Vector3, target: THREE.Vector3): void {
    this.camera.position.copy(position);
    this.controls.target.copy(target);
    this.controls.update();
  }

  /** Moves camera and target with the spreader. */
  follow(point: THREE.Vector3): void {
    this.delta.subVectors(point, this.followed);
    this.followed.copy(point);
    this.camera.position.add(this.delta);
    this.controls.target.add(this.delta);
    this.controls.minDistance = this.settings.orbitMinDistance_m;
    this.controls.maxDistance = this.settings.orbitMaxDistance_m;
    this.controls.update();
  }
}
