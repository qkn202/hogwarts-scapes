/**
 * Playrix Gravity Physics (Vertical + Diagonal Slide Around Blockers)
 * & Turn-End Board Mechanics (Soap Foam / Honey Spread, Rising Butterflies, Alarm Clocks).
 */

import { advanceStreamsAndClams, applyPortalTeleport } from './dynamicMechanics.js';
import { hasWallBetween } from './matchDetector.js';
import { sound } from '../utils/sound.js';

function isFallableBlocker(blocker) {
  return blocker?.type === 'cookie' || blocker?.type === 'acorn';
}

function isMovableCell(cell) {
  if (!cell.active || cell.chain > 0 || cell.foam) return false;
  if (cell.blocker) return isFallableBlocker(cell.blocker);
  return Boolean(cell.piece || cell.dropItem);
}

function isEmptyCell(cell) {
  return cell.active && !cell.blocker && !cell.dropItem && !cell.piece && cell.chain === 0 && !cell.foam;
}

function isStaticStopper(cell) {
  if (!cell.active) return false;
  if (cell.chain > 0 || cell.foam) return true;
  return Boolean(cell.blocker && !isFallableBlocker(cell.blocker));
}

function transferCellPayload(dest, src, dy, dx = 0) {
  dest.piece = src.piece;
  dest.dropItem = src.dropItem;
  dest.blocker = src.blocker;
  dest.fallOffset = Math.max(dest.fallOffset || 0, dy);
  dest.fallOffsetX = dx;
  dest.bounce = 1.0;

  src.piece = null;
  src.dropItem = null;
  src.blocker = null;
}

/**
 * Executes Playrix vertical fall + diagonal slide under overhangs/boxes/walls + top refill.
 */
export function applyPlayrixGravity(board) {
  let anyMoved = false;
  // Split-island boards: inactive gaps are solid; only Apparition Portals carry pieces across.
  const stagePortals = (board.activeStageDef || board.levelDef)?.portals || [];
  const hasPortals = stagePortals.length > 0;
  const portalCols = new Set(stagePortals.map((p) => p.from[1]));

  for (let pass = 0; pass < board.rows + 2; pass++) {
    let passMoved = false;

    // 0. Apparition Portal Teleport across split island gaps
    if (applyPortalTeleport(board, isEmptyCell, isMovableCell, transferCellPayload)) {
      passMoved = true;
      anyMoved = true;
    }

    // 1. Vertical fall in each column (respecting wallBottom & static stoppers)
    for (let c = 0; c < board.cols; c++) {
      for (let r = board.rows - 1; r > 0; r--) {
        const dest = board.grid[r][c];
        if (!isEmptyCell(dest)) continue;

        let srcR = r - 1;
        while (srcR >= 0) {
          if (hasWallBetween(board.grid, srcR, c, srcR + 1, c)) break;
          const cand = board.grid[srcR][c];
          if (!cand.active) {
            if (hasPortals) break;
            srcR--;
            continue;
          }
          if (isStaticStopper(cand)) break;
          if (isMovableCell(cand)) {
            transferCellPayload(dest, cand, r - srcR, 0);
            passMoved = true;
            anyMoved = true;
            break;
          }
          srcR--;
        }
      }
    }

    // 2. Top-of-column spawning into unblocked top segments
    let activeDropItems = 0;
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        if (board.grid[r][c].dropItem) activeDropItems++;
      }
    }

    for (let c = 0; c < board.cols; c++) {
      let seenActive = false;
      let segmentBlocked = false;
      for (let r = 0; r < board.rows; r++) {
        if (r > 0 && hasWallBetween(board.grid, r - 1, c, r, c)) break;
        const cell = board.grid[r][c];
        if (!cell.active) {
          // Portal columns: lower island is fed only through the portal.
          // Non-portal columns: lower island receives fresh magical refills directly
          // (even when the upper island's column is capped by a crate/clam).
          if (hasPortals && seenActive && portalCols.has(c)) break;
          if (hasPortals && seenActive) segmentBlocked = false;
          continue;
        }
        seenActive = true;
        if (segmentBlocked) continue;
        if (isStaticStopper(cell)) {
          if (hasPortals && !portalCols.has(c)) {
            segmentBlocked = true;
            continue;
          }
          break;
        }
        if (isEmptyCell(cell)) {
          const dropAllowed = !hasPortals || portalCols.has(c);
          if (dropAllowed && board.pendingDrops > 0 && activeDropItems < 2 && Math.random() < 0.35) {
            cell.dropItem = board.gameId === 'homescapes' ? 'donut' : 'lemonade';
            board.pendingDrops -= 1;
            activeDropItems += 1;
          } else {
            cell.piece = { color: Math.floor(Math.random() * board.numColors), power: null };
          }
          cell.fallOffset = Math.max(1.2, r + 1.2);
          cell.fallOffsetX = 0;
          cell.bounce = 1.0;
          passMoved = true;
          anyMoved = true;
        }
      }
    }

    // 3. Diagonal Gravity Slide! Fills pockets underneath Boxes/Crates/Walls
    for (let r = board.rows - 1; r > 0; r--) {
      for (let c = 0; c < board.cols; c++) {
        const dest = board.grid[r][c];
        if (!isEmptyCell(dest)) continue;

        // Only slide diagonally if vertical supply directly above is blocked
        const aboveBlocked =
          hasWallBetween(board.grid, r - 1, c, r, c) ||
          !board.grid[r - 1][c].active ||
          isStaticStopper(board.grid[r - 1][c]);
        if (!aboveBlocked) continue;

        const dirs = Math.random() < 0.5 ? [-1, 1] : [1, -1];
        for (const dc of dirs) {
          const sc = c + dc;
          if (sc < 0 || sc >= board.cols) continue;
          const diagSrc = board.grid[r - 1][sc];
          if (!isMovableCell(diagSrc)) continue;
          // Ensure neither horizontal nor vertical wall blocks the corner slide
          if (
            hasWallBetween(board.grid, r - 1, sc, r - 1, c) &&
            hasWallBetween(board.grid, r, sc, r, c)
          ) {
            continue;
          }
          // Prefer letting diagSrc fall straight down if its own column below is empty
          const belowDiag = board.grid[r][sc];
          if (belowDiag?.active && isEmptyCell(belowDiag) && !hasWallBetween(board.grid, r - 1, sc, r, sc)) {
            continue;
          }
          transferCellPayload(dest, diagSrc, 1, dc);
          passMoved = true;
          anyMoved = true;
          break;
        }
      }
    }

    if (!passMoved) break;
  }

  return anyMoved;
}

