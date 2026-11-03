/**
 * Unified 24-Vault Gringotts & Forbidden Forest Physics Pin Registry
 * - 12 Castle Vaults (Homescapes: Giải Cứu Hedwig & Ký Ức)
 * - 12 Grounds Vaults (Gardenscapes: Kho Báu Niffler & Rừng Cấm)
 * - Progressive unlock: 2 vaults at Level 1, +1 vault every 5 Match-3 levels up to 12/12!
 */

import { GARDEN_PIN_PUZZLES } from './pinPuzzlesGarden.js';
import { HOME_PIN_PUZZLES } from './pinPuzzlesHome.js';

export { GARDEN_PIN_PUZZLES, HOME_PIN_PUZZLES };
export const PIN_PUZZLES = HOME_PIN_PUZZLES;

export function getGamePinPuzzles(gameId) {
  return gameId === 'gardenscapes' ? GARDEN_PIN_PUZZLES : HOME_PIN_PUZZLES;
}

export function getUnlockedPinCount(level = 1) {
  return Math.min(12, Math.max(2, 2 + Math.floor((Math.max(1, level) - 1) / 5)));
}

export function countUnsolvedUnlockedPins(gameId, save) {
  const list = getGamePinPuzzles(gameId);
  const unlocked = getUnlockedPinCount(save?.level || 1);
  const done = new Set(save?.completedPinIds || []);
  let count = 0;
  for (let i = 0; i < unlocked && i < list.length; i++) {
    if (!done.has(list[i].id)) count++;
  }
  return count;
}
