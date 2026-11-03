/**
 * Playrix Authentic Power-Ups, Combinations & Gardenscapes Rainbow Blast Charge Meter
 *
 * Homescapes Power-Ups:
 * - rocket_h / rocket_v (Row / Column clear)
 * - h_bomb (2-tile diamond/square radius)
 * - paper_plane (Cross takeoff + seeks highest-priority objective cell on board!)
 * - rainbow_ball (Clears all of a color, or multiplies swapped power-up across board!)
 *
 * Gardenscapes Power-Ups + Charge Gauge:
 * - g_firecracker (Radius 1 explosion, +22% Rainbow Charge)
 * - g_bomb (Radius 2 explosion, +36% Rainbow Charge)
 * - g_dynamite (Radius 3 explosion, +58% Rainbow Charge)
 * - g_tnt (Radius 4 mega explosion, +88% Rainbow Charge)
 * - g_rainbow (Spawned automatically each time Rainbow Charge hits 100%!)
 */

import { hitCell } from './obstacles.js';
import { sound } from '../utils/sound.js';

const RAINBOW_POWERS = new Set(['rainbow_ball', 'g_rainbow']);

export const GARDEN_CHARGE_VALUES = {
  g_firecracker: 24,
  g_bomb: 38,
  g_dynamite: 60,
  g_tnt: 90,
};

export const HOME_CHARGE_VALUES = {
  rocket_h: 20,
  rocket_v: 20,
  paper_plane: 24,
  h_bomb: 36,
};

/**
 * Triggers a single power-up at (r, c) and resolves any chain-reaction power-ups.
 */
export function triggerSinglePowerup(board, r, c, powerInfo = null) {
  const cell = board.grid[r]?.[c];
  const power = powerInfo?.power || cell?.piece?.power;
  if (!power) return;

  const spreadCarpet = Boolean(powerInfo?.carpet ?? cell?.carpet);
  const pieceColor = powerInfo?.color ?? cell?.piece?.color ?? -1;

  if (cell?.piece?.power === power) {
    cell.piece = null;
  }

  const queue = [{ r, c, power, color: pieceColor, carpet: spreadCarpet }];
  const processedGuard = new Set();

  while (queue.length > 0) {
    const cur = queue.shift();
    const key = `${cur.r},${cur.c},${cur.power}`;
    if (processedGuard.has(key)) continue;
    processedGuard.add(key);

    executePowerEffect(board, cur.r, cur.c, cur.power, cur.color, cur.carpet, queue);
  }
}

