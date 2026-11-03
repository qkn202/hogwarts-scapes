/**
 * 77,777-Level Hardcore & Auror Nightmare Campaign Engine (Gardenscapes: Khuôn Viên Hogwarts)
 * - Default Hardcore Mode: +1.5 difficulty tiers above original Playrix (tight move budgets,
 *   early 5-6 colors, layered hazards, streams, portals, alternating clams, countdown clocks, 2-stage bosses).
 * - Auror Nightmare Mode (nightmare = true): +2.5 tiers (-15% moves, +1 color up to 6, extra hazards, 2x Coins & XP).
 */

import { validateStageSupply } from './boardSupplyValidator.js';

export const MAX_GARDENSCAPES_LEVEL = 77777;

const ROWS = 8;
const COLS = 8;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeMask(fn = () => true) {
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (__, c) => Boolean(fn(r, c)))
  );
}

const BOARD_MASKS = [
  { id: 'full', mask: makeMask() },
  { id: 'octagon', mask: makeMask((r, c) => !((r === 0 || r === 7) && (c === 0 || c === 7))) },
  { id: 'hourglass', mask: makeMask((r, c) => !((r === 3 || r === 4) && (c === 0 || c === 7))) },
  { id: 'courtyard', mask: makeMask((r, c) => !(r >= 3 && r <= 4 && c >= 3 && c <= 4)) },
  { id: 'sanctum', mask: makeMask((r, c) => Math.abs(r - 3.5) + Math.abs(c - 3.5) <= 5.6) },
  {
    id: 'twin_islands',
    mask: makeMask((r) => r !== 3),
    portals: [
      { from: [2, 1], to: [4, 1], color: '#4cc9f0' },
      { from: [2, 3], to: [4, 3], color: '#ffd166' },
      { from: [2, 4], to: [4, 4], color: '#72efdd' },
      { from: [2, 6], to: [4, 6], color: '#c77dff' },
    ],
  },
  { id: 'wings', mask: makeMask((r, c) => !(r <= 1 && (c === 3 || c === 4)) && !(r >= 6 && (c === 3 || c === 4))) },
  { id: 'chalice', mask: makeMask((r, c) => !(r >= 5 && (c === 0 || c === 7)) && !(r === 7 && (c === 1 || c === 6))) },
];

const STREAM_TEMPLATES = [
  [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [2, 6], [2, 5], [2, 4], [2, 3], [2, 2], [2, 1]],
  [[5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [5, 6], [6, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1]],
  [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1]],
  [[6, 6], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6]],
];

