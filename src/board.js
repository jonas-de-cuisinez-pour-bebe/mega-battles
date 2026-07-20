import * as THREE from 'three';

export const COLS = 12, ROWS = 10;

// Rivière verticale en x=6, franchissable par le pont en z=4 et z=5.
const RIVER_X = 6;
const BRIDGES = [[6, 4], [6, 5]];
const TREES = [[3, 1], [4, 6], [8, 1], [9, 7], [2, 8]];
const BARRICADES = [[4, 3], [8, 6]];

const HIGHLIGHT = { move: 0x6fbf5f, attack: 0xd05348, hover: 0xe8c84a };

export class Board {
  constructor(scene) {
    this.scene = scene;
    this.tiles = [];      // [x][z] -> 'ground' | 'river' | 'bridge' | 'tree' | 'barricade'
    this.tileMeshes = []; // pour le raycast (userData {x, z})
    this.overlays = new Map(); // key -> mesh de surbrillance
    this.#build();
  }

  key(x, z) { return `${x},${z}`; }
  inBounds(x, z) { return x >= 0 && x < COLS && z >= 0 && z < ROWS; }
  worldPos(x, z, y = 0) { return new THREE.Vector3(x - COLS / 2 + 0.5, y, z - ROWS / 2 + 0.5); }

  terrainAt(x, z) { return this.tiles[x][z]; }
  terrainBlocked(x, z) {
    const t = this.tiles[x][z];
    return t === 'river' || t === 'tree' || t === 'barricade';
  }

  #build() {
    for (let x = 0; x < COLS; x++) {
      this.tiles[x] = [];
      for (let z = 0; z < ROWS; z++) this.tiles[x][z] = 'ground';
    }
    for (let z = 0; z < ROWS; z++) this.tiles[RIVER_X][z] = 'river';
    for (const [x, z] of BRIDGES) this.tiles[x][z] = 'bridge';
    for (const [x, z] of TREES) this.tiles[x][z] = 'tree';
    for (const [x, z] of BARRICADES) this.tiles[x][z] = 'barricade';

    const tileGeo = new THREE.BoxGeometry(0.96, 0.2, 0.96);
    const overlayGeo = new THREE.PlaneGeometry(0.9, 0.9);

    for (let x = 0; x < COLS; x++) {
      for (let z = 0; z < ROWS; z++) {
        const t = this.tiles[x][z];
        const light = (x + z) % 2 === 0;
        let color;
        if (t === 'river') color = light ? 0x4f83b8 : 0x4779ad;
        else if (t === 'bridge') color = 0x8a6f4d;
        else color = light ? 0x9aa06b : 0x8e9463; // sol sec post-apo
        const tile = new THREE.Mesh(tileGeo, new THREE.MeshStandardMaterial({ color }));
        tile.position.copy(this.worldPos(x, z));
        if (t === 'river') tile.position.y = -0.06;
        tile.receiveShadow = true;
        tile.userData = { x, z, tile: true };
        this.scene.add(tile);
        this.tileMeshes.push(tile);

        const ov = new THREE.Mesh(overlayGeo, new THREE.MeshBasicMaterial({
          transparent: true, opacity: 0.55, depthWrite: false,
        }));
        ov.rotation.x = -Math.PI / 2;
        ov.position.copy(this.worldPos(x, z, 0.115));
        ov.visible = false;
        this.scene.add(ov);
        this.overlays.set(this.key(x, z), ov);

        if (t === 'tree') this.#addTree(x, z);
        if (t === 'barricade') this.#addBarricade(x, z);
      }
    }
  }

  #addTree(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.11, 0.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x6b4a2b })
    );
    trunk.position.y = 0.3;
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.38, 0.85, 8),
      new THREE.MeshStandardMaterial({ color: 0x4e7d3a })
    );
    crown.position.y = 0.95;
    trunk.castShadow = crown.castShadow = true;
    g.add(trunk, crown);
    g.position.copy(this.worldPos(x, z));
    this.scene.add(g);
  }

  #addBarricade(x, z) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x7d6547 });
    for (let i = 0; i < 3; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 0.1), mat);
      plank.position.set(0, 0.2 + i * 0.18, (i % 2 ? 0.06 : -0.06));
      plank.rotation.z = (i % 2 ? 0.08 : -0.08);
      plank.castShadow = true;
      g.add(plank);
    }
    g.position.copy(this.worldPos(x, z));
    this.scene.add(g);
  }

  // Cases atteignables en déplacement (BFS 4 directions).
  // Les ennemis bloquent le passage ; les alliés sont traversables
  // mais on ne peut pas terminer son déplacement sur eux.
  reachable(unit, units) {
    const others = units.filter(u => u.alive && u !== unit);
    const blocking = new Set(others.filter(u => u.team !== unit.team).map(u => this.key(u.x, u.z)));
    const occupied = new Set(others.map(u => this.key(u.x, u.z)));
    const start = this.key(unit.x, unit.z);
    const dist = new Map([[start, 0]]);
    const parent = new Map();
    const frontier = [[unit.x, unit.z]];
    while (frontier.length) {
      const [cx, cz] = frontier.shift();
      const d = dist.get(this.key(cx, cz));
      if (d >= unit.cls.mov) continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, nz = cz + dz;
        const k = this.key(nx, nz);
        if (!this.inBounds(nx, nz) || dist.has(k)) continue;
        if (this.terrainBlocked(nx, nz) || blocking.has(k)) continue;
        dist.set(k, d + 1);
        parent.set(k, this.key(cx, cz));
        frontier.push([nx, nz]);
      }
    }
    dist.delete(start);
    const cells = new Set([...dist.keys()].filter(k => !occupied.has(k)));
    const paths = new Map();
    for (const k of cells) {
      const path = [];
      let cur = k;
      while (cur !== start) {
        const [px, pz] = cur.split(',').map(Number);
        path.unshift({ x: px, z: pz });
        cur = parent.get(cur);
      }
      paths.set(k, path);
    }
    return { cells, paths };
  }

  // Cases dans la portée d'attaque (distance de Manhattan min..max).
  cellsInRange(x, z, min, max) {
    const out = [];
    for (let cx = x - max; cx <= x + max; cx++) {
      for (let cz = z - max; cz <= z + max; cz++) {
        const d = Math.abs(cx - x) + Math.abs(cz - z);
        if (d >= min && d <= max && this.inBounds(cx, cz)) out.push({ x: cx, z: cz });
      }
    }
    return out;
  }

  highlight(cells, kind) {
    const color = HIGHLIGHT[kind];
    for (const c of cells) {
      const k = typeof c === 'string' ? c : this.key(c.x, c.z);
      const ov = this.overlays.get(k);
      if (ov) { ov.material.color.setHex(color); ov.visible = true; }
    }
  }

  clearHighlights() {
    for (const ov of this.overlays.values()) ov.visible = false;
  }
}
