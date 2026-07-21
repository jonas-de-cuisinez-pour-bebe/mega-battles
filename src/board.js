import * as THREE from 'three';

export const COLS = 12, ROWS = 10;

// Rivière verticale en x=6, franchissable par le pont en z=4 et z=5.
const RIVER_X = 6;
const BRIDGES = [[6, 4], [6, 5]];
const TREES = [[3, 1], [4, 6], [8, 1], [9, 7], [2, 8]];
const BARRICADES = [[4, 3], [8, 6]];
// Décor purement visuel (ne bloque pas) — positions fixes pour rester identique en ligne
const GRASS = [[2, 4], [5, 1], [7, 8], [9, 5], [4, 0], [10, 8], [0, 0], [8, 3], [3, 6], [11, 0]];
const STUMPS = [[5, 8], [8, 0], [2, 2]];

// petit générateur déterministe par case (variations de décor identiques partout)
const vary = (x, z, n = 1) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return (s - Math.floor(s)) * n;
};

// texture de sol : bruit d'herbe/terre dessiné sur canvas (teinté par la couleur de la case)
function makeGroundTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d9d9d9';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 128, y = Math.random() * 128;
    const light = Math.random() < 0.5;
    ctx.strokeStyle = light ? 'rgba(255,255,255,0.16)' : 'rgba(40,34,20,0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 3, y - 1.5 - Math.random() * 3.5);
    ctx.stroke();
  }
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '35,30,18' : '235,235,215'},0.10)`;
    ctx.beginPath();
    ctx.arc(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 4, 0, 7);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

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
    const groundTex = makeGroundTexture();

    for (let x = 0; x < COLS; x++) {
      for (let z = 0; z < ROWS; z++) {
        const t = this.tiles[x][z];
        const light = (x + z) % 2 === 0;
        let color;
        if (t === 'river') color = light ? 0x4f83b8 : 0x4779ad;
        else if (t === 'bridge') color = 0x8a6f4d;
        else {
          // sol sec post-apo, avec une légère variation de teinte par case
          const base = light ? 0x9aa06b : 0x8e9463;
          const c = new THREE.Color(base);
          c.offsetHSL((vary(x, z) - 0.5) * 0.03, (vary(z, x) - 0.5) * 0.08, (vary(x + 7, z + 3) - 0.5) * 0.05);
          color = c;
        }
        const mat = new THREE.MeshStandardMaterial({ color });
        if (t !== 'river') { mat.map = groundTex; mat.roughness = 0.95; }
        const tile = new THREE.Mesh(tileGeo, mat);
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
    for (const [x, z] of GRASS) this.#addGrass(x, z);
    for (const [x, z] of STUMPS) this.#addStump(x, z);
  }

  // Touffe étoilée de grandes feuilles pointues (croquis « touffe arbre » 2013)
  #tuft(size, color) {
    const tuftG = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const n = 7;
    for (let i = 0; i < n; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.5, 4), mat);
      leaf.scale.set(size, size, size * 0.4);
      const a = (i / n) * Math.PI * 2 + size; // léger décalage pour casser la régularité
      // feuille pointant vers l'extérieur, retombant légèrement
      leaf.position.set(Math.cos(a) * 0.16 * size, 0.02, Math.sin(a) * 0.16 * size);
      leaf.rotation.set(Math.sin(a) * 1.9, 0, -Math.cos(a) * 1.9);
      tuftG.add(leaf);
    }
    // cœur de la touffe, pointé vers le haut
    const heart = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.34, 5), mat);
    heart.scale.setScalar(size);
    heart.position.y = 0.12 * size;
    tuftG.add(heart);
    return tuftG;
  }

  // Arbre fidèle au croquis « arbre1 » : tronc épais évasé + 3 touffes étoilées
  #addTree(x, z) {
    const g = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x77552f, roughness: 0.95 });
    const v = vary(x, z);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, 0.75, 9), trunkMat);
    trunk.position.y = 0.48;
    trunk.rotation.z = (v - 0.5) * 0.18; // léger penché
    g.add(trunk);
    // évasement racinaire (croquis tronc2)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + v * 2;
      const root = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.24, 5), trunkMat);
      root.position.set(Math.cos(a) * 0.15, 0.16, Math.sin(a) * 0.15);
      root.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7);
      g.add(root);
    }

    // 3 touffes : sommet + deux latérales sur petites branches
    const greens = [0x5d8f3f, 0x6da24a, 0x517e35];
    const top = this.#tuft(1.15, greens[Math.floor(v * 3) % 3]);
    top.position.set(trunk.rotation.z * -0.6, 0.98, 0);
    g.add(top);
    for (const side of [-1, 1]) {
      const a = v * Math.PI * 2 + (side > 0 ? 0 : Math.PI * 0.8);
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.3, 6), trunkMat);
      branch.position.set(Math.cos(a) * 0.22, 0.72, Math.sin(a) * 0.22);
      branch.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
      g.add(branch);
      const tuft = this.#tuft(0.8 + vary(x + side, z) * 0.25, greens[(Math.floor(v * 3) + side + 1 + 3) % 3]);
      tuft.position.set(Math.cos(a) * 0.36, 0.82 + vary(z + side, x) * 0.12, Math.sin(a) * 0.36);
      g.add(tuft);
    }

    g.rotation.y = v * Math.PI * 2;
    g.scale.setScalar(0.95 + vary(z, x) * 0.2);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.position.copy(this.worldPos(x, z));
    this.scene.add(g);
  }

  // Souche à racines évasées + brins d'herbe (croquis « tronc2 »)
  #addStump(x, z) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x7a5c38, roughness: 0.95 });
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.2, 8), mat);
    stump.position.y = 0.1;
    stump.castShadow = true;
    g.add(stump);
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.02, 8),
      new THREE.MeshStandardMaterial({ color: 0xc4a370, roughness: 0.9 })
    );
    top.position.y = 0.21;
    g.add(top);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + vary(x, z) * 2;
      const root = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 5), mat);
      root.position.set(Math.cos(a) * 0.13, 0.05, Math.sin(a) * 0.13);
      root.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
      g.add(root);
    }
    g.rotation.y = vary(z, x) * Math.PI * 2;
    g.position.copy(this.worldPos(x, z));
    this.scene.add(g);
    this.#addGrass(x, z); // quelques brins au pied, comme sur le croquis
  }

  // Brins d'herbe : fins cônes verts inclinés
  #addGrass(x, z) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x74904a, roughness: 0.9 });
    const n = 5 + Math.floor(vary(x, z) * 3);
    for (let i = 0; i < n; i++) {
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.14 + vary(x + i, z) * 0.12, 4), mat);
      blade.position.set((vary(x, z + i) - 0.5) * 0.5, 0.07, (vary(x + i, z + i) - 0.5) * 0.5);
      blade.rotation.set((vary(z + i, x) - 0.5) * 0.7, 0, (vary(x + i * 3, z) - 0.5) * 0.7);
      g.add(blade);
    }
    g.position.copy(this.worldPos(x, z, 0.1));
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
