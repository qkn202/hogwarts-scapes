/**
 * Interactive 2.5D Magical Homestead Renderer (`farmHomesteadRenderer.js`)
 * Renders Trang Trại Hang Sóc (`garden_zone_6`) as a living 2.5D Playrix/Hay Day Farmstead:
 * - True `Swipe-to-Harvest` & `Swipe-to-Plant` continuous brush strokes across 9 soil plots!
 * - Interactive Honeybee Skep, Grazing Cow Paddock, Molly's Oven, Rescue Cauldron & Owl Post!
 * - Flying harvest icons & floating yield popups arcing straight into the Barn!
 */

import {
  FARM_CREATURES,
  FARM_CROPS,
  FARM_PLOTS_LAYOUT,
  FARM_RECIPES,
  FARM_STATIONS_LAYOUT,
} from '../data/farmDefs.js';
import {
  addFarmXp,
  harvestPlot,
  plantCropOnPlot,
  saveFarmState,
  speedUpPlotWithDew,
} from '../utils/farmStorage.js';
import { haptics } from '../utils/haptics.js';
import { sound } from '../utils/sound.js';
import { sprites } from '../utils/spriteLoader.js';
import {
  drawCreaturePen2D,
  drawFarmStation2D,
  drawIsometricFarmPlot,
} from './farmPlotArt.js';
import { drawWeatherAtmosphere } from './gardenscapesExtras.js';
import { drawFloatingMagicMotes } from './gardenscapesVfx.js';
import { drawAustin, drawPet, drawSceneBackdrop } from './isoMath.js';
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
    this.selectedTool = 'harvest'; // 'harvest' | 'dew' | 'crop:<id>'
    this.austinLine = '🌾 Lướt qua luống chín để gặt ngay!';

    this.running = false;
    this.rafId = null;
    this._scene = null;
    this.hoveredTarget = null;
    this.swipeSession = null;
    this.flyingItems = [];
    this.floatTexts = [];
    this.hitTargets = [];

    this.camera = new WorldCameraController(this.canvas, {
      isActive: () => this.running && !this.swipeSession,
      onTap: (cx, cy, pt) => this._handleTap(cx, cy, pt),
      onHover: (cx, cy) => this._handleHover(cx, cy),
      onLeave: () => {
        this.hoveredTarget = null;
        if (this.canvas) this.canvas.style.cursor = 'default';
      },
    });

    this._bindSwipeAndResize();
  }

  setState({ farm, appSave, weather = 'day', petName = 'Niffler', austinLine = null }) {
    this.farm = farm;
    this.appSave = appSave;
    this.weather = weather;
    this.petName = petName || 'Niffler';
    if (austinLine) this.austinLine = austinLine;
    sprites.ensure('garden_zone_6', 'high');
  }

  setTool(toolId) {
    this.selectedTool = toolId;
    this.callbacks.onToolChange?.(toolId);
  }

  start() {
    if (this.running) return;
    this.running = true;
    sprites.preloadForGame('gardenscapes', 'garden_zone_6');
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

  _findTargetAt(clientX, clientY, radiusMul = 1) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best = null;
    let bestDist = Infinity;
    for (const t of this.hitTargets) {
      const d = Math.hypot((x - t.x) * 0.85, (y - t.y) * 1.15);
      if (d <= t.r * radiusMul && d < bestDist) {
        bestDist = d;
        best = t;
      }
    }
    return best;
  }

  _bindSwipeAndResize() {
    window.addEventListener('resize', () => {
      if (this.running) this.resize();
    });
    if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
      this._ro = new ResizeObserver(() => {
        if (this.running) this.resize();
      });
      this._ro.observe(this.canvas.parentElement);
    }

    // Continuous Swipe-to-Harvest / Swipe-to-Plant capture when starting on a Farm Plot!
    this.canvas.addEventListener(
      'pointerdown',
      (e) => {
        if (!this.running || !this.farm || (e.pointerType === 'mouse' && e.button !== 0)) return;
        const hit = this._findTargetAt(e.clientX, e.clientY, 1.05);
        if (!hit || hit.kind !== 'plot') return;

        const slot = this.farm.plots[hit.idx];
        const now = Date.now();
        const isRipe = Boolean(slot?.cropId && now >= slot.readyAt);
        const canPlant = !slot?.cropId && this.selectedTool?.startsWith('crop:');
        const canDew = Boolean(slot?.cropId && now < slot.readyAt && this.selectedTool === 'dew');

        if (isRipe || canPlant || canDew) {
          e.stopImmediatePropagation();
          this.swipeSession = {
            pointerId: e.pointerId,
            mode: isRipe ? 'harvest' : canDew ? 'dew' : 'plant',
            cropId: canPlant ? this.selectedTool.slice(5) : null,
            visited: new Set(),
          };
          try {
            this.canvas.setPointerCapture?.(e.pointerId);
          } catch {
            // Safe fallback for synthetic events
          }
          this._applySwipePlot(hit);
        }
      },
      { capture: true }
    );

    this.canvas.addEventListener(
      'pointermove',
      (e) => {
        if (!this.swipeSession || e.pointerId !== this.swipeSession.pointerId) return;
        e.stopImmediatePropagation();
        const hit = this._findTargetAt(e.clientX, e.clientY, 1.12);
        if (hit && hit.kind === 'plot') this._applySwipePlot(hit);
      },
      { capture: true }
    );

    const endSwipe = (e) => {
      if (!this.swipeSession || e.pointerId !== this.swipeSession.pointerId) return;
      this.swipeSession = null;
    };
    this.canvas.addEventListener('pointerup', endSwipe, { capture: true });
    this.canvas.addEventListener('pointercancel', endSwipe, { capture: true });
  }

  _spawnHarvestFly(x, y, icon, label, color = '#ffea9c') {
    this.flyingItems.push({
      x,
      y,
      tx: 110,
      ty: this.viewH - 42,
      t: 0,
      icon,
    });
    this.floatTexts.push({ x, y: y - 18, text: label, color, life: 1.15, maxLife: 1.15 });
  }

  _applySwipePlot(hit) {
    if (!this.swipeSession || this.swipeSession.visited.has(hit.idx)) return;
    this.swipeSession.visited.add(hit.idx);
    const now = Date.now();

    if (this.swipeSession.mode === 'harvest') {
      const res = harvestPlot(this.farm, hit.idx, this.weather, now);
      if (res.ok) {
        sound.sfxCoin();
        haptics.tap?.();
        const snowTxt = res.bonusSnow ? ' +1❄️' : '';
        this._spawnHarvestFly(hit.x, hit.y, res.crop.icon, `+${res.qty} ${res.crop.icon}${snowTxt}`);
        if (res.leveledUp) {
          sound.sfxVictory();
          this.callbacks.onToast?.(`🎉 Nông Trại Hang Sóc thăng lên Cấp ${this.farm.farmLevel} (+2 💧 Sương Phép)!`);
        }
        this.callbacks.onStateChanged?.();
      } else if (res.reason) {
        this.callbacks.onToast?.(res.reason);
      }
      return;
    }

    if (this.swipeSession.mode === 'dew') {
      const res = speedUpPlotWithDew(this.farm, hit.idx, now);
      if (res.ok) {
        sound.sfxRainbow();
        this._spawnHarvestFly(hit.x, hit.y, '💧', 'Chín Tức Thì!', '#72efdd');
        this.callbacks.onStateChanged?.();
      } else if (res.reason) {
        this.callbacks.onToast?.(res.reason);
      }
      return;
    }

    if (this.swipeSession.mode === 'plant' && this.swipeSession.cropId) {
      const res = plantCropOnPlot(this.farm, this.appSave, hit.idx, this.swipeSession.cropId, this.weather, now);
      if (res.ok) {
        sound.sfxClick();
        const costLbl = res.usedSeed ? 'Dùng 1 Hạt' : res.crop.seedCostCoins > 0 ? `-${res.crop.seedCostCoins} 💰` : 'Miễn Phí!';
        this.floatTexts.push({ x: hit.x, y: hit.y - 16, text: `🌱 ${res.crop.icon} (${costLbl})`, color: '#b7e4c7', life: 1.0, maxLife: 1.0 });
        this.callbacks.onStateChanged?.();
      } else if (res.reason) {
        this.callbacks.onToast?.(res.reason);
      }
    }
  }

  _handleTap(clientX, clientY) {
    if (!this.farm) return;
    const hit = this._findTargetAt(clientX, clientY, 1.08);
    if (!hit) return;
    const now = Date.now();

    if (hit.kind === 'plot') {
      const slot = this.farm.plots[hit.idx];
      const def = FARM_PLOTS_LAYOUT[hit.idx];
      if (this.farm.farmLevel < def.minFarmLv) {
        sound.sfxInvalid();
        this.callbacks.onToast?.(`🔒 Ô đất này mở tự động khi đạt Cấp Nông Trại ${def.minFarmLv} (Đang Cấp ${this.farm.farmLevel})!`);
        return;
      }
      if (!slot.cropId) {
        const cropId = this.selectedTool?.startsWith('crop:') ? this.selectedTool.slice(5) : 'wheat';
        const res = plantCropOnPlot(this.farm, this.appSave, hit.idx, cropId, this.weather, now);
        if (res.ok) {
          sound.sfxClick();
          this.floatTexts.push({ x: hit.x, y: hit.y - 16, text: `🌱 Đã gieo ${res.crop.name}`, color: '#b7e4c7', life: 1.0, maxLife: 1.0 });
          this.callbacks.onStateChanged?.();
        } else if (res.reason) this.callbacks.onToast?.(res.reason);
        return;
      }
      if (now < slot.readyAt) {
        if (this.selectedTool === 'dew') {
          const res = speedUpPlotWithDew(this.farm, hit.idx, now);
          if (res.ok) {
            sound.sfxRainbow();
            this._spawnHarvestFly(hit.x, hit.y, '💧', 'Chín Tức Thì!', '#72efdd');
            this.callbacks.onStateChanged?.();
          } else if (res.reason) this.callbacks.onToast?.(res.reason);
        } else {
          this.callbacks.onToast?.('⏳ Cây đang lớn! Chọn công cụ "💧 Sương Phép" trên thanh dưới nếu muốn chín tức thì nhé!');
        }
      }
      return;
    }

    if (hit.kind === 'creature') {
      const cr = FARM_CREATURES.find((c) => c.id === hit.id);
      const st = this.farm.creatures[cr.id];
      if (st?.active && now >= st.readyAt) {
        this.farm.barn[cr.productKey] = (this.farm.barn[cr.productKey] || 0) + cr.yieldQty;
        if (cr.bonusCoins) this.appSave.coins = (this.appSave.coins || 0) + cr.bonusCoins;
        st.active = false;
        addFarmXp(this.farm, cr.xp);
        saveFarmState(this.farm);
        sound.sfxCoin();
        const coinTxt = cr.bonusCoins ? ` +${cr.bonusCoins}💰` : '';
        this._spawnHarvestFly(hit.x, hit.y, cr.productIcon, `+${cr.yieldQty} ${cr.productIcon}${coinTxt}`);
        this.callbacks.onStateChanged?.();
      } else if (!st?.active) {
        if ((this.farm.barn[cr.feedKey] || 0) < cr.feedQty) {
          sound.sfxInvalid();
          this.callbacks.onToast?.(`🌾 Cần ${cr.feedQty} Lúa Mạch Vàng trong Kho để cho ${cr.name} ăn!`);
          return;
        }
        this.farm.barn[cr.feedKey] -= cr.feedQty;
        st.active = true;
        st.startedAt = now;
        st.readyAt = now + cr.cycleSec * 1000;
        saveFarmState(this.farm);
        sound.sfxClick();
        this.floatTexts.push({ x: hit.x, y: hit.y - 20, text: `🌾 Đã cho ăn!`, color: '#ffea9c', life: 1.0, maxLife: 1.0 });
        this.callbacks.onStateChanged?.();
      } else if (this.selectedTool === 'dew' && (this.farm.dewdrops || 0) > 0) {
        this.farm.dewdrops -= 1;
        st.readyAt = now - 1;
        saveFarmState(this.farm);
        sound.sfxRainbow();
        this.callbacks.onStateChanged?.();
      } else {
        this.callbacks.onToast?.(`⏳ ${cr.name} đang tạo ${cr.productName}!`);
      }
      return;
    }

    if (hit.kind === 'station') {
      if (hit.id === 'owlpost') {
        sound.sfxClick();
        this.callbacks.onOpenFarmModal?.('orders');
        return;
      }
      const st = this.farm.stations[hit.id];
      if (st?.recipeId && now >= st.readyAt) {
        const rec = FARM_RECIPES.find((r) => r.id === st.recipeId);
        st.recipeId = null;
        if (rec) this.callbacks.onCollectStationRecipe?.(rec, hit.x, hit.y);
        addFarmXp(this.farm, rec?.xp || 20);
        saveFarmState(this.farm);
        this.callbacks.onStateChanged?.();
        return;
      }
      sound.sfxClick();
      this.callbacks.onOpenFarmModal?.('workshops');
    }
  }

  _handleHover(clientX, clientY) {
    const hit = this._findTargetAt(clientX, clientY, 1.05);
    this.hoveredTarget = hit ? `${hit.kind}:${hit.id ?? hit.idx}` : null;
    if (this.canvas) this.canvas.style.cursor = hit ? 'pointer' : this.camera.maxPanX > 4 ? 'grab' : 'default';
  }

  _update(dt) {
    this.camera.update(dt);
    this.flyingItems = this.flyingItems.filter((it) => {
      it.t += dt * 1.85;
      return it.t < 1;
    });
    this.floatTexts = this.floatTexts.filter((ft) => {
      ft.y -= 28 * dt;
      ft.life -= dt;
      return ft.life > 0;
    });
  }

  _render(timeSec) {
    const ctx = this.ctx;
    const w = this.viewW || 800;
    const h = this.viewH || 520;
    if (!this.farm) return;

    const scene = drawSceneBackdrop(ctx, w, h, 'garden_zone_6', '#1b4332', '#081c15', this.camera, 'garden_zone_0');
    this._scene = scene;
    const sc = scene.scale;
    const now = Date.now();
    this.hitTargets = [];

    // 1. Artisan Stations & Owl Post (Back row)
    for (const [stKey, meta] of Object.entries(FARM_STATIONS_LAYOUT)) {
      const pt = scene.pt(meta.nx, meta.ny);
      const hovered = this.hoveredTarget === `station:${stKey}`;
      drawFarmStation2D(ctx, pt.x, pt.y, sc, stKey, meta, this.farm, hovered, timeSec, now);
      this.hitTargets.push({ kind: 'station', id: stKey, x: pt.x, y: pt.y, r: 46 * sc });
    }

    // 2. Creature Pens (Honeybee & Dairy Cow)
    for (const cr of FARM_CREATURES) {
      const pt = scene.pt(cr.nx, cr.ny);
      const hovered = this.hoveredTarget === `creature:${cr.id}`;
      drawCreaturePen2D(ctx, pt.x, pt.y, sc, cr, this.farm.creatures[cr.id], hovered, timeSec, now);
      this.hitTargets.push({ kind: 'creature', id: cr.id, x: pt.x, y: pt.y, r: 46 * sc });
    }

    // 3. 9 Isometric Soil Plots (Sorted back-to-front by ny)
    const sortedPlots = [...FARM_PLOTS_LAYOUT].sort((a, b) => a.ny - b.ny);
    for (const pDef of sortedPlots) {
      const pt = scene.pt(pDef.nx, pDef.ny);
      const hovered = this.hoveredTarget === `plot:${pDef.idx}`;
      drawIsometricFarmPlot(
        ctx,
        pt.x,
        pt.y,
        sc,
        pDef,
        this.farm.plots[pDef.idx],
        this.farm.farmLevel,
        this.selectedTool,
        hovered,
        timeSec,
        now
      );
      this.hitTargets.push({ kind: 'plot', idx: pDef.idx, x: pt.x, y: pt.y, r: 44 * sc });
    }

    // 4. Companions & Weather Atmosphere
    const austinPt = scene.pt(0.22, 0.72);
    drawAustin(ctx, austinPt.x, austinPt.y, sc * 0.94, timeSec, true, this.austinLine);
    const petPt = scene.pt(0.76, 0.71);
    drawPet(ctx, petPt.x + Math.sin(timeSec * 1.4) * 14 * sc, petPt.y, true, timeSec, this.petName, sc);

    drawFloatingMagicMotes(ctx, w, h, sc, timeSec);
    drawWeatherAtmosphere(ctx, w, h, sc, timeSec, this.weather);

    // 5. Flying Harvest Icons & Floating Popups
    for (const it of this.flyingItems) {
      const t = it.t;
      const fx = it.x + (it.tx - it.x) * t;
      const fy = it.y + (it.ty - it.y) * t - Math.sin(t * Math.PI) * 95;
      ctx.font = `${Math.round(28 * (1 - t * 0.25))}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText(it.icon, fx, fy);
    }

    for (const ft of this.floatTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
      ctx.font = `900 ${Math.round(14 * sc)}px Fredoka, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#1b1209';
      ctx.lineWidth = 3.5;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }
}
