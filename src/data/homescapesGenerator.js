/**
 * 77,777-Level Hardcore & Auror Nightmare Campaign Engine (Homescapes: Lâu Đài Hogwarts)
 * - Default Hardcore Mode: +1.5 difficulty tiers above original Playrix (tight move budgets,
 *   early 5-6 colors, Gryffindor Carpet, Howler Paper Planes, Chocolate Frogs, Gringotts Keys,
 *   Moving Staircase Streams, Floo Portals, Enchanted Clams, Hourglass Clocks, 2-Stage Bosses).
 * - Auror Nightmare Mode (nightmare = true): +2.5 tiers (-15% moves, +1 color up to 6, extra clocks, 2x Coins & XP).
 */

import { validateStageSupply } from './boardSupplyValidator.js';

export const MAX_HOMESCAPES_LEVEL = 77777;

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
  { id: 'hallway', mask: makeMask((r, c) => !((r === 3 || r === 4) && (c === 0 || c === 7))) },
  { id: 'atrium', mask: makeMask((r, c) => !(r >= 3 && r <= 4 && c >= 3 && c <= 4)) },
  { id: 'tower', mask: makeMask((r, c) => Math.abs(r - 3.5) + Math.abs(c - 3.5) <= 5.6) },
  {
    id: 'twin_towers',
    mask: makeMask((r) => r !== 3),
    portals: [
      { from: [2, 1], to: [4, 1], color: '#4cc9f0' },
      { from: [2, 3], to: [4, 3], color: '#ffd166' },
      { from: [2, 4], to: [4, 4], color: '#72efdd' },
      { from: [2, 6], to: [4, 6], color: '#c77dff' },
    ],
  },
  { id: 'wings', mask: makeMask((r, c) => !(r <= 1 && (c === 3 || c === 4)) && !(r >= 6 && (c === 3 || c === 4))) },
  { id: 'great_hall', mask: makeMask((r, c) => !(r >= 5 && (c === 0 || c === 7)) && !(r === 7 && (c === 1 || c === 6))) },
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
    tip: 'Ghép ô vuông 2×2 tạo Thư Sấm Howler ✉️ và ghép chạm Thảm Đỏ để trải Thảm Gryffindor khắp tháp!',
    goals: [{ type: 'carpet', target: 40 }, { type: 'color', color: 0, target: 24 }],
    carpetSeeds: [[3, 3], [3, 4], [4, 3], [4, 4]],
    presetPowerups: [{ r: 4, c: 3, power: 'paper_plane', color: 0 }],
  },
  2: {
    moves: 15, colors: 5, difficulty: 'normal',
    tip: 'Ếch Sô-cô-la 🐸 CHỈ thu được bằng Chổi Thần, Vạc Nổ hoặc Thư Sấm! Phá thêm 10 Rương Hogwarts!',
    goals: [{ type: 'cookie', target: 4 }, { type: 'box', target: 10 }],
    cookies: [[2, 3], [2, 4], [5, 3], [5, 4]],
    boxes: [
      [3, 1, 2], [3, 2, 1], [3, 5, 1], [3, 6, 2], [4, 1, 1],
      [4, 2, 2], [4, 5, 2], [4, 6, 1], [6, 2, 1], [6, 5, 1],
    ],
    presetPowerups: [{ r: 4, c: 3, power: 'rocket_h', color: 1 }],
  },
  3: {
    moves: 14, colors: 5, difficulty: 'normal',
    tip: 'Dẫn 3 Chìa Khóa Vàng Gringotts 🔑 rơi chạm đáy và phá Rương Trường 2 lớp khóa!',
    goals: [{ type: 'donut', target: 3 }, { type: 'box', target: 8 }],
    donuts: [[0, 2], [0, 5]],
    boxes: [
      [3, 1, 2], [3, 3, 2], [3, 4, 2], [3, 6, 2],
      [4, 1, 1], [4, 3, 1], [4, 4, 1], [4, 6, 1],
    ],
  },
  4: {
    moves: 15, colors: 5, difficulty: 'normal',
    tip: 'Thu thập Đậu Đủ Vị Bertie Bott 🍬, phá Xích Sắt Azkaban ⛓️ và vượt Tường Đá Bí Mật!',
    goals: [{ type: 'cherry', target: 10 }, { type: 'chain', target: 8 }],
    jellies: [
      [2, 2, 2], [2, 5, 2], [3, 3, 2], [3, 4, 2], [4, 3, 2],
      [4, 4, 2], [5, 2, 1], [5, 5, 1], [6, 3, 1], [6, 4, 1],
    ],
    chains: [[1, 2, 2], [1, 5, 2], [3, 1, 1], [3, 6, 1], [4, 1, 1], [4, 6, 1], [6, 2, 1], [6, 5, 1]],
    walls: [[2, 3, 'bottom'], [2, 4, 'bottom']],
  },
  5: {
    moves: 14, colors: 5, difficulty: 'hard',
    tip: '🌊 HÀNH LANG DỊCH CHUYỂN: Cuối mỗi lượt, dòng phép cuốn cổ vật trôi 1 ô — tận dụng để trải Thảm!',
    goals: [{ type: 'carpet', target: 44 }, { type: 'box', target: 8 }],
    streams: [STREAM_TEMPLATES[0]],
    carpetSeeds: [[1, 2], [1, 5], [4, 3], [4, 4]],
    boxes: [[3, 1, 2], [3, 2, 2], [3, 5, 2], [3, 6, 2], [5, 2, 1], [5, 3, 1], [5, 4, 1], [5, 5, 1]],
  },
  6: {
    moves: 14, colors: 5, difficulty: 'normal',
    tip: '🐚 SÒ PHÉP ĐÓNG/MỞ: Canh lượt vỏ sò mở hé ngọc trai để ghép phá & nổ Ếch Sô-cô-la!',
    goals: [{ type: 'clam', target: 6 }, { type: 'cookie', target: 5 }],
    clams: [[2, 1], [2, 6], [4, 2], [4, 5], [6, 2], [6, 5]],
    cookies: [[1, 3], [1, 4], [3, 3], [3, 4], [5, 3]],
  },
  7: {
    moves: 13, colors: 5, difficulty: 'normal',
    tip: 'Bắt Bướm Phép 🦋 trước khi bay thoát và chặn đứng Bọt Độc Dược Đa Dịch 🧪 lan rộng!',
    goals: [{ type: 'butterfly', target: 6 }, { type: 'foam', target: 10 }],
    butterflies: [[6, 1, 0], [6, 2, 1], [6, 5, 2], [6, 6, 3], [7, 3, 4], [7, 4, 0]],
    foams: [[3, 2], [3, 3], [3, 4], [3, 5], [4, 2], [4, 3], [4, 4], [4, 5], [2, 3], [2, 4]],
  },
  8: {
    moves: 15, colors: 6, difficulty: 'hard',
    maskId: 'twin_towers',
    tip: '🌀 LÒ SƯỞI MẠNG LƯỚI FLOO (6 Màu!): Cổ vật rơi xuyên Cổng nối liền hai Tòa Tháp Lâu Đài!',
    goals: [{ type: 'carpet', target: 38 }, { type: 'cherry', target: 6 }, { type: 'box', target: 6 }],
    carpetSeeds: [[1, 3], [1, 4], [5, 3], [5, 4]],
    jellies: [[1, 2, 2], [1, 5, 2], [6, 2, 2], [6, 3, 1], [6, 4, 1], [6, 5, 2]],
    boxes: [[4, 2, 2], [4, 5, 2], [5, 1, 1], [5, 2, 1], [5, 5, 1], [5, 6, 1]],
  },
  9: {
    moves: 12, colors: 5, difficulty: 'normal',
    tip: '⏳ ĐỒNG HỒ CÁT HẮC ÁM: Phá hủy cổ vật gắn đồng hồ đếm ngược trước khi phát nổ về 0!',
    goals: [{ type: 'clam', target: 5 }, { type: 'foam', target: 8 }, { type: 'color', color: 2, target: 20 }],
    clams: [[2, 1], [2, 6], [4, 3], [4, 4], [6, 3]],
    foams: [[3, 2], [3, 5], [5, 2], [5, 3], [5, 4], [5, 5], [6, 2], [6, 5]],
    clocks: [[1, 3, 8], [1, 4, 9], [4, 2, 10]],
  },
  10: {
    moves: 23, colors: 6, difficulty: 'super_hard',
    tip: '💀 BOSS 2 GIAI ĐOẠN (2 ⭐): Trải thảm Đại Sảnh để cuộn xuống Giai Đoạn 2 Mật Thất trong cùng số lượt!',
    goals: [{ type: 'carpet', target: 42 }, { type: 'box', target: 6 }],
    carpetSeeds: [[3, 3], [3, 4], [4, 3], [4, 4]],
    boxes: [[2, 2, 2], [2, 5, 2], [3, 1, 2], [3, 6, 2], [5, 2, 1], [5, 5, 1]],
    stage2: {
      mask: BOARD_MASKS[1].mask,
      streams: [STREAM_TEMPLATES[1]],
      goals: [{ type: 'clam', target: 4 }, { type: 'cookie', target: 4 }],
      clams: [[2, 2], [2, 5], [4, 2], [4, 5]],
      cookies: [[3, 3], [3, 4], [5, 3], [5, 4]],
      chains: [[3, 1, 1], [3, 6, 1]],
    },
  },
};

