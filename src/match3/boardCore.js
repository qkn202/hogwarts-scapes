/**
 * Core Playrix Match-3 Board State Machine (Shared by Homescapes & Gardenscapes)
 * Manages cascades, diagonal gravity, turn-end hazards, boosters, and Gardenscapes Rainbow Charge.
 */

import { advanceTurnMechanics, applyPlayrixGravity } from './boardPhysics.js';
import { applyPresetAndPreBoosters, buildInitialGrid, seedInitialPieces } from './boardSetup.js';
import { detectMatches, findBestHint, hasWallBetween, isCellSwappable, isValidMove } from './matchDetector.js';
import { collectDropExits, damageAdjacentBlockers, hitCell } from './obstacles.js';
import { triggerPowerCombo, triggerSinglePowerup } from './powerups.js';
import { sound } from '../utils/sound.js';

export class Match3Board {
  constructor(levelDef, activePreBoosters = [], winStreak = 0) {
    this.gameId = levelDef.gameId;
    this.levelDef = levelDef;
    this.rows = levelDef.rows;
    this.cols = levelDef.cols;
    this.numColors = levelDef.colors;
    this.movesLeft = levelDef.moves;
    this.score = 0;
    this.rainbowCharge = 0;
    this.pendingRainbows = 0;
    this.foamClearedThisTurn = false;
    this.clockExploded = false;
    this.hasActed = false;
    this.winStreak = winStreak;
    this.nightmare = Boolean(levelDef.nightmare);
    this.superRainbow = winStreak >= 10;
    this.stageIndex = 0;
    this.totalStages = levelDef.stage2 ? 2 : 1;
    this.activeStageDef = levelDef;

    this.goals = levelDef.goals.map((g) => ({ ...g, current: 0 }));
    this.gnomes = (levelDef.gnomes || []).map((gn) => ({
      id: gn.id,
      cells: gn.cells.map(([r, c]) => [r, c]),
      rescued: false,
    }));

    const dropGoal = this.goals.find((g) => g.type === 'donut' || g.type === 'lemonade');
    const placedDrops = (levelDef.donuts?.length || 0) + (levelDef.lemonades?.length || 0);
    this.pendingDrops = dropGoal ? Math.max(0, dropGoal.target - placedDrops) : 0;

    this.fxEvents = [];
    this.grid = buildInitialGrid(this.rows, this.cols, levelDef, this.gnomes);
    seedInitialPieces(this, levelDef);
    applyPresetAndPreBoosters(this, levelDef, activePreBoosters, winStreak);
    this.syncCarpetGoal();
  }

  addRainbowCharge(amount, srcR, srcC) {
    this.rainbowCharge += amount;
    this.fxEvents.push({ type: 'charge_orb', r: srcR, c: srcC, amount });
    while (this.rainbowCharge >= 100) {
      this.rainbowCharge -= 100;
      this.pendingRainbows += 1;
    }
  }

