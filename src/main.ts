import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadProfiles, ProfileError } from './config/profiles';
import { FixedStepClock } from './core/fixedStep';
import { Crane } from './crane/crane';
import { CraneInput } from './input/craneInput';
import { ContainerMeshes } from './render/containerMeshes';
import { CraneRig } from './render/craneRig';
import { buildEnvironment, followWithShadows } from './render/environment';
import { Stage } from './render/stage';
import { buildVessel } from './render/vesselMesh';
import { buildTractorAndChassis } from './render/yardMesh';
import { lerpView } from './sim/craneView';
import { World } from './sim/world';

const host = document.getElementById('app');
if (!host) throw new Error('QuayOps: #app element missing');

try {
  start(host);
} catch (e) {
  showStartupError(e);
}

function start(el: HTMLElement): void {
  const { profiles, scene } = loadProfiles();
  const world = new World(scene, profiles);
  const stage = new Stage(el);
  const env = buildEnvironment(stage.scene, world);
  const crane = new CraneRig(profiles);
  const boxes = new ContainerMeshes(profiles);
  stage.scene.add(buildVessel(world), buildTractorAndChassis(world.chassis), crane.root, boxes.group);
  boxes.sync(world.containers);

  const sim = new Crane(profiles, scene, world.frame);
  const input = new CraneInput(profiles.controls, window);
  const clock = new FixedStepClock();
  let previous = sim.view();
  let current = previous;
  const step = (): void => {
    input.gamepad.poll();
    sim.step(clock.dt, input.commands());
    previous = current;
    current = sim.view();
  };

  const gantryX = current.gantryX;

  const camera = new THREE.PerspectiveCamera(55, stage.aspect, 0.3, 4000);
  const orbit = new OrbitControls(camera, stage.renderer.domElement);
  orbit.minDistance = profiles.camera.orbitMinDistance_m;
  orbit.maxDistance = profiles.camera.orbitMaxDistance_m;
  const views: Record<string, [THREE.Vector3, THREE.Vector3]> = {
    overview: [new THREE.Vector3(gantryX - 120, 75, 150), new THREE.Vector3(gantryX, 18, -5)],
    stack: [new THREE.Vector3(gantryX + 30, 28, 22), new THREE.Vector3(gantryX, 6, -16)],
    crane: [new THREE.Vector3(gantryX + 85, 45, 75), new THREE.Vector3(gantryX, 32, 8)],
    lane: [new THREE.Vector3(gantryX - 22, 10, 26), new THREE.Vector3(gantryX, 2, world.chassis.z)],
  };
  const setView = (name: string): void => {
    const v = views[name] ?? views.overview;
    if (!v) return;
    camera.position.copy(v[0]);
    orbit.target.copy(v[1]);
    orbit.update();
  };
  setView('overview');

  let last = performance.now();
  const frame = (now: number): void => {
    const steps = clock.advance((now - last) / 1000);
    last = now;
    input.gamepad.poll();
    for (let i = 0; i < steps; i++) step();
    const view = lerpView(previous, current, clock.alpha);
    crane.update(view);
    followWithShadows(env, view.gantryX, 0);
    stage.fit(camera);
    orbit.update();
    stage.renderer.render(stage.scene, camera);
  };
  stage.renderer.setAnimationLoop(frame);

  // Test hooks for the headless smoke run: fast-forward the simulation with the live input, read the drives.
  const advance = (seconds: number): void => {
    for (let i = 0; i < Math.round(seconds / clock.dt); i++) step();
  };
  const drive = (a: { axis: { position: number; velocity: number; atLimit: boolean; travel: { min: number; max: number } } }) => ({
    position: a.axis.position,
    velocity: a.axis.velocity,
    atLimit: a.axis.atLimit,
    min: a.axis.travel.min,
    max: a.axis.travel.max,
  });
  const state = () => ({
    gantry: drive(sim.gantry),
    trolley: drive(sim.trolley),
    hoist: drive(sim.hoist),
    boom: { ...drive(sim.boom), latched: sim.boom.latched, interlock: sim.boom.interlock },
  });
  Object.assign(window, { __quayops: { setView, views: Object.keys(views), advance, state } });
  document.body.dataset.ready = 'true';
}

function showStartupError(e: unknown): void {
  const box = document.createElement('pre');
  box.className = 'startup-error';
  box.textContent = e instanceof ProfileError ? e.message : `QuayOps could not start:\n${String(e)}`;
  document.body.appendChild(box);
  document.body.dataset.ready = 'error';
  console.error(e);
}
