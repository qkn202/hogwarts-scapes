/**
 * Match-3 Grid Construction, Match-Free Seeding & Pre-Booster Placement
 * Supports Playrix Partition Walls, Soap Foam / Honey, Fallable Acorns,
 * Butterflies, Alarm Clocks, Hidden 1x2 & 2x2 Gnomes, and Dynamic Drop Streams.
 */

import { attachDynamicGridMetadata } from './dynamicMechanics.js';
import { detectMatches, findBestHint } from './matchDetector.js';

export function buildInitialGrid(rows, cols, def, gnomes) {
  const grid = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (__, c) => ({
      r,
      c,
      active: Boolean(def.mask[r][c]),
      carpet: false,
      grass: 0,
      gnomeId: null,
      jelly: 0,
      chain: 0,
      foam: false,
      wallRight: false,
      wallBottom: false,
      blocker: null,
      dropItem: null,
      piece: null,
      isExit: false,
      fallOffset: 0,
      fallOffsetX: 0,
      bounce: 0,
    }))
  );

  for (let c = 0; c < cols; c++) {
    for (let r = rows - 1; r >= 0; r--) {
      if (grid[r][c].active) {
        grid[r][c].isExit = true;
        break;
      }
    }
  }

  for (const [r, c, side] of def.walls || []) {
    if (!grid[r]?.[c]) continue;
    if (side === 'right' || side === 'r') grid[r][c].wallRight = true;
    if (side === 'bottom' || side === 'b') grid[r][c].wallBottom = true;
  }

  for (const [r, c] of def.carpetSeeds || []) {
    if (grid[r]?.[c]?.active) grid[r][c].carpet = true;
  }
  for (const [r, c, hp = 1] of def.boxes || []) {
    if (grid[r]?.[c]?.active) grid[r][c].blocker = { type: 'box', hp };
  }
  for (const [r, c, hp = 1] of def.crates || []) {
    if (grid[r]?.[c]?.active) grid[r][c].blocker = { type: 'crate', hp };
  }
  for (const [r, c] of def.cookies || []) {
    if (grid[r]?.[c]?.active) grid[r][c].blocker = { type: 'cookie', hp: 1 };
  }
  for (const [r, c, hp = 1] of def.acorns || []) {
    if (grid[r]?.[c]?.active) grid[r][c].blocker = { type: 'acorn', hp };
  }
  for (const [r, c] of def.flowerbeds || []) {
    if (grid[r]?.[c]?.active) grid[r][c].blocker = { type: 'flowerbed', hp: 99, stage: 0 };
  }
  for (const [r, c, hp = 2] of def.jellies || []) {
    if (grid[r]?.[c]?.active && !grid[r][c].blocker) {
      grid[r][c].blocker = { type: 'cherry', hp };
    }
  }
  for (const [r, c, layers = 1] of def.grassPatches || []) {
    if (grid[r]?.[c]?.active) grid[r][c].grass = layers;
  }
  for (const gn of gnomes) {
    for (const [gr, gc] of gn.cells) {
      if (grid[gr]?.[gc]?.active) {
        grid[gr][gc].gnomeId = gn.id;
        if (grid[gr][gc].grass <= 0) grid[gr][gc].grass = 1;
      }
    }
  }
  for (const [r, c, hp = 1] of def.chains || []) {
    if (grid[r]?.[c]?.active && !grid[r][c].blocker) grid[r][c].chain = hp;
  }
  for (const [r, c, hp = 1] of def.vines || []) {
    if (grid[r]?.[c]?.active && !grid[r][c].blocker) grid[r][c].chain = hp;
  }
  for (const [r, c] of def.foams || []) {
    if (grid[r]?.[c]?.active && !grid[r][c].blocker) grid[r][c].foam = true;
  }
  for (const [r, c] of def.donuts || []) {
    if (grid[r]?.[c]?.active && !grid[r][c].blocker) {
      grid[r][c].dropItem = 'donut';
      grid[r][c].chain = 0;
      grid[r][c].foam = false;
    }
  }
  for (const [r, c] of def.lemonades || []) {
    if (grid[r]?.[c]?.active && !grid[r][c].blocker) {
      grid[r][c].dropItem = 'lemonade';
      grid[r][c].chain = 0;
      grid[r][c].foam = false;
    }
  }

  attachDynamicGridMetadata(grid, def);
  return grid;
}

