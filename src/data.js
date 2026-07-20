// Données de jeu — stats issues des mock-ups 2013 (HP/STR/DEF/MOV).
export const CLASSES = {
  tanker: {
    key: 'tanker', name: 'Tanker', abbr: 'TNK',
    hp: 64, str: 8, def: 10, mov: 3, rangeMin: 1, rangeMax: 1,
    skillName: 'Aura de garde', passive: true,
    skillDesc: 'Passif : les alliés adjacents subissent -3 dégâts.',
  },
  dps: {
    key: 'dps', name: 'DPS', abbr: 'DPS',
    hp: 44, str: 14, def: 4, mov: 5, rangeMin: 1, rangeMax: 1,
    skillName: 'Frappe double', passive: false,
    skillDesc: 'Actif (1x/partie) : la prochaine attaque inflige STR x2.',
  },
  archer: {
    key: 'archer', name: 'Archer', abbr: 'ARC',
    hp: 36, str: 10, def: 2, mov: 4, rangeMin: 2, rangeMax: 4,
    skillName: 'Tir visé', passive: false,
    skillDesc: 'Actif (1x/partie) : la prochaine attaque ignore DEF et les auras.',
  },
};

export const TEAMS = {
  humans: { id: 'humans', label: 'Humans', color: 0x3b7dd8, css: '#3b7dd8' },
  zombies: { id: 'zombies', label: 'Zombies', color: 0xd0453f, css: '#d0453f' },
};

// 6 unités par camp : 2 Tanker, 2 DPS, 2 Archer.
export const SPAWNS = {
  humans: { tanker: [[1, 3], [1, 6]], dps: [[0, 2], [0, 7]], archer: [[0, 4], [0, 5]] },
  zombies: { tanker: [[10, 3], [10, 6]], dps: [[11, 2], [11, 7]], archer: [[11, 4], [11, 5]] },
};

export const AURA_REDUCTION = 3;
