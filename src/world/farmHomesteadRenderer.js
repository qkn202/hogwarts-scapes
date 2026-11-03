/**
 * Interactive 2.5D Isometric Tile-Grid Farmstead Engine (`farmHomesteadRenderer.js`)
 * Powers the true 14×14 Tile-Grid Sandbox (`196` diamond tiles) for Trang Trại Hang Sóc:
 * - Free-Placement Build Mode (`place:<type>`, `move` + rotate/demolish, `erase` brush, parcel unlock)
 * - Continuous `Swipe-to-Harvest` / `Swipe-to-Plant` / `Swipe-Dew` via `farmGridInteractions.js`
 * - Depth-sorted (`col + row`) 2.5D architectural rendering + strolling companions along player roads!
 */

import { GRID_COLS, GRID_ROWS } from '../data/farmGridDefs.js';
import {
  getEntityFootprint,
  isGridRectFree,
  moveExistingEntity,
  removeExistingEntity,
} from '../utils/farmStorage.js';
import { sound } from '../utils/sound.js';
import { drawFarmGridEntity } from './farmBuildingArt.js';
import {
  bindFarmGridGestures,
  handleFarmGridHover,
  handleFarmGridTap,
} from './farmGridInteractions.js';
import {
  createIsoGridProjector,
  drawBuildGhostFootprint,
  drawFarmGridTilesAndPaths,
  drawFarmValleyBackdrop,
  drawLockedParcelSigns,
} from './farmTerrainRenderer.js';
import { drawWeatherAtmosphere, spawnCelebrationFireworks } from './gardenscapesExtras.js';
import { drawFloatingMagicMotes } from './gardenscapesVfx.js';
import { drawAustin, drawPet } from './isoMath.js';
import { WorldCameraController } from './worldCamera.js';

export class FarmHomesteadRenderer {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.callbacks = callbacks;

    this.farm = null;
    this.appSave = null;
    this.weather = 'day';
    this.petName = 'Niffler';

    this.buildMode = false;
    this.buildAction = 'move'; // 'move' | 'erase' | 'place:<type>'
    this.placeFlip = false;
    this.movingUid = null;
    this.movingFlip = false;

    this.selectedTool = 'harvest'; // 'harvest' | 'dew' | 'crop:<id>'
    this.hoverCell = null;
    this.hoveredEntityUid = null;
    this.hoveredParcelId = null;

    this.running = false;
    this.rafId = null;
    this.proj = null;
    this.parcelSigns = [];
    this.swipeSession = null;
    this.flyingItems = [];
    this.floatTexts = [];
    this.sparkles = [];

    this.camera = new WorldCameraController(this.canvas, {
      isActive: () => this.running && !this.swipeSession,
      onTap: (cx, cy) => handleFarmGridTap(this, cx, cy),
      onHover: (cx, cy) => handleFarmGridHover(this, cx, cy),
      onLeave: () => {
        this.hoverCell = null;
        this.hoveredEntityUid = null;
        this.hoveredParcelId = null;
        if (this.canvas) this.canvas.style.cursor = 'default';
      },
    });

