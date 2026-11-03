/**
 * Match-3 Two-Stage Boss Transition & Victory Finale Sequence
 * Extracted from Match3Controller to keep controller sleek and modular (< 430 lines).
 */

import { haptics } from '../utils/haptics.js';
import { sound } from '../utils/sound.js';
import { triggerSinglePowerup } from './powerups.js';

/**
 * Checks whether the current board has a Stage 2 Boss phase and executes a smooth vertical scroll!
 */
export async function maybeTransitionToStage2(ctrl, sid = ctrl.sessionId) {
  const board = ctrl.board;
  if (!board || !board.canAdvanceStage()) return false;
  const aborted = () => sid !== ctrl.sessionId || !ctrl.running || ctrl.board !== board;

  ctrl.busy = true;
  haptics.explosion(2);
  sound.sfxRainbow();
  board.emitFloatingText(
    Math.floor(board.rows / 2),
    Math.floor(board.cols / 2),
    board.gameId === 'homescapes'
      ? '⚡ GIAI ĐOẠN 2 — SÂU TRONG MẬT THẤT!'
      : '⚡ GIAI ĐOẠN 2 — SÂU TRONG RỪNG CẤM!',
    '#72efdd'
  );
  ctrl._ingestFx();
  await ctrl._sleep(480);
  if (aborted()) return false;

  // Smooth upward camera pan effect
  for (let step = 1; step <= 8; step++) {
    ctrl.stageScrollOffsetY = -(step / 8) * (ctrl.tileSize * 2.2);
    await ctrl._sleep(26);
    if (aborted()) return false;
  }

  board.loadNextStage();
  ctrl.stageScrollOffsetY = ctrl.tileSize * 1.8;
  ctrl.resize();
  ctrl.callbacks.onHudSync(board, ctrl.activeBooster);

  for (let step = 7; step >= 0; step--) {
    ctrl.stageScrollOffsetY = (step / 8) * (ctrl.tileSize * 1.8);
    await ctrl._sleep(26);
    if (aborted()) return false;
  }
  ctrl.stageScrollOffsetY = 0;
  board.emitShockwave(Math.floor(board.rows / 2), Math.floor(board.cols / 2), 3.5);
  ctrl._ingestFx();
  await ctrl._sleep(220);
  return !aborted();
}

/**
 * Converts remaining moves into explosive fireworks and emits final Victory summary.
 */
export async function runVictoryFinaleSequence(ctrl, sid = ctrl.sessionId) {
  const board = ctrl.board;
  if (!board || ctrl.finaleActive) return;
  const aborted = () => sid !== ctrl.sessionId || !ctrl.running || ctrl.board !== board;
  ctrl.finaleActive = true;
  haptics.victory();

  const movesToConvert = board.movesLeft;
  const coinPerMove = board.levelDef.nightmare ? 8 : 4;
  const bonusCoins = movesToConvert * coinPerMove;
  board.score += movesToConvert * 120;
  board.emitFloatingText(
    Math.floor(board.rows / 2),
    Math.floor(board.cols / 2),
    '⚡ ĐẠI TIỆC PHÁO HOA PHÉP!',
    '#ffd166'
  );
  ctrl._ingestFx();
  await ctrl._sleep(380);
  if (aborted()) return;

  const visualDrops = Math.min(8, movesToConvert);
  const pool =
    board.gameId === 'homescapes'
      ? ['rocket_h', 'rocket_v', 'paper_plane']
      : ['g_firecracker', 'g_bomb'];

  for (let i = 0; i < visualDrops; i++) {
    board.movesLeft = Math.max(0, board.movesLeft - 1);
    const cands = [];
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const cell = board.grid[r][c];
        if (cell.active && !cell.blocker && !cell.dropItem && cell.piece && !cell.piece.power) {
          cands.push(cell);
        }
      }
    }
    if (cands.length > 0) {
      const picked = cands[Math.floor(Math.random() * cands.length)];
      picked.piece = { color: picked.piece.color, power: pool[i % pool.length] };
      picked.bounce = 1.0;
      sound.sfxPowerupCreate();
      ctrl.callbacks.onHudSync(board, null);
      await ctrl._sleep(90);
      if (aborted()) return;
    }
  }
  board.movesLeft = 0;
  ctrl.callbacks.onHudSync(board, null);

  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      if (board.grid[r][c]?.piece?.power) {
        triggerSinglePowerup(board, r, c);
        ctrl._ingestFx();
        await ctrl._sleep(80);
        if (aborted()) return;
      }
    }
  }
  board.applyGravityAndRefill();
  await ctrl._sleep(340);
  if (aborted()) return;

  sound.sfxVictory();
  ctrl.finaleActive = false;
  ctrl.busy = false;
  ctrl.callbacks.onVictory({
    score: board.score,
    bonusCoins,
    starReward: board.levelDef.starReward,
    coinReward: board.levelDef.coinReward,
  });
}