function executePowerEffect(board, r, c, power, color, carpet, queue) {
  board.score += 120;

  // Patronus (Grounds) & Time-Turner (Castle) Charge Meter contribution!
  const chargeVal =
    board.gameId === 'gardenscapes' ? GARDEN_CHARGE_VALUES[power] : HOME_CHARGE_VALUES[power];
  if (chargeVal) {
    const mult = board.nightmare ? 0.8 : 1.0;
    board.addRainbowCharge(Math.round(chargeVal * mult), r, c);
  }

  if (power === 'rocket_h') {
    sound.sfxRocket();
    board.emitBeam(r, c, 'h');
    const rowCarpet =
      carpet || (board.gameId === 'homescapes' && board.grid[r]?.some((cl) => cl?.active && cl.carpet));
    for (let col = 0; col < board.cols; col++) {
      hitCell(board, r, col, { source: 'powerup', spreadCarpet: rowCarpet, queuedPowerups: queue });
    }
    return;
  }

  if (power === 'rocket_v') {
    sound.sfxRocket();
    board.emitBeam(r, c, 'v');
    const colCarpet =
      carpet || (board.gameId === 'homescapes' && board.grid.some((rowArr) => rowArr[c]?.active && rowArr[c].carpet));
    for (let row = 0; row < board.rows; row++) {
      hitCell(board, row, c, { source: 'powerup', spreadCarpet: colCarpet, queuedPowerups: queue });
    }
    return;
  }

  if (power === 'paper_plane') {
    sound.sfxPlane();
    // 1. Takeoff cross splash (picks up Carpet if any of the 5 cross cells has Carpet!)
    const takeoff = [
      [r, c],
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];
    const planeCarpet =
      carpet ||
      (board.gameId === 'homescapes' &&
        takeoff.some(([tr, tc]) => board.grid[tr]?.[tc]?.active && board.grid[tr][tc].carpet));
    for (const [tr, tc] of takeoff) {
      hitCell(board, tr, tc, { source: 'powerup', spreadCarpet: planeCarpet, queuedPowerups: queue });
    }
    // 2. Fly to best level objective cell!
    const target = choosePaperPlaneTarget(board, r, c);
    if (target) {
      board.emitPlaneFlight(r, c, target.r, target.c, null);
      hitCell(board, target.r, target.c, {
        source: 'powerup',
        spreadCarpet: planeCarpet,
        queuedPowerups: queue,
      });
    }
    return;
  }

  if (power === 'h_bomb') {
    sound.sfxExplosion(2);
    explodeDiamondOrSquare(board, r, c, 2, false, carpet, queue);
    return;
  }

  if (power === 'g_firecracker') {
    sound.sfxExplosion(1);
    explodeDiamondOrSquare(board, r, c, 1, false, carpet, queue);
    return;
  }

  if (power === 'g_bomb') {
    sound.sfxExplosion(2);
    explodeDiamondOrSquare(board, r, c, 2, true, carpet, queue);
    return;
  }

  if (power === 'g_dynamite') {
    sound.sfxExplosion(3);
    explodeDiamondOrSquare(board, r, c, 3, true, carpet, queue);
    return;
  }

  if (power === 'g_tnt') {
    sound.sfxExplosion(4);
    explodeDiamondOrSquare(board, r, c, 4, true, carpet, queue);
    return;
  }

  if (RAINBOW_POWERS.has(power)) {
    sound.sfxRainbow();
    hitCell(board, r, c, { source: 'self', spreadCarpet: carpet, queuedPowerups: queue });
    const targetColor = color >= 0 ? color : findMostCommonColor(board);
    zapColorOnBoard(board, r, c, targetColor, carpet, queue);
    if (board.superRainbow) {
      const secondColor = findMostCommonColor(board, new Set([targetColor]));
      if (secondColor >= 0 && secondColor !== targetColor) {
        board.emitFloatingText(r, c, '⚡🪄 ĐẠI PHÁP X2!', '#ffd166');
        zapColorOnBoard(board, r, c, secondColor, carpet, queue);
      }
    }
  }
}

function explodeDiamondOrSquare(board, r, c, radius, useDiamond, carpet, queue) {
  board.emitShockwave(r, c, radius);
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (useDiamond && Math.abs(dr) + Math.abs(dc) > radius + 1) continue;
      hitCell(board, r + dr, c + dc, {
        source: 'powerup',
        spreadCarpet: carpet,
        queuedPowerups: queue,
      });
    }
  }
}

function zapColorOnBoard(board, srcR, srcC, targetColor, carpet, queue) {
  if (targetColor < 0) return;
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = board.grid[r][c];
      if (!cell?.active || cell.blocker || cell.dropItem) continue;
      if (cell.piece && cell.piece.color === targetColor && !cell.piece.power) {
        board.emitLightning(srcR, srcC, r, c);
        hitCell(board, r, c, { source: 'powerup', spreadCarpet: carpet, queuedPowerups: queue });
      }
    }
  }
}

/**
 * Executes authentic Playrix Two-Power-Up Combinations when swapped together!
 */
