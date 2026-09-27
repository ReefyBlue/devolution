// Procedural crane sounds (Web Audio): twistlock clunk, landing thud, hard-landing alarm, refusal buzz,
// gantry warning bell. The audio context starts on the first key or pointer press, as browsers require.

import type { Profiles } from '../config/profiles';
import type { CraneEvent } from '../crane/events';

export class CraneAudio {
  private ctx: AudioContext | null = null;
  private sinceBell = Infinity;

  constructor(
    private readonly settings: Profiles['audio'],
    target: Window,
  ) {
    const start = (): void => {
      if (this.ctx || !this.settings.enabled) return;
      try {
        this.ctx = new AudioContext();
      } catch {
        this.settings.enabled = false;
      }
    };
    target.addEventListener('keydown', start);
    target.addEventListener('pointerdown', start);
  }

  play(e: CraneEvent): void {
    if (e.kind === 'twistlocks') this.clunk();
    else if (e.kind === 'landed' && e.hard) this.alarm();
    else if (e.kind === 'landed') this.thud();
    else if (e.kind === 'refused') this.tone(140, 0, 0.25, 'sawtooth', 0.25);
  }

  /** Rings the gantry warning bell every gantryBellInterval_s while the gantry travels. */
  update(dt: number, gantryTravelling: boolean): void {
    this.sinceBell = gantryTravelling ? this.sinceBell + dt : Infinity;
    if (this.sinceBell < this.settings.gantryBellInterval_s) return;
    this.sinceBell = 0;
    this.tone(1400, 0, 0.6, 'sine', 0.35);
    this.tone(2800, 0, 0.3, 'sine', 0.1);
  }

  private clunk(): void {
    this.tone(180, 0, 0.08, 'square', 0.35);
    this.tone(90, 0.05, 0.12, 'square', 0.3);
  }

  private thud(): void {
    this.tone(70, 0, 0.15, 'sine', 0.5);
  }

  /** Two-tone alarm, about 1.5 s. */
  private alarm(): void {
    for (let i = 0; i < 6; i++) this.tone(i % 2 ? 660 : 880, i * 0.25, 0.22, 'square', 0.25);
  }

  private tone(freq: number, delay: number, duration: number, type: OscillatorType, level: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.settings.enabled) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(level * this.settings.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }
}
