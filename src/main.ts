import * as THREE from 'three';

// Phase 1 bootstrap: a blank scene until the simulator modules are wired in.
const host = document.getElementById('app');
if (!host) throw new Error('QuayOps: #app element missing');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(host.clientWidth, host.clientHeight);
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fb8cc);
const camera = new THREE.PerspectiveCamera(60, host.clientWidth / host.clientHeight, 0.1, 5000);
renderer.render(scene, camera);
document.body.dataset.ready = 'true';