const SHOWCASE_LEVELS = {
  1: {
    moves: 15, colors: 5, difficulty: 'normal',
    tip: 'Ghép 4 tạo Pháo Sáng, ghép 5 tạo Vạc Nổ để nạp đầy Thần Hộ Mệnh Patronus!',
    goals: [{ type: 'color', color: 0, target: 28 }, { type: 'color', color: 1, target: 28 }],
    grassPatches: [[3, 2, 1], [3, 3, 1], [3, 4, 1], [3, 5, 1], [4, 2, 1], [4, 5, 1]],
    presetPowerups: [{ r: 4, c: 3, power: 'g_bomb', color: 0 }],
  },
  2: {
    moves: 14, colors: 5, difficulty: 'normal',
    tip: 'Phá sạch Rêu Cổ Ngữ để giải cứu 3 Tượng Phù Thủy ẩn bên dưới!',
    goals: [{ type: 'gnome', target: 3 }, { type: 'grass', target: 16 }],
    gnomes: [
      { id: 'gn1', cells: [[2, 1], [3, 1]] },
      { id: 'gn2', cells: [[2, 6], [3, 6]] },
      { id: 'gn3', cells: [[5, 3], [5, 4], [6, 3], [6, 4]] },
    ],
    grassPatches: [
      [2, 1, 2], [3, 1, 1], [2, 6, 2], [3, 6, 1],
      [5, 3, 2], [5, 4, 2], [6, 3, 2], [6, 4, 2],
      [4, 2, 1], [4, 3, 1], [4, 4, 1], [4, 5, 1],
      [1, 3, 1], [1, 4, 1], [6, 1, 1], [6, 6, 1],
    ],
  },
  3: {
    moves: 13, colors: 5, difficulty: 'normal',
    tip: 'Dẫn 3 Cúp Bia Bơ rơi chạm đáy và phá Rương Trường 2 lớp khóa!',
    goals: [{ type: 'lemonade', target: 3 }, { type: 'crate', target: 10 }],
    lemonades: [[0, 2], [0, 5]],
    crates: [
      [3, 1, 2], [3, 2, 2], [3, 5, 2], [3, 6, 2], [4, 2, 1],
      [4, 3, 2], [4, 4, 2], [4, 5, 1], [5, 2, 1], [5, 5, 1],
    ],
  },
  4: {
    moves: 15, colors: 5, difficulty: 'normal',
    tip: 'Ghép 3 lần cạnh Bồn Thảo Dược để thu hoạch & chém đứt Dây Gai Quỷ!',
    goals: [{ type: 'bloom', target: 14 }, { type: 'chain', target: 8 }],
    flowerbeds: [[3, 2], [3, 5], [5, 3], [5, 4]],
    vines: [[2, 2, 2], [2, 5, 2], [4, 2, 1], [4, 3, 1], [4, 4, 1], [4, 5, 1], [6, 3, 1], [6, 4, 1]],
    walls: [[2, 3, 'bottom'], [2, 4, 'bottom']],
  },
  5: {
    moves: 13, colors: 5, difficulty: 'hard',
    tip: '🌊 DÒNG CHẢY PHÉP: Cuối mỗi lượt, dòng suối dịch chuyển cổ vật 1 ô theo mũi tên!',
    goals: [{ type: 'gnome', target: 3 }, { type: 'crate', target: 8 }],
    streams: [STREAM_TEMPLATES[0]],
    gnomes: [
      { id: 'gn1', cells: [[4, 1], [5, 1]] },
      { id: 'gn2', cells: [[4, 6], [5, 6]] },
      { id: 'gn3', cells: [[5, 3], [5, 4], [6, 3], [6, 4]] },
    ],
    grassPatches: [
      [4, 1, 2], [5, 1, 2], [4, 6, 2], [5, 6, 2],
      [5, 3, 2], [5, 4, 2], [6, 3, 2], [6, 4, 2],
    ],
    crates: [[3, 2, 2], [3, 3, 2], [3, 4, 2], [3, 5, 2], [4, 2, 1], [4, 3, 1], [4, 4, 1], [4, 5, 1]],
  },
  6: {
    moves: 14, colors: 5, difficulty: 'normal',
    tip: '🐚 VỎ SÒ PHÉP: Sò đóng/mở luân phiên mỗi lượt — canh lượt mở hé ngọc trai để ghép phá!',
    goals: [{ type: 'clam', target: 6 }, { type: 'acorn', target: 8 }],
    clams: [[2, 2], [2, 5], [4, 1], [4, 6], [6, 2], [6, 5]],
    acorns: [[1, 2, 2], [1, 5, 2], [3, 3, 2], [3, 4, 2], [5, 3, 1], [5, 4, 1], [1, 3, 1], [1, 4, 1]],
  },
  7: {
    moves: 12, colors: 5, difficulty: 'normal',
    tip: 'Bắt Bướm Phép trước khi bay mất và dọn Mật Công Tước mỗi lượt!',
    goals: [{ type: 'butterfly', target: 6 }, { type: 'foam', target: 10 }],
    butterflies: [[6, 1, 0], [6, 2, 1], [6, 5, 2], [6, 6, 3], [7, 3, 4], [7, 4, 0]],
    foams: [[3, 2], [3, 3], [3, 4], [3, 5], [4, 2], [4, 3], [4, 4], [4, 5], [2, 3], [2, 4]],
  },
  8: {
    moves: 15, colors: 6, difficulty: 'hard',
    maskId: 'twin_islands',
    tip: '🌀 CỔNG ĐỘN THỔ (6 Màu!): Cổ vật rơi qua Cổng trên sẽ dịch chuyển tức thời xuống đảo dưới!',
    goals: [{ type: 'lemonade', target: 3 }, { type: 'gnome', target: 2 }, { type: 'crate', target: 6 }],
    lemonades: [[0, 1], [0, 6]],
    gnomes: [
      { id: 'gn1', cells: [[5, 2], [6, 2]] },
      { id: 'gn2', cells: [[5, 5], [6, 5]] },
    ],
    grassPatches: [[5, 2, 2], [6, 2, 2], [5, 5, 2], [6, 5, 2], [6, 3, 1], [6, 4, 1]],
    crates: [[4, 2, 2], [4, 5, 2], [5, 1, 1], [5, 3, 1], [5, 4, 1], [5, 6, 1]],
  },
  9: {
    moves: 12, colors: 5, difficulty: 'normal',
    tip: '⏳ ĐỒNG HỒ CÁT HẮC ÁM: Phá hủy hạt mang đồng hồ đếm ngược trước khi về 0!',
    goals: [{ type: 'clam', target: 5 }, { type: 'foam', target: 8 }, { type: 'color', color: 3, target: 20 }],
    clams: [[2, 1], [2, 6], [4, 3], [4, 4], [6, 3]],
    foams: [[3, 2], [3, 5], [5, 2], [5, 3], [5, 4], [5, 5], [6, 2], [6, 5]],
    clocks: [[1, 3, 8], [1, 4, 9], [4, 2, 10]],
  },
  10: {
    moves: 23, colors: 6, difficulty: 'super_hard',
    tip: '💀 BOSS 2 GIAI ĐOẠN (2 ⭐): Quét sạch Sân Trước để cuộn sang Giai Đoạn 2 Rừng Cấm trong cùng số lượt!',
    goals: [{ type: 'gnome', target: 2 }, { type: 'crate', target: 6 }],
    gnomes: [
      { id: 'gn1', cells: [[4, 1], [5, 1]] },
      { id: 'gn2', cells: [[4, 6], [5, 6]] },
    ],
    grassPatches: [[4, 1, 2], [5, 1, 2], [4, 6, 2], [5, 6, 2], [4, 3, 1], [4, 4, 1]],
    crates: [[3, 2, 2], [3, 3, 2], [3, 4, 2], [3, 5, 2], [5, 3, 1], [5, 4, 1]],
    stage2: {
      mask: BOARD_MASKS[1].mask,
      streams: [STREAM_TEMPLATES[1]],
      goals: [{ type: 'clam', target: 4 }, { type: 'gnome', target: 2 }],
      clams: [[2, 2], [2, 5], [4, 3], [4, 4]],
      gnomes: [
        { id: 'gn2_1', cells: [[6, 2], [6, 3]] },
        { id: 'gn2_2', cells: [[6, 4], [6, 5]] },
      ],
      grassPatches: [[6, 2, 2], [6, 3, 2], [6, 4, 2], [6, 5, 2]],
      vines: [[3, 2, 1], [3, 5, 1]],
    },
  },
};

