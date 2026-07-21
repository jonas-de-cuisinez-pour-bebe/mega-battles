import { TEAMS } from './data.js';

const CSS = `
#hud * { box-sizing: border-box; }
.mb-banner {
  position: fixed; top: 14px; left: 50%; transform: translateX(-50%);
  padding: 9px 24px; border-radius: 999px; color: #fff;
  font: 600 15px system-ui;
  background: url('/assets/ui/carbon.png') center/220px, rgba(10,11,14,0.85);
  border: 2px solid #565d68; pointer-events: none;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.55);
}
.mb-banner b { text-transform: uppercase; letter-spacing: 0.5px; }

/* Molette d'action, fidèle au Widget 0.1 de 2013 : gros cadran central
   (✕ rouge de fin de tour intégré en bas) + satellites asymétriques */
.mb-wheel {
  position: fixed; left: 24px; bottom: 130px; width: 224px; height: 170px;
  pointer-events: none;
}
.mb-wheel .hubc {
  position: absolute; left: 50%; top: 48%; transform: translate(-50%,-50%);
  width: 92px; height: 92px; border-radius: 50%;
  background: url('/assets/ui/carbon.png') center/150px, radial-gradient(circle at 35% 30%, #3c414b, #1d2026);
  border: 4px solid #6a707c; color: #fff;
  font: 800 15px system-ui; letter-spacing: 0.5px;
  box-shadow: inset 0 2px 5px rgba(255,255,255,0.14), 0 6px 14px rgba(0,0,0,0.55);
  overflow: hidden;
}
.mb-wheel .mb-cls {
  position: absolute; left: 0; right: 0; top: 16px; text-align: center;
  text-shadow: 0 1px 3px #000;
}
.mb-btn-end {
  position: absolute; bottom: 0; left: 0; right: 0; height: 36%;
  background: radial-gradient(circle at 50% -30%, #e0604f, #a32c22 75%);
  border-top: 2px solid rgba(0,0,0,0.5);
  color: #fff; font: 800 12px system-ui; letter-spacing: -1px;
  display: flex; align-items: center; justify-content: center;
  padding-bottom: 6px;
  cursor: pointer; pointer-events: auto;
  box-shadow: inset 0 -4px 8px rgba(0,0,0,0.4), inset 0 2px 3px rgba(255,255,255,0.22);
}
.mb-btn-end:hover { filter: brightness(1.18); }
.mb-end-label {
  position: absolute; left: 50%; top: 134px; transform: translateX(-50%);
  font: 800 10px system-ui; color: #fff; letter-spacing: 0.5px;
  text-shadow: 0 1px 3px #000, 0 0 6px rgba(0,0,0,0.7); white-space: nowrap;
  pointer-events: none;
}
.mb-btn {
  position: absolute; width: 66px; height: 66px;
  background: center / contain no-repeat;
  cursor: pointer; pointer-events: auto; user-select: none;
  filter: drop-shadow(0 3px 7px rgba(0,0,0,0.55));
  transition: transform 0.1s;
}
.mb-btn:hover { transform: scale(1.1); }
.mb-btn span {
  position: absolute; left: 50%; bottom: -15px; transform: translateX(-50%);
  font: 800 10px system-ui; color: #fff; letter-spacing: 0.5px;
  text-shadow: 0 1px 3px #000, 0 0 6px rgba(0,0,0,0.7); white-space: nowrap;
}
.mb-btn.disabled { filter: grayscale(1) opacity(0.35); pointer-events: none; }
.mb-btn.selected { transform: scale(1.14); filter: drop-shadow(0 0 12px rgba(255,255,255,0.85)); }
/* satellites accrochés au cadran, placement asymétrique façon maquette */
.mb-btn-attack { width: 58px; height: 58px; left: 8px; top: 56px; background-image: url('/assets/ui/act_attack.png'); }
.mb-btn-move   { width: 58px; height: 58px; right: 8px; top: 48px; background-image: url('/assets/ui/act_move.png'); }
.mb-btn-skill  { width: 50px; height: 50px; left: 28px; top: -8px; background-image: url('/assets/ui/act_skill.png'); }
.mb-btn-skill span { left: auto; right: 54px; bottom: 8px; transform: none; }
.mb-cd {
  position: absolute; top: -5px; right: -5px; width: 24px; height: 24px;
  border-radius: 50%; background: #1d2026; border: 2px solid #6a707c;
  color: #ffd34a; font: 800 13px system-ui; font-style: normal;
  display: none; align-items: center; justify-content: center;
  box-shadow: 0 2px 5px rgba(0,0,0,0.6);
}

/* Panneau d'infos unité */
.mb-info {
  position: fixed; left: 252px; bottom: 80px; min-width: 250px;
  background: url('/assets/ui/carbon.png') center/260px, rgba(13,15,19,0.92);
  border: 2px solid #4a5058; outline: 1px solid rgba(0,0,0,0.7);
  border-radius: 14px; padding: 12px 16px; color: #fff;
  font: 500 13px system-ui; pointer-events: none;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 6px 16px rgba(0,0,0,0.55);
}
.mb-info h3 { margin: 0 0 6px; font-size: 16px; }
.mb-info .hpbar { height: 10px; border-radius: 5px; background: #333; overflow: hidden; margin: 4px 0 8px; }
.mb-info .hpbar div { height: 100%; background: #3fbf4a; }
.mb-info .stats { opacity: 0.85; }
.mb-info .skill { margin-top: 6px; font-size: 12px; opacity: 0.75; font-style: italic; }

/* File d'initiative */
.mb-queue {
  position: fixed; bottom: 0; left: 0; right: 0; height: 64px;
  background: url('/assets/ui/carbon.png') center/240px, rgba(9,10,13,0.94);
  border-top: 2px solid #454b54;
  box-shadow: 0 -5px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08);
  display: flex; align-items: center;
  justify-content: center; gap: 10px; pointer-events: none;
}
.mb-chip {
  width: 42px; height: 42px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; color: #fff;
  font: 800 11px system-ui; border: 2px solid rgba(0,0,0,0.55);
  flex: 0 0 auto; pointer-events: auto; cursor: pointer;
  transition: transform 0.12s;
  box-shadow: inset 0 7px 8px -4px rgba(255,255,255,0.55),
              inset 0 -7px 8px -4px rgba(0,0,0,0.45), 0 2px 5px rgba(0,0,0,0.5);
  text-shadow: 0 1px 2px rgba(0,0,0,0.6);
}
.mb-chip:hover { transform: scale(1.18); border-color: #fff; }
.mb-chip.active { outline: 3px dashed #fff; outline-offset: 2px; width: 48px; height: 48px; }

/* Dégâts flottants */
.mb-dmg {
  position: fixed; transform: translate(-50%, -50%); pointer-events: none;
  font: 900 32px system-ui; color: #ff6a52;
  -webkit-text-stroke: 1.5px #47100a;
  text-shadow: 0 3px 6px rgba(0,0,0,0.85);
  animation: mb-rise 1.1s ease-out forwards;
}
@keyframes mb-rise {
  0% { opacity: 0; margin-top: 0; } 15% { opacity: 1; }
  100% { opacity: 0; margin-top: -70px; }
}

/* Tooltip inspection */
.mb-tip {
  position: fixed; color: #fff;
  background: url('/assets/ui/carbon.png') center/200px, rgba(13,15,19,0.94);
  border: 2px solid #4a5058; border-radius: 10px;
  padding: 8px 12px; font: 500 12px system-ui; pointer-events: none; z-index: 20;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 10px rgba(0,0,0,0.55);
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
.mb-screen.mb-home {
  background:
    linear-gradient(rgba(8,9,12,0.2), rgba(8,9,12,0.45) 65%, rgba(8,9,12,0.8)),
    url('/assets/ui/keyart.png') center / cover no-repeat, #0a0b0e;
  gap: 14px;
}
.mb-logo { width: min(80vw, 580px); filter: drop-shadow(0 8px 20px rgba(0,0,0,0.85)); }
.mb-tagline {
  color: #fff; font: 600 italic 20px system-ui; margin: 0;
  text-shadow: 0 2px 8px rgba(0,0,0,0.95); letter-spacing: 0.5px;
}
.mb-btn-col { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-top: 12px; }
.mb-btn-img {
  width: 330px; height: 112px; display: flex; align-items: center; justify-content: center;
  background: center / 100% 100% no-repeat;
  padding: 0 40px; box-sizing: border-box;
  color: #fff; font: 800 20px system-ui; letter-spacing: 1px; text-align: center;
  text-shadow: 0 2px 5px rgba(0,0,0,0.75), 0 0 12px rgba(0,0,0,0.5);
  cursor: pointer; transition: transform 0.12s;
}
.mb-btn-img:hover { transform: scale(1.07); }
.mb-btn-img small {
  display: block; font: 700 13px system-ui; letter-spacing: 0.5px;
  opacity: 0.92; margin-top: 1px; text-transform: none;
}
.mb-btn-orange { background-image: url('/assets/ui/btn_orange.png'); }
.mb-btn-green { background-image: url('/assets/ui/btn_green.png'); }

/* Lien crédits + écran crédits */
.mb-credits-link {
  margin-top: 10px; color: #fff; font: 700 14px system-ui; letter-spacing: 1px;
  opacity: 0.8; cursor: pointer; text-shadow: 0 2px 6px rgba(0,0,0,0.9);
  background: none; border: none; text-transform: uppercase;
}
.mb-credits-link:hover { opacity: 1; text-decoration: underline; }
.mb-credits {
  text-align: center; color: #fff; max-width: 460px; padding: 20px;
  text-shadow: 0 2px 6px rgba(0,0,0,0.9);
}
.mb-credits h2 { font: 800 30px system-ui; letter-spacing: 2px; margin: 0 0 4px; }
.mb-credits .copy { opacity: 0.75; font: 600 14px system-ui; margin-bottom: 22px; }
.mb-credits .role { opacity: 0.6; font: 700 12px system-ui; letter-spacing: 2px;
  text-transform: uppercase; margin: 20px 0 8px; }
.mb-credits .names { font: 700 19px system-ui; line-height: 1.7; }
.mb-credits .lic { opacity: 0.7; font: 500 13px system-ui; margin-top: 24px; line-height: 1.6; }
.mb-credits a { color: #6fbf5f; font-weight: 700; text-decoration: none; }
.mb-credits a:hover { text-decoration: underline; }

/* Attente d'adversaire */
.mb-spinner {
  width: 46px; height: 46px; border-radius: 50%;
  border: 5px solid rgba(255,255,255,0.25); border-top-color: #fff;
  animation: mb-spin 0.9s linear infinite;
}
@keyframes mb-spin { to { transform: rotate(360deg); } }
.mb-invite { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.mb-invite-row { display: flex; gap: 8px; }
.mb-invite-link {
  width: 300px; padding: 10px 12px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.3);
  background: rgba(0,0,0,0.55); color: #fff; font: 600 13px monospace;
}
.mb-copy {
  padding: 10px 18px; border-radius: 8px; border: none; background: #58a34c;
  color: #fff; font: 700 14px system-ui; cursor: pointer;
}

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
.mb-victory .mb-btn-img { width: 280px; height: 92px; font-size: 19px; }
`;

