// Text sprites for quay marks and other world labels.

import * as THREE from 'three';

export function textSprite(text: string, heightM: number, colour = '#1b2530', background = 'rgba(255,255,255,0.0)'): THREE.Sprite {
  const scale = 4;
  const fontPx = 48 * scale;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.font = `600 ${fontPx}px system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width + fontPx * 0.4);
  canvas.width = w;
  canvas.height = Math.ceil(fontPx * 1.3);
  ctx.font = `600 ${fontPx}px system-ui, sans-serif`;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = colour;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  sprite.scale.set((heightM * canvas.width) / canvas.height, heightM, 1);
  return sprite;
}
