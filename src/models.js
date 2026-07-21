import * as THREE from 'three';

// Modèles 3D procéduraux, style figurine chibi low-poly.
// Chaque builder construit le personnage face à +z, ~1,3-1,6 de haut, pieds à y=0.
// buildModel() oriente ensuite chaque camp vers l'adversaire.

const M = (color, opts = {}) => new THREE.MeshStandardMaterial({
  color, roughness: 0.75, metalness: 0.05, ...opts,
});

function box(w, h, d, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

function ball(r, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

function cyl(r1, r2, h, mat, x = 0, y = 0, z = 0, rx = 0, rz = 0, open = false) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 16, 1, open), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, 0, rz);
  return m;
}

function cone(r, h, mat, x = 0, y = 0, z = 0, rx = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 12), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, 0, rz);
  return m;
}

// ---------- Humans ----------

function humansTanker() {
  const g = new THREE.Group();
  const navy = M(0x46586c), navyDark = M(0x364353), olive = M(0x7f8f56);
  const dark = M(0x474c54), orange = M(0xe08a2e);
  const visor = M(0x35c8f0, { emissive: 0x35c8f0, emissiveIntensity: 0.9, roughness: 0.3 });

  // bottes + jambes courtes (chibi)
  g.add(box(0.24, 0.15, 0.34, dark, -0.15, 0.075, 0.02));
  g.add(box(0.24, 0.15, 0.34, dark, 0.15, 0.075, 0.02));
  g.add(cyl(0.1, 0.11, 0.18, navyDark, -0.15, 0.24));
  g.add(cyl(0.1, 0.11, 0.18, navyDark, 0.15, 0.24));

  // bassin + ceinture + torse blindé
  g.add(box(0.42, 0.18, 0.28, navyDark, 0, 0.4));
  g.add(box(0.48, 0.08, 0.33, dark, 0, 0.5));
  const torso = cyl(0.24, 0.28, 0.38, olive, 0, 0.72);
  torso.scale.z = 0.75;
  g.add(torso);
  g.add(box(0.3, 0.2, 0.08, olive, 0, 0.74, 0.18)); // plastron
  g.add(box(0.12, 0.08, 0.05, dark, -0.1, 0.62, 0.2));
  g.add(box(0.12, 0.08, 0.05, dark, 0.1, 0.62, 0.2));

  // épaulières (rayure orange à gauche)
  g.add(ball(0.15, olive, -0.3, 0.92, 0, 1, 0.8, 1));
  g.add(ball(0.15, olive, 0.3, 0.92, 0, 1, 0.8, 1));
  g.add(box(0.1, 0.03, 0.18, orange, -0.32, 0.97, 0, 0, 0, 0.3));

  // bras + poings
  g.add(cyl(0.08, 0.09, 0.3, navy, -0.34, 0.72, 0, 0, 0.25));
  g.add(cyl(0.08, 0.09, 0.3, navy, 0.34, 0.72, 0, 0, -0.25));
  g.add(ball(0.1, navyDark, -0.39, 0.55));
  g.add(ball(0.1, navyDark, 0.39, 0.55));

  // tête-casque massive + oreillettes + visière + respirateur
  g.add(ball(0.36, navy, 0, 1.28, 0, 1, 0.92, 1));
  g.add(box(0.1, 0.18, 0.22, navyDark, -0.34, 1.24, 0));
  g.add(box(0.1, 0.18, 0.22, navyDark, 0.34, 1.24, 0));
  g.add(box(0.4, 0.16, 0.1, visor, 0, 1.3, 0.28, -0.08));
  g.add(box(0.3, 0.14, 0.14, navyDark, 0, 1.08, 0.22));
  g.add(box(0.05, 0.02, 0.02, dark, -0.06, 1.06, 0.29));
  g.add(box(0.05, 0.02, 0.02, dark, 0.06, 1.06, 0.29));

  // bouclier anti-émeute
  const shield = new THREE.Group();
  shield.add(box(0.07, 0.8, 0.55, olive));
  shield.add(box(0.08, 0.84, 0.06, navyDark, 0, 0, 0.27));
  shield.add(box(0.08, 0.84, 0.06, navyDark, 0, 0, -0.27));
  shield.add(box(0.08, 0.06, 0.55, navyDark, 0, 0.4, 0));
  shield.add(box(0.08, 0.06, 0.55, navyDark, 0, -0.4, 0));
  shield.add(box(0.085, 0.09, 0.34, orange, 0, 0.16, 0));
  shield.add(box(0.085, 0.09, 0.34, orange, 0, -0.02, 0));
  shield.position.set(0.52, 0.62, 0.05);
  shield.rotation.z = -0.06;
  g.add(shield);
  return g;
}

