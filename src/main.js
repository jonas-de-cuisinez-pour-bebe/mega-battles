import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SPAWNS, AURA_REDUCTION } from './data.js';
import { Board } from './board.js';
import { Unit, Queue } from './units.js';
import { initUI } from './ui.js';
import { aiTakeTurn } from './ai.js';

// ---------- Scène ----------
const container = document.getElementById('app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1d24);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 13, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI / 2.2;
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xfff2dd, 1.2);
sun.position.set(10, 15, 5);
sun.castShadow = true;
sun.shadow.camera.left = sun.shadow.camera.bottom = -10;
sun.shadow.camera.right = sun.shadow.camera.top = 10;
scene.add(sun);

// ---------- Plateau & unités ----------
const board = new Board(scene);
const units = [];
for (const teamId of ['humans', 'zombies']) {
  for (const [clsKey, spots] of Object.entries(SPAWNS[teamId])) {
    for (const [x, z] of spots) {
      const u = new Unit(teamId, clsKey, x, z);
      u.mesh.position.copy(board.worldPos(x, z, 0.1));
      scene.add(u.mesh);
      units.push(u);
    }
  }
}
const queue = new Queue(units);

// Anneau de sélection sous l'unité active
const ring = new THREE.Mesh(
  new THREE.RingGeometry(0.42, 0.52, 24),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
);
ring.rotation.x = -Math.PI / 2;
scene.add(ring);

// ---------- État du tour ----------
const game = {
  mode: 'move',        // 'move' | 'attack'
  hasMoved: false,
  hasActed: false,
  busy: false,         // animation en cours
  over: false,
  started: false,      // false tant que le setup n'est pas terminé
  aiTeam: null,        // camp joué par l'IA (null en hotseat)
  reach: { cells: new Set(), paths: new Map() },
  targets: [],
};

const isAiTurn = () => game.aiTeam && queue.current.team === game.aiTeam;
const inputLocked = () => game.busy || game.over || !game.started || isAiTurn();

const ui = initUI({
  onMode: (m) => { if (!inputLocked()) { game.mode = m; refresh(); } },
  onSkill: () => {
    const u = queue.current;
    if (inputLocked() || u.cls.passive || u.skillUsed) return;
    u.armed = !u.armed;
    game.mode = 'attack';
    refresh();
  },
  onEnd: () => { if (!inputLocked()) endTurn(); },
});

function startTurn() {
  const u = queue.current;
  game.hasMoved = false;
  game.hasActed = false;
  game.mode = 'move';
  computeOptions();
  if (!game.reach.cells.size && game.targets.length) game.mode = 'attack';
  refresh();
  if (isAiTurn()) {
    aiTakeTurn({
      game, units, queue, doAttack, doMove, endTurn, computeDamage,
      wait: (ms) => tween(ms, () => {}),
    });
  }
}

function computeOptions() {
  const u = queue.current;
  game.reach = game.hasMoved ? { cells: new Set(), paths: new Map() } : board.reachable(u, units);
  game.targets = units.filter(t =>
    t.alive && t.team !== u.team &&
    inAttackRange(u, t.x, t.z)
  );
}

function inAttackRange(u, x, z) {
  const d = Math.abs(u.x - x) + Math.abs(u.z - z);
  return d >= u.cls.rangeMin && d <= u.cls.rangeMax;
}

function refresh() {
  const u = queue.current;
  board.clearHighlights();
  if (!game.over && !game.busy) {
    if (game.mode === 'move' && !game.hasMoved) {
      board.highlight([...game.reach.cells], 'move');
    } else if (game.mode === 'attack') {
      board.highlight(board.cellsInRange(u.x, u.z, u.cls.rangeMin, u.cls.rangeMax), 'attack');
    }
  }
  ring.position.copy(board.worldPos(u.x, u.z, 0.13));
  ui.setBanner(u, isAiTurn());
  ui.updateWheel(u, {
    mode: game.mode,
    canMove: !game.hasMoved && game.reach.cells.size > 0,
    canAttack: !game.hasActed,
    locked: isAiTurn(),
  });
  ui.showInfo(u);
  ui.renderQueue(queue.ordered(), u);
}

function endTurn() {
  const u = queue.current;
  u.armed = false;
  queue.next();
  startTurn();
}

// ---------- Actions ----------
async function doMove(destKey) {
  const u = queue.current;
  const path = game.reach.paths.get(destKey);
  if (!path) return;
  game.busy = true;
  board.clearHighlights();
  for (const step of path) {
    const from = u.mesh.position.clone();
    const to = board.worldPos(step.x, step.z, 0.1);
    await tween(110, k => u.mesh.position.lerpVectors(from, to, k));
    u.x = step.x; u.z = step.z;
  }
  game.hasMoved = true;
  game.busy = false;
  computeOptions();
  game.mode = game.targets.length ? 'attack' : 'move';
  refresh();
}

