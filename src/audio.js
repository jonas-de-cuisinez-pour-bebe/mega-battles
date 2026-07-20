// Sons synthétisés en Web Audio — aucun asset externe.
// Palette : humains = timbres propres (triangle), zombies = graves détunés (saw).

let ctx = null;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq = 440, dur = 0.15, type = 'sine', vol = 0.25, slide = 0, delay = 0 }) {
  const c = ac();
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}

function noise({ dur = 0.2, vol = 0.2, freq = 1000, q = 1, type = 'bandpass', slide = 0, delay = 0 }) {
  const c = ac();
  const t0 = c.currentTime + delay;
  const len = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t0);
  f.Q.value = q;
  if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0);
}

export const sfx = {
  // à appeler sur le premier geste utilisateur (politique autoplay des navigateurs)
  unlock() { ac(); },

  // Focus sur une nouvelle unité : hauteur selon la classe, timbre selon l'espèce.
  focus(unit) {
    const base = { tanker: 180, dps: 320, archer: 470 }[unit.cls.key];
    if (unit.team === 'humans') {
      // deux notes montantes, propres
      tone({ freq: base, dur: 0.09, type: 'triangle', vol: 0.2 });
      tone({ freq: base * 1.5, dur: 0.13, type: 'triangle', vol: 0.2, delay: 0.09 });
    } else {
      // grognement : deux saw graves détunées qui glissent vers le bas
      tone({ freq: base * 0.55, dur: 0.3, type: 'sawtooth', vol: 0.16, slide: -base * 0.2 });
      tone({ freq: base * 0.57, dur: 0.3, type: 'sawtooth', vol: 0.1, slide: -base * 0.2 });
    }
  },

  // Un son par type d'attaque (+ variante brillante quand un skill est armé).
  attack(unit, armed = false) {
    if (armed) { // éclat du skill avant l'impact
      tone({ freq: 880, dur: 0.07, type: 'triangle', vol: 0.16 });
      tone({ freq: 1320, dur: 0.09, type: 'triangle', vol: 0.16, delay: 0.06 });
    }
    const d = armed ? 0.12 : 0;
    if (unit.cls.key === 'archer') {
      // sifflement de flèche puis impact
      noise({ dur: 0.24, vol: 0.22, freq: 2400, q: 2, slide: -1800, delay: d });
      tone({ freq: 220, dur: 0.08, type: 'square', vol: 0.16, delay: d + 0.23 });
    } else if (unit.cls.key === 'tanker') {
      // gros impact sourd
      tone({ freq: 120, dur: 0.26, type: 'sine', vol: 0.45, slide: -70, delay: d });
      noise({ dur: 0.12, vol: 0.25, freq: 400, q: 0.8, type: 'lowpass', delay: d });
    } else {
      // slash sec du DPS
      noise({ dur: 0.12, vol: 0.26, freq: 3200, q: 1.4, slide: -2400, type: 'highpass', delay: d });
      tone({ freq: 700, dur: 0.05, type: 'square', vol: 0.1, delay: d });
    }
  },

  // Mort : glissando descendant + souffle, plus grave pour les zombies.
  death(unit) {
    const f = unit.team === 'zombies' ? 140 : 210;
    tone({ freq: f * 2, dur: 0.5, type: 'sawtooth', vol: 0.2, slide: -f * 1.6 });
    noise({ dur: 0.4, vol: 0.15, freq: 600, q: 0.7, type: 'lowpass', delay: 0.05 });
  },
};