// DPS humain, croquis « DPS design » : marcel, bandana au front, avant-bras
// bandé, gros poignard en prise inversée, short
function humansDps() {
  const g = new THREE.Group();
  const skin = M(0xe6b482), hair = M(0x2e2a26), bandana = M(0x3a3f45);
  const marcel = M(0xb9bec6), shorts = M(0x5c6e7d), boots = M(0x42464d);
  const wrap = M(0xd9d4c8), blade = M(0xc7ccd4, { metalness: 0.5, roughness: 0.35 });

  // bottes + jambes nues + short
  g.add(box(0.19, 0.13, 0.3, boots, -0.12, 0.065, 0.02));
  g.add(box(0.19, 0.13, 0.3, boots, 0.12, 0.065, 0.02));
  g.add(cyl(0.075, 0.085, 0.24, skin, -0.12, 0.27));
  g.add(cyl(0.075, 0.085, 0.24, skin, 0.12, 0.27));
  g.add(box(0.34, 0.2, 0.24, shorts, 0, 0.47));
  g.add(box(0.36, 0.05, 0.26, boots, 0, 0.55)); // ceinture

  // torse musclé en marcel
  g.add(cyl(0.17, 0.2, 0.38, marcel, 0, 0.73));
  g.add(ball(0.06, skin, -0.12, 0.9, 0.1)); // épaules nues
  g.add(ball(0.06, skin, 0.12, 0.9, 0.1));

  // bras gauche nu, bras droit bandé tenant le poignard inversé (lame vers le bas)
  g.add(cyl(0.06, 0.07, 0.3, skin, -0.26, 0.68, 0, 0, 0.3));
  g.add(ball(0.075, skin, -0.32, 0.5));
  g.add(cyl(0.065, 0.075, 0.3, wrap, 0.26, 0.68, 0, 0, -0.3)); // avant-bras bandé
  g.add(ball(0.08, wrap, 0.32, 0.5));
  g.add(box(0.05, 0.4, 0.09, blade, 0.33, 0.26, 0.02, 0, 0, 0.06)); // lame inversée
  g.add(box(0.12, 0.04, 0.1, boots, 0.32, 0.47, 0.02)); // garde

  // grosse tête : cheveux noirs en casque + bandana fin sur le front
  g.add(ball(0.32, skin, 0, 1.12, 0, 1, 0.95, 1));
  g.add(ball(0.335, hair, 0, 1.24, -0.04, 1, 0.6, 1));
  g.add(cyl(0.325, 0.325, 0.07, bandana, 0, 1.16, 0, 0, 0, true));
  // petits yeux déterminés
  const white = M(0xf2f2ec), pupil = M(0x26201e);
  g.add(ball(0.045, white, -0.1, 1.1, 0.29));
  g.add(ball(0.045, white, 0.1, 1.1, 0.29));
  g.add(ball(0.02, pupil, -0.1, 1.1, 0.325));
  g.add(ball(0.02, pupil, 0.1, 1.1, 0.325));
  g.add(box(0.09, 0.02, 0.02, hair, -0.1, 1.16, 0.3, 0, 0, 0.15)); // sourcils froncés
  g.add(box(0.09, 0.02, 0.02, hair, 0.1, 1.16, 0.3, 0, 0, -0.15));
  return g;
}

