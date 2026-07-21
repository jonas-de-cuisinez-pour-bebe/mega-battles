// Serveur Mega Battles : sert le build statique + relais WebSocket des parties.
// Le jeu est déterministe : le serveur ne simule rien, il ordonne et relaie
// les actions aux deux joueurs (l'écho fait foi des deux côtés).
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.static(path.join(__dirname, '../dist')));
app.get('/health', (_req, res) => res.send('ok'));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const rooms = new Map(); // code -> { code, players: [ws], started }
let publicRoom = null;   // code de la room publique en attente d'un adversaire

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function genCode() {
  let s = '';
  for (let i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return rooms.has(s) ? genCode() : s;
}

function join(ws, wanted) {
  const code = wanted ? String(wanted).toUpperCase().slice(0, 8) : null;
  const target = code ? rooms.get(code) : (publicRoom ? rooms.get(publicRoom) : null);

  if (target && !target.started && target.players.length === 1) {
    target.players.push(ws);
    ws.room = target.code;
    if (publicRoom === target.code) publicRoom = null;
    return start(target);
  }

  // Personne à rejoindre : on crée une room en attente
  const newCode = code && !rooms.has(code) ? code : genCode();
  const room = { code: newCode, players: [ws], started: false };
  rooms.set(newCode, room);
  ws.room = newCode;
  if (!code) publicRoom = newCode; // publique : le prochain venu tombera dessus
  ws.send(JSON.stringify({ type: 'waiting', room: newCode }));
}

function start(room) {
  room.started = true;
  const flip = Math.random() < 0.5;
  const teams = flip ? ['humans', 'zombies'] : ['zombies', 'humans'];
  room.players.forEach((p, i) =>
    p.send(JSON.stringify({ type: 'start', team: teams[i], room: room.code }))
  );
  console.log(`room ${room.code} : partie lancée`);
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (buf) => {
    let m;
    try { m = JSON.parse(buf); } catch { return; }
    if (m.type === 'join' && !ws.room) return join(ws, m.room);
    if (m.type === 'action' && ws.room) {
      const r = rooms.get(ws.room);
      if (!r || !r.started) return;
      const payload = JSON.stringify({ type: 'action', action: m.action });
      for (const p of r.players) if (p.readyState === 1) p.send(payload);
    }
  });

  ws.on('close', () => {
    const code = ws.room;
    if (!code) return;
    const r = rooms.get(code);
    if (!r) return;
    for (const p of r.players) {
      if (p !== ws && p.readyState === 1) p.send(JSON.stringify({ type: 'opponentLeft' }));
    }
    rooms.delete(code);
    if (publicRoom === code) publicRoom = null;
  });
});

// Keepalive : coupe les connexions mortes, garde les proxies éveillés
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Mega Battles en écoute sur :${PORT}`));
