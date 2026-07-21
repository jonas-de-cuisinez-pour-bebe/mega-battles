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

function humansDps() {
  const g = new THREE.Group();
  const skin = M(0xe6b482), hair = M(0x6e4a2f), red = M(0xd04438);
  const tank = M(0x50565e), pants = M(0x64788a), boots = M(0x42464d);
  const blade = M(0xc7ccd4, { metalness: 0.5, roughness: 0.35 });

  // baskets + jambes + bassin
  g.add(box(0.18, 0.12, 0.3, boots, -0.12, 0.06, 0.02));
  g.add(box(0.18, 0.12, 0.3, boots, 0.12, 0.06, 0.02));
  g.add(cyl(0.08, 0.09, 0.28, pants, -0.12, 0.28));
  g.add(cyl(0.08, 0.09, 0.28, pants, 0.12, 0.28));
  g.add(box(0.32, 0.16, 0.22, pants, 0, 0.48));

  // torse fin en débardeur + dog tags
  g.add(cyl(0.16, 0.19, 0.36, tank, 0, 0.72));
  g.add(box(0.07, 0.09, 0.03, M(0xb9bec6, { metalness: 0.6 }), 0, 0.76, 0.16));

  // bras nus + mitaines ; couteau bas dans la main droite
  g.add(cyl(0.06, 0.07, 0.3, skin, -0.25, 0.68, 0, 0, 0.3));
  g.add(cyl(0.06, 0.07, 0.3, skin, 0.25, 0.68, 0, 0, -0.3));
  g.add(ball(0.08, boots, -0.31, 0.5));
  g.add(ball(0.08, boots, 0.31, 0.5));
  g.add(box(0.035, 0.34, 0.07, blade, 0.33, 0.32, 0.05, 0.15));
  g.add(box(0.1, 0.04, 0.09, boots, 0.32, 0.48, 0.03));

  // grosse tête : peau, cheveux en bataille, bandeau rouge, clope
  g.add(ball(0.32, skin, 0, 1.12, 0, 1, 0.95, 1));
  g.add(ball(0.33, hair, 0, 1.26, -0.05, 1, 0.55, 1));
  g.add(cyl(0.33, 0.33, 0.08, red, 0, 1.2, 0, 0, 0, true));
  g.add(box(0.1, 0.1, 0.06, red, 0, 1.2, -0.31)); // nœud du bandeau
  const cig = cyl(0.015, 0.015, 0.14, M(0xf2f0e8), 0.08, 1.0, 0.32, 1.2, 0.4);
  g.add(cig);
  g.add(ball(0.02, M(0xe0662e, { emissive: 0xe0662e, emissiveIntensity: 0.8 }), 0.12, 0.97, 0.36));
  return g;
}

function humansArcher() {
  const g = new THREE.Group();
  const skin = M(0xe6b482), oliveJ = M(0x6f7d4e), pants = M(0x5c6e7d);
  const boots = M(0x42464d), capM = M(0x4a5a3e), scarf = M(0x83905c);
  const gun = M(0x53575e, { metalness: 0.4, roughness: 0.4 }), stock = M(0x5f4a33);

  // bottes + jambes + bassin
  g.add(box(0.2, 0.13, 0.3, boots, -0.13, 0.065, 0.02));
  g.add(box(0.2, 0.13, 0.3, boots, 0.13, 0.065, 0.02));
  g.add(cyl(0.085, 0.095, 0.26, pants, -0.13, 0.28));
  g.add(cyl(0.085, 0.095, 0.26, pants, 0.13, 0.28));
  g.add(box(0.34, 0.16, 0.24, pants, 0, 0.47));

  // veste + sac à dos + antenne
  g.add(cyl(0.19, 0.22, 0.4, oliveJ, 0, 0.72));
  g.add(box(0.3, 0.34, 0.16, capM, 0, 0.76, -0.24));
  g.add(cyl(0.008, 0.008, 0.5, M(0x2e3236), 0.1, 1.05, -0.28));

  // bras
  g.add(cyl(0.07, 0.08, 0.3, oliveJ, -0.28, 0.7, 0, 0, 0.3));
  g.add(cyl(0.07, 0.08, 0.3, oliveJ, 0.28, 0.78, 0, -0.5, -0.9));
  g.add(ball(0.08, skin, -0.34, 0.52));
  g.add(ball(0.08, skin, 0.3, 0.95, 0.12));

  // tête : casquette basse + écharpe sur la bouche
  g.add(ball(0.31, skin, 0, 1.12, 0, 1, 0.95, 1));
  g.add(ball(0.325, capM, 0, 1.24, -0.02, 1, 0.55, 1));
  g.add(box(0.34, 0.05, 0.22, capM, 0, 1.19, 0.25, 0.12));
  g.add(cyl(0.32, 0.34, 0.14, scarf, 0, 0.95, 0.02));

  // fusil long à lunette, posé sur l'épaule droite
  const rifle = new THREE.Group();
  rifle.add(box(1.05, 0.05, 0.05, gun));
  rifle.add(box(0.22, 0.09, 0.06, stock, -0.5, -0.03, 0));
  rifle.add(cyl(0.035, 0.035, 0.16, gun, 0.1, 0.06, 0, 0, Math.PI / 2));
  rifle.add(cone(0.02, 0.06, gun, 0.55, 0, 0, 0, -Math.PI / 2));
  rifle.position.set(0.3, 1.05, 0.05);
  rifle.rotation.z = 0.55;
  g.add(rifle);
  return g;
}