// Distance humain, croquis « DPS_human » : maigre, bandeau rouge, clope au bec,
// fusil tenu bas le long de la jambe
function humansArcher() {
  const g = new THREE.Group();
  const skin = M(0xe6b482), hair = M(0x6e4a2f), red = M(0xd04438);
  const tank = M(0x707a58), pants = M(0x5c6e7d), boots = M(0x42464d);
  const gun = M(0x53575e, { metalness: 0.4, roughness: 0.4 }), stock = M(0x5f4a33);

  // bottes + jambes (pantalon retroussé) + bassin
  g.add(box(0.18, 0.12, 0.29, boots, -0.12, 0.06, 0.02));
  g.add(box(0.18, 0.12, 0.29, boots, 0.12, 0.06, 0.02));
  g.add(cyl(0.075, 0.085, 0.26, pants, -0.12, 0.28));
  g.add(cyl(0.075, 0.085, 0.26, pants, 0.12, 0.28));
  g.add(box(0.3, 0.16, 0.22, pants, 0, 0.47));

  // torse maigre en débardeur
  g.add(cyl(0.15, 0.18, 0.36, tank, 0, 0.72));

  // bras nus ; le droit tient le fusil bas, canon vers le sol
  g.add(cyl(0.055, 0.065, 0.28, skin, -0.24, 0.68, 0, 0, 0.3));
  g.add(ball(0.07, skin, -0.3, 0.52));
  g.add(cyl(0.055, 0.065, 0.28, skin, 0.24, 0.66, 0, 0, -0.15));
  g.add(ball(0.07, skin, 0.27, 0.5));
  const rifle = new THREE.Group();
  rifle.add(box(0.05, 0.95, 0.05, gun));
  rifle.add(box(0.07, 0.2, 0.06, stock, 0, 0.42, -0.02));
  rifle.add(cone(0.02, 0.06, gun, 0, -0.5, 0, Math.PI));
  rifle.position.set(0.29, 0.42, 0.06);
  rifle.rotation.x = 0.12;
  g.add(rifle);

  // grosse tête : cheveux bruns, bandeau rouge avec nœud, clope incandescente
  g.add(ball(0.31, skin, 0, 1.1, 0, 1, 0.95, 1));
  g.add(ball(0.32, hair, 0, 1.23, -0.05, 1, 0.55, 1));
  g.add(cyl(0.315, 0.315, 0.08, red, 0, 1.17, 0, 0, 0, true));
  // petits yeux mi-clos, l'air blasé
  const white = M(0xf2f2ec), lid = M(0xc9985f);
  g.add(ball(0.042, white, -0.09, 1.09, 0.28, 1, 0.7, 1));
  g.add(ball(0.042, white, 0.09, 1.09, 0.28, 1, 0.7, 1));
  g.add(ball(0.018, M(0x26201e), -0.09, 1.08, 0.315));
  g.add(ball(0.018, M(0x26201e), 0.09, 1.08, 0.315));
  g.add(box(0.09, 0.025, 0.02, lid, -0.09, 1.12, 0.3)); // paupières tombantes
  g.add(box(0.09, 0.025, 0.02, lid, 0.09, 1.12, 0.3));
  g.add(box(0.1, 0.1, 0.06, red, 0, 1.17, -0.3)); // nœud du bandeau
  g.add(cyl(0.015, 0.015, 0.14, M(0xf2f0e8), 0.08, 0.99, 0.31, 1.2, 0.4));
  g.add(ball(0.02, M(0xe0662e, { emissive: 0xe0662e, emissiveIntensity: 0.8 }), 0.12, 0.96, 0.35));
  return g;
}

// ---------- Zombies ----------