async function doAttack(target) {
  const u = queue.current;
  game.busy = true;
  board.clearHighlights();

  const dmg = computeDamage(u, target);
  if (u.armed) { u.armed = false; u.skillUsed = true; }

  // Animation : lunge en mêlée, projectile pour l'archer
  const origin = u.mesh.position.clone();
  const targetPos = board.worldPos(target.x, target.z, 0.1);
  if (u.cls.key === 'archer') {
    const proj = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe08a })
    );
    proj.position.copy(origin).setY(0.9);
    scene.add(proj);
    const dest = targetPos.clone().setY(0.9);
    await tween(280, k => proj.position.lerpVectors(origin.clone().setY(0.9), dest, k));
    scene.remove(proj);
  } else {
    const lungeTo = origin.clone().lerp(targetPos, 0.35);
    await tween(140, k => u.mesh.position.lerpVectors(origin, lungeTo, k));
    await tween(140, k => u.mesh.position.lerpVectors(lungeTo, origin, k));
  }

  target.setHP(target.hp - dmg);
  const s = toScreen(board.worldPos(target.x, target.z, 1.2));
  ui.floatDamage(s.x, s.y, `-${dmg}`);

  if (!target.alive) {
    await tween(300, k => {
      target.mesh.scale.setScalar(1 - k);
      target.mesh.position.y = 0.1 - k * 0.3;
    });
    scene.remove(target.mesh);
    queue.remove(target);
  }

  game.hasActed = true;
  game.busy = false;

  const winner = checkVictory();
  if (winner) {
    game.over = true;
    board.clearHighlights();
    ui.showVictory(winner);
    return;
  }
  await tween(350, () => {});
  endTurn();
}

function computeDamage(att, def) {
  const aim = att.armed && att.cls.key === 'archer';
  const dbl = att.armed && att.cls.key === 'dps';
  let dmg = att.cls.str * (dbl ? 2 : 1);
  if (!aim) {
    dmg -= def.cls.def;
    if (hasAdjacentAlliedTanker(def)) dmg -= AURA_REDUCTION;
  }
  return Math.max(1, dmg);
}

function hasAdjacentAlliedTanker(u) {
  return units.some(t =>
    t.alive && t !== u && t.team === u.team && t.cls.key === 'tanker' &&
    Math.abs(t.x - u.x) + Math.abs(t.z - u.z) === 1
  );
}

function checkVictory() {
  for (const team of ['humans', 'zombies']) {
    if (!units.some(u => u.alive && u.team === team)) {
      return team === 'humans' ? 'zombies' : 'humans';
    }
  }
  return null;
}

// ---------- Entrées ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function pick(event) {
  pointer.x = (event.clientX / innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const unitMeshes = units.filter(u => u.alive).flatMap(u => u.mesh.children);
  const hitUnit = raycaster.intersectObjects(unitMeshes, false)[0];
  if (hitUnit?.object.userData.unit) return { unit: hitUnit.object.userData.unit };
  const hitTile = raycaster.intersectObjects(board.tileMeshes, false)[0];
  if (hitTile) return { tile: hitTile.object.userData };
  return {};
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (inputLocked() || e.button !== 0) return;
  const hit = pick(e);
  const u = queue.current;

  if (hit.unit && hit.unit.team !== u.team && !game.hasActed &&
      inAttackRange(u, hit.unit.x, hit.unit.z)) {
    doAttack(hit.unit);
    return;
  }
  if (hit.unit) return;
  if (hit.tile && game.mode === 'move' && !game.hasMoved) {
    const k = board.key(hit.tile.x, hit.tile.z);
    if (game.reach.cells.has(k)) doMove(k);
  }
});

// Inspection au survol : portée + stats de l'unité survolée (cases jaunes)
let hovered = null;
renderer.domElement.addEventListener('pointermove', (e) => {
  if (game.busy || game.over || !game.started) return;
  const hit = pick(e);
  const h = hit.unit && hit.unit !== queue.current ? hit.unit : null;
  if (h !== hovered) {
    hovered = h;
    if (h) {
      board.clearHighlights();
      board.highlight([...board.reachable(h, units).cells], 'hover');
    } else {
      ui.tooltip(null);
      refresh();
    }
  }
  if (h) {
    ui.tooltip(
      `<b>${h.cls.name}</b> — ${h.hp}/${h.maxHp} HP<br>` +
      `STR ${h.cls.str} · DEF ${h.cls.def} · MOV ${h.cls.mov}`,
      e.clientX, e.clientY
    );
  }
});

// ---------- Animations ----------
const anims = [];
function tween(dur, fn) {
  return new Promise(res => anims.push({ t: 0, dur, fn, res }));
}

function toScreen(v3) {
  const p = v3.clone().project(camera);
  return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight };
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta() * 1000;
  for (let i = anims.length - 1; i >= 0; i--) {
    const a = anims[i];
    a.t += dt;
    const k = Math.min(1, a.t / a.dur);
    a.fn(k);
    if (k >= 1) { anims.splice(i, 1); a.res(); }
  }
  ring.rotation.z += 0.02;
  controls.update();
  renderer.render(scene, camera);
});

// HMR : ce module gère tout l'état du jeu — un patch à chaud dupliquerait la scène.
if (import.meta.hot) import.meta.hot.accept(() => location.reload());

// Point d'entrée : setup (accueil → armée → VS) puis premier tour
ui.showSetup(({ mode, playerTeam }) => {
  game.aiTeam = mode === 'ai' ? (playerTeam === 'humans' ? 'zombies' : 'humans') : null;
  ui.showVs(() => {
    game.started = true;
    startTurn();
  });
});

// Poignée de debug pour les tests
window.MB = { game, units, queue, board, doAttack, doMove, endTurn, computeDamage, toScreen, camera };
