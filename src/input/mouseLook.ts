// Mouse look for the cabin camera: hold the right button and move the mouse. The pointer is locked while
// the button is held where the page allows it; without the lock, dragging works the same way.

export class MouseLook {
  /** Only the cabin view uses it; the orbit camera has its own mouse handling. */
  enabled = true;
  private held = false;
  private dx = 0;
  private dy = 0;

  constructor(private readonly element: HTMLElement) {
    element.addEventListener('contextmenu', (e) => e.preventDefault());
    element.addEventListener('pointerdown', (e) => {
      if (e.button !== 2 || !this.enabled) return;
      this.held = true;
      this.lock();
    });
    window.addEventListener('pointerup', (e) => {
      if (e.button !== 2 || !this.held) return;
      this.held = false;
      if (document.pointerLockElement === element) document.exitPointerLock();
    });
    window.addEventListener('pointermove', (e) => {
      if (!this.held) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
  }

  /** Mouse movement in pixels since the last call. */
  take(): { dx: number; dy: number } {
    const d = { dx: this.dx, dy: this.dy };
    this.dx = this.dy = 0;
    return d;
  }

  private lock(): void {
    try {
      const request = this.element.requestPointerLock() as Promise<void> | undefined;
      request?.catch(() => undefined);
    } catch {
      // Pointer lock not allowed here; dragging still turns the view.
    }
  }
}
