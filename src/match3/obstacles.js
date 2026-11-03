/**
 * Playrix Obstacles, Under-layers & Level Objective Handlers
 * Handles Carpet spreading (Homescapes), Hidden Gnomes (1x2 & 2x2) under Grass,
 * Blooming Flowerbeds, Soap Foam / Sticky Honey, Fallable Acorns, Butterflies,
 * Alarm Clocks, Cookies, Boxes/Crates, Chains/Vines, Cherries in Jelly, and Donuts/Lemonades.
 */

import { hasWallBetween } from './matchDetector.js';
import { sound } from '../utils/sound.js';

/**
 * Applies 1 hit to cell (r, c) from a match, adjacent splash, power-up, or booster.
 */
export function hitCell(board, r, c, opts = {}) {
  const { source = 'match', spreadCarpet = false, queuedPowerups = [] } = opts;
  if (r < 0 || r >= board.rows || c < 0 || c >= board.cols) return;
  const cell = board.grid[r][c];
  if (!cell || !cell.active) return;

  // 0. Soap Foam (Homescapes) / Sticky Honey (Gardenscapes) overlay!
  if (cell.foam) {
    cell.foam = false;
    board.foamClearedThisTurn = true;
    board.recordGoal('foam', 1, r, c);
    board.emitFx('spark', r, c, board.gameId === 'homescapes' ? '#dff7ff' : '#ffb703');
    if (spreadCarpet && board.gameId === 'homescapes' && !cell.carpet) {
      cell.carpet = true;
      sound.sfxCarpet();
      board.syncCarpetGoal();
    }
    // Adjacent 3-match splash peels off Foam/Honey without destroying the freed piece underneath
    if (source === 'adjacent') return;
  }

  // 1. Chain / Ivy Vine absorbs hit first and frees the piece underneath
  if (cell.chain > 0) {
    if (source === 'adjacent') return;
    cell.chain -= 1;
    board.chainClearedThisTurn = true;
    board.recordGoal('chain', 1, r, c);
    board.emitFx('spark', r, c, board.gameId === 'homescapes' ? '#adb5bd' : '#40916c');
    if (spreadCarpet && board.gameId === 'homescapes' && !cell.carpet) {
      cell.carpet = true;
      sound.sfxCarpet();
      board.syncCarpetGoal();
    }
    return;
  }

  // 2. Blockers occupying the cell (Box, Crate, Cookie, Acorn, Flowerbed)
  if (cell.blocker) {
    const b = cell.blocker;
    if (b.type === 'cookie') {
      if (source !== 'powerup' && source !== 'booster') return;
      cell.blocker = null;
      board.recordGoal('cookie', 1, r, c);
      board.emitFx('crumb', r, c, '#d4a373');
    } else if (b.type === 'acorn') {
      b.hp -= 1;
      board.emitFx('wood', r, c, '#a1662f');
      if (b.hp <= 0) {
        cell.blocker = null;
        board.recordGoal('acorn', 1, r, c);
      }
    } else if (b.type === 'cherry') {
      b.hp -= 1;
      board.emitFx('spark', r, c, b.hp > 0 ? '#ff758f' : '#e63946');
      if (b.hp <= 0) {
        cell.blocker = null;
        board.recordGoal('cherry', 1, r, c);
        board.emitFloatingText(r, c, '🍬 Đậu phép!', '#ff4d6d');
      }
    } else if (b.type === 'box' || b.type === 'crate') {
      b.hp -= 1;
      board.emitFx('wood', r, c, b.type === 'box' ? '#c68b59' : '#9c6644');
      if (b.hp <= 0) {
        const bType = b.type;
        cell.blocker = null;
        board.recordGoal(bType, 1, r, c);
      }
    } else if (b.type === 'clam') {
      if (source === 'adjacent' && b.open === false) {
        cell.bounce = 0.65;
        return;
      }
      cell.blocker = null;
      board.recordGoal('clam', 1, r, c);
      board.emitFx('spark', r, c, '#e0aaff');
      board.emitFloatingText(r, c, '🐚 Ngọc Sò Phép!', '#ffd166');
      board.score += 180;
    } else if (b.type === 'portrait') {
      if (source === 'adjacent' && b.open === false) {
        cell.bounce = 0.65;
        return;
      }
      b.hp = (b.hp || 2) - 1;
      board.emitFx('spark', r, c, '#ffd166');
      if (b.hp <= 0) {
        cell.blocker = null;
        board.recordGoal('portrait', 1, r, c);
        board.emitFloatingText(r, c, '🖼️ Mở Khung Tranh!', '#ffd166');
        board.score += 200;
      }
    } else if (b.type === 'firefly') {
      b.hp = Math.max(0, (b.hp || 3) - 1);
      board.recordGoal('firefly', 1, r, c);
      board.emitFx('spark', r, c, '#72efdd');
      board.score += 90;
      if (b.hp <= 0) {
        cell.blocker = null;
        board.emitFloatingText(r, c, '✨ Đom Đóm Bay!', '#72efdd');
      }
    } else if (b.type === 'flowerbed') {
      b.stage = (b.stage || 0) + 1;
      board.emitFx('petal', r, c, '#ff758f');
      if (b.stage >= 3) {
        b.stage = 0;
        board.recordGoal('bloom', 3, r, c);
        board.emitFloatingText(r, c, '+3 🪴 Mandrake!', '#ff4d6d');
      }
      return;
    }

    if (!cell.blocker && spreadCarpet && board.gameId === 'homescapes' && !cell.carpet) {
      cell.carpet = true;
      board.syncCarpetGoal();
    }
    return;
  }

  // 3. Spread Gryffindor Tapestry Carpet onto open active floor
  if (spreadCarpet && board.gameId === 'homescapes' && !cell.carpet) {
    cell.carpet = true;
    sound.sfxCarpet();
    board.emitFx('carpet', r, c, '#d90429');
    board.syncCarpetGoal();
  }

  // 4. Under-layers: Cherries in Jelly (Homescapes) & Grass + Hidden Gnomes (Gardenscapes)
  if (cell.jelly > 0 && source !== 'adjacent') {
    cell.jelly = 0;
    board.recordGoal('cherry', 1, r, c);
    board.emitFx('spark', r, c, '#e63946');
  }

  if (cell.grass > 0 && source !== 'adjacent') {
    cell.grass -= 1;
    board.recordGoal('grass', 1, r, c);
    board.emitFx('leaf', r, c, '#52b788');
    checkUncoveredGnomes(board);
  }

  // 5. Drop items (Donut / Lemonade) are immune to destruction!
  if (cell.dropItem) {
    return;
  }

  // 6. Piece on the cell (including Butterfly & Alarm Clock attachments!)
  if (cell.piece && source !== 'adjacent') {
    const p = cell.piece;
    cell.piece = null;

    if (p.butterfly) {
      board.recordGoal('butterfly', 1, r, c);
      board.emitFloatingText(r, c, '🦋 Bướm phép!', '#ff758f');
      board.score += 180;
    }
    if (p.fuse) {
      board.recordGoal('clock', 1, r, c);
      board.emitFloatingText(r, c, '⏳ Hóa giải!', '#4cc9f0');
      board.score += 150;
    }

    if (p.power && source !== 'self') {
      queuedPowerups.push({
        r,
        c,
        power: p.power,
        color: p.color,
        carpet: cell.carpet,
      });
    } else if (p.color >= 0) {
      board.recordGoal('color', 1, r, c, p.color);
      board.score += 30;
      board.emitPiecePop(r, c, p.color);
    }
  }
}

