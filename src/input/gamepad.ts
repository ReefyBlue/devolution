// Gamepad API polling: the first connected pad, sticks with a scaled deadzone, button presses latched.

export class GamepadReader {
  private axes: readonly number[] = [];
  private down: boolean[] = [];
  private readonly presses = new Map<number, number>();
  private available = typeof navigator !== 'undefined' && 'getGamepads' in navigator;

  constructor(private readonly deadzone: number) {}

  /** Reads the pad; call once per rendered frame and before each simulation step. */
  poll(): void {
    const pad = this.firstPad();
    if (!pad) {
      this.axes = [];
      this.down = [];
      return;
    }
    this.axes = pad.axes;
    pad.buttons.forEach((b, i) => {
      if (b.pressed && !this.down[i]) this.presses.set(i, (this.presses.get(i) ?? 0) + 1);
      this.down[i] = b.pressed;
    });
  }

  /** Stick axis −1 … +1 with the deadzone removed and the rest rescaled. */
  axis(index: number): number {
    const v = this.axes[index] ?? 0;
    const m = Math.abs(v);
    return m <= this.deadzone ? 0 : (Math.sign(v) * (m - this.deadzone)) / (1 - this.deadzone);
  }

  isHeld(button: number): boolean {
    return this.down[button] ?? false;
  }

  takePresses(button: number): number {
    const n = this.presses.get(button) ?? 0;
    this.presses.delete(button);
    return n;
  }

  private firstPad(): Gamepad | null {
    if (!this.available) return null;
    try {
      return navigator.getGamepads().find((p): p is Gamepad => p !== null && p.connected) ?? null;
    } catch {
      // Embedded pages can be denied the gamepad by permissions policy; the keyboard still works.
      this.available = false;
      console.warn('QuayOps: gamepad access is blocked on this page; use the offline file for a gamepad.');
      return null;
    }
  }
}
