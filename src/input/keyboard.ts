// Keyboard state by KeyboardEvent.code: keys held now, and presses latched until they are taken.

/** Typing in a form field (tuning panel) must not drive the crane. */
const isTyping = (e: KeyboardEvent): boolean =>
  e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;

export class Keyboard {
  private readonly held = new Set<string>();
  private readonly presses = new Map<string, number>();

  /** `bound` lists the codes the app uses; the browser's own action for them (scrolling, menus) is suppressed. */
  constructor(target: Window, bound: ReadonlySet<string>) {
    target.addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      if (bound.has(e.code)) e.preventDefault();
      if (!e.repeat) this.presses.set(e.code, (this.presses.get(e.code) ?? 0) + 1);
      this.held.add(e.code);
    });
    target.addEventListener('keyup', (e) => this.held.delete(e.code));
    // Keys released while the window has no focus never send keyup.
    target.addEventListener('blur', () => this.held.clear());
  }

  isHeld(codes: readonly string[]): boolean {
    return codes.some((c) => this.held.has(c));
  }

  /** Number of presses of any of the codes since the last call; clears them. */
  takePresses(codes: readonly string[]): number {
    let n = 0;
    for (const c of codes) {
      n += this.presses.get(c) ?? 0;
      this.presses.delete(c);
    }
    return n;
  }
}
