import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SPAWNS, AURA_REDUCTION, SKILL_COOLDOWN, TEAMS } from './data.js';
import { Board } from './board.js';
import { Unit, Queue } from './units.js';
import { initUI } from './ui.js';
import { aiTakeTurn } from './ai.js';
import { connect } from './net.js';
import { sfx } from './audio.js';

// politique autoplay : débloquer l'audio au premier geste réel
addEventListener('pointerdown', () => sfx.unlock(), { once: true });

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

// Curseur de survol : cadre blanc sur la case sous la souris
const cursor = new THREE.Group();
{
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
  const H = 0.05, L = 0.96;
  for (const [dx, dz, w, d] of [
    [0, -L / 2 + H / 2, L, H], [0, L / 2 - H / 2, L, H],
    [-L / 2 + H / 2, 0, H, L], [L / 2 - H / 2, 0, H, L],
  ]) {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(dx, 0, dz);
    cursor.add(edge);
  }
  cursor.position.y = 0.125;
  cursor.renderOrder = 5;
  cursor.visible = false;
  scene.add(cursor);
}

function setCursorCell(x, z) {
  if (x === null) { cursor.visible = false; return; }
  const p = board.worldPos(x, z, 0.125);
  cursor.position.set(p.x, p.y, p.z);
  cursor.visible = true;
}

// ---------- État du tour ----------
const game = {
  mode: 'move',        // 'move' | 'attack'
  hasMoved: false,
  hasActed: false,
  busy: false,         // animation en cours
  over: false,
  started: false,      // false tant que le setup n'est pas terminé
  aiTeam: null,        // camp joué par l'IA (mode Partie rapide)
  online: null,        // { send, myTeam } en duel WebSocket
  reach: { cells: new Set(), paths: new Map() },
  targets: [],
};

const isAiTurn = () => game.aiTeam && queue.current.team === game.aiTeam;
const isRemoteTurn = () => game.online && queue.current.team !== game.online.myTeam;
const inputLocked = () => game.busy || game.over || !game.started || isAiTurn() || isRemoteTurn();

// ---------- Bus d'actions ----------
// Toutes les entrées joueur passent par dispatch : en ligne, l'action part au
// serveur et n'est exécutée qu'à la réception de son écho (ordre garanti,
// identique chez les deux joueurs — le jeu est déterministe).
const pending = [];
let pumping = false;

function dispatch(action) {
  if (game.online) game.online.send(action);
  else enqueue(action);
}

function enqueue(action) {
  pending.push(action);
  pump();
}

async function pump() {
  if (pumping) return;
  pumping = true;
  while (pending.length) {
    while (game.busy) await new Promise(r => setTimeout(r, 60));
    if (game.over) { pending.length = 0; break; }
    await runAction(pending.shift());
  }
  pumping = false;
}

async function runAction(a) {
  const u = queue.current;
  switch (a.kind) {
    case 'move': {
      const k = board.key(a.x, a.z);
      if (!game.hasMoved && game.reach.cells.has(k)) await doMove(k);
      break;
    }
    case 'attack': {
      const t = units.find(v => v.id === a.target);
      if (t && t.alive && t.team !== u.team && !game.hasActed && inAttackRange(u, t.x, t.z)) {
        await doAttack(t);
      }
      break;
    }
    case 'skill':
      if (!u.cls.passive && u.cooldown === 0) {
        u.armed = a.armed;
        game.mode = 'attack';
        refresh();
      }
      break;
    case 'end':
      endTurn();
      break;
  }
}

const ui = initUI({
  onMode: (m) => { if (!inputLocked()) { game.mode = m; refresh(); } },
  onSkill: () => {
    const u = queue.current;
    if (inputLocked() || u.cls.passive || u.cooldown > 0) return;
    dispatch({ kind: 'skill', armed: !u.armed });
  },
  onEnd: () => { if (!inputLocked()) dispatch({ kind: 'end' }); },
  // Survol d'un jeton de la file : repère le personnage sur le plateau
  onChipHover: (u, e) => {
    if (game.over || !game.started) return;
    if (u) {
      setCursorCell(u.x, u.z);
      ui.tooltip(
        `<b style="color:${TEAMS[u.team].css}">${TEAMS[u.team].label} · ${u.cls.name}</b><br>` +
        `${u.hp}/${u.maxHp} HP`,
        e.clientX, e.clientY
      );
      // petit bond pour le repérer d'un coup d'œil
      if (!game.busy && !u.pinging) {
        u.pinging = true;
        tween(280, k => { u.mesh.position.y = 0.1 + 0.28 * Math.sin(Math.PI * k); })
          .then(() => { u.pinging = false; u.mesh.position.y = 0.1; });
      }
    } else {
      setCursorCell(null);
      ui.tooltip(null);
    }
  },
});

