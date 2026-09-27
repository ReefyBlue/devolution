import { startApp } from './app';
import { ProfileError } from './config/profiles';

const host = document.getElementById('app');
if (!host) throw new Error('QuayOps: #app element missing');

try {
  startApp(host);
} catch (e) {
  showStartupError(e);
}

function showStartupError(e: unknown): void {
  const box = document.createElement('pre');
  box.className = 'startup-error';
  box.textContent = e instanceof ProfileError ? e.message : `QuayOps could not start:\n${String(e)}`;
  document.body.appendChild(box);
  document.body.dataset.ready = 'error';
  console.error(e);
}