// Tank zombie, croquis « horde » : obèse au ventre énorme, pustules rondes,
// petite tête ronde aux gros yeux vides, short déchiré — pas de bouclier
function zombiesTanker() {
  const g = new THREE.Group();
  const flesh = M(0x86a35c), fleshDark = M(0x6e8a49), shorts = M(0x6b5442);
  const eye = M(0xf2f2ec), pupil = M(0x26201e);

  // jambes courtaudes + pieds nus
  g.add(box(0.24, 0.12, 0.32, fleshDark, -0.18, 0.06, 0.02));
  g.add(box(0.24, 0.12, 0.32, fleshDark, 0.18, 0.06, 0.02));
  g.add(cyl(0.12, 0.13, 0.16, fleshDark, -0.18, 0.2));
  g.add(cyl(0.12, 0.13, 0.16, fleshDark, 0.18, 0.2));

  // short déchiré sous le bide
  g.add(box(0.52, 0.2, 0.4, shorts, 0, 0.36));

  // énorme corps-ventre sphérique qui déborde
  g.add(ball(0.5, flesh, 0, 0.78, 0, 1, 0.95, 0.88));
  g.add(ball(0.34, fleshDark, 0, 0.6, 0.24, 1, 0.75, 0.6)); // bide qui pend
  g.add(ball(0.05, fleshDark, 0, 0.66, 0.5)); // nombril

  // pustules et plaies rondes (croquis : cercles sur le corps)
  const sore = M(0x9a4a3a);
  g.add(ball(0.07, sore, -0.3, 0.95, 0.28));
  g.add(ball(0.055, sore, 0.34, 0.8, 0.26));
  g.add(ball(0.05, sore, -0.38, 0.66, 0.2));
  g.add(ball(0.06, sore, 0.16, 1.02, 0.3));
  g.add(ball(0.045, sore, 0.4, 0.9, -0.14));

  // petite tête ronde enfoncée, gros yeux ronds vides
  g.add(ball(0.22, flesh, 0, 1.32, 0.06));
  g.add(ball(0.075, eye, -0.09, 1.34, 0.24));
  g.add(ball(0.075, eye, 0.09, 1.34, 0.24));
  g.add(ball(0.025, pupil, -0.09, 1.34, 0.3));
  g.add(ball(0.025, pupil, 0.09, 1.34, 0.3));
  g.add(box(0.12, 0.05, 0.03, pupil, 0, 1.2, 0.26)); // bouche molle

  // gros bras ballants
  g.add(cyl(0.11, 0.13, 0.44, flesh, -0.5, 0.7, 0, 0, 0.3));
  g.add(cyl(0.11, 0.13, 0.44, flesh, 0.5, 0.7, 0, 0, -0.3));
  g.add(ball(0.13, fleshDark, -0.58, 0.46));
  g.add(ball(0.13, fleshDark, 0.58, 0.46));
  return g;
}

// DPS zombie, croquis « horde » : petit maigre en pull et jean, yeux vides
// énormes, bouche béante, bras tendu avec la MAIN DÉTACHÉE qui flotte
function zombiesDps() {
  const g = new THREE.Group();
  const skin = M(0x7da05a), sweater = M(0x4a5568), jeans = M(0x51616e);
  const shoes = M(0x777b80), eye = M(0xf2f2ec, { emissive: 0xf2f2ec, emissiveIntensity: 0.3 });
  const dark = M(0x26201e);

  // baskets + jambes en jean
  g.add(box(0.17, 0.11, 0.28, shoes, -0.11, 0.055, 0.02));
  g.add(box(0.17, 0.11, 0.28, shoes, 0.11, 0.055, 0.02));
  g.add(cyl(0.07, 0.08, 0.3, jeans, -0.11, 0.28));
  g.add(cyl(0.07, 0.08, 0.3, jeans, 0.11, 0.28));

  // petit torse en pull
  g.add(cyl(0.15, 0.17, 0.34, sweater, 0, 0.6));

  // bras gauche ballant ; bras droit TENDU devant, main détachée qui flotte
  g.add(cyl(0.055, 0.06, 0.28, sweater, -0.22, 0.56, 0, 0, 0.25));
  g.add(ball(0.06, skin, -0.27, 0.4));
  g.add(cyl(0.055, 0.06, 0.34, sweater, 0.1, 0.72, 0.2, -1.35, -0.1)); // tendu horizontal
  g.add(ball(0.045, dark, 0.13, 0.74, 0.38)); // moignon sombre
  const hand = new THREE.Group(); // la main, détachée quelques cm plus loin
  hand.add(ball(0.065, skin));
  hand.add(cone(0.025, 0.09, skin, -0.03, 0, 0.06, 1.4));
  hand.add(cone(0.025, 0.1, skin, 0.03, 0, 0.06, 1.4));
  hand.position.set(0.15, 0.73, 0.52);
  g.add(hand);

  // grosse tête : yeux vides énormes, bouche béante, cheveux en pétard
  g.add(ball(0.29, skin, 0, 1.02, 0, 1, 0.95, 1));
  g.add(ball(0.3, dark, 0, 1.16, -0.06, 1, 0.45, 1)); // tignasse
  g.add(ball(0.085, eye, -0.1, 1.06, 0.24));
  g.add(ball(0.085, eye, 0.1, 1.06, 0.24));
  g.add(ball(0.065, dark, 0, 0.88, 0.26, 1, 1.3, 0.5)); // bouche béante ovale
  return g;
}

