import * as THREE from 'three';
import { CLASSES, TEAMS } from './data.js';
import { buildModel } from './models.js';

let nextId = 1;

// Hauteur de la barre de HP au-dessus de chaque modèle 3D
const BAR_Y = { tanker: 1.85, dps: 1.65, archer: 1.7 };

export class Unit {
  constructor(teamId, clsKey, x, z) {
    this.id = nextId++;
    this.team = teamId;
    this.cls = CLASSES[clsKey];
    this.hp = this.cls.hp;
    this.maxHp = this.cls.hp;
    this.x = x;
    this.z = z;
    this.cooldown = 0;  // tours restants avant que le skill actif soit rechargé
    this.armed = false; // skill actif enclenché pour la prochaine attaque
    this.mesh = this.#buildMesh();
    this.#buildHpBar();
  }

  get alive() { return this.hp > 0; }

  #buildMesh() {
    const g = new THREE.Group();
    const color = TEAMS[this.team].color;

    // Modèle 3D procédural, style figurine chibi (voir models.js)
    const model = buildModel(this.team, this.cls.key);
    model.position.y = 0.1;
    model.traverse(o => { if (o.isMesh) o.userData.unit = this; });
    g.add(model);

    // Socle aux couleurs de l'équipe (lisibilité du camp en un coup d'œil)
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.44, 0.06, 24),
      new THREE.MeshStandardMaterial({ color })
    );
    disc.position.y = 0.13;
    disc.userData.unit = this;
    g.add(disc);

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
    sprite.position.y = BAR_Y[this.cls.key];
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