  spawnPendingRainbows() {
    while (this.pendingRainbows > 0) {
      this.pendingRainbows -= 1;
      const candidates = [];
      const fallback = [];
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const cell = this.grid[r][c];
          if (
            cell.active &&
            !cell.blocker &&
            !cell.dropItem &&
            cell.piece &&
            !cell.piece.power &&
            !cell.piece.butterfly &&
            cell.piece.fuse === undefined
          ) {
            if (!cell.foam && cell.chain === 0) candidates.push(cell);
            else fallback.push(cell);
          }
        }
      }
      const pool = candidates.length > 0 ? candidates : fallback;
      if (pool.length > 0) {
        const picked = pool[Math.floor(Math.random() * pool.length)];
        picked.foam = false;
        picked.chain = 0;
        const isHome = this.gameId === 'homescapes';
        picked.piece = {
          color: -1,
          power: isHome ? 'rainbow_ball' : 'g_rainbow',
          super: Boolean(this.superRainbow),
        };
        picked.bounce = 1.0;
        sound.sfxRainbow();
        this.emitFloatingText(
          picked.r,
          picked.c,
          isHome
            ? this.superRainbow
              ? '⏳✨ SIÊU XOAY THỜI GIAN!'
              : '⏳ XOAY THỜI GIAN!'
            : this.superRainbow
              ? '🦌✨ SIÊU THẦN HỘ MỆNH!'
              : '🦌 THẦN HỘ MỆNH!',
          '#ffd166'
        );
        this.emitShockwave(picked.r, picked.c, 1.5);
      }
    }
  }

  syncCarpetGoal() {
    const carpetGoal = this.goals.find((g) => g.type === 'carpet');
    if (!carpetGoal) return;
    let count = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c].active && this.grid[r][c].carpet) count++;
      }
    }
    carpetGoal.current = Math.min(carpetGoal.target, count);
  }

  recordGoal(type, amount = 1, r = 0, c = 0, color = -1) {
    for (const g of this.goals) {
      if (g.type !== type) continue;
      if (type === 'color' && g.color !== color) continue;
      if (g.current < g.target) {
        g.current = Math.min(g.target, g.current + amount);
        this.fxEvents.push({ type: 'goal_fly', goalType: type, color, r, c });
      }
    }
  }

  hasRemainingGoal(type) {
    return this.goals.some((g) => g.type === type && g.current < g.target);
  }

  getRemainingGoalColors() {
    const set = new Set();
    for (const g of this.goals) {
      if (g.type === 'color' && g.current < g.target) set.add(g.color);
    }
    return set;
  }

  allGoalsComplete() {
    this.syncCarpetGoal();
    return this.goals.every((g) => g.current >= g.target);
  }

  canAdvanceStage() {
    return Boolean(this.stageIndex === 0 && this.levelDef.stage2 && this.allGoalsComplete());
  }

  loadNextStage() {
    if (!this.levelDef.stage2) return false;
    const s2 = this.levelDef.stage2;
    this.hasActed = true;
    this.stageIndex = 1;
    this.streamReversed = false;
    this.activeStageDef = s2;
    this.goals = s2.goals.map((g) => ({ ...g, current: 0 }));
    this.gnomes = (s2.gnomes || []).map((gn) => ({
      id: gn.id,
      cells: gn.cells.map(([r, c]) => [r, c]),
      rescued: false,
    }));
    const dropGoal = this.goals.find((g) => g.type === 'donut' || g.type === 'lemonade');
    const placedDrops = (s2.donuts?.length || 0) + (s2.lemonades?.length || 0);
    this.pendingDrops = dropGoal ? Math.max(0, dropGoal.target - placedDrops) : 0;
    this.grid = buildInitialGrid(this.rows, this.cols, s2, this.gnomes);
    seedInitialPieces(this, s2);
    this.syncCarpetGoal();
    return true;
  }

  performPlayerSwap(r1, c1, r2, c2, freeMove = false) {
    if (hasWallBetween(this.grid, r1, c1, r2, c2) && !freeMove) return false;
    const a = this.grid[r1]?.[c1];
    const b = this.grid[r2]?.[c2];
    if (!isCellSwappable(a) || !isCellSwappable(b)) return false;
    if (!freeMove && !isValidMove(this.grid, r1, c1, r2, c2, this.gameId)) return false;

    this.hasActed = true;
    this.foamClearedThisTurn = false;
    const tmpPiece = a.piece;
    const tmpDrop = a.dropItem;
    a.piece = b.piece;
    a.dropItem = b.dropItem;
    b.piece = tmpPiece;
    b.dropItem = tmpDrop;

    if (!freeMove) this.movesLeft = Math.max(0, this.movesLeft - 1);

    const powA = a.piece?.power;
    const powB = b.piece?.power;
    if (powA && powB) {
      triggerPowerCombo(this, r1, c1, r2, c2);
      return { action: 'combo', anchors: [{ r: r1, c: c1 }, { r: r2, c: c2 }], playerMove: !freeMove };
    }

    const isRainA = powA === 'rainbow_ball' || powA === 'g_rainbow';
    const isRainB = powB === 'rainbow_ball' || powB === 'g_rainbow';
    if (isRainA && b.piece && b.piece.color >= 0) {
      triggerSinglePowerup(this, r1, c1, { power: powA, color: b.piece.color, carpet: a.carpet || b.carpet });
      return { action: 'power', anchors: [{ r: r1, c: c1 }], playerMove: !freeMove };
    }
    if (isRainB && a.piece && a.piece.color >= 0) {
      triggerSinglePowerup(this, r2, c2, { power: powB, color: a.piece.color, carpet: a.carpet || b.carpet });
      return { action: 'power', anchors: [{ r: r2, c: c2 }], playerMove: !freeMove };
    }
    if (powA && !freeMove) {
      triggerSinglePowerup(this, r1, c1);
      return { action: 'power', anchors: [{ r: r1, c: c1 }, { r: r2, c: c2 }], playerMove: true };
    }
    if (powB && !freeMove) {
      triggerSinglePowerup(this, r2, c2);
      return { action: 'power', anchors: [{ r: r2, c: c2 }, { r: r1, c: c1 }], playerMove: true };
    }

    return { action: 'match', anchors: [{ r: r2, c: c2 }, { r: r1, c: c1 }], playerMove: !freeMove };
  }

  activateCellTap(r, c) {
    const cell = this.grid[r]?.[c];
    if (!cell?.active || cell.chain > 0 || cell.foam || !cell.piece?.power) return false;
    this.hasActed = true;
    this.foamClearedThisTurn = false;
    this.movesLeft = Math.max(0, this.movesLeft - 1);
    triggerSinglePowerup(this, r, c);
    return true;
  }

  resolveMatchStep(cascadeIndex = 0, preferredAnchors = []) {
    let changed = collectDropExits(this);
    const groups = detectMatches(this.grid, this.gameId, preferredAnchors);
    if (groups.length === 0) {
      this.spawnPendingRainbows();
      this.syncCarpetGoal();
      return changed;
    }

    sound.sfxMatch(cascadeIndex);
    const queuedPowerups = [];

    for (const grp of groups) {
      const groupHasCarpet =
        this.gameId === 'homescapes' && grp.cells.some((pt) => this.grid[pt.r][pt.c].carpet);
      damageAdjacentBlockers(this, grp.cells, groupHasCarpet);

      for (const pt of grp.cells) {
        hitCell(this, pt.r, pt.c, { source: 'match', spreadCarpet: groupHasCarpet, queuedPowerups });
      }

      if (grp.spawnPower) {
        const anchorCell = this.grid[grp.anchor.r][grp.anchor.c];
        if (anchorCell.active && !anchorCell.blocker && !anchorCell.dropItem) {
          const isRainbow = grp.spawnPower === 'rainbow_ball' || grp.spawnPower === 'g_rainbow';
          anchorCell.piece = {
            color: isRainbow ? -1 : grp.color,
            power: grp.spawnPower,
            super: isRainbow && Boolean(this.superRainbow),
          };
          anchorCell.bounce = 1.0;
          if (groupHasCarpet) anchorCell.carpet = true;
          sound.sfxPowerupCreate();
          this.emitFx('power_spawn', grp.anchor.r, grp.anchor.c, '#ffd166');
        }
      }
    }

    for (const qp of queuedPowerups) {
      triggerSinglePowerup(this, qp.r, qp.c, qp);
    }

    this.spawnPendingRainbows();
    this.syncCarpetGoal();
    return true;
  }

  applyGravityAndRefill() {
    return applyPlayrixGravity(this);
  }

  endPlayerTurn() {
    if (this.allGoalsComplete()) return false;
    return advanceTurnMechanics(this);
  }

  shufflePieces(preserveSpecial = false) {
    const slots = [];
    const pool = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (
          cell.active &&
          !cell.blocker &&
          !cell.dropItem &&
          cell.chain === 0 &&
          !cell.foam &&
          cell.piece &&
          !cell.piece.power &&
          (!preserveSpecial || (!cell.piece.butterfly && !cell.piece.fuse))
        ) {
          slots.push(cell);
          pool.push(cell.piece);
        }
      }
    }
    for (let attempt = 0; attempt < 25; attempt++) {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      slots.forEach((cell, idx) => {
        cell.piece = pool[idx];
      });
      if (detectMatches(this.grid, this.gameId).length === 0 && findBestHint(this.grid, this.gameId)) break;
    }
    if (!preserveSpecial) {
      this.emitFloatingText(Math.floor(this.rows / 2), Math.floor(this.cols / 2), '🪄 Đảo phép!', '#4cc9f0');
    }
  }

  canUseBoosterAt(boosterType, r, c, r2 = -1, c2 = -1) {
    const cell = this.grid[r]?.[c];
    if (!cell?.active) return false;
    if (boosterType === 'hand' || boosterType === 'glove') {
      if (!isCellSwappable(cell)) return false;
      if (r2 < 0 || c2 < 0) return true;
      if (Math.abs(r - r2) + Math.abs(c - c2) !== 1) return false;
      return isCellSwappable(this.grid[r2]?.[c2]);
    }
    if (boosterType === 'hammer' || boosterType === 'shovel') {
      if (cell.foam || cell.chain > 0 || cell.blocker || cell.jelly > 0 || cell.grass > 0) return true;
      if (cell.dropItem) return false;
      return Boolean(cell.piece);
    }
    return boosterType === 'kettlebell' || boosterType === 'rake';
  }

  useBooster(boosterType, r, c) {
    if (boosterType === 'hammer' || boosterType === 'shovel') {
      this.hasActed = true;
      sound.sfxExplosion(1.5);
      const q = [];
      hitCell(this, r, c, { source: 'booster', spreadCarpet: this.grid[r][c]?.carpet, queuedPowerups: q });
      for (const qp of q) triggerSinglePowerup(this, qp.r, qp.c, qp);
      return true;
    }
    if (boosterType === 'kettlebell' || boosterType === 'rake') {
      this.hasActed = true;
      sound.sfxRocket();
      this.emitBeam(r, c, 'h');
      this.emitBeam(r, c, 'v');
      const q = [];
      const carpet = Boolean(this.grid[r][c]?.carpet);
      for (let col = 0; col < this.cols; col++) {
        hitCell(this, r, col, { source: 'booster', spreadCarpet: carpet, queuedPowerups: q });
      }
      for (let row = 0; row < this.rows; row++) {
        if (row === r) continue;
        hitCell(this, row, c, { source: 'booster', spreadCarpet: carpet, queuedPowerups: q });
      }
      for (const qp of q) triggerSinglePowerup(this, qp.r, qp.c, qp);
      return true;
    }
    return false;
  }

  emitFx(kind, r, c, color) { this.fxEvents.push({ type: 'particles', kind, r, c, color }); }
  emitPiecePop(r, c, colorIndex) { this.fxEvents.push({ type: 'piece_pop', r, c, colorIndex }); }
  emitBeam(r, c, axis) { this.fxEvents.push({ type: 'beam', r, c, axis }); }
  emitShockwave(r, c, radius) { this.fxEvents.push({ type: 'shockwave', r, c, radius }); }
  emitPlaneFlight(r1, c1, r2, c2, payload) { this.fxEvents.push({ type: 'plane_flight', r1, c1, r2, c2, payload }); }
  emitLightning(r1, c1, r2, c2) { this.fxEvents.push({ type: 'lightning', r1, c1, r2, c2 }); }
  emitFloatingText(r, c, text, color) { this.fxEvents.push({ type: 'float_text', r, c, text, color }); }
}