// Distance zombie, croquis « horde » : squelette AILÉ à l'arc, crâne grimaçant
function zombiesArcher() {
  const g = new THREE.Group();
  const bone = M(0xd9d2c0, { roughness: 0.85 }), dark = M(0x26201e);
  const wing = M(0x5d5548), bow = M(0x5f4a33);

  // jambes osseuses repliées (posture accroupie flottante)
  g.add(cyl(0.045, 0.05, 0.24, bone, -0.1, 0.3, 0.06, 0.9, 0.15));
  g.add(cyl(0.045, 0.05, 0.24, bone, 0.1, 0.3, 0.06, 0.9, -0.15));
  g.add(box(0.1, 0.06, 0.16, bone, -0.12, 0.18, 0.16));
  g.add(box(0.1, 0.06, 0.16, bone, 0.12, 0.18, 0.16));

  // colonne + cage thoracique suggérée
  g.add(cyl(0.05, 0.06, 0.34, bone, 0, 0.56));
  for (let i = 0; i < 3; i++) {
    g.add(cyl(0.14 - i * 0.02, 0.14 - i * 0.02, 0.035, bone, 0, 0.52 + i * 0.09, 0, 0, 0, true));
  }
  g.add(box(0.26, 0.05, 0.12, bone, 0, 0.74, 0)); // clavicules/épaules

  // grandes ailes déplumées en éventail (le croquis les fait plus grandes que le corps)
  for (const side of [-1, 1]) {
    const w = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const f = cone(0.06, 0.62 - i * 0.07, wing, 0, 0.26 - i * 0.035, 0, 0, side * (0.45 + i * 0.38));
      f.scale.z = 0.35;
      w.add(f);
    }
    // accrochées dans le dos, déployées vers l'arrière, envergure massive
    w.position.set(side * 0.1, 0.85, -0.26);
    w.rotation.z = side * 0.55;
    w.rotation.y = side * 0.45;
    w.scale.setScalar(1.9);
    g.add(w);
  }

  // crâne grimaçant : orbites noires + rangée de dents
  g.add(ball(0.27, bone, 0, 1.06, 0, 1, 0.92, 1));
  g.add(ball(0.08, dark, -0.1, 1.1, 0.21));
  g.add(ball(0.08, dark, 0.1, 1.1, 0.21));
  g.add(box(0.22, 0.09, 0.08, bone, 0, 0.88, 0.16)); // mâchoire
  for (let i = 0; i < 5; i++) {
    g.add(box(0.028, 0.05, 0.02, M(0xf2efe4), -0.08 + i * 0.04, 0.9, 0.235));
  }

  // arc tenu devant à deux mains osseuses
  const bowG = new THREE.Group();
  const arc = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.025, 6, 14, Math.PI),
    bow
  );
  bowG.add(arc);
  bowG.add(cyl(0.006, 0.006, 0.6, M(0xd9d2c0), 0, 0, 0, 0, Math.PI / 2)); // corde... verticale
  bowG.position.set(0.02, 0.62, 0.3);
  bowG.rotation.set(0, Math.PI / 2, Math.PI / 2);
  g.add(bowG);
  g.add(cyl(0.04, 0.045, 0.3, bone, -0.18, 0.62, 0.16, -0.9, 0.3)); // bras vers l'arc
  g.add(cyl(0.04, 0.045, 0.3, bone, 0.18, 0.62, 0.16, -0.9, -0.3));
  return g;
}

const BUILDERS = {
  humans_tanker: humansTanker,
  humans_dps: humansDps,
  humans_archer: humansArcher,
  zombies_tanker: zombiesTanker,
  zombies_dps: zombiesDps,
  zombies_archer: zombiesArcher,
};

export function buildModel(team, cls) {
  const g = BUILDERS[`${team}_${cls}`]();
  // le modèle est construit face à +z ; l'orientation est gérée par le jeu
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
