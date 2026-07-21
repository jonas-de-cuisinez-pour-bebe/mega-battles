# Mega Battles

Tactical-RPG de duel en 3D (Three.js) — reboot 2026 du game design de 2013.
Devise : « des duels simples et rapides ». Humans vs Zombies, post-apo cartoon.

## Lancer

```bash
npm install
npm run dev
```

## Feuille de route V0

- [x] Phase 0 — scaffold Vite + Three.js
- [x] Phase 1 — cœur jouable (plateau 12x10, 2x6 unités, file d'initiative, move/attack, skills, hotseat)
- [x] Phase 2 — IA basique + écrans de setup (armée, VS)
- [x] Phase 3 — artwork gpt-image-1 pour l'UI (portraits, setup, VS, victoire) + personnages
  en modèles 3D procéduraux chibi sur le plateau (src/models.js)
  (18 variantes générées pour 3,01 $, planche contact : /planche.html ; script : assets-raw/gen_assets.py)
- [x] Phase 4 — polish (idle, impacts/particules, survol de la file) + équilibrage rapide (HP -25 %)

Design source : doc « Mega Battles » + mock-ups juillet 2013 (Design/).

## Jouer en ligne

**https://mega-battles.cleverapps.io/** — multijoueur en direct par WebSocket :
« Jouer en ligne » matche automatiquement deux joueurs (ou partage ton lien
d'invitation `?room=XXXX` : la partie démarre dès que l'ami l'ouvre).

Architecture : le jeu est déterministe, le serveur (server/index.js) ne fait
qu'apparier les joueurs et relayer les actions dans l'ordre — chaque client
rejoue la même simulation.

Redéploiement : `clever deploy` (app Node sur Clever Cloud, le build tourne
dans `prestart`). L'ancien miroir statique Cellar (`./deploy.sh`) est obsolète
depuis le passage au multijoueur.

## Dev local

```bash
npm install
PORT=8091 node server/index.js   # serveur de jeu (rooms + relais WS)
npm run dev                      # vite (proxy /ws → 8091)
```