export function triggerPowerCombo(board, r1, c1, r2, c2) {
  const cellA = board.grid[r1][c1];
  const cellB = board.grid[r2][c2];
  const pA = cellA.piece?.power;
  const pB = cellB.piece?.power;
  const carpet = Boolean(cellA.carpet || cellB.carpet);

  cellA.piece = null;
  cellB.piece = null;
  const queue = [];

  // Charge bonus for any explosive two-power-up combo (Grounds Patronus & Castle Time-Turner)
  const chargeTable = board.gameId === 'gardenscapes' ? GARDEN_CHARGE_VALUES : HOME_CHARGE_VALUES;
  const gain = (chargeTable[pA] || 15) + (chargeTable[pB] || 15);
  board.addRainbowCharge(Math.round(gain * (board.nightmare ? 0.8 : 1.0)), r2, c2);

  // 1. Double Rainbow -> Full Board Wipe!
  if (RAINBOW_POWERS.has(pA) && RAINBOW_POWERS.has(pB)) {
    sound.sfxRainbow();
    sound.sfxExplosion(4);
    board.emitShockwave(r2, c2, 7);
    board.emitFloatingText(r2, c2, '⚡ LUMOS MAXIMA!', '#ffd166');
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        hitCell(board, r, c, { source: 'powerup', spreadCarpet: carpet, queuedPowerups: queue });
      }
    }
    drainQueue(board, queue);
    return;
  }

  // 2. Rainbow + Any Other Power-Up -> Multiplies that Power-Up across 1 (or 2 with Super Patronus!) colors!
  if (RAINBOW_POWERS.has(pA) || RAINBOW_POWERS.has(pB)) {
    const otherPower = RAINBOW_POWERS.has(pA) ? pB : pA;
    hitCell(board, r1, c1, { source: 'self', spreadCarpet: carpet, queuedPowerups: queue });
    hitCell(board, r2, c2, { source: 'self', spreadCarpet: carpet, queuedPowerups: queue });
    const c1Col = findMostCommonColor(board);
    const targetColors = new Set([c1Col]);
    if (board.superRainbow) {
      const c2Col = findMostCommonColor(board, targetColors);
      if (c2Col >= 0) targetColors.add(c2Col);
    }
    sound.sfxRainbow();
    const superIcon = board.gameId === 'homescapes' ? '⏳✨' : '🦌✨';
    board.emitFloatingText(
      r2,
      c2,
      board.superRainbow ? `${superIcon} SIÊU GEMINIO 2 MÀU!` : '🪄 GEMINIO NHÂN BẢN!',
      '#ffbe0b'
    );
    const converted = [];
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const cell = board.grid[r][c];
        if (
          cell?.active &&
          !cell.blocker &&
          !cell.dropItem &&
          cell.piece &&
          !cell.piece.power &&
          targetColors.has(cell.piece.color)
        ) {
          board.emitLightning(r2, c2, r, c);
          if (cell.chain > 0 || cell.foam) {
            hitCell(board, r, c, { source: 'powerup', spreadCarpet: carpet || cell.carpet, queuedPowerups: queue });
            continue;
          }
          if (cell.piece.butterfly) board.recordGoal('butterfly', 1, r, c);
          if (cell.piece.fuse !== undefined) board.recordGoal('clock', 1, r, c);
          if (cell.piece.color >= 0) board.recordGoal('color', 1, r, c, cell.piece.color);
          const chosenPower =
            otherPower === 'rocket_h' || otherPower === 'rocket_v'
              ? Math.random() < 0.5
                ? 'rocket_h'
                : 'rocket_v'
              : otherPower;
          cell.piece = { color: cell.piece.color, power: chosenPower };
          converted.push({ r, c, power: chosenPower, color: cell.piece.color, carpet: carpet || cell.carpet });
        }
      }
    }
    for (const item of converted) {
      triggerSinglePowerup(board, item.r, item.c, item);
    }
    drainQueue(board, queue);
    return;
  }

  // 3. Hogwarts Howler / Enchanted Memo Plane Combos!
  if (pA === 'paper_plane' && pB === 'paper_plane') {
    sound.sfxPlane();
    board.emitFloatingText(r2, c2, '✉️✉️✉️ BẦY THƯ SẤM HOWLER!', '#c77dff');
    for (const [dr, dc] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
      hitCell(board, r2 + dr, c2 + dc, { source: 'powerup', spreadCarpet: carpet, queuedPowerups: queue });
    }
    const used = new Set();
    for (let i = 0; i < 3; i++) {
      const tgt = choosePaperPlaneTarget(board, r2, c2, used);
      if (tgt) {
        used.add(`${tgt.r},${tgt.c}`);
        board.emitPlaneFlight(r2, c2, tgt.r, tgt.c, null);
        hitCell(board, tgt.r, tgt.c, { source: 'powerup', spreadCarpet: carpet, queuedPowerups: queue });
      }
    }
    drainQueue(board, queue);
    return;
  }

  if (pA === 'paper_plane' || pB === 'paper_plane') {
    const payload = pA === 'paper_plane' ? pB : pA;
    sound.sfxPlane();
    const cross = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
    const comboCarpet =
      carpet ||
      (board.gameId === 'homescapes' &&
        cross.some(([dr, dc]) => board.grid[r2 + dr]?.[c2 + dc]?.active && board.grid[r2 + dr][c2 + dc].carpet));
    for (const [dr, dc] of cross) {
      hitCell(board, r2 + dr, c2 + dc, { source: 'powerup', spreadCarpet: comboCarpet, queuedPowerups: queue });
    }
    const tgt = choosePaperPlaneTarget(board, r2, c2) || { r: r2, c: c2 };
    board.emitPlaneFlight(r2, c2, tgt.r, tgt.c, payload);
    board.emitFloatingText(tgt.r, tgt.c, '✉️ THƯ SẤM MANG BOM!', '#ff9f1c');
    executePowerEffect(board, tgt.r, tgt.c, payload, -1, comboCarpet, queue);
    drainQueue(board, queue);
    return;
  }

  // 4. Broomstick Rocket + Rocket -> Row + Column Cross Blast!
  const isRocketA = pA === 'rocket_h' || pA === 'rocket_v';
  const isRocketB = pB === 'rocket_h' || pB === 'rocket_v';
  if (isRocketA && isRocketB) {
    sound.sfxRocket();
    board.emitBeam(r2, c2, 'h');
    board.emitBeam(r2, c2, 'v');
    const rowC = carpet || (board.gameId === 'homescapes' && board.grid[r2]?.some((cl) => cl?.active && cl.carpet));
    const colC = carpet || (board.gameId === 'homescapes' && board.grid.some((ra) => ra[c2]?.active && ra[c2].carpet));
    for (let col = 0; col < board.cols; col++) {
      hitCell(board, r2, col, { source: 'powerup', spreadCarpet: rowC || (col === c2 && colC), queuedPowerups: queue });
    }
    for (let row = 0; row < board.rows; row++) {
      if (row === r2) continue;
      hitCell(board, row, c2, { source: 'powerup', spreadCarpet: colC, queuedPowerups: queue });
    }
    drainQueue(board, queue);
    return;
  }

  // 5. Broomstick Rocket + Cauldron Bomb -> Giant 3-Row + 3-Column Blast!
  if ((isRocketA && pB === 'h_bomb') || (isRocketB && pA === 'h_bomb')) {
    sound.sfxRocket();
    sound.sfxExplosion(3);
    board.emitFloatingText(r2, c2, '🧹💥 TIA CHỚP QUÉT 3 HÀNG!', '#ff595e');
    const hitSet = new Set();
    const hitOnce = (rr, cc) => {
      const key = `${rr},${cc}`;
      if (hitSet.has(key)) return;
      hitSet.add(key);
      hitCell(board, rr, cc, { source: 'powerup', spreadCarpet: carpet, queuedPowerups: queue });
    };
    for (let d = -1; d <= 1; d++) {
      if (r2 + d >= 0 && r2 + d < board.rows) {
        board.emitBeam(r2 + d, c2, 'h');
        for (let col = 0; col < board.cols; col++) hitOnce(r2 + d, col);
      }
      if (c2 + d >= 0 && c2 + d < board.cols) {
        board.emitBeam(r2, c2 + d, 'v');
        for (let row = 0; row < board.rows; row++) hitOnce(row, c2 + d);
      }
    }
    drainQueue(board, queue);
    return;
  }

  // 6. Dual Explosives (Cauldron Bomb+Bomb OR Weasley Fireworks combos!)
  const radMap = { h_bomb: 2, g_firecracker: 1, g_bomb: 2, g_dynamite: 3, g_tnt: 4 };
  const combinedRadius = Math.min(6, Math.max(radMap[pA] || 2, radMap[pB] || 2) + 2);
  sound.sfxExplosion(combinedRadius);
  board.emitFloatingText(r2, c2, '💥 BOMBARDA MAXIMA!', '#ffbe0b');
  explodeDiamondOrSquare(board, r2, c2, combinedRadius, false, carpet, queue);
  drainQueue(board, queue);
}