    bindFarmGridGestures(this);
  }

  setState({ farm, appSave, weather, petName } = {}) {
    if (farm) this.farm = farm;
    if (appSave) this.appSave = appSave;
    if (weather) this.weather = weather;
    if (petName) this.petName = petName;
  }

  triggerRenovationBurst() {
    spawnCelebrationFireworks(this);
  }

  setBuildMode(enabled, action = 'move') {
    this.buildMode = Boolean(enabled);
    this.buildAction = action || 'move';
    this.movingUid = null;
    this.placeFlip = false;
    this.callbacks.onBuildStateChange?.();
  }

  setBuildAction(action) {
    this.buildAction = action;
    if (action !== 'move') this.movingUid = null;
    this.callbacks.onBuildStateChange?.();
  }

  toggleRotateSelection() {
    if (this.movingUid) {
      this.movingFlip = !this.movingFlip;
      const ent = this.farm?.entities.find((e) => e.uid === this.movingUid);
      if (ent) {
        const res = moveExistingEntity(this.farm, ent.uid, ent.col, ent.row, this.movingFlip);
        if (res.ok) {
          sound.sfxClick();
          this.callbacks.onStateChanged?.();
        } else if (res.reason) {
          this.movingFlip = !this.movingFlip;
          sound.sfxInvalid();
          this.callbacks.onToast?.(res.reason);
        }
      }
    } else {
      this.placeFlip = !this.placeFlip;
      sound.sfxClick();
    }
    this.callbacks.onBuildStateChange?.();
  }

  demolishSelectedEntity() {
    if (!this.movingUid || !this.farm) return;
    const res = removeExistingEntity(this.farm, this.appSave, this.movingUid);
    if (res.ok) {
      sound.sfxCoin();
      this.movingUid = null;
      this.callbacks.onToast?.(`🧹 Đã thu hồi "${res.def.name}" (+${res.refund} 💰)!`);
      this.callbacks.onStateChanged?.();
      this.callbacks.onBuildStateChange?.();
    } else if (res.reason) {
      sound.sfxInvalid();
      this.callbacks.onToast?.(res.reason);
    }
  }

  setTool(toolId) {
    this.selectedTool = toolId;
    this.callbacks.onToolChange?.(toolId);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.camera.reset();
    this.resize();
    let last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this._update(dt);
      this._render(now / 1000);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    this.swipeSession = null;
    this.movingUid = null;
    this.buildMode = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resize() {
    const rect = this.canvas.parentElement?.getBoundingClientRect() || { width: 800, height: 520 };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.viewW = Math.max(240, Math.floor(rect.width));
    this.viewH = Math.max(220, Math.floor(rect.height));
    this.canvas.width = Math.floor(this.viewW * dpr);
    this.canvas.height = Math.floor(this.viewH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _clientToLocal(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  _findParcelSignAt(lx, ly) {
    for (const s of this.parcelSigns) {
      if (Math.hypot(lx - s.x, ly - s.y) <= s.r) return s.parcelId;
    }
    return null;
  }

  _spawnHarvestFly(x, y, icon, label, color = '#ffea9c') {
    this.flyingItems.push({ x, y, tx: this.viewW * 0.5, ty: this.viewH - 95, t: 0, icon });
    this.floatTexts.push({ x, y: y - 16, text: label, color, life: 1.15, maxLife: 1.15 });
  }

  _update(dt) {
    this.camera.update(dt);
    this.flyingItems = this.flyingItems.filter((it) => {
      it.t += dt * 1.9;
      return it.t < 1;
    });
    this.floatTexts = this.floatTexts.filter((ft) => {
      ft.y -= 28 * dt;
      ft.life -= dt;
      return ft.life > 0;
    });
    this.sparkles = this.sparkles.filter((sp) => {
      sp.x += (sp.vx || 0) * dt;
      sp.y += (sp.vy || 0) * dt;
      sp.vy = (sp.vy || 0) + 120 * dt;
      sp.life -= dt;
      return sp.life > 0;
    });
  }

  _render(timeSec) {
    const ctx = this.ctx;
    const w = this.viewW || 800;
    const h = this.viewH || 520;
    if (!this.farm) return;

    const proj = createIsoGridProjector(w, h, this.camera);
    this.proj = proj;
    const now = Date.now();

    drawFarmValleyBackdrop(ctx, w, h, proj, this.weather, timeSec);
    drawFarmGridTilesAndPaths(ctx, proj, this.farm, this.weather, this.buildMode);

    let ghostEnt = null;
    if (this.buildMode && this.hoverCell) {
      const { col, row } = this.hoverCell;
      if (col >= 0 && row >= 0 && col < GRID_COLS && row < GRID_ROWS) {
        if (this.buildAction.startsWith('place:')) {
          const bType = this.buildAction.slice(6);
          const { w: bw, h: bh } = getEntityFootprint(bType, this.placeFlip);
          const free = isGridRectFree(this.farm, col, row, bw, bh);
          drawBuildGhostFootprint(ctx, proj, col, row, bw, bh, free);
          ghostEnt = { uid: '_ghost', type: bType, col, row, flip: this.placeFlip };
        } else if (this.movingUid) {
          const orig = this.farm.entities.find((e) => e.uid === this.movingUid);
          if (orig) {
            const { w: bw, h: bh } = getEntityFootprint(orig.type, this.movingFlip);
            const free = isGridRectFree(this.farm, col, row, bw, bh, orig.uid);
            drawBuildGhostFootprint(ctx, proj, col, row, bw, bh, free);
            ghostEnt = { ...orig, col, row, flip: this.movingFlip };
          }
        }
      }
    }

    const fenceSet = new Set(
      this.farm.entities.filter((e) => e.type === 'wood_fence').map((e) => `${e.col},${e.row}`)
    );
    const paths = this.farm.entities.filter((e) => e.type === 'cobble_path');
    const drawQueue = this.farm.entities
      .filter((e) => e.type !== 'cobble_path')
      .map((ent) => {
        const fp = getEntityFootprint(ent);
        return { kind: 'entity', ent, depth: ent.col + fp.w + ent.row + fp.h };
      });

    if (!this.buildMode) {
      const aTile = paths[Math.min(2, paths.length - 1)] || { col: 4, row: 5 };
      const pTile = paths[paths.length - 1] || { col: 7, row: 5 };
      drawQueue.push({ kind: 'austin', col: aTile.col, row: aTile.row, depth: aTile.col + aTile.row + 1.4 });
      drawQueue.push({
        kind: 'pet',
        col: pTile.col + Math.sin(timeSec * 0.7) * 0.35,
        row: pTile.row,
        depth: pTile.col + pTile.row + 1.45,
      });
    }

    drawQueue.sort((a, b) => a.depth - b.depth);

    for (const item of drawQueue) {
      if (item.kind === 'entity') {
        const isPicked = this.buildMode && this.movingUid === item.ent.uid;
        drawFarmGridEntity(ctx, proj, item.ent, this.farm, {
          selectedTool: this.selectedTool,
          hovered: this.hoveredEntityUid === item.ent.uid,
          isMovingGhost: isPicked,
          buildMode: this.buildMode,
          timeSec,
          now,
          fenceSet,
        });
      } else if (item.kind === 'austin') {
        const pos = proj.cellCenter(item.col, item.row);
        drawAustin(ctx, pos.x, pos.y, proj.sc * 0.76, timeSec, true, null);
      } else if (item.kind === 'pet') {
        const pos = proj.cellCenter(item.col, item.row);
        drawPet(ctx, pos.x, pos.y, true, timeSec, this.petName, proj.sc * 0.8);
      }
    }

    if (ghostEnt) {
      drawFarmGridEntity(ctx, proj, ghostEnt, this.farm, {
        selectedTool: this.selectedTool,
        hovered: true,
        isMovingGhost: true,
        buildMode: false,
        timeSec,
        now,
        fenceSet,
      });
    }

    this.parcelSigns = drawLockedParcelSigns(ctx, proj, this.farm, this.hoveredParcelId);

    drawFloatingMagicMotes(ctx, w, h, proj.sc, timeSec);
    drawWeatherAtmosphere(ctx, w, h, proj.sc, timeSec, this.weather);

    for (const sp of this.sparkles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sp.life / (sp.maxLife || 1));
      ctx.fillStyle = sp.color || '#ffd166';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.r || 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const it of this.flyingItems) {
      const t = it.t;
      const fx = it.x + (it.tx - it.x) * t;
      const fy = it.y + (it.ty - it.y) * t - Math.sin(t * Math.PI) * 90;
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.round(26 * (1 - t * 0.2))}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText(it.icon, fx, fy);
    }
    for (const ft of this.floatTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
      ctx.font = `900 ${Math.round(13.5 * proj.sc)}px Fredoka, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#1b1209';
      ctx.lineWidth = 3.2;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }
}