function buildProceduralHomeStage(rng, level, isStage2, difficulty) {
  const arch = (level + (isStage2 ? 2 : 0)) % 5;
  // Keep Carpet (arch 0 & 3) and Donut (arch 2) on contiguous single-island masks for guaranteed reachability
  const maskChoice = isStage2
    ? BOARD_MASKS[(level + 3) % 5]
    : arch !== 0 && arch !== 2 && arch !== 3 && level % 8 === 0
      ? BOARD_MASKS[5]
      : BOARD_MASKS[level % 5];

  const mask = maskChoice.mask.map((row) => [...row]);
  const activeCount = mask.flat().filter(Boolean).length;
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
  let shiftingStreams = false;
  if (portals.length === 0 && (level % 3 === 0 || isStage2)) {
    const tpl = STREAM_TEMPLATES[(level + (isStage2 ? 1 : 0)) % STREAM_TEMPLATES.length];
    const validPath = tpl.filter(([r, c]) => mask[r]?.[c]);
    if (validPath.length >= 5) {
      streams.push(validPath);
      if (level >= 15 && level % 6 === 3) shiftingStreams = true;
    }
  }

  const carpetSeeds = [];
  const boxes = [];
  const cookies = [];
  const jellies = [];
  const chains = [];
  const foams = [];
  const clams = [];
  const portraits = [];
  const butterflies = [];
  const donuts = [];
  const clocks = [];
  const walls = [];
  const goals = [];

  const scale = isStage2 ? 0.62 : 1.0;
  const tierFactor = Math.min(1.45, 1 + Math.log10(Math.max(1, level)) * 0.11);
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

  if (arch === 0) {
    const seeds = pickFreeCells(4, (r, c) => r >= 2 && r <= 5 && c >= 2 && c <= 5);
    for (const [r, c] of seeds) carpetSeeds.push([r, c]);
    const carpetTarget = Math.min(activeCount, Math.max(28, Math.round(activeCount * (isStage2 ? 0.68 : 0.82))));
    goals.push({ type: 'carpet', target: carpetTarget });

    const boxCells = pickFreeCells(Math.max(4, Math.round(7 * scale * tierFactor * earlyEase)), (r) => r >= 2);
    for (const [r, c] of boxCells) boxes.push([r, c, rng() < 0.55 ? 2 : 1]);
    goals.push({ type: 'box', target: boxes.length });
  } else if (arch === 1) {
    if (level >= 11 && level % 2 === 1) {
      const portCells = pickFreeCells(Math.max(3, Math.round(4 * scale * tierFactor * earlyEase)), (r) => r >= 2);
      for (const [r, c] of portCells) portraits.push([r, c, 2]);
      goals.push({ type: 'portrait', target: portraits.length });
    } else {
      const clamCells = pickFreeCells(Math.max(3, Math.round(5 * scale * tierFactor * earlyEase)), (r) => r >= 2);
      for (const [r, c] of clamCells) clams.push([r, c]);
      goals.push({ type: 'clam', target: clams.length });
    }

    const cookieCells = pickFreeCells(Math.max(3, Math.round(5 * scale * earlyEase)), (r) => r >= 1 && r <= 5);
    for (const [r, c] of cookieCells) cookies.push([r, c]);
    goals.push({ type: 'cookie', target: cookies.length });
  } else if (arch === 2) {
    let dropCols = [];
    if (!isStage2 && portals.length === 0) {
      const dropTarget = Math.min(5, Math.max(2, Math.round(3 * tierFactor)));
      const topCols = [1, 2, 3, 4, 5, 6].filter((c) => mask[0][c] && mask[7][c]);
      if (topCols.length >= 2) {
        dropCols = [topCols[0], topCols[topCols.length - 1]];
        donuts.push([0, dropCols[0]], [0, dropCols[1]]);
        occupied.add(`0,${dropCols[0]}`);
        occupied.add(`0,${dropCols[1]}`);
        goals.push({ type: 'donut', target: dropTarget });
      }
    }
    const boxCells = pickFreeCells(
      Math.max(4, Math.round(7 * scale * tierFactor * earlyEase)),
      (r, c) => r >= 2 && r <= 5 && !dropCols.includes(c)
    );
    for (const [r, c] of boxCells) boxes.push([r, c, rng() < 0.55 ? 2 : 1]);
    goals.push({ type: 'box', target: boxes.length });
  } else if (arch === 3) {
    const seeds = pickFreeCells(3, (r, c) => r >= 2 && r <= 5 && c >= 1 && c <= 6);
    for (const [r, c] of seeds) carpetSeeds.push([r, c]);
    goals.push({ type: 'carpet', target: Math.min(activeCount, Math.round(activeCount * 0.78)) });

    const jellyCells = pickFreeCells(Math.max(4, Math.round(7 * scale * tierFactor * earlyEase)), (r) => r >= 2);
    for (const [r, c] of jellyCells) jellies.push([r, c, rng() < 0.6 ? 2 : 1]);
    goals.push({ type: 'cherry', target: jellies.length });
  } else {
    const jellyCells = pickFreeCells(Math.max(4, Math.round(6 * scale * tierFactor * earlyEase)), (r) => r >= 2 && r <= 5);
    for (const [r, c] of jellyCells) jellies.push([r, c, 2]);
    if (jellies.length > 0) goals.push({ type: 'cherry', target: jellies.length });

    const bflyCells = pickFreeCells(Math.max(3, Math.round(5 * scale)), (r) => r >= 5);
    for (const [r, c] of bflyCells) butterflies.push([r, c, Math.floor(rng() * 5)]);
    if (butterflies.length > 0) goals.push({ type: 'butterfly', target: butterflies.length });
  }

  // Secondary Hardcore Hazards: Azkaban Chains, Polyjuice Foam, Secret Walls & Hourglass Clocks
  if (rng() < 0.55) {
    const chainCells = pickFreeCells(Math.max(3, Math.round(5 * scale)), (r) => r >= 2);
    for (const [r, c] of chainCells) chains.push([r, c, difficulty !== 'normal' && rng() < 0.5 ? 2 : 1]);
    if (goals.length < 3 && chains.length >= 4) goals.push({ type: 'chain', target: chains.length });
  }
  if (rng() < 0.45 && donuts.length === 0) {
    const foamCells = pickFreeCells(Math.max(4, Math.round(6 * scale)), (r) => r >= 3);
    for (const [r, c] of foamCells) foams.push([r, c]);
    if (goals.length < 3 && foams.length >= 4) goals.push({ type: 'foam', target: foams.length });
  }
  if ((difficulty !== 'normal' || level % 6 === 0) && !isStage2) {
    const clockCells = pickFreeCells(difficulty === 'super_hard' ? 3 : 2, (r) => r >= 1 && r <= 5);
    for (const [r, c] of clockCells) clocks.push([r, c, difficulty === 'super_hard' ? 8 : 9]);
  }
  if (portals.length === 0 && donuts.length === 0 && rng() < 0.45) {
    walls.push([2, 2, 'bottom'], [2, 5, 'bottom']);
  }

  if (goals.length < 2) {
    goals.push({ type: 'color', color: level % 5, target: Math.round(24 * scale * tierFactor) });
  }

  return {
    rows: ROWS, cols: COLS,
    mask, portals, streams, shiftingStreams, carpetSeeds, boxes, cookies, jellies,
    chains, foams, clams, portraits, butterflies, donuts, clocks, walls,
    goals: goals.slice(0, 3),
  };
}

