// Head-up display (proposal §5.12): move, messages, wind and the five-cell status bar. Text refreshes at
// hud.refresh_hz; the numbers come in as a plain snapshot, so the HUD never reads the simulation itself.

import './hud.css';
import type { Profiles } from '../config/profiles';
import { formatFromWatersideRail, formatSigned } from '../core/units';
import { type Corner, CORNERS } from '../sim/craneView';

export interface HudData {
  title: string;
  wind: { kn: number; mps: number; from: string; gust_kn: number; stop_kn: number };
  /** Current test move, e.g. "14-02-88 ─► L1 centre", with the box line and timer; null when all are done. */
  move: { route: string; box: string; elapsed: string; target: string } | null;
  lastPlacement: string;
  hoist: { height: number; speed: number; load_t: number | null; creep: boolean };
  trolley: { fwr: number; speed: number; abeam: string };
  gantry: { mark: number; speed: number; boom: string; boomAlert: boolean };
  spreader: { size: string; lock: string; flippers: string; antiSway: string };
  corners: Record<Corner, boolean>;
  sway_m: number;
}

type MessageKind = 'alarm' | 'warn' | 'ok';

const SWAY_CELLS = 6;

export class Hud {
  private readonly root = document.createElement('div');
  private readonly fields = new Map<string, HTMLElement>();
  private readonly lamps = new Map<Corner, HTMLElement>();
  private readonly swayCells: HTMLElement[] = [];
  private readonly messages: { el: HTMLElement; until: number }[] = [];
  private sinceRefresh = Infinity;
  private clock = 0;

  constructor(
    host: HTMLElement,
    private readonly settings: Profiles['hud'],
  ) {
    this.root.className = 'hud';
    this.root.innerHTML = `
      <div class="hud-top-left">
        <div><span class="hud-title" data-f="title"></span> <span class="hud-hint">· C camera · T anti-sway · F10 tuning</span></div>
        <div data-f="move"></div>
        <div data-f="moveBox" class="hud-muted"></div>
        <div data-f="timer"></div>
        <div class="hud-messages" data-f="messages"></div>
      </div>
      <div class="hud-top-right">
        <div data-f="wind"></div>
        <div class="hud-muted" data-f="windLimits"></div>
      </div>
      <div class="hud-bar">
        <div class="hud-cell"><b>HOIST</b> <span data-f="hoist"></span><br><span data-f="hoistSpeed"></span><br><span data-f="load"></span><br><span data-f="creep" class="hud-warn"></span></div>
        <div class="hud-cell"><b>TROLLEY</b><br><span data-f="trolley"></span><br><span data-f="trolleySpeed"></span><br><span data-f="abeam"></span></div>
        <div class="hud-cell"><b>GANTRY</b><br><span data-f="gantry"></span><br><span data-f="gantrySpeed"></span><br><span data-f="boom"></span></div>
        <div class="hud-cell"><b>SPREADER</b> <span data-f="size"></span><br><span data-f="lock"></span><br><span data-f="flippers"></span><br><span data-f="antiSway"></span></div>
        <div class="hud-cell">
          <div class="hud-corners">${CORNERS.map((c) => `<span class="hud-lamp" data-lamp="${c}">${c}</span>`).join('')}</div>
          <span data-f="landed"></span><br>SWAY <span data-f="sway"></span><span class="hud-sway" data-f="swayBar">${'<i></i>'.repeat(SWAY_CELLS)}</span>
        </div>
      </div>`;
    host.appendChild(this.root);
    this.root.querySelectorAll<HTMLElement>('[data-f]').forEach((el) => this.fields.set(el.dataset.f ?? '', el));
    this.root.querySelectorAll<HTMLElement>('[data-lamp]').forEach((el) => this.lamps.set(el.dataset.lamp as Corner, el));
    this.swayCells.push(...this.root.querySelectorAll<HTMLElement>('.hud-sway i'));
  }

  /** Shows a message for `seconds` (alarms flash). */
  flash(text: string, kind: MessageKind, seconds: number): void {
    const el = document.createElement('div');
    el.className = `hud-message ${kind}`;
    el.textContent = text;
    this.field('messages').prepend(el);
    this.messages.push({ el, until: this.clock + seconds });
  }

