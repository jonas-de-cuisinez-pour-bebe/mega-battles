<div align="center">

# ⚔️ Mega Battles

**Un tactical-RPG de duel en 3D — « des duels simples et rapides ».**
Humans vs Zombies, dans un univers post-apo cartoon façon figurines.

### 🎮 [Jouer maintenant → mega-battles.cleverapps.io](https://mega-battles.cleverapps.io/)

*Reboot 2026 d'un game design imaginé en 2013.*

</div>

---

## ✨ Le jeu

Deux escouades de 6 unités s'affrontent au tour par tour sur une grille.
Trois classes, chacune avec sa tactique :

| Classe | Rôle | Skill unique |
|--------|------|--------------|
| 🛡️ **Tanker** | Encaisse, protège | *Aura de garde* — réduit les dégâts des alliés adjacents |
| 🗡️ **DPS** | Frappe fort au contact | *Frappe double* — inflige STR ×2 |
| 🏹 **Archer** | Attaque à distance | *Tir visé* — ignore la défense et les auras |

- **Partie rapide** — affronte l'IA.
- **Jouer en ligne** — duel en direct : le matchmaking apparie deux joueurs
  automatiquement, ou partage ton lien d'invitation `?room=XXXX` et la partie
  démarre dès que ton adversaire l'ouvre.

## 🚀 Lancer le projet

**Prérequis :** Node.js ≥ 20.

```bash
git clone https://github.com/jonas-de-cuisinez-pour-bebe/mega-battles.git
cd mega-battles
npm install
```

### Développement

Deux processus à lancer côte à côte :

```bash
# 1. le serveur de jeu (rooms + relais WebSocket)
PORT=8091 node server/index.js

# 2. le client Vite (proxifie /ws → 8091, hot-reload)
npm run dev
```

Puis ouvre **http://localhost:5173**.

> Pour tester le multijoueur en local, ouvre deux onglets : l'un lance
> « Jouer en ligne », l'autre ouvre le lien `?room=XXXX` affiché.

### Production

```bash
npm run build   # génère dist/
npm start       # sert dist/ + le WebSocket sur le même port (PORT, défaut 8080)
```

Déployé sur [Clever Cloud](https://www.clever-cloud.com/) (app Node.js, le build
tourne dans le hook `prestart`) via `clever deploy`.

## 🧠 Architecture

Le jeu est **entièrement déterministe** (aucun hasard dans les règles) — le
serveur ne simule donc rien : il apparie les joueurs et **relaie les actions
dans l'ordre**, chaque client rejouant la même simulation. Résultat : un serveur
minuscule et une synchro parfaite.

```
src/
  main.js      orchestration : tours, bus d'actions, rendu, entrées
  board.js     plateau, terrain, pathfinding, décor procédural
  units.js     unités, file d'initiative, barres de vie
  models.js    modèles 3D chibi procéduraux (6 personnages)
  ai.js        IA de la partie rapide
  net.js       client WebSocket
  ui.js        HUD (molette d'action, panneaux, écrans)
  data.js      stats & configuration
server/
  index.js     serveur Express + WebSocket (rooms, matchmaking, relais)
```

Les artworks de l'UI (portraits, écran-titre, boutons) sont générés via
`gpt-image-1` ; les scripts de génération sont dans `assets-raw/`.

## 🎨 Crédits

Game design & concept art originels **© 2013** :

- **Alexandre Cesarini**
- **Alexandre Dury**
- **Aurélien Lepage**
- **Jonas Maumené**

## 📄 Licence

[MIT](LICENSE) — libre d'utilisation, de modification et de distribution.