export function getHomescapesLevel(levelNum, nightmare = false) {
  const clamped = Math.max(1, Math.min(MAX_HOMESCAPES_LEVEL, Math.floor(Number(levelNum) || 1)));
  const isBossMilestone =
    clamped === MAX_HOMESCAPES_LEVEL || clamped % 10 === 0 || clamped % 25 === 0;
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
      gameId: 'homescapes',
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
      carpetSeeds: (preset.carpetSeeds || []).map((x) => [...x]),
      boxes: (preset.boxes || []).map((x) => [...x]),
      cookies: (preset.cookies || []).map((x) => [...x]),
      jellies: (preset.jellies || []).map((x) => [...x]),
      chains: (preset.chains || []).map((x) => [...x]),
      foams: (preset.foams || []).map((x) => [...x]),
      clams: (preset.clams || []).map((x) => [...x]),
      butterflies: (preset.butterflies || []).map((x) => [...x]),
      donuts: (preset.donuts || []).map((x) => [...x]),
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
    const rng = mulberry32(clamped * 2246822519 + 0x85ebca6b);
    const stage1 = buildProceduralHomeStage(rng, clamped, false, difficulty);
    const hasStage2 = isBossMilestone;
    const stage2 = hasStage2 ? buildProceduralHomeStage(rng, clamped + 999, true, difficulty) : null;

    const baseMoves = hasStage2
      ? 23 - Math.min(3, Math.floor(clamped / 5000))
      : difficulty === 'hard'
        ? 16
        : 17 - (clamped > 200 ? 1 : 0);

    const colors =
      difficulty !== 'normal' || clamped >= 30 || rng() < 0.45 ? 6 : 5;

    const tip =
      clamped === MAX_HOMESCAPES_LEVEL
        ? '👑 ĐẠI CHIẾN MÀN 77,777 LÂU ĐÀI HOGWARTS: Triệu hồi Siêu Xoay Thời Gian 2 Màu để làm chủ Lâu Đài!'
        : hasStage2
          ? '💀 MÀN BOSS 2 GIAI ĐOẠN (2 ⭐): Giữ lượt ở Giai Đoạn 1 để quét sạch Mật Thất Giai Đoạn 2!'
          : stage1.portals.length > 0
            ? '🌀 Lò Sưởi Floo nối hai Tòa Tháp — phá ô tháp dưới để hút cổ vật xuyên cổng!'
            : stage1.streams.length > 0
              ? '🌊 Hành Lang Dịch Chuyển cuốn cổ vật mỗi lượt — tính trước hướng trôi để nổ liên hoàn!'
              : '🪄 Chế độ Hardcore: Kết hợp Thư Sấm Howler + Xoay Thời Gian để nạp đầy đồng hồ phép!';

    def = {
      level: clamped,
      gameId: 'homescapes',
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

  validateStageSupply(def);
  if (def.stage2) validateStageSupply(def.stage2);

  let coinReward = difficulty === 'super_hard' ? 160 : difficulty === 'hard' ? 110 : 75;
  if (nightmare) {
    def.nightmare = true;
    def.moves = Math.max(11, Math.floor(def.moves * 0.85));
    if (clamped >= 3) def.colors = Math.min(6, def.colors + 1);
    if (def.clocks.length === 0 && clamped >= 2) {
      const busy = new Set();
      for (const list of [
        def.boxes, def.cookies, def.jellies, def.chains, def.foams,
        def.clams, def.portraits, def.butterflies, def.donuts,
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

