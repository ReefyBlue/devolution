// The only reader of keyboard and gamepad: maps the bindings in config/controls.json to crane commands
// and latched button presses. Axes and held modifiers use the latest state; presses wait until taken.

import type { Profiles } from '../config/profiles';
import type { CraneCommands } from '../crane/crane';
import { GamepadReader } from './gamepad';
import { Keyboard } from './keyboard';

type Bindings = Profiles['controls'];

/** Button actions that are latched until a fixed step (or the frame loop, for camera and tuning) takes them. */
export type PressAction =
  | 'lock'
  | 'flippers'
  | 'antiSway'
  | 'spreader20'
  | 'spreader40'
  | 'spreader45'
  | 'spreaderLonger'
  | 'spreaderShorter'
  | 'camera'
  | 'tuning';

export class CraneInput {
  readonly gamepad: GamepadReader;
  private readonly keyboard: Keyboard;

  constructor(
    private readonly bindings: Bindings,
    target: Window,
  ) {
    const bound = new Set(Object.values(bindings.keyboard).flat());
    this.keyboard = new Keyboard(target, bound);
    this.gamepad = new GamepadReader(bindings.gamepad.deadzone);
  }

  /** Commands for the next fixed step. With the boom modifier held, the hoist lever drives the boom. */
  commands(): CraneCommands {
    const k = this.bindings.keyboard;
    const g = this.bindings.gamepad;
    const pad = this.gamepad;
    const key = (plus: readonly string[], minus: readonly string[]): number =>
      (this.keyboard.isHeld(plus) ? 1 : 0) - (this.keyboard.isHeld(minus) ? 1 : 0);

    // Stick up reads −1 in the Gamepad API: up on the left stick = towards the water.
    const trolley = key(k.trolleyWaterside, k.trolleyLandside) - pad.axis(g.axes.trolley);
    const gantry = key(k.gantryPlusX, k.gantryMinusX) + (pad.isHeld(g.buttons.gantryPlusX) ? 1 : 0) - (pad.isHeld(g.buttons.gantryMinusX) ? 1 : 0);
    // While look is held the right stick turns the view, not the hoist.
    const stick = pad.isHeld(g.buttons.look) ? 0 : pad.axis(g.axes.hoist);
    const lever = key(k.hoistUp, k.hoistDown) + (g.hoistForwardLowers ? stick : -stick);
    const boomHeld = this.keyboard.isHeld(k.boom) || pad.isHeld(g.buttons.boom);

    return {
      gantry: clampUnit(gantry),
      trolley: clampUnit(trolley),
      hoist: boomHeld ? 0 : clampUnit(lever),
      boom: boomHeld ? clampUnit(lever) : 0,
      creep: this.keyboard.isHeld(k.creep) || pad.isHeld(g.buttons.creep),
    };
  }

  /** Presses of an action since it was last taken (keyboard and gamepad together). */
  take(action: PressAction): number {
    const k = this.bindings.keyboard;
    const b = this.bindings.gamepad.buttons;
    switch (action) {
      case 'lock':
      case 'flippers':
      case 'antiSway':
      case 'camera':
        return this.keyboard.takePresses(k[action]) + this.gamepad.takePresses(b[action]);
      case 'spreaderLonger':
      case 'spreaderShorter':
        return this.gamepad.takePresses(b[action]);
      case 'spreader20':
      case 'spreader40':
      case 'spreader45':
      case 'tuning':
        return this.keyboard.takePresses(k[action]);
    }
  }
}

const clampUnit = (v: number): number => Math.min(1, Math.max(-1, v));