async function startTurn() {
  const u = queue.current;
  game.hasMoved = false;
  game.hasActed = false;
  game.mode = 'move';
  if (u.cooldown > 0) u.cooldown--;
  computeOptions();
  if (!game.reach.cells.size && game.targets.length) game.mode = 'attack';
  // animation d'entrée : petit saut de l'unité qui prend son tour
  game.busy = true;
  refresh();
  if (game.started) sfx.focus(u);
  const baseY = 0.1;
  const foe = nearestEnemy(u);
  if (foe) faceTween(u, foe.x, foe.z, 220); // se tourne vers l'ennemi le plus proche
  await tween(380, k => { u.mesh.position.y = baseY + 0.35 * Math.sin(Math.PI * k); });
  u.mesh.position.y = baseY;
  game.busy = false;
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

function nearestEnemy(u) {
  let best = null, bd = Infinity;
  for (const t of units) {
    if (!t.alive || t.team === u.team) continue;
    const d = Math.abs(t.x - u.x) + Math.abs(t.z - u.z);
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}

// Éclats de particules à l'impact
function spawnImpact(pos, color = 0xffe08a) {
  const parts = [];
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 6, 6),
      new THREE.MeshBasicMaterial({ color, transparent: true })
    );
    p.position.copy(pos);
    p.userData.o = pos.clone();
    p.userData.v = new THREE.Vector3(
      (Math.random() - 0.5) * 2.4, Math.random() * 2.4 + 0.8, (Math.random() - 0.5) * 2.4
    );
    scene.add(p);
    parts.push(p);
  }
  const T = 0.45;
  tween(450, k => {
    const t = k * T;
    for (const p of parts) {
      p.position.set(
        p.userData.o.x + p.userData.v.x * t,
        p.userData.o.y + p.userData.v.y * t - 4.5 * t * t,
        p.userData.o.z + p.userData.v.z * t
      );
      p.material.opacity = 1 - k;
      p.scale.setScalar(1 - k * 0.6);
    }
  }).then(() => parts.forEach(p => { scene.remove(p); p.geometry.dispose(); p.material.dispose(); }));
}

// Anneau au sol quand un skill se déclenche
function spawnRing(pos, color = 0xffd34a) {
  const r = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.42, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide })
  );
  r.rotation.x = -Math.PI / 2;
  r.position.set(pos.x, 0.14, pos.z);
  scene.add(r);
  tween(350, k => { r.scale.setScalar(1 + k * 1.6); r.material.opacity = 1 - k; })
    .then(() => { scene.remove(r); r.geometry.dispose(); r.material.dispose(); });
}

// Secousse de la cible à l'impact
function shake(t) {
  tween(260, k => {
    const a = (1 - k) * 0.07;
    t.model.position.x = (Math.random() * 2 - 1) * a;
    t.model.position.z = (Math.random() * 2 - 1) * a;
  }).then(() => { t.model.position.x = 0; t.model.position.z = 0; });
}