export function seedInitialPieces(board, def = board.levelDef) {
  for (let attempt = 0; attempt < 15; attempt++) {
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const cell = board.grid[r][c];
        if (cell.active && !cell.blocker && !cell.dropItem) cell.piece = null;
      }
    }

    for (const [r, c, bColor] of def?.butterflies || []) {
      const cell = board.grid[r]?.[c];
      if (cell?.active && !cell.blocker && !cell.dropItem) {
        const col = Number.isInteger(bColor)
          ? ((bColor % board.numColors) + board.numColors) % board.numColors
          : Math.floor(Math.random() * board.numColors);
        cell.piece = { color: col, power: null, butterfly: true };
      }
    }

    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const cell = board.grid[r][c];
        if (!cell.active || cell.blocker || cell.dropItem || cell.piece) continue;

        const order = Array.from({ length: board.numColors }, (_, i) => i);
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }

        let placed = false;
        for (const col of order) {
          cell.piece = { color: col, power: null };
          if (detectMatches(board.grid, board.gameId).length === 0) {
            placed = true;
            break;
          }
        }
        if (!placed) cell.piece = { color: order[0], power: null };
      }
    }

    for (const [r, c, turns = 9] of def?.clocks || []) {
      let target = board.grid[r]?.[c];
      if (
        !target?.active ||
        !target.piece ||
        target.blocker ||
        target.dropItem ||
        target.foam ||
        target.chain > 0 ||
        target.piece.fuse !== undefined
      ) {
        target = null;
        let bestDist = Infinity;
        for (let rr = 0; rr < board.rows; rr++) {
          for (let cc = 0; cc < board.cols; cc++) {
            const cl = board.grid[rr][cc];
            if (
              cl?.active &&
              cl.piece &&
              !cl.blocker &&
              !cl.dropItem &&
              !cl.foam &&
              cl.chain === 0 &&
              !cl.piece.butterfly &&
              cl.piece.fuse === undefined
            ) {
              const dist = Math.abs(rr - r) + Math.abs(cc - c);
              if (dist < bestDist) {
                bestDist = dist;
                target = cl;
              }
            }
          }
        }
      }
      if (target?.piece) {
        target.piece.fuse = turns;
      }
    }

    if (detectMatches(board.grid, board.gameId).length === 0 && findBestHint(board.grid, board.gameId)) {
      return;
    }
  }
  board.shufflePieces(true);
}

export function applyPresetAndPreBoosters(board, def, preBoosters, winStreak) {
  for (const p of def.presetPowerups || []) {
    const cell = board.grid[p.r]?.[p.c];
    if (cell?.active && !cell.blocker && !cell.dropItem) {
      cell.piece = {
        color: p.power === 'rainbow_ball' || p.power === 'g_rainbow' ? -1 : p.color ?? 0,
        power: p.power,
      };
    }
  }

  const toPlace = [];
  for (const key of preBoosters) {
    if (key === 'pre_rocket_bomb') toPlace.push('rocket_h', 'h_bomb');
    if (key === 'pre_rainbow') {
      toPlace.push(board.gameId === 'homescapes' ? 'rainbow_ball' : 'g_rainbow');
    }
    if (key === 'pre_planes') toPlace.push('paper_plane', 'paper_plane');
    if (key === 'pre_bomb_dynamite') toPlace.push('g_bomb', 'g_dynamite');
    if (key === 'pre_double_bomb') toPlace.push('g_bomb', 'g_bomb');
  }

  if (winStreak >= 1) {
    toPlace.push(board.gameId === 'homescapes' ? 'rocket_v' : 'g_firecracker');
  }
  if (winStreak >= 2) {
    toPlace.push(board.gameId === 'homescapes' ? 'paper_plane' : 'g_bomb');
  }
  if (winStreak >= 3) {
    toPlace.push(board.gameId === 'homescapes' ? 'rainbow_ball' : 'g_rainbow');
  }

  if (toPlace.length === 0) return;
  const candidates = [];
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = board.grid[r][c];
      if (
        cell.active &&
        !cell.blocker &&
        !cell.dropItem &&
        cell.chain === 0 &&
        !cell.foam &&
        !cell.piece?.power &&
        !cell.piece?.butterfly &&
        !cell.piece?.fuse
      ) {
        candidates.push(cell);
      }
    }
  }
  for (const pow of toPlace) {
    if (candidates.length === 0) break;
    const idx = Math.floor(Math.random() * candidates.length);
    const cell = candidates.splice(idx, 1)[0];
    const isRain = pow === 'rainbow_ball' || pow === 'g_rainbow';
    cell.piece = {
      color: isRain ? -1 : cell.piece?.color ?? 0,
      power: pow,
      super: isRain && Boolean(board.superRainbow),
    };
  }
}
