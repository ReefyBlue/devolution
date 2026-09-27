// Puts QuayOps together: world, scene, crane simulation on the fixed step, input, cameras, HUD, sounds
// and the tuning panel; one animation loop renders the interpolated state.

import * as THREE from 'three';
import { CraneAudio } from './audio/craneAudio';
import { loadProfiles } from './config/profiles';
import { FixedStepClock } from './core/fixedStep';
import { pad2 } from './core/slotAddress';
import { formatClock, mpsToKnots } from './core/units';
import { Crane, type CraneCommands, NO_COMMANDS } from './crane/crane';
import type { CraneEvent } from './crane/events';
import { CraneInput } from './input/craneInput';
import { MouseLook } from './input/mouseLook';
import { CabinCamera } from './render/cabinCamera';
import { ContainerMeshes } from './render/containerMeshes';
import { CraneRig } from './render/craneRig';
import { buildEnvironment, followWithShadows } from './render/environment';
import { OrbitCamera } from './render/orbitCamera';
import { Stage } from './render/stage';
import { buildVessel } from './render/vesselMesh';
import { buildTractorAndChassis } from './render/yardMesh';
import { type CraneView, lerpView } from './sim/craneView';
import { TestMoves } from './sim/testMoves';
import { World } from './sim/world';
import { installTestHooks } from './testHooks';
import { Hud, type HudData } from './ui/hud';
import { TuningPanel } from './ui/tuningPanel';
import { abeam } from './vessel/abeam';

export type CameraMode = 'cabin' | 'orbit';

