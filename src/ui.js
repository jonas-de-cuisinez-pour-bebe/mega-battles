import { TEAMS } from './data.js';

const CSS = `
#hud * { box-sizing: border-box; }
.mb-banner {
  position: fixed; top: 14px; left: 50%; transform: translateX(-50%);
  padding: 8px 22px; border-radius: 999px; color: #fff;
  font: 600 15px system-ui; background: rgba(0,0,0,0.6);
  border: 2px solid rgba(255,255,255,0.25); pointer-events: none;
}
.mb-banner b { text-transform: uppercase; letter-spacing: 0.5px; }

/* Molette d'action */
.mb-wheel {
  position: fixed; left: 30px; bottom: 140px; width: 150px; height: 150px;
  pointer-events: none;
}
.mb-wheel .hubc {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%);
  width: 74px; height: 74px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #4a4f5a, #23262d);
  border: 4px solid #6a707c; color: #fff; display: flex;
  align-items: center; justify-content: center; flex-direction: column;
  font: 700 13px system-ui;
}
.mb-btn {
  position: absolute; width: 52px; height: 52px; border-radius: 12px;
  transform: rotate(45deg); display: flex; align-items: center; justify-content: center;
  cursor: pointer; pointer-events: auto; border: 2px solid rgba(0,0,0,0.35);
  box-shadow: 0 3px 8px rgba(0,0,0,0.45); user-select: none;
}
.mb-btn span { transform: rotate(-45deg); font: 700 10px system-ui; color: #fff; text-align: center; }
.mb-btn.disabled { opacity: 0.3; pointer-events: none; }
.mb-btn.selected { outline: 3px solid #fff; }
.mb-btn-move   { left: -6px; top: 8px; background: #58a34c; }
.mb-btn-attack { right: -6px; top: 8px; background: #c2453d; }
.mb-btn-skill  { left: -6px; bottom: -14px; background: #d8952e; }
.mb-btn-end {
  position: absolute; left: 50%; bottom: -46px; transform: translateX(-50%);
  padding: 7px 16px; border-radius: 8px; background: #e0862e; color: #fff;
  font: 700 12px system-ui; cursor: pointer; pointer-events: auto;
  border: 2px solid rgba(0,0,0,0.35); box-shadow: 0 3px 8px rgba(0,0,0,0.45);
  white-space: nowrap;
}

/* Panneau d'infos unité */
.mb-info {
  position: fixed; left: 210px; bottom: 80px; min-width: 240px;
  background: rgba(15,17,22,0.85); border: 2px solid rgba(255,255,255,0.15);
  border-radius: 12px; padding: 12px 16px; color: #fff;
  font: 500 13px system-ui; pointer-events: none;
}
.mb-info h3 { margin: 0 0 6px; font-size: 16px; }
.mb-info .hpbar { height: 10px; border-radius: 5px; background: #333; overflow: hidden; margin: 4px 0 8px; }
.mb-info .hpbar div { height: 100%; background: #3fbf4a; }
.mb-info .stats { opacity: 0.85; }
.mb-info .skill { margin-top: 6px; font-size: 12px; opacity: 0.75; font-style: italic; }

/* File d'initiative */
.mb-queue {
  position: fixed; bottom: 0; left: 0; right: 0; height: 64px;
  background: rgba(10,11,14,0.88); display: flex; align-items: center;
  justify-content: center; gap: 10px; pointer-events: none;
}
.mb-chip {
  width: 42px; height: 42px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; color: #fff;
  font: 700 11px system-ui; border: 2px solid rgba(0,0,0,0.4);
  flex: 0 0 auto;
}
.mb-chip.active { outline: 3px dashed #fff; outline-offset: 2px; width: 48px; height: 48px; }

/* Dégâts flottants */
.mb-dmg {
  position: fixed; transform: translate(-50%, -50%); pointer-events: none;
  font: 800 26px system-ui; color: #ff5a4e; text-shadow: 0 2px 4px rgba(0,0,0,0.8);
  animation: mb-rise 1.1s ease-out forwards;
}
@keyframes mb-rise {
  0% { opacity: 0; margin-top: 0; } 15% { opacity: 1; }
  100% { opacity: 0; margin-top: -70px; }
}

/* Tooltip inspection */
.mb-tip {
  position: fixed; background: rgba(15,17,22,0.92); color: #fff;
  border: 1px solid rgba(255,255,255,0.25); border-radius: 8px;
  padding: 8px 12px; font: 500 12px system-ui; pointer-events: none; z-index: 20;
}

/* Écrans de setup */
.mb-screen {
  position: fixed; inset: 0; background: rgba(10,11,14,0.92); display: flex;
  flex-direction: column; align-items: center; justify-content: center;
  gap: 28px; pointer-events: auto; z-index: 40;
}
.mb-screen h1 { color: #fff; font: 800 52px system-ui; margin: 0; letter-spacing: 2px; }
.mb-screen h2 { color: #fff; font: 600 26px system-ui; margin: 0; }
.mb-screen .row { display: flex; gap: 24px; }
.mb-choice {
  padding: 20px 40px; font: 700 20px system-ui; color: #fff; background: #2c313b;
  border: 3px solid rgba(255,255,255,0.2); border-radius: 14px; cursor: pointer;
  min-width: 200px; text-align: center; transition: transform 0.1s;
}
.mb-choice:hover { transform: scale(1.05); border-color: #fff; }
.mb-choice small { display: block; font: 500 13px system-ui; opacity: 0.7; margin-top: 6px; }
.mb-vs { display: flex; align-items: center; gap: 36px; }
.mb-vs .camp { font: 800 44px system-ui; }
.mb-vs .vs { color: #fff; font: 800 30px system-ui; opacity: 0.7; }

/* Victoire */
.mb-victory {
  position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex;
  flex-direction: column; align-items: center; justify-content: center;
  gap: 24px; pointer-events: auto; z-index: 50;
}
.mb-victory h1 { color: #fff; font: 800 48px system-ui; margin: 0; }
.mb-victory button {
  padding: 14px 42px; font: 700 18px system-ui; color: #fff; background: #58a34c;
  border: none; border-radius: 12px; cursor: pointer;
}
`;

