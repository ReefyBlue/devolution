// Cabin view: the operator's eye in the trolley cabin. Yaw 0 faces the water; limits and start pitch from
// config/camera.json (read every frame, so the tuning panel applies at once).

import * as THREE from 'three';
import type { Profiles } from '../config/profiles';
import { degToRad } from '../core/units';

export class CabinCamera {
  readonly camera = new THREE.PerspectiveCamera(60, 1, 0.1, 4000);
  /** Degrees; + turns left. */
  yaw = 0;
  /** Degrees; − looks down. */
  pitch: number;

  constructor(private readonly settings: Profiles['camera']) {
    this.pitch = settings.startPitch_deg;
    this.camera.rotation.order = 'YXZ';
  }

  /** Turns the view by mouse pixels and stick deflection (−1 … +1) over dt. */
  look(mouse: { dx: number; dy: number }, stick: { x: number; y: number }, dt: number): void {
    const s = this.settings;
    const yaw = this.yaw - mouse.dx * s.mouseSensitivity_degPerPx - stick.x * s.stickSpeed_degps * dt;
    const pitch = this.pitch - mouse.dy * s.mouseSensitivity_degPerPx - stick.y * s.stickSpeed_degps * dt;
    this.yaw = Math.min(s.yawLimit_deg, Math.max(-s.yawLimit_deg, yaw));
    this.pitch = Math.min(s.pitchUp_deg, Math.max(-s.pitchDown_deg, pitch));
  }

  /** Places the camera at the cabin eye point. */
  update(eye: THREE.Object3D): void {
    eye.getWorldPosition(this.camera.position);
    this.camera.rotation.set(degToRad(this.pitch), degToRad(this.yaw), 0);
    if (this.camera.fov !== this.settings.cabinFov_deg) {
      this.camera.fov = this.settings.cabinFov_deg;
      this.camera.updateProjectionMatrix();
    }
  }
}
