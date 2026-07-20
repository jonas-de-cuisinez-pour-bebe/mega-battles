import * as THREE from 'three';
import { CLASSES, TEAMS } from './data.js';

let nextId = 1;

export class Unit {
  constructor(teamId, clsKey, x, z) {
    this.id = nextId++;
    this.team = teamId;
    this.cls = CLASSES[clsKey];
    this.hp = this.cls.hp;
    this.maxHp = this.cls.hp;
    this.x = x;
    this.z = z;
    this.skillUsed = false;
    this.armed = false; // skill actif enclenché pour la prochaine attaque
    this.mesh = this.#buildMesh();
    this.#buildHpBar();
  }

  get alive() { return this.hp > 0; }

  #buildMesh() {
    const g = new THREE.Group();
    const color = TEAMS[this.team].color;
    const mat = new THREE.MeshStandardMaterial({ color });
    const dark = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(0.55),
    });

    if (this.cls.key === 'tanker') {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.75, 14), mat);
      body.position.y = 0.48;
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), dark);
      helmet.position.y = 0.95;
      const shield = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.5), dark);
      shield.position.set(0.4, 0.5, 0);
      g.add(body, helmet, shield);
    } else if (this.cls.key === 'dps') {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.85, 12), mat);
      body.position.y = 0.53;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), dark);
      head.position.y = 1.08;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.08), dark);
      blade.position.set(0.28, 0.65, 0);
      blade.rotation.z = -0.4;
      g.add(body, head, blade);
    } else { // archer
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.7, 12), mat);
      body.position.y = 0.45;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), dark);
      head.position.y = 0.95;
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 8, 16, Math.PI), dark);
      bow.position.set(0.35, 0.55, 0);
      bow.rotation.y = Math.PI / 2;
      g.add(body, head, bow);
    }

    if (this.team === 'zombies') g.rotation.x = 0.12; // posture voûtée

    g.traverse(o => {
      if (o.isMesh) { o.castShadow = true; o.userData.unit = this; }
    });

    // Zone cliquable élargie (invisible mais interceptée par le raycast)
    const hitProxy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 1.7, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitProxy.position.y = 0.85;
    hitProxy.userData.unit = this;
    g.add(hitProxy);
    return g;
  }

  #buildHpBar() {
    this.hpCanvas = document.createElement('canvas');
    this.hpCanvas.width = 96;
    this.hpCanvas.height = 14;
    this.hpTexture = new THREE.CanvasTexture(this.hpCanvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.hpTexture, depthTest: false,
    }));
    sprite.scale.set(0.85, 0.12, 1);
    sprite.position.y = 1.45;
    sprite.renderOrder = 10;
    sprite.userData.unit = this; // la barre de HP est cliquable aussi
    this.mesh.add(sprite);
    this.#drawHpBar();
  }

  #drawHpBar() {
    const ctx = this.hpCanvas.getContext('2d');
    ctx.clearRect(0, 0, 96, 14);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, 96, 14);
    const ratio = this.hp / this.maxHp;
    ctx.fillStyle = ratio > 0.5 ? '#3fbf4a' : ratio > 0.25 ? '#e0a52e' : '#d0453f';
    ctx.fillRect(2, 2, 92 * ratio, 10);
    this.hpTexture.needsUpdate = true;
  }

  setHP(v) {
    this.hp = Math.max(0, Math.min(this.maxHp, v));
    this.#drawHpBar();
  }
}

// File d'initiative : les classes rapides d'abord, camps alternés.
export function buildInitiativeOrder(units) {
  const order = [];
  for (const cls of ['dps', 'archer', 'tanker']) {
    const h = units.filter(u => u.team === 'humans' && u.cls.key === cls);
    const z = units.filter(u => u.team === 'zombies' && u.cls.key === cls);
    for (let i = 0; i < Math.max(h.length, z.length); i++) {
      if (h[i]) order.push(h[i]);
      if (z[i]) order.push(z[i]);
    }
  }
  return order;
}

export class Queue {
  constructor(units) {
    this.list = buildInitiativeOrder(units);
    this.i = 0;
  }
  get current() { return this.list[this.i]; }
  next() { if (this.list.length) this.i = (this.i + 1) % this.list.length; }
  remove(u) {
    const idx = this.list.indexOf(u);
    if (idx < 0) return;
    this.list.splice(idx, 1);
    if (idx < this.i) this.i--;
    if (this.i >= this.list.length) this.i = 0;
  }
  ordered() { return [...this.list.slice(this.i), ...this.list.slice(0, this.i)]; }
}