export function initUI(handlers) {
  const hud = document.getElementById('hud');
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const banner = el('div', 'mb-banner');
  const wheel = el('div', 'mb-wheel');
  wheel.innerHTML = `
    <div class="mb-btn mb-btn-move"><span>MOVE</span></div>
    <div class="mb-btn mb-btn-attack"><span>ATTACK</span></div>
    <div class="mb-btn mb-btn-skill"><span>SKILL</span></div>
    <div class="hubc"></div>
    <div class="mb-btn-end">END TURN</div>`;
  const info = el('div', 'mb-info');
  const queue = el('div', 'mb-queue');
  const tip = el('div', 'mb-tip');
  tip.style.display = 'none';
  hud.append(banner, wheel, info, queue, tip);

  const btnMove = wheel.querySelector('.mb-btn-move');
  const btnAttack = wheel.querySelector('.mb-btn-attack');
  const btnSkill = wheel.querySelector('.mb-btn-skill');
  const btnEnd = wheel.querySelector('.mb-btn-end');
  const hub = wheel.querySelector('.hubc');

  btnMove.onclick = () => handlers.onMode('move');
  btnAttack.onclick = () => handlers.onMode('attack');
  btnSkill.onclick = () => handlers.onSkill();
  btnEnd.onclick = () => handlers.onEnd();

  return {
    setBanner(unit, isAi) {
      const t = TEAMS[unit.team];
      banner.innerHTML = `Tour de <b style="color:${t.css}">${t.label}</b> — ${unit.cls.name}${isAi ? ' (IA)' : ''}`;
    },

    updateWheel(unit, { mode, canMove, canAttack, locked }) {
      hub.textContent = unit.cls.abbr;
      hub.style.borderColor = TEAMS[unit.team].css;
      toggle(btnMove, canMove && !locked, mode === 'move');
      toggle(btnAttack, canAttack && !locked, mode === 'attack');
      const skillUsable = !locked && !unit.cls.passive && unit.cooldown === 0;
      toggle(btnSkill, skillUsable, unit.armed);
      btnSkill.querySelector('span').textContent =
        unit.cooldown > 0 ? `SKILL (${unit.cooldown})` : 'SKILL';
      btnSkill.title = `${unit.cls.skillName} — ${unit.cls.skillDesc}`;
    },

    showInfo(unit) {
      if (!unit) { info.style.display = 'none'; return; }
      info.style.display = 'block';
      const t = TEAMS[unit.team];
      const c = unit.cls;
      const flip = unit.team === 'zombies' ? 'transform:scaleX(-1);' : '';
      info.innerHTML = `
        <div style="display:flex;gap:14px;align-items:center">
          <img src="/assets/units/${unit.team}_${c.key}.png" alt=""
               style="width:84px;height:84px;object-fit:contain;flex:0 0 auto;${flip}">
          <div style="min-width:0">
            <h3 style="color:${t.css}">${t.label} · ${c.name}</h3>
            <div>${unit.hp}/${unit.maxHp} HP</div>
            <div class="hpbar"><div style="width:${(unit.hp / unit.maxHp) * 100}%"></div></div>
            <div class="stats">STR ${c.str} · DEF ${c.def} · MOV ${c.mov} · Portée ${c.rangeMin}${c.rangeMax > c.rangeMin ? '-' + c.rangeMax : ''}</div>
            <div class="skill">${c.skillName}${unit.cooldown > 0 ? ` (recharge : ${unit.cooldown} tour${unit.cooldown > 1 ? 's' : ''})` : ''} : ${c.skillDesc}</div>
          </div>
        </div>`;
    },

    renderQueue(units, active) {
      queue.innerHTML = '';
      for (const u of units) {
        const chip = el('div', 'mb-chip' + (u === active ? ' active' : ''));
        chip.style.background = TEAMS[u.team].css;
        chip.textContent = u.cls.abbr;
        queue.appendChild(chip);
      }
    },

    floatDamage(x, y, text) {
      const d = el('div', 'mb-dmg');
      d.textContent = text;
      d.style.left = x + 'px';
      d.style.top = y + 'px';
      hud.appendChild(d);
      setTimeout(() => d.remove(), 1200);
    },

    tooltip(html, x, y) {
      if (!html) { tip.style.display = 'none'; return; }
      tip.innerHTML = html;
      tip.style.display = 'block';
      tip.style.left = (x + 16) + 'px';
      tip.style.top = (y + 12) + 'px';
    },

    // Accueil → (choix d'armée si vs IA) → onDone({mode, playerTeam})
    showSetup(onDone) {
      const screen = el('div', 'mb-screen');
      hud.appendChild(screen);

      const home = () => {
        screen.innerHTML = '<h1>MEGA BATTLES</h1><h2>Des duels simples et rapides</h2>';
        const row = el('div', 'row');
        row.append(
          choice('Partie rapide', 'contre l’IA', () => pickArmy()),
          choice('2 joueurs', 'sur le même écran', () => finish('hotseat', 'humans')),
        );
        screen.appendChild(row);
      };

      const pickArmy = () => {
        screen.innerHTML = '<h2>Choisis ton armée</h2>';
        const row = el('div', 'row');
        for (const t of Object.values(TEAMS)) {
          const c = choice(t.label, t.id === 'humans' ? 'les survivants' : 'la horde', () => finish('ai', t.id));
          c.style.borderColor = t.css;
          const flip = t.id === 'zombies' ? 'transform:scaleX(-1);' : '';
          c.insertAdjacentHTML('afterbegin',
            `<img src="/assets/units/${t.id}_tanker.png" alt=""
                  style="width:160px;height:160px;object-fit:contain;display:block;margin:0 auto 8px;${flip}">`);
          row.appendChild(c);
        }
        screen.appendChild(row);
      };

      const finish = (mode, playerTeam) => {
        screen.remove();
        onDone({ mode, playerTeam });
      };

      const choice = (label, sub, onClick) => {
        const c = el('div', 'mb-choice');
        c.innerHTML = `${label}<small>${sub}</small>`;
        c.onclick = onClick;
        return c;
      };

      home();
    },

    showVs(onDone) {
      const screen = el('div', 'mb-screen');
      screen.innerHTML = `
        <div class="mb-vs">
          <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
            <img src="/assets/units/humans_dps.png" alt="" style="width:230px;height:230px;object-fit:contain">
            <span class="camp" style="color:${TEAMS.humans.css}">HUMANS</span>
          </div>
          <span class="vs">VS</span>
          <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
            <img src="/assets/units/zombies_dps.png" alt="" style="width:230px;height:230px;object-fit:contain;transform:scaleX(-1)">
            <span class="camp" style="color:${TEAMS.zombies.css}">ZOMBIES</span>
          </div>
        </div>`;
      hud.appendChild(screen);
      setTimeout(() => { screen.remove(); onDone(); }, 2200);
    },

    showVictory(teamId) {
      const t = TEAMS[teamId];
      const v = el('div', 'mb-victory');
      v.innerHTML = `
        <img src="/assets/units/${teamId}_dps.png" alt=""
             style="width:260px;height:260px;object-fit:contain${teamId === 'zombies' ? ';transform:scaleX(-1)' : ''}">
        <h1 style="color:${t.css}">${t.label} l'emportent !</h1>`;
      const btn = document.createElement('button');
      btn.textContent = 'Rejouer';
      btn.onclick = () => location.reload();
      v.appendChild(btn);
      hud.appendChild(v);
    },
  };
}

function el(tag, cls) {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}

function toggle(btn, enabled, selected) {
  btn.classList.toggle('disabled', !enabled);
  btn.classList.toggle('selected', !!selected);
}
