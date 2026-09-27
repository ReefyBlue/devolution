// Placeholder vessel: hull with boot-top, deck, coamings, hatch cover panels, forecastle and deckhouse.

import * as THREE from 'three';
import type { World } from '../sim/world';
import { textSprite } from './labels';
import { span, standard } from './primitives';

/** Length of the pointed bow section, m (visual only). */
const BOW_TAPER_M = 18;

export function buildVessel(world: World): THREE.Group {
  const group = new THREE.Group();
  const g = world.geometry;
  const v = world.scene.vessel;
  const hull = world.vesselBounds();
  const waterY = -world.scene.quay.apronAboveWaterline_m;
  const bowX = world.frame.worldX(v.mooring.bowAtQuayMark_m);
  const bowDir = g.bowPointsPlusX ? 1 : -1;

  const red = standard(0x7c2522, 0.8, 0.1);
  const black = standard(0x1f2428, 0.7, 0.2);
  const deck = standard(0x56685c, 0.9, 0.1);
  const coverMat = standard(0x3d4b58, 0.7, 0.3);
  const white = standard(0xe8ebee, 0.7, 0.1);
  const window = standard(0x22313d, 0.2, 0.5);

  const hullShape = (): THREE.Shape => {
    // Plan outline in (x, −z) so the extrusion, turned upright, lands on world X/Z.
    const s = new THREE.Shape();
    const sternX = bowX - bowDir * v.loa_m;
    const shoulderX = bowX - bowDir * BOW_TAPER_M;
    const midZ = (hull.minZ + hull.maxZ) / 2;
    s.moveTo(sternX, -hull.minZ);
    s.lineTo(shoulderX, -hull.minZ);
    s.quadraticCurveTo(bowX, -hull.minZ, bowX, -midZ);
    s.quadraticCurveTo(bowX, -hull.maxZ, shoulderX, -hull.maxZ);
    s.lineTo(sternX, -hull.maxZ);
    s.closePath();
    return s;
  };
  const extrudeHull = (y0: number, y1: number, material: THREE.Material): THREE.Mesh => {
    const geo = new THREE.ExtrudeGeometry(hullShape(), { depth: y1 - y0, bevelEnabled: false, curveSegments: 10 });
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, material);
    m.position.y = y0;
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  group.add(extrudeHull(g.keelY, waterY + 0.3, red));
  group.add(extrudeHull(waterY + 0.3, g.mainDeckY, black));

  // Cargo deck, coamings and covers per bay.
  const rowPitch = v.structure.rowPitch_m;
  const holdHalf = (v.bays.rowsInHold * rowPitch) / 2 + 0.3;
  const centreZ = world.frame.worldZ(g.centrelineFromWatersideRail);
  const first = g.positions[0];
  const last = g.positions[g.positions.length - 1];
  if (first && last) {
    const xs = [g.bayWorldX(first.bay), g.bayWorldX(last.bay)];
    group.add(span(deck, Math.min(...xs) - 8, Math.max(...xs) + 8, g.mainDeckY, g.mainDeckY + 0.05, hull.minZ + 0.6, hull.maxZ - 0.6));
  }
  for (const pos of g.positions) {
    const cx = g.bayWorldX(pos.bay);
    const len = pos.length_m - 0.2;
    group.add(span(deck, cx - len / 2, cx + len / 2, g.mainDeckY, g.coverUndersideY, centreZ - holdHalf, centreZ + holdHalf));
  }
  for (const slab of world.covers) {
    group.add(span(coverMat, slab.minX + 0.03, slab.maxX - 0.03, slab.bottom, slab.top, slab.minZ + 0.03, slab.maxZ - 0.03));
  }

  // Forecastle at the bow.
  const fcX0 = bowX - bowDir * (BOW_TAPER_M + 4);
  group.add(span(black, Math.min(fcX0, bowX - bowDir * 6), Math.max(fcX0, bowX - bowDir * 6), g.mainDeckY, g.mainDeckY + 2.5, hull.minZ + 1.5, hull.maxZ - 1.5));

  // Deckhouse in its gap, with a bridge window band and full-width wings.
  for (const gap of v.bays.gaps) {
    const before = g.position(gap.afterBay);
    if (!before || gap.heightAboveDeck_m <= 0) continue;
    const startX = g.bayWorldX(gap.afterBay) - bowDir * (before.length_m / 2);
    const endX = startX - bowDir * gap.length_m;
    const x0 = Math.min(startX, endX) + 1;
    const x1 = Math.max(startX, endX) - 1;
    const top = g.mainDeckY + gap.heightAboveDeck_m;
    group.add(span(white, x0 + 2, x1 - 2, g.mainDeckY, top, hull.minZ + 3, hull.maxZ - 3));
    group.add(span(white, x0 + 3, x1 - 3, top - 3, top, hull.minZ + 0.5, hull.maxZ - 0.5));
    group.add(span(window, x0 + 2.9, x1 - 2.9, top - 2.4, top - 1.2, hull.minZ + 0.45, hull.maxZ - 0.45));
  }

  const name = textSprite(v.name, 1.6, '#f4f4f4');
  name.position.set(bowX - bowDir * 30, g.mainDeckY - 2.2, hull.maxZ + 0.2);
  group.add(name);
  return group;
}