export function startApp(host: HTMLElement): void {
  const { profiles, scene } = loadProfiles();
  const world = new World(scene, profiles);
  const stage = new Stage(host);
  const env = buildEnvironment(stage.scene, world);
  const rig = new CraneRig(profiles);
  const boxes = new ContainerMeshes(profiles);
  stage.scene.add(buildVessel(world), buildTractorAndChassis(world.chassis), rig.root, boxes.group);

  const sim = new Crane(profiles, world);
  const input = new CraneInput(profiles.controls, window);
  const audio = new CraneAudio(profiles.audio, window);
  const moves = new TestMoves(scene.testMoves, world);
  const hud = new Hud(host, profiles.hud);
  const tuning = new TuningPanel(profiles, scene, () => sim.retune());
  const clock = new FixedStepClock();
  const eventLog: CraneEvent[] = [];
  let commands: CraneCommands = NO_COMMANDS;
  let lastPlacement = '';
  let previous = sim.view();
  let current = previous;

  const cabin = new CabinCamera(profiles.camera);
  const mouseLook = new MouseLook(stage.renderer.domElement);
  const orbit = new OrbitCamera(stage.renderer.domElement, profiles.camera, loadPoint(current));
  let mode: CameraMode = 'cabin';
  const setMode = (m: CameraMode): void => {
    mode = m;
    mouseLook.enabled = m === 'cabin';
    orbit.controls.enabled = m === 'orbit';
  };
  setMode('cabin');

  const report = (e: CraneEvent): void => {
    audio.play(e);
    eventLog.push(e);
    const update = moves.onEvent(e, sim.time);
    if (e.kind === 'landed' && e.hard) hud.flash(`▲ HARD LANDING ${e.speed.toFixed(1)} m/s`, 'alarm', 4);
    else if (e.kind === 'refused') hud.flash(`${e.action.toUpperCase()} REFUSED · ${e.reason}`, 'warn', 3);
    else if (e.kind === 'twistlocks') hud.flash(e.locked ? 'LOCKED' : 'UNLOCKED', 'ok', 1.5);
    else if (e.kind === 'cleared') hud.flash(`${e.laneId}: tractor away with ${e.boxId}`, 'ok', 3);
    else if (e.kind === 'placed') {
      lastPlacement = `Δ ${Math.hypot(e.dx_cm, e.dz_cm).toFixed(1)} cm · ${e.yaw_deg.toFixed(1)}°`;
      hud.flash(`PLACED ${e.label} · Δ ${e.dx_cm.toFixed(1)} / ${e.dz_cm.toFixed(1)} cm`, 'ok', 5);
    }
    const move = moves.last?.move ?? moves.current;
    if (update === 'done' && move) hud.flash(`MOVE DONE ${move.from} ─► ${move.to} in ${formatClock(moves.last?.time_s ?? 0)}`, 'ok', 6);
    if (update === 'wrongPosition' && moves.current) hud.flash(`WRONG POSITION: ${moves.current.to} ${moves.current.chassisPosition} expected`, 'warn', 6);
    if (update === 'missed' && move) hud.flash(`MOVE MISSED ${move.from}: the tractor left with the box`, 'warn', 6);
  };

  const step = (): void => {
    input.gamepad.poll();
    commands = input.commands();
    sim.step(clock.dt, commands);
    for (const e of sim.events) report(e);
    sim.events.length = 0;
    audio.update(clock.dt, sim.gantry.travelling);
    previous = current;
    current = sim.view();
  };

  const hudData = (view: CraneView): HudData => {
    const wind = sim.wind;
    const along = world.frame.windComponents(1, wind.settings.fromDirection_deg);
    const from = Math.abs(along.towardsWater) >= Math.abs(along.alongX) ? (along.towardsWater > 0 ? 'LS' : 'WS') : along.alongX > 0 ? 'left' : 'right';
    const move = moves.current;
    const box = moves.boxId ? world.container(moves.boxId) : undefined;
    const carried = sim.carried?.box;
    const at = abeam(world.geometry, world.vesselBounds(), view.load.x, view.load.z);
    const boom = sim.boom;
    const boomText = boom.interlock
      ? `BOOM: ${boom.interlock}`
      : boom.down
        ? 'BOOM DOWN'
        : boom.latched
          ? 'BOOM UP · LATCHED'
          : `BOOM ${boom.axis.position.toFixed(0)}°`;
    const telescope = sim.spreader.telescope;
    const flippers = sim.spreader.flippers;
    const offsets = sim.sway.offsets(sim.ropeFall);
    return {
      title: `${profiles.crane.profileId} · ${mode.toUpperCase()}`,
      wind: {
        kn: mpsToKnots(wind.speed),
        mps: wind.speed,
        from: `${wind.settings.fromDirection_deg.toFixed(0)}° (${from})`,
        gust_kn: wind.settings.gustSpeed_kn,
        stop_kn: Math.min(profiles.crane.inServiceWindLimit_kn, profiles.rules.windStopLimit_kn),
      },
      move: move && {
        route: `${move.from} ─► ${move.to} ${move.chassisPosition}`,
        box: box ? `${box.id} · ${box.size}' ${box.height === 'HC' ? 'HC' : box.type} · ${box.grossWeight_t.toFixed(1)} t` : '',
        elapsed: formatClock(sim.time - moves.startedAt),
        target: formatClock(profiles.rules.moveTimeTargets_s.discharge),
      },
      lastPlacement,
      hoist: { height: sim.load.pose.y, speed: sim.hoist.axis.velocity, load_t: carried ? carried.grossWeight_t : null, creep: commands.creep },
      trolley: { fwr: sim.trolley.fwr, speed: sim.trolley.axis.velocity, abeam: at ? `ABEAM BAY ${pad2(at.bay)} ROW ${pad2(at.row)}` : '' },
      gantry: { mark: world.frame.quayMark(sim.gantry.x), speed: sim.gantry.axis.velocity, boom: boomText, boomAlert: boom.interlock !== '' },
      spreader: {
        size: telescope.moving ? `→ ${telescope.size}'` : `${telescope.size}'`,
        lock: sim.spreader.twistlocks.state.toUpperCase(),
        flippers: flippers.position === 0 ? 'FLIPPERS UP' : flippers.fullyDown ? 'FLIPPERS DOWN' : 'FLIPPERS MOVING',
        antiSway: `ANTI-SWAY ${sim.antiSway ? 'ON' : 'OFF'}`,
      },
      corners: view.cornerLanded,
      sway_m: Math.hypot(offsets.trolley, offsets.gantry),
    };
  };

  let last = performance.now();
  const frame = (now: number): void => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    input.gamepad.poll();
    if (input.take('camera') % 2 === 1) setMode(mode === 'cabin' ? 'orbit' : 'cabin');
    if (input.take('tuning') % 2 === 1) tuning.toggle();
    for (let i = clock.advance(dt); i > 0; i--) step();

    const view = lerpView(previous, current, clock.alpha);
    rig.update(view);
    boxes.sync(world.containers);
    if (view.carried) {
      const o = view.carried.offset;
      boxes.placeBottom(view.carried.id, view.load.x + o.x, view.load.y + o.y, view.load.z + o.z);
    }
    followWithShadows(env, view.gantryX, 0);
    hud.update(dt, hudData(view));

    orbit.follow(loadPoint(view));
    cabin.look(mouseLook.take(), input.gamepadLook(), dt);
    cabin.update(rig.eye);
    const camera = mode === 'cabin' ? cabin.camera : orbit.camera;
    stage.fit(camera);
    stage.renderer.render(stage.scene, camera);
  };
  stage.renderer.setAnimationLoop(frame);

  installTestHooks({ sim, world, clock, step, eventLog, orbit, setMode, getMode: () => mode, resync: () => (current = previous = sim.view()) });
  document.body.dataset.ready = 'true';
}

const loadPoint = (v: CraneView): THREE.Vector3 => new THREE.Vector3(v.load.x, v.load.y, v.load.z);