function buildProceduralStage(rng, level, isStage2, difficulty) {
  const maskChoice = isStage2
    ? BOARD_MASKS[(level + 3) % 5]
    : level % 8 === 0
      ? BOARD_MASKS[5] // Twin Islands with Apparition Portals!
      : BOARD_MASKS[level % BOARD_MASKS.length];

  const mask = maskChoice.mask.map((row) => [...row]);
  const portals = (maskChoice.portals || []).map((p) => ({
    from: [...p.from],
    to: [...p.to],
    color: p.color,
  }));

  const occupied = new Set();
  for (const p of portals) {
    occupied.add(`${p.from[0]},${p.from[1]}`);
    occupied.add(`${p.to[0]},${p.to[1]}`);
  }

  const streams = [];
  if (portals.length === 0 && (level % 3 === 0 || isStage2)) {
    const tpl = STREAM_TEMPLATES[(level + (isStage2 ? 1 : 0)) % STREAM_TEMPLATES.length];
    const validPath = tpl.filter(([r, c]) => mask[r]?.[c]);
    if (validPath.length >= 5) streams.push(validPath);
  }

  const gnomes = [];
  const grassPatches = [];
  const crates = [];
  const clams = [];
  const fireflies = [];
  const acorns = [];
  const foams = [];
  const vines = [];
  let willowActive = false;
  const flowerbeds = [];
  const butterflies = [];
  const lemonades = [];
  const clocks = [];
  const walls = [];
  const goals = [];

  const scale = isStage2 ? 0.62 : 1.0;
  const tierFactor = Math.min(1.45, 1 + Math.log10(Math.max(1, level)) * 0.11);
  // Early procedural levels (11..~30) ramp blocker density instead of spiking it
  const earlyEase = Math.min(1, 0.7 + level / 100);

  const pickFreeCells = (count, filterFn = () => true) => {
    const pool = [];
    for (let r = 1; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const key = `${r},${c}`;
        if (!mask[r][c] || occupied.has(key) || !filterFn(r, c)) continue;
        pool.push([r, c]);
      }
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const chosen = pool.slice(0, count);
    for (const [r, c] of chosen) occupied.add(`${r},${c}`);
    return chosen;
  };

  // Primary Objective Archetype
  const arch = (level + (isStage2 ? 2 : 0)) % 5;
  if (arch === 0 || arch === 3) {
    const wantGnomes = Math.max(1, Math.round((arch === 0 ? 3 : 2) * scale));
    const candSpots = [
      [[5, 1], [6, 1]],
      [[5, 6], [6, 6]],
      [[5, 3], [5, 4], [6, 3], [6, 4]],
      [[2, 2], [3, 2]],
      [[2, 5], [3, 5]],
    ];
    for (const cells of candSpots) {
      if (gnomes.length >= wantGnomes) break;
      if (cells.every(([r, c]) => mask[r]?.[c] && !occupied.has(`${r},${c}`))) {
        const id = `gn_${isStage2 ? 'b' : 'a'}_${gnomes.length}`;
        gnomes.push({ id, cells });
        for (const [r, c] of cells) {
          occupied.add(`${r},${c}`);
          grassPatches.push([r, c, rng() < 0.65 ? 2 : 1]);
        }
      }
    }
    for (const [r, c] of pickFreeCells(Math.round(8 * scale))) {
      grassPatches.push([r, c, rng() < 0.45 ? 2 : 1]);
    }
    if (gnomes.length > 0) goals.push({ type: 'gnome', target: gnomes.length });
    goals.push({ type: 'grass', target: grassPatches.length });
  } else if (arch === 1) {
    if (level >= 11 && level % 2 === 1) {
      const ffCells = pickFreeCells(Math.max(2, Math.round(3 * scale * earlyEase)), (r) => r >= 2);
      for (const [r, c] of ffCells) fireflies.push([r, c, 3]);
      goals.push({ type: 'firefly', target: fireflies.length * 3 });
    } else {
      const clamCells = pickFreeCells(Math.max(3, Math.round(6 * scale * tierFactor * earlyEase)), (r) => r >= 2);
      for (const [r, c] of clamCells) clams.push([r, c]);
      goals.push({ type: 'clam', target: clams.length });
    }

    const crateCells = pickFreeCells(Math.max(4, Math.round(8 * scale * tierFactor * earlyEase)), (r) => r >= 2);
    for (const [r, c] of crateCells) crates.push([r, c, rng() < 0.6 ? 2 : 1]);
    goals.push({ type: 'crate', target: crates.length });
  } else if (arch === 2) {
    let dropCols = [];
    if (!isStage2 && portals.length === 0) {
      const dropTarget = Math.min(5, Math.max(2, Math.round(3 * tierFactor)));
      const topCols = [1, 2, 3, 4, 5, 6].filter((c) => mask[0][c] && mask[7][c]);
      if (topCols.length >= 2) {
        dropCols = [topCols[0], topCols[topCols.length - 1]];
        lemonades.push([0, dropCols[0]], [0, dropCols[1]]);
        occupied.add(`0,${dropCols[0]}`);
        occupied.add(`0,${dropCols[1]}`);
        goals.push({ type: 'lemonade', target: dropTarget });
      }
    }
    if (dropCols.length > 0) {
      // Fallable Prophecy Orbs would sink and pave a floor Butterbeer can never pass:
      // pair Butterbeer with static 2-lock crates kept off the goblet drop columns instead.
      const crateCells = pickFreeCells(
        Math.max(4, Math.round(7 * scale * tierFactor)),
        (r, c) => r >= 2 && r <= 5 && !dropCols.includes(c)
      );
      for (const [r, c] of crateCells) crates.push([r, c, rng() < 0.55 ? 2 : 1]);
      goals.push({ type: 'crate', target: crates.length });
    } else {
      const acornCells = pickFreeCells(Math.max(4, Math.round(8 * scale * tierFactor)), (r) => r >= 1 && r <= 5);
      for (const [r, c] of acornCells) acorns.push([r, c, rng() < 0.55 ? 2 : 1]);
      goals.push({ type: 'acorn', target: acorns.length });
    }
  } else {
    const bedCells = pickFreeCells(Math.max(2, Math.round(3 * scale)), (r, c) => r >= 2 && r <= 6 && c >= 1 && c <= 6);
    for (const [r, c] of bedCells) flowerbeds.push([r, c]);
    if (flowerbeds.length > 0) goals.push({ type: 'bloom', target: Math.round(12 * scale * tierFactor) });

    const bflyCells = pickFreeCells(Math.max(3, Math.round(5 * scale)), (r) => r >= 5);
    for (const [r, c] of bflyCells) butterflies.push([r, c, Math.floor(rng() * 5)]);
    if (butterflies.length > 0) goals.push({ type: 'butterfly', target: butterflies.length });
  }

  // Secondary Hardcore Hazards: Honey, Devil's Snare, Partition Walls & Countdown Clocks
  if (rng() < 0.55) {
    const vineCells = pickFreeCells(Math.max(3, Math.round(5 * scale)), (r) => r >= 2);
    for (const [r, c] of vineCells) vines.push([r, c, difficulty !== 'normal' && rng() < 0.5 ? 2 : 1]);
    if (goals.length < 3 && vines.length >= 4) goals.push({ type: 'chain', target: vines.length });
    if (level >= 14 && level % 4 === 2 && vines.length > 0) willowActive = true;
  }
  if (rng() < 0.45) {
    const foamCells = pickFreeCells(Math.max(4, Math.round(6 * scale)), (r) => r >= 3);
    for (const [r, c] of foamCells) foams.push([r, c]);
    if (goals.length < 3 && foams.length >= 4) goals.push({ type: 'foam', target: foams.length });
  }
  if ((difficulty !== 'normal' || level % 6 === 0) && !isStage2) {
    const clockCells = pickFreeCells(difficulty === 'super_hard' ? 3 : 2, (r) => r >= 1 && r <= 5);
    for (const [r, c] of clockCells) clocks.push([r, c, difficulty === 'super_hard' ? 8 : 9]);
  }
  if (portals.length === 0 && rng() < 0.45) {
    walls.push([2, 2, 'bottom'], [2, 5, 'bottom']);
  }

  if (goals.length < 2) {
    goals.push({ type: 'color', color: level % 5, target: Math.round(24 * scale * tierFactor) });
  }

  return {
    rows: ROWS, cols: COLS,
    mask, portals, streams, gnomes, grassPatches, crates, clams, fireflies,
    acorns, foams, vines, willowActive, flowerbeds, butterflies, lemonades, clocks, walls,
    goals: goals.slice(0, 3),
  };
}