/**
 * Applies adjacent match splash to Cardboard Boxes, Crates, Acorns, Flowerbeds, and Soap Foam / Honey.
 * Respects Partition Walls!
 */
export function damageAdjacentBlockers(board, matchedCells, spreadCarpet = false) {
  const hitSet = new Set();
  const matchedKeySet = new Set(matchedCells.map((pt) => `${pt.r},${pt.c}`));
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (const pt of matchedCells) {
    for (const [dr, dc] of dirs) {
      const nr = pt.r + dr;
      const nc = pt.c + dc;
      const key = `${nr},${nc}`;
      if (matchedKeySet.has(key) || hitSet.has(key)) continue;
      if (nr < 0 || nr >= board.rows || nc < 0 || nc >= board.cols) continue;
      if (hasWallBetween(board.grid, pt.r, pt.c, nr, nc)) continue;

      const neighbor = board.grid[nr][nc];
      if (!neighbor?.active) continue;

      if (neighbor.foam) {
        hitSet.add(key);
        hitCell(board, nr, nc, { source: 'adjacent', spreadCarpet: false });
        continue;
      }

      if (!neighbor.blocker) continue;
      if (neighbor.blocker.type === 'cookie') continue;
      hitSet.add(key);
      hitCell(board, nr, nc, { source: 'adjacent', spreadCarpet });
    }
  }
}

/**
 * Checks if any Hidden Garden Gnome (1x2, 2x1, or 2x2) has had all covering Grass tiles cleared.
 */
export function checkUncoveredGnomes(board) {
  if (!board.gnomes || board.gnomes.length === 0) return;
  for (const gnome of board.gnomes) {
    if (gnome.rescued) continue;
    const allClear = gnome.cells.every(([gr, gc]) => {
      const cell = board.grid[gr]?.[gc];
      return !cell || cell.grass <= 0;
    });
    if (allClear) {
      gnome.rescued = true;
      const [ar, ac] = gnome.cells[0];
      sound.sfxGnome();
      board.recordGoal('gnome', 1, ar, ac);
      board.emitFloatingText(ar, ac, '🧙‍♂️ Tượng Phù Thủy!', '#ffb703');
      board.score += 260;
    }
  }
}

/**
 * Collects Gringotts Keys (Castle) or Butterbeer Goblets (Grounds) sitting on bottom exit cells.
 */
export function collectDropExits(board) {
  let collected = false;
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = board.grid[r][c];
      if (cell?.active && cell.isExit && cell.dropItem && cell.chain === 0 && !cell.foam) {
        const itemType = cell.dropItem;
        cell.dropItem = null;
        board.recordGoal(itemType, 1, r, c);
        board.emitFloatingText(
          r,
          c,
          itemType === 'donut' ? '🔑 Mở kho vàng!' : '🍺 Bia Bơ thơm!',
          '#ff9f1c'
        );
        sound.sfxCoin();
        board.score += 300;
        collected = true;
      }
    }
  }
  return collected;
}