// Tourne le modèle d'une unité vers une case (arc le plus court)
function faceTween(u, tx, tz, dur = 150) {
  const target = Math.atan2(tx - u.x, tz - u.z);
  const from = u.model.rotation.y;
  let delta = (target - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  if (Math.abs(delta) < 0.01) return Promise.resolve();
  return tween(dur, k => { u.model.rotation.y = from + delta * k; });
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
  ui.setBanner(u, isAiTurn(), game.online ? (isRemoteTurn() ? 'them' : 'me') : null);
  ui.updateWheel(u, {
    mode: game.mode,
    canMove: !game.hasMoved && game.reach.cells.size > 0,
    canAttack: !game.hasActed,
    locked: isAiTurn() || isRemoteTurn(),
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
    faceTween(u, step.x, step.z, 80); // regarde dans le sens de la marche
    await tween(110, k => u.mesh.position.lerpVectors(from, to, k));
    u.x = step.x; u.z = step.z;
  }
  const foe = nearestEnemy(u);
  if (foe) faceTween(u, foe.x, foe.z, 180); // puis fait face à l'ennemi le plus proche
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
  const wasArmed = u.armed;
  if (u.armed) { u.armed = false; u.cooldown = SKILL_COOLDOWN; }
  sfx.attack(u, wasArmed);

  // L'attaquant fait face à sa cible, la cible se retourne vers lui
  await faceTween(u, target.x, target.z, 120);
  faceTween(target, u.x, u.z, 160);

  // Animation : recul + charge étirée en mêlée, tir en cloche pour l'archer
  const origin = u.mesh.position.clone();
  const targetPos = board.worldPos(target.x, target.z, 0.1);
  if (wasArmed) spawnRing(origin); // éclat au sol quand le skill part

  if (u.cls.key === 'archer') {
    // le buste bascule en arrière pendant la visée…
    await tween(130, k => { u.model.rotation.x = -0.3 * Math.sin(Math.PI * k); });
    // …puis le projectile part en cloche
    const proj = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe08a })
    );
    scene.add(proj);
    const from = origin.clone().setY(1.0);
    const dest = targetPos.clone().setY(0.9);
    await tween(300, k => {
      proj.position.lerpVectors(from, dest, k);
      proj.position.y += Math.sin(Math.PI * k) * 0.9;
    });
    scene.remove(proj);
  } else {
    // recul-armé (écrasement) puis charge (étirement)
    const back = origin.clone().lerp(targetPos, -0.12);
    const hit = origin.clone().lerp(targetPos, 0.45);
    await tween(100, k => {
      u.mesh.position.lerpVectors(origin, back, k);
      u.squash = 1 - 0.09 * k;
    });
    await tween(110, k => {
      u.mesh.position.lerpVectors(back, hit, k);
      u.squash = 0.91 + 0.17 * k;
    });
  }

  // Impact : particules, secousse de la cible, dégâts flottants
  spawnImpact(targetPos.clone().setY(0.8), target.team === 'zombies' ? 0x9fcf4a : 0xff8a5c);
  shake(target);
  target.setHP(target.hp - dmg);
  const s = toScreen(board.worldPos(target.x, target.z, 1.2));
  ui.floatDamage(s.x, s.y, `-${dmg}`);

  if (u.cls.key !== 'archer') {
    // retour en position avec détente
    const hit = origin.clone().lerp(targetPos, 0.45);
    await tween(150, k => {
      u.mesh.position.lerpVectors(hit, origin, k);
      u.squash = 1.08 - 0.08 * k;
    });
    u.squash = 1;
  }

  if (!target.alive) {
    sfx.death(target);
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
    ui.renderQueue(queue.ordered(), null); // purge le dernier mort de la file affichée
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
  // Priorité aux ennemis : un clic qui traverse un ennemi le cible,
  // même si un allié ou une case est plus proche de la caméra.
  const cur = queue.current;
  const meshesOf = (list) => list.flatMap(u => u.mesh.children);
  const enemies = units.filter(u => u.alive && cur && u.team !== cur.team);
  const allies = units.filter(u => u.alive && cur && u.team === cur.team);
  const hitEnemy = raycaster.intersectObjects(meshesOf(enemies), false)[0];
  const hitAlly = raycaster.intersectObjects(meshesOf(allies), false)[0];
  const hitTile = raycaster.intersectObjects(board.tileMeshes, false)[0];
  return {
    unit: hitEnemy?.object.userData.unit ?? hitAlly?.object.userData.unit ?? null,
    tile: hitTile ? hitTile.object.userData : null,
  };
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (inputLocked() || e.button !== 0) return;
  const hit = pick(e);
  const u = queue.current;
  const attackable = (t) => t && t.alive && t.team !== u.team && !game.hasActed &&
    inAttackRange(u, t.x, t.z);

  // 1. Attaque si le clic touche un ennemi réellement attaquable
  if (attackable(hit.unit)) { dispatch({ kind: 'attack', target: hit.unit.id }); return; }
  if (hit.tile) {
    // 2. Ou si le clic touche la case d'un ennemi attaquable
    const occupant = units.find(v => v.alive && v.x === hit.tile.x && v.z === hit.tile.z);
    if (attackable(occupant)) { dispatch({ kind: 'attack', target: occupant.id }); return; }
    // 3. Sinon le clic retombe sur la case (un ennemi hors de portée n'avale pas le clic)
    if (game.mode === 'move' && !game.hasMoved) {
      const k = board.key(hit.tile.x, hit.tile.z);
      if (game.reach.cells.has(k)) dispatch({ kind: 'move', x: hit.tile.x, z: hit.tile.z });
    }
  }
});