export function getGardenscapesLevel(levelNum, nightmare = false) {
  const clamped = Math.max(1, Math.min(MAX_GARDENSCAPES_LEVEL, Math.floor(Number(levelNum) || 1)));
  const isBossMilestone =
    clamped === MAX_GARDENSCAPES_LEVEL || clamped % 10 === 0 || clamped % 25 === 0;
  const difficulty = isBossMilestone
    ? 'super_hard'
    : clamped % 5 === 0
      ? 'hard'
      : 'normal';

  let def;
  const preset = SHOWCASE_LEVELS[clamped];
  if (preset) {
    const maskObj = BOARD_MASKS.find((m) => m.id === preset.maskId) || BOARD_MASKS[0];
    def = {
      level: clamped,
      gameId: 'gardenscapes',
      rows: ROWS,
      cols: COLS,
      moves: preset.moves,
      colors: preset.colors,
      difficulty: preset.difficulty,
      tip: preset.tip,
      mask: maskObj.mask.map((row) => [...row]),
      portals: (preset.portals || maskObj.portals || []).map((p) => ({
        from: [...p.from],
        to: [...p.to],
        color: p.color,
      })),
      streams: (preset.streams || []).map((s) => s.map(([r, c]) => [r, c])),
      goals: preset.goals.map((g) => ({ ...g })),
      gnomes: (preset.gnomes || []).map((g) => ({ id: g.id, cells: g.cells.map(([r, c]) => [r, c]) })),
      grassPatches: (preset.grassPatches || []).map((x) => [...x]),
      crates: (preset.crates || []).map((x) => [...x]),
      clams: (preset.clams || []).map((x) => [...x]),
      acorns: (preset.acorns || []).map((x) => [...x]),
      foams: (preset.foams || []).map((x) => [...x]),
      vines: (preset.vines || []).map((x) => [...x]),
      flowerbeds: (preset.flowerbeds || []).map((x) => [...x]),
      butterflies: (preset.butterflies || []).map((x) => [...x]),
      lemonades: (preset.lemonades || []).map((x) => [...x]),
      clocks: (preset.clocks || []).map((x) => [...x]),
      walls: (preset.walls || []).map((x) => [...x]),
      presetPowerups: (preset.presetPowerups || []).map((x) => ({ ...x })),
      stage2: preset.stage2
        ? {
            rows: ROWS,
            cols: COLS,
            ...preset.stage2,
            mask: preset.stage2.mask.map((row) => [...row]),
            goals: preset.stage2.goals.map((g) => ({ ...g })),
          }
        : null,
    };
  } else {
    const rng = mulberry32(clamped * 2654435761 + 0x9e3779b9);
    const stage1 = buildProceduralStage(rng, clamped, false, difficulty);
    const hasStage2 = isBossMilestone;
    const stage2 = hasStage2 ? buildProceduralStage(rng, clamped + 777, true, difficulty) : null;

    // Hardcore (+1.5 tier) tight tactical move budget
    const baseMoves = hasStage2
      ? 23 - Math.min(3, Math.floor(clamped / 5000))
      : difficulty === 'hard'
        ? 16
        : 17 - (clamped > 200 ? 1 : 0);

    const colors =
      difficulty !== 'normal' || clamped >= 30 || rng() < 0.45 ? 6 : 5;

    const tip =
      clamped === MAX_GARDENSCAPES_LEVEL
        ? '👑 ĐẠI CHIẾN MÀN 77,777 HUYỀN THOẠI: Vận dụng Siêu Thần Hộ Mệnh để bảo vệ toàn cõi Hogwarts!'
        : hasStage2
          ? '💀 MÀN BOSS 2 GIAI ĐOẠN (2 ⭐): Tiết kiệm lượt ở Giai Đoạn 1 để càn quét Giai Đoạn 2!'
          : stage1.portals.length > 0
            ? '🌀 Cổng Độn Thổ nối liền hai đảo — nổ Vạc ở đảo dưới để kéo cổ vật xuyên cổng!'
            : stage1.streams.length > 0
              ? '🌊 Dòng Chảy Phép dịch chuyển cổ vật cuối mỗi lượt — tính trước hướng trôi để ghép chuỗi!'
              : '🔥 Chế độ Hardcore: Kết hợp liên hoàn Vạc Nổ & Thần Hộ Mệnh Patronus để tối ưu từng lượt!';

    def = {
      level: clamped,
      gameId: 'gardenscapes',
      rows: ROWS,
      cols: COLS,
      moves: Math.max(13, baseMoves),
      colors,
      difficulty,
      tip,
      ...stage1,
      presetPowerups: [],
      stage2,
    };
  }

  // Guarantee every playable cell can be refilled (no permanently empty pockets)
  validateStageSupply(def);
  if (def.stage2) validateStageSupply(def.stage2);

  // Apply Auror Nightmare Mode (+2.5 Tiers, x2 Coin & XP Rewards!)
  let coinReward = difficulty === 'super_hard' ? 160 : difficulty === 'hard' ? 110 : 75;
  if (nightmare) {
    def.nightmare = true;
    def.moves = Math.max(11, Math.floor(def.moves * 0.85));
    if (clamped >= 3) def.colors = Math.min(6, def.colors + 1);
    if (def.clocks.length === 0 && clamped >= 2) {
      const busy = new Set();
      for (const list of [
        def.crates, def.clams, def.fireflies, def.acorns, def.foams,
        def.vines, def.flowerbeds, def.butterflies, def.lemonades,
      ]) {
        for (const item of list || []) busy.add(`${item[0]},${item[1]}`);
      }
      for (const p of def.portals || []) {
        busy.add(`${p.from[0]},${p.from[1]}`);
        busy.add(`${p.to[0]},${p.to[1]}`);
      }
      const openSlots = [];
      for (let r = 1; r < ROWS - 1; r++) {
        for (let c = 1; c < COLS - 1; c++) {
          if (def.mask[r]?.[c] && !busy.has(`${r},${c}`)) openSlots.push([r, c]);
        }
      }
      if (openSlots[0]) def.clocks.push([openSlots[0][0], openSlots[0][1], 8]);
      if (openSlots[1]) def.clocks.push([openSlots[1][0], openSlots[1][1], 9]);
    }
    coinReward *= 2;
    def.tip = `🔥 ÁC MỘNG THẦN SÁNG (x2 Thưởng): ${def.tip}`;
  } else {
    def.nightmare = false;
  }

  def.starReward = difficulty === 'super_hard' ? 2 : 1;
  def.coinReward = coinReward;
  return def;
}

