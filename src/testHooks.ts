// Test interface for the headless smoke run (window.__quayops): fixed viewpoints, fast-forward with the
// live input, a sway trace, the crane state, boxes and events. Not used by the app itself.

import * as THREE from 'three';
import type { CameraMode } from './app';
import type { FixedStepClock } from './core/fixedStep';
import type { RampedAxis } from './core/rampedAxis';
import { radToDeg } from './core/units';
import type { Crane } from './crane/crane';
import type { CraneEvent } from './crane/events';
import type { OrbitCamera } from './render/orbitCamera';
import type { World } from './sim/world';

export interface HookDeps {
  sim: Crane;
  world: World;
  clock: FixedStepClock;
  step: () => void;
  eventLog: readonly CraneEvent[];
  orbit: OrbitCamera;
  setMode: (m: CameraMode) => void;
  getMode: () => CameraMode;
  /** Makes the rendered state jump to the simulation (after setting a position directly). */
  resync: () => void;
}

export function installTestHooks(d: HookDeps): void {
  const { sim, world } = d;
  const x = sim.gantry.x;
  const v = (px: number, py: number, pz: number): THREE.Vector3 => new THREE.Vector3(px, py, pz);
  const views: Record<string, [THREE.Vector3, THREE.Vector3] | null> = {
    cabin: null,
    overview: [v(x - 120, 75, 150), v(x, 18, -5)],
    stack: [v(x + 30, 28, 22), v(x, 6, -16)],
    crane: [v(x + 85, 45, 75), v(x, 32, 8)],
    lane: [v(x - 22, 10, 26), v(x, 2, world.chassis.z)],
  };
  const setView = (name: string): void => {
    const pose = views[name];
    if (!pose) return d.setMode('cabin');
    d.setMode('orbit');
    d.orbit.setPose(pose[0], pose[1]);
  };
  const advance = (seconds: number): { trolley: number; gantry: number }[] => {
    const trace = [];
    for (let i = 0; i < Math.round(seconds / d.clock.dt); i++) {
      d.step();
      trace.push({ trolley: radToDeg(sim.sway.trolley.angle), gantry: radToDeg(sim.sway.gantry.angle) });
    }
    return trace;
  };
  const setHoist = (height: number): void => {
    sim.hoist.axis.reset(height);
    sim.load.pose.y = height;
    sim.sway.ground();
    d.resync();
  };
  const drive = (a: { axis: RampedAxis }) => ({
    position: a.axis.position,
    velocity: a.axis.velocity,
    atLimit: a.axis.atLimit,
    min: a.axis.travel.min,
    max: a.axis.travel.max,
    maxSpeed: a.axis.params.maxSpeed,
  });
  const state = () => ({
    gantry: drive(sim.gantry),
    trolley: drive(sim.trolley),
    hoist: drive(sim.hoist),
    boom: { ...drive(sim.boom), latched: sim.boom.latched, interlock: sim.boom.interlock },
    ropeFall: sim.ropeFall,
    antiSway: sim.antiSway,
    load: { ...sim.load.pose },
    sway: { trolley: radToDeg(sim.sway.trolley.angle), gantry: radToDeg(sim.sway.gantry.angle) },
    spreader: {
      size: sim.spreaderSize,
      lock: sim.spreader.twistlocks.state,
      flippers: sim.spreader.flippers.position,
      landed: { ...sim.landing.landed },
      carried: sim.carried?.box.id ?? null,
    },
    boxes: world.containers.map((b) => ({ id: b.id, location: b.location, x: b.x, y: b.y, z: b.z, size: b.size })),
    events: d.eventLog.slice(-30),
    camera: d.getMode(),
  });
  Object.assign(window, { __quayops: { setView, views: Object.keys(views), advance, state, setHoist } });
}