function drainQueue(board, queue) {
  const seen = new Set();
  while (queue.length > 0) {
    const cur = queue.shift();
    const k = `${cur.r},${cur.c},${cur.power}`;
    if (seen.has(k)) continue;
    seen.add(k);
    executePowerEffect(board, cur.r, cur.c, cur.power, cur.color, cur.carpet, queue);
  }
}

export function findMostCommonColor(board, excludeColors = new Set()) {
  const counts = new Map();
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const p = board.grid[r][c]?.piece;
      if (p && p.color >= 0 && !RAINBOW_POWERS.has(p.power) && !excludeColors.has(p.color)) {
        counts.set(p.color, (counts.get(p.color) || 0) + 1);
      }
    }
  }
  let bestColor = -1;
  let bestCount = -1;
  for (const [col, cnt] of counts.entries()) {
    if (cnt > bestCount) {
      bestCount = cnt;
      bestColor = col;
    }
  }
  return bestColor >= 0 ? bestColor : 0;
}

/**
 * Homescapes Paper Plane AI: scores every cell on the board to hit unfulfilled level goals first!
 */
export function choosePaperPlaneTarget(board, srcR, srcC, excludeSet = new Set()) {
  let best = null;
  let bestPriority = -1;
  const needCarpet = board.hasRemainingGoal('carpet');
  const neededColors = board.getRemainingGoalColors();

  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      if (r === srcR && c === srcC) continue;
      if (excludeSet.has(`${r},${c}`)) continue;
      const cell = board.grid[r][c];
      if (!cell?.active || cell.dropItem) continue;

      let prio = 1 + Math.random() * 0.5;
      if (cell.piece?.fuse && cell.piece.fuse <= 4) prio = 110 + Math.random();
      else if (cell.blocker?.type === 'cookie') prio = 102 + Math.random();
      else if (cell.foam) prio = 98 + Math.random();
      else if (cell.piece?.butterfly) prio = 96 + Math.random();
      else if (cell.blocker?.type === 'cherry' || cell.jelly > 0) prio = 95 + Math.random();
      else if (cell.blocker?.type === 'firefly') prio = 94.5 + Math.random();
      else if ((cell.blocker?.type === 'clam' || cell.blocker?.type === 'portrait') && cell.blocker.open !== false) prio = 94 + Math.random();
      else if (cell.blocker?.type === 'acorn') prio = 92 + Math.random();
      else if (cell.chain > 0) prio = 90 + Math.random();
      else if (cell.piece?.fuse) prio = 88 + Math.random();
      else if (cell.blocker) prio = 85 + Math.random();
      else if (needCarpet && !cell.carpet) prio = 80 + Math.random();
      else if (cell.piece && neededColors.has(cell.piece.color)) prio = 65 + Math.random();

      if (prio > bestPriority) {
        bestPriority = prio;
        best = { r, c };
      }
    }
  }
  return best;
}

