import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Phase 0 : scène de base — plateau placeholder + une unité témoin.
// Le vrai jeu (board, units, turn, ui) arrive en phase 1.

const container = document.getElementById('app');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1d24);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 200);
camera.position.set(8, 12, 14);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.maxPolarAngle = Math.PI / 2.2;

// Lumières
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xfff2dd, 1.2);
sun.position.set(10, 15, 5);
sun.castShadow = true;
scene.add(sun);

// Plateau placeholder 12x10 en damier
const COLS = 12, ROWS = 10;
const tileGeo = new THREE.BoxGeometry(0.95, 0.2, 0.95);
for (let x = 0; x < COLS; x++) {
  for (let z = 0; z < ROWS; z++) {
    const light = (x + z) % 2 === 0;
    const mat = new THREE.MeshStandardMaterial({ color: light ? 0x8fbf6a : 0x7cab5c });
    const tile = new THREE.Mesh(tileGeo, mat);
    tile.position.set(x - COLS / 2 + 0.5, 0, z - ROWS / 2 + 0.5);
    tile.receiveShadow = true;
    scene.add(tile);
  }
}

// Unité témoin (un futur Tanker)
const unit = new THREE.Mesh(
  new THREE.CylinderGeometry(0.35, 0.4, 0.9, 16),
  new THREE.MeshStandardMaterial({ color: 0x3b7dd8 })
);
unit.position.set(-3.5, 0.55, -2.5);
unit.castShadow = true;
scene.add(unit);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