// ---------- Zombies ----------

function zombiesTanker() {
  const g = new THREE.Group();
  const flesh = M(0x86a35c), fleshDark = M(0x6e8a49), armor = M(0x4c5248);
  const strap = M(0x3d4238), rust = M(0x9aa3ab, { metalness: 0.3, roughness: 0.6 });
  const rustSpot = M(0x8a5436);

  // jambes trapues + pieds
  g.add(box(0.26, 0.13, 0.34, strap, -0.18, 0.065, 0.02));
  g.add(box(0.26, 0.13, 0.34, strap, 0.18, 0.065, 0.02));
  g.add(cyl(0.13, 0.14, 0.2, fleshDark, -0.18, 0.24));
  g.add(cyl(0.13, 0.14, 0.2, fleshDark, 0.18, 0.24));

  // énorme corps gonflé + ventre + sangles + plaques
  g.add(ball(0.52, flesh, 0, 0.72, 0, 1, 0.92, 0.85));
  g.add(ball(0.4, fleshDark, 0, 0.6, 0.18, 1, 0.8, 0.7));
  g.add(box(0.95, 0.09, 0.06, strap, 0, 0.78, 0.38, 0, 0, 0.6));
  g.add(box(0.4, 0.22, 0.1, armor, -0.22, 1.0, 0.1, 0, 0, 0.25));
  g.add(box(0.3, 0.18, 0.34, armor, 0.3, 1.02, 0));

  // petite tête enfoncée + yeux rouges
  g.add(ball(0.18, flesh, 0.02, 1.24, 0.16));
  g.add(ball(0.03, M(0xd83a2e, { emissive: 0xd83a2e, emissiveIntensity: 0.7 }), -0.04, 1.27, 0.32));
  g.add(ball(0.03, M(0xd83a2e, { emissive: 0xd83a2e, emissiveIntensity: 0.7 }), 0.08, 1.27, 0.32));

  // bras épais
  g.add(cyl(0.12, 0.14, 0.42, flesh, -0.5, 0.62, 0, 0, 0.35));
  g.add(cyl(0.12, 0.14, 0.42, flesh, 0.5, 0.62, 0, 0, -0.35));
  g.add(ball(0.14, fleshDark, -0.58, 0.38));
  g.add(ball(0.14, fleshDark, 0.58, 0.38));

  // portière de voiture en guise de bouclier
  const door = new THREE.Group();
  door.add(box(0.08, 0.85, 0.6, rust));
  door.add(box(0.09, 0.3, 0.44, M(0x6a7178), 0, 0.22, 0));
  door.add(box(0.1, 0.05, 0.16, strap, 0, -0.05, 0.14));
  door.add(box(0.09, 0.12, 0.1, rustSpot, 0, -0.28, -0.18));
  door.add(box(0.09, 0.08, 0.14, rustSpot, 0, 0.02, 0.2));
  door.position.set(0.68, 0.6, 0.05);
  door.rotation.z = -0.1;
  g.add(door);
  return g;
}

