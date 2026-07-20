// IA basique : se rapproche, attaque la cible la plus faible, arme son skill
// quand il est décisif (kill garanti ou gros bonus de dégâts).

function manhattan(ax, az, bx, bz) {
  return Math.abs(ax - bx) + Math.abs(az - bz);
}

function pickTarget(unit, targets, computeDamage) {
  if (!targets.length) return null;
  const killable = targets.filter(t => computeDamage(unit, t) >= t.hp);
  const pool = killable.length ? killable : targets;
  return pool.reduce((best, t) => (t.hp < best.hp ? t : best));
}

function maybeArmSkill(unit, target, computeDamage) {
  if (unit.cls.passive || unit.skillUsed) return;
  const normal = computeDamage(unit, target);
  unit.armed = true;
  const armed = computeDamage(unit, target);
  const killsNow = armed >= target.hp && normal < target.hp;
  if (!killsNow && armed - normal < 6) unit.armed = false;
}

// Meilleure case de déplacement : une case d'où on peut tirer si possible
// (l'archer garde ses distances), sinon se rapprocher de la bonne portée.
function chooseDest(unit, reach, units) {
  const enemies = units.filter(e => e.alive && e.team !== unit.team);
  if (!enemies.length || !reach.cells.size) return null;
  let best = null, bestScore = -Infinity;
  for (const k of reach.cells) {
    const [x, z] = k.split(',').map(Number);
    const dists = enemies.map(e => manhattan(x, z, e.x, e.z));
    const dmin = Math.min(...dists);
    const canHit = dists.some(d => d >= unit.cls.rangeMin && d <= unit.cls.rangeMax);
    const ranged = unit.cls.rangeMin > 1;
    const score = canHit ? 1000 + (ranged ? dmin : -dmin)
                         : -Math.abs(dmin - unit.cls.rangeMax);
    if (score > bestScore) { bestScore = score; best = k; }
  }
  // Rester sur place si aucune case ne fait mieux que la position actuelle
  if (bestScore < 0) {
    const hereMin = Math.min(...enemies.map(e => manhattan(unit.x, unit.z, e.x, e.z)));
    if (-Math.abs(hereMin - unit.cls.rangeMax) >= bestScore) return null;
  }
  return best;
}

export async function aiTakeTurn(ctx) {
  const { game, units, queue, doAttack, doMove, endTurn, computeDamage, wait } = ctx;
  const u = queue.current;
  await wait(550); // laisser le joueur lire la file

  let target = pickTarget(u, game.targets, computeDamage);
  if (!target) {
    const dest = chooseDest(u, game.reach, units);
    if (dest) {
      await doMove(dest); // met à jour game.targets
      target = pickTarget(u, game.targets, computeDamage);
    }
  }
  if (target) {
    maybeArmSkill(u, target, computeDamage);
    await wait(250);
    await doAttack(target); // termine le tour (ou affiche la victoire)
    return;
  }
  await wait(300);
  endTurn();
}