/**
 * Executes Playrix end-of-turn hazard updates after a player move finishes cascading:
 * 1. Soap Foam / Sticky Honey spreads 1 tile if none was cleared this turn.
 * 2. Gardenscapes Butterflies flutter 1 row upward.
 * 3. Alarm Clocks tick down 1 turn.
 */
export function advanceTurnMechanics(board) {
  let triggered = false;

  // 0. Enchanted Water Streams & Alternating Enchanted Clams
  if (advanceStreamsAndClams(board)) {
    triggered = true;
  }

  // 1. Soap Foam / Sticky Honey spread
  if (!board.foamClearedThisTurn) {
    const spreadCandidates = [];
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        if (!board.grid[r][c].foam) continue;
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= board.rows || nc < 0 || nc >= board.cols) continue;
          if (hasWallBetween(board.grid, r, c, nr, nc)) continue;
          const tgt = board.grid[nr][nc];
          if (
            tgt?.active &&
            !tgt.foam &&
            !tgt.blocker &&
            !tgt.dropItem &&
            tgt.chain === 0 &&
            tgt.piece &&
            !tgt.piece.power
          ) {
            spreadCandidates.push(tgt);
          }
        }
      }
    }
    if (spreadCandidates.length > 0) {
      const picked = spreadCandidates[Math.floor(Math.random() * spreadCandidates.length)];
      picked.foam = true;
      board.emitFx('spark', picked.r, picked.c, board.gameId === 'homescapes' ? '#e0aaff' : '#ffb703');
      board.emitFloatingText(
        picked.r,
        picked.c,
        board.gameId === 'homescapes' ? '🧪 Độc dược lan!' : '🍯 Mật phép tràn!',
        board.gameId === 'homescapes' ? '#c77dff' : '#ffb703'
      );
      triggered = true;
    }
  }
  board.foamClearedThisTurn = false;

  // 1b. Gardenscapes Whomping Willow Root Spread (if active & no vine broken this turn, max 4 vines)
  const stageDef = board.activeStageDef || board.levelDef;
  if (board.gameId === 'gardenscapes' && stageDef?.willowActive && !board.chainClearedThisTurn) {
    let chainCount = 0;
    const vineCandidates = [];
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        if (board.grid[r][c].chain > 0) {
          chainCount++;
          for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= board.rows || nc < 0 || nc >= board.cols) continue;
            if (hasWallBetween(board.grid, r, c, nr, nc)) continue;
            const tgt = board.grid[nr][nc];
            if (tgt?.active && !tgt.foam && !tgt.blocker && !tgt.dropItem && tgt.chain === 0 && tgt.piece && !tgt.piece.power) {
              vineCandidates.push(tgt);
            }
          }
        }
      }
    }
    if (chainCount > 0 && chainCount < 4 && vineCandidates.length > 0) {
      const picked = vineCandidates[Math.floor(Math.random() * vineCandidates.length)];
      picked.chain = 1;
      board.emitFx('leaf', picked.r, picked.c, '#2d6a4f');
      board.emitFloatingText(picked.r, picked.c, '🌿 Rễ Liễu Roi quấn!', '#52b788');
      triggered = true;
    }
  }
  board.chainClearedThisTurn = false;

  // 2. Gardenscapes Butterflies flutter up 1 row
  for (let r = 1; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = board.grid[r][c];
      if (!cell.active || cell.chain > 0 || cell.foam || !cell.piece?.butterfly) continue;
      if (hasWallBetween(board.grid, r - 1, c, r, c)) continue;
      const above = board.grid[r - 1][c];
      if (
        above?.active &&
        !above.blocker &&
        !above.dropItem &&
        above.chain === 0 &&
        !above.foam &&
        above.piece &&
        !above.piece.butterfly &&
        !above.piece.power
      ) {
        const tmp = above.piece;
        above.piece = cell.piece;
        cell.piece = tmp;
        above.fallOffset = -0.7;
        triggered = true;
      }
    }
  }

  // 3. Alarm Clocks countdown (if fuse hits 0 -> immediate level hazard failure, NEVER credits goal!)
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const p = board.grid[r][c]?.piece;
      if (p?.fuse !== undefined && p.fuse > 0) {
        p.fuse -= 1;
        if (p.fuse === 0) {
          board.clockExploded = true;
          sound.sfxInvalid();
          board.emitShockwave(r, c, 1.8);
          board.emitFloatingText(r, c, '⏳ BÙA ĐẾM NGƯỢC NỔ!', '#ff4d6d');
          triggered = true;
        }
      }
    }
  }

  return triggered;
}