function zombiesDps() {
  const g = new THREE.Group();
  const skin = M(0x7da05a), hood = M(0x4a4f45), hoodIn = M(0x363a33);
  const pantsM = M(0x5d4a42), shoes = M(0x777b80), stain = M(0x7a2e26);
  const eye = M(0xf2f2ec, { emissive: 0xf2f2ec, emissiveIntensity: 0.35 });

  // baskets + jambes
  g.add(box(0.18, 0.11, 0.3, shoes, -0.12, 0.055, 0.02));
  g.add(box(0.18, 0.11, 0.3, shoes, 0.12, 0.055, 0.02));
  g.add(cyl(0.075, 0.085, 0.28, pantsM, -0.12, 0.27));
  g.add(cyl(0.075, 0.085, 0.28, pantsM, 0.12, 0.27));

  // buste voûté en hoodie (penché vers l'avant) + tache sombre
  const upper = new THREE.Group();
  upper.add(cyl(0.18, 0.21, 0.4, hood, 0, 0.2));
  upper.add(box(0.14, 0.12, 0.03, stain, 0.05, 0.18, 0.19));
  // capuche + visage : gros yeux vides, bave
  upper.add(ball(0.33, hood, 0, 0.6, -0.02));
  upper.add(ball(0.26, skin, 0, 0.57, 0.1));
  upper.add(cone(0.16, 0.25, hood, 0, 0.82, -0.18, -0.5));
  upper.add(ball(0.075, eye, -0.1, 0.62, 0.32));
  upper.add(ball(0.075, eye, 0.1, 0.62, 0.32));
  upper.add(box(0.07, 0.12, 0.03, M(0x26201e), 0.01, 0.42, 0.33)); // bave noire
  // longs bras griffus tendus vers l'avant
  for (const side of [-1, 1]) {
    upper.add(cyl(0.06, 0.07, 0.46, hood, side * 0.26, 0.28, 0.2, -0.9, side * 0.25));
    const hand = new THREE.Group();
    hand.add(ball(0.07, skin));
    hand.add(cone(0.03, 0.12, skin, -0.04, -0.08, 0, Math.PI));
    hand.add(cone(0.03, 0.14, skin, 0.03, -0.09, 0, Math.PI));
    hand.position.set(side * 0.33, 0.06, 0.42);
    upper.add(hand);
  }
  upper.position.y = 0.42;
  upper.rotation.x = 0.3; // posture penchée, prête à bondir
  g.add(upper);
  return g;
}

function zombiesArcher() {
  const g = new THREE.Group();
  const skin = M(0x7da05a), skinDark = M(0x66854a), rags = M(0x5d6650);
  const boil = M(0x8a5c9e), jawM = M(0x66854a);
  const sac = M(0xc8e04a, { emissive: 0xa8c832, emissiveIntensity: 0.8, roughness: 0.4 });

  // pieds nus + jambes
  g.add(box(0.17, 0.1, 0.28, skinDark, -0.12, 0.05, 0.02));
  g.add(box(0.17, 0.1, 0.28, skinDark, 0.12, 0.05, 0.02));
  g.add(cyl(0.07, 0.08, 0.26, rags, -0.12, 0.25));
  g.add(cyl(0.07, 0.08, 0.26, rags, 0.12, 0.25));

  // buste voûté en haillons + poche à venin luisante
  const upper = new THREE.Group();
  upper.add(cyl(0.17, 0.21, 0.4, rags, 0, 0.2));
  upper.add(ball(0.15, sac, 0, 0.32, 0.16)); // gorge gonflée lumineuse
  // tête aux joues gonflées + mâchoire décrochée
  upper.add(ball(0.3, skin, 0, 0.66, 0.04, 1.2, 0.85, 1));
  upper.add(ball(0.06, M(0xf2f2ec), -0.11, 0.72, 0.28));
  upper.add(ball(0.06, M(0xf2f2ec), 0.11, 0.72, 0.28));
  upper.add(box(0.2, 0.16, 0.1, jawM, 0, 0.42, 0.24, 0.35)); // mâchoire pendante
  upper.add(box(0.16, 0.05, 0.02, M(0x26201e), 0, 0.52, 0.3)); // bouche béante
  // pustules violettes
  upper.add(ball(0.05, boil, -0.24, 0.78, 0.1));
  upper.add(ball(0.04, boil, 0.2, 0.6, -0.18));
  upper.add(ball(0.035, boil, -0.1, 0.36, 0.18));
  // bras maigres ballants
  upper.add(cyl(0.05, 0.06, 0.4, skin, -0.24, 0.12, 0.05, -0.25, 0.15));
  upper.add(cyl(0.05, 0.06, 0.4, skin, 0.24, 0.12, 0.05, -0.25, -0.15));
  upper.position.y = 0.4;
  upper.rotation.x = 0.35; // très voûté
  g.add(upper);
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