  /** Call every frame; the text refreshes at hud.refresh_hz. */
  update(dt: number, d: HudData): void {
    this.clock += dt;
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const m = this.messages[i];
      if (m && m.until <= this.clock) {
        m.el.remove();
        this.messages.splice(i, 1);
      }
    }
    this.sinceRefresh += dt;
    if (this.sinceRefresh < 1 / this.settings.refresh_hz) return;
    this.sinceRefresh = 0;

    this.set('title', d.title);
    this.set('move', d.move ? `MOVE  ${d.move.route}` : 'ALL TEST MOVES DONE');
    this.set('moveBox', d.move?.box ?? '');
    this.set('timer', d.move ? `TIMER ${d.move.elapsed} / target ${d.move.target}${d.lastPlacement ? `     last placement ${d.lastPlacement}` : ''}` : d.lastPlacement);
    const w = d.wind;
    this.set('wind', w.kn < 0.5 ? 'WIND calm' : `WIND ${w.kn.toFixed(0)} kn · ${w.mps.toFixed(1)} m/s · from ${w.from}`);
    this.set('windLimits', `gusts ${w.gust_kn.toFixed(0)} kn     stop ${w.stop_kn.toFixed(0)} kn`);

    this.set('hoist', `${formatSigned(d.hoist.height)} m`);
    this.set('hoistSpeed', `${arrow(d.hoist.speed, '▲', '▼')} ${mmin(d.hoist.speed)} m/min`);
    this.set('load', d.hoist.load_t === null ? 'LOAD —' : `LOAD ${d.hoist.load_t.toFixed(1)} t`);
    this.set('creep', d.hoist.creep ? 'CREEP' : '');
    this.set('trolley', formatFromWatersideRail(d.trolley.fwr));
    this.set('trolleySpeed', `${arrow(d.trolley.speed, '→ WS', '← LS')} ${mmin(d.trolley.speed)} m/min`);
    this.set('abeam', d.trolley.abeam);
    this.set('gantry', `${d.gantry.mark.toFixed(1)} m`);
    this.set('gantrySpeed', `${arrow(d.gantry.speed, '►', '◄')} ${mmin(d.gantry.speed)} m/min`);
    this.set('boom', d.gantry.boom);
    this.field('boom').className = d.gantry.boomAlert ? 'hud-warn' : '';
    this.set('size', d.spreader.size);
    this.set('lock', d.spreader.lock);
    this.field('lock').className = d.spreader.lock === 'LOCKED' ? 'hud-on' : '';
    this.set('flippers', d.spreader.flippers);
    this.set('antiSway', d.spreader.antiSway);

    for (const c of CORNERS) this.lamps.get(c)?.classList.toggle('landed', d.corners[c]);
    const all = CORNERS.every((c) => d.corners[c]);
    this.set('landed', all ? 'ALL LANDED' : '');
    this.field('landed').className = all ? 'hud-on' : '';
    this.set('sway', `${d.sway_m.toFixed(2)} m`);
    const lit = Math.min(SWAY_CELLS, Math.ceil((d.sway_m / this.settings.swayRed_m) * SWAY_CELLS));
    this.swayCells.forEach((cell, i) => cell.classList.toggle('on', i < lit));
    const bar = this.field('swayBar');
    bar.classList.toggle('amber', d.sway_m >= this.settings.swayAmber_m && d.sway_m < this.settings.swayRed_m);
    bar.classList.toggle('red', d.sway_m >= this.settings.swayRed_m);
  }

  private field(name: string): HTMLElement {
    const el = this.fields.get(name);
    if (!el) throw new Error(`HUD field ${name} missing`);
    return el;
  }

  private set(name: string, text: string): void {
    const el = this.field(name);
    if (el.textContent !== text) el.textContent = text;
  }
}

/** Below 0.5 m/min a drive shows as stopped. */
const arrow = (v: number, plus: string, minus: string): string => (Math.abs(v) * 60 < 0.5 ? '■' : v > 0 ? plus : minus);
const mmin = (v: number): string => (Math.abs(v) * 60).toFixed(0);