// Inspection au survol : portée + stats de l'unité survolée (cases jaunes)
let hovered = null;
renderer.domElement.addEventListener('pointermove', (e) => {
  if (game.busy || game.over || !game.started) return;
  const hit = pick(e);
  // focus uniquement sur la case sous la souris (jamais sur les personnages)
  if (hit.tile) setCursorCell(hit.tile.x, hit.tile.z);
  else setCursorCell(null);
  // inspection pilotée par la case : on inspecte l'unité qui OCCUPE la case
  // survolée, pas celle dont le corps intercepte le pixel
  const occupant = hit.tile
    ? units.find(v => v.alive && v.x === hit.tile.x && v.z === hit.tile.z)
    : null;
  const h = occupant && occupant !== queue.current ? occupant : null;
  if (h !== hovered) {
    hovered = h;
    // en mode attaque, on garde l'affichage de SA portée (rouge) :
    // pas de surbrillance jaune de l'unité survolée
    if (h && game.mode !== 'attack') {
      board.clearHighlights();
      board.highlight([...board.reachable(h, units).cells], 'hover');
    } else {
      refresh();
    }
    if (!h) ui.tooltip(null);
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
  // rendu en pause (onglet caché) : appliquer l'état final immédiatement
  if (performance.now() - lastFrame > 400) { fn(1); return Promise.resolve(); }
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
let idleT = 0;

function stepAnims(dt) {
  for (let i = anims.length - 1; i >= 0; i--) {
    const a = anims[i];
    a.t += dt;
    const k = Math.min(1, a.t / a.dur);
    a.fn(k);
    if (k >= 1) { anims.splice(i, 1); a.res(); }
  }
}

// Onglet caché : le rAF est en pause — les tweens encore en vol sont soldés
// d'un coup et la caméra garde des matrices à jour pour les projections.
let lastFrame = 0;
setInterval(() => {
  if (performance.now() - lastFrame < 400) return; // le rAF tourne, rien à faire
  stepAnims(1e6); // solde tout tween en attente
  camera.updateMatrixWorld(true);
}, 250);

renderer.setAnimationLoop(() => {
  lastFrame = performance.now();
  const dt = clock.getDelta() * 1000;
  stepAnims(dt);
  ring.rotation.z += 0.02;
  // idle : les figurines respirent (humains) ou tanguent (zombies)
  idleT += dt / 1000;
  for (const u of units) {
    if (!u.alive) continue;
    const z = u.team === 'zombies';
    u.model.scale.y = u.squash * (1 + (z ? 0.02 : 0.014) * Math.sin(idleT * (z ? 1.8 : 2.4) + u.id * 1.7));
    u.model.rotation.z = (z ? 0.05 : 0.014) * Math.sin(idleT * (z ? 1.1 : 1.5) + u.id * 2.3);
  }
  if (game.busy || game.over || !game.started) cursor.visible = false;
  controls.update();
  renderer.render(scene, camera);
});

// HMR : ce module gère tout l'état du jeu — un patch à chaud dupliquerait la scène.
if (import.meta.hot) import.meta.hot.accept(() => location.reload());

// ---------- Démarrage ----------
function startAi(playerTeam) {
  game.aiTeam = playerTeam === 'humans' ? 'zombies' : 'humans';
  ui.showVs(() => {
    game.started = true;
    startTurn();
  });
}

function startOnline(room) {
  const waiting = ui.showWaiting();
  const net = connect({
    room,
    onWaiting: (code) => waiting.setLink(`${location.origin}${location.pathname}?room=${code}`),
    onStart: ({ team }) => {
      waiting.close();
      game.online = { send: net.sendAction, myTeam: team };
      ui.showVs(() => {
        game.started = true;
        startTurn();
      }, team);
    },
    onAction: (a) => enqueue(a),
    onOpponentLeft: () => {
      if (game.over) return;
      game.over = true;
      board.clearHighlights();
      ui.showOpponentLeft();
    },
    onClosed: () => {
      if (game.over) return;
      game.over = true;
      ui.showOpponentLeft(game.started ? 'Connexion perdue…' : 'Serveur injoignable');
    },
  });
}

// Lien d'invitation (?room=CODE) : on rejoint directement le duel
const roomParam = new URLSearchParams(location.search).get('room');
if (roomParam) startOnline(roomParam);
else ui.showSetup({ onAi: startAi, onOnline: () => startOnline(null) });

// Poignée de debug pour les tests
window.MB = { game, units, queue, board, doAttack, doMove, endTurn, computeDamage, toScreen, camera, pick, dispatch };