export function initUI(handlers) {
  const hud = document.getElementById('hud');
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const banner = el('div', 'mb-banner');
  const wheel = el('div', 'mb-wheel');
  wheel.innerHTML = `
    <div class="mb-btn mb-btn-skill"><span>SKILL</span><i class="mb-cd"></i></div>
    <div class="mb-btn mb-btn-attack"><span>ATTAQUER</span></div>
    <div class="mb-btn mb-btn-move"><span>DÉPLACER</span></div>
    <div class="hubc">
      <span class="mb-cls"></span>
      <div class="mb-btn-end" title="Fin de tour">▶▶</div>
    </div>
    <span class="mb-end-label">FIN DE TOUR</span>`;
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
    setBanner(unit, isAi, online) {
      const t = TEAMS[unit.team];
      if (online) {
        banner.innerHTML = online === 'me'
          ? `<b style="color:${t.css}">À toi</b> — ${unit.cls.name}`
          : `<b style="color:${t.css}">Adversaire</b> — ${unit.cls.name}`;
      } else {
        banner.innerHTML = `Tour de <b style="color:${t.css}">${t.label}</b> — ${unit.cls.name}${isAi ? ' (IA)' : ''}`;
      }
    },

    updateWheel(unit, { mode, canMove, canAttack, locked }) {
      hub.querySelector('.mb-cls').textContent = unit.cls.abbr;
      hub.style.borderColor = TEAMS[unit.team].css;
      toggle(btnMove, canMove && !locked, mode === 'move');
      toggle(btnAttack, canAttack && !locked, mode === 'attack');
      const skillUsable = !locked && !unit.cls.passive && unit.cooldown === 0;
      toggle(btnSkill, skillUsable, unit.armed);
      const cd = btnSkill.querySelector('.mb-cd');
      cd.style.display = unit.cooldown > 0 ? 'flex' : 'none';
      cd.textContent = unit.cooldown || '';
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
        chip.addEventListener('mouseenter', (e) => handlers.onChipHover?.(u, e));
        chip.addEventListener('mouseleave', () => handlers.onChipHover?.(null));
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

    // Accueil → « Partie rapide » (choix d'armée puis onAi) ou « Jouer en ligne » (onOnline)
    showSetup({ onAi, onOnline }) {
      const screen = el('div', 'mb-screen');
      hud.appendChild(screen);

      const home = () => {
        screen.classList.add('mb-home');
        screen.innerHTML = `
          <img class="mb-logo" src="/assets/ui/logo.png" alt="MEGA BATTLES">
          <h2 class="mb-tagline">Des duels simples et rapides</h2>`;
        const col = el('div', 'mb-btn-col');
        col.append(
          imgBtn('JOUER EN LIGNE', 'duel en direct', 'green', () => { screen.remove(); onOnline(); }),
          imgBtn('PARTIE RAPIDE', 'contre l’IA', 'orange', () => pickArmy()),
        );
        screen.appendChild(col);
        const creditsBtn = el('button', 'mb-credits-link');
        creditsBtn.textContent = 'Crédits';
        creditsBtn.onclick = credits;
        screen.appendChild(creditsBtn);
      };

      const credits = () => {
        screen.classList.add('mb-home');
        screen.innerHTML = `
          <div class="mb-credits">
            <h2>MEGA BATTLES</h2>
            <div class="copy">© 2013 — un jeu imaginé avec passion</div>
            <div class="role">Game design & concept art</div>
            <div class="names">
              Alexandre Cesarini<br>
              Alexandre Dury<br>
              Aurélien Lepage<br>
              Jonas Maumené
            </div>
            <div class="lic">
              Projet open source sous licence MIT.<br>
              <a href="https://github.com/jonas-de-cuisinez-pour-bebe/mega-battles"
                 target="_blank" rel="noopener">github.com/…/mega-battles ↗</a>
            </div>
          </div>`;
        const back = el('button', 'mb-credits-link');
        back.textContent = '← Retour';
        back.onclick = home;
        screen.appendChild(back);
      };

      const imgBtn = (label, sub, color, onClick) => {
        const b = el('div', `mb-btn-img mb-btn-${color}`);
        b.innerHTML = `<div>${label}<small>${sub}</small></div>`;
        b.onclick = onClick;
        return b;
      };

      const pickArmy = () => {
        screen.innerHTML = '<h2>Choisis ton armée</h2>';
        const row = el('div', 'row');
        for (const t of Object.values(TEAMS)) {
          const c = el('div', 'mb-choice');
          c.innerHTML = `${t.label}<small>${t.id === 'humans' ? 'les survivants' : 'la horde'}</small>`;
          c.onclick = () => { screen.remove(); onAi(t.id); };
          c.style.borderColor = t.css;
          const flip = t.id === 'zombies' ? 'transform:scaleX(-1);' : '';
          c.insertAdjacentHTML('afterbegin',
            `<img src="/assets/units/${t.id}_tanker.png" alt=""
                  style="width:160px;height:160px;object-fit:contain;display:block;margin:0 auto 8px;${flip}">`);
          row.appendChild(c);
        }
        screen.appendChild(row);
      };

      home();
    },

    // Écran d'attente d'adversaire, avec lien d'invitation
    showWaiting() {
      const screen = el('div', 'mb-screen mb-home');
      screen.innerHTML = `
        <img class="mb-logo" src="/assets/ui/logo.png" alt="MEGA BATTLES">
        <h2 class="mb-tagline">En attente d'un adversaire…</h2>
        <div class="mb-spinner"></div>
        <div class="mb-invite" style="display:none">
          <div style="color:#fff;font:600 14px system-ui;opacity:0.9">Invite un ami avec ce lien — la partie démarre dès qu'il l'ouvre :</div>
          <div class="mb-invite-row">
            <input readonly class="mb-invite-link">
            <button class="mb-copy">Copier</button>
          </div>
        </div>`;
      hud.appendChild(screen);
      const linkInput = screen.querySelector('.mb-invite-link');
      const copyBtn = screen.querySelector('.mb-copy');
      copyBtn.onclick = () => {
        linkInput.select();
        navigator.clipboard?.writeText(linkInput.value);
        copyBtn.textContent = 'Copié !';
        setTimeout(() => { copyBtn.textContent = 'Copier'; }, 1500);
      };
      return {
        setLink(url) {
          screen.querySelector('.mb-invite').style.display = 'flex';
          linkInput.value = url;
        },
        close() { screen.remove(); },
      };
    },

    showOpponentLeft(msg) {
      const v = el('div', 'mb-victory');
      v.innerHTML = `<h1 style="color:#fff;font-size:34px">${msg || 'L’adversaire a fui le champ de bataille !'}</h1>`;
      const btn = el('div', 'mb-btn-img mb-btn-orange');
      btn.innerHTML = '<div>RETOUR À L’ACCUEIL</div>';
      btn.onclick = () => { location.href = location.pathname; };
      v.appendChild(btn);
      hud.appendChild(v);
    },

    showVs(onDone, myTeam) {
      const screen = el('div', 'mb-screen');
      screen.innerHTML = `
        ${myTeam ? `<h2>Tu joues <b style="color:${TEAMS[myTeam].css}">${TEAMS[myTeam].label}</b></h2>` : ''}
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
      const btn = el('div', 'mb-btn-img mb-btn-green');
      btn.innerHTML = '<div>REJOUER</div>';
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
