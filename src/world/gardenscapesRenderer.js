/**
 * Harry Potter Hogwarts Grounds 2.5D Isometric World Renderer (Gardenscapes)
 * Renders 12 Iconic Zones × 9 Magical Relics across 7 Panoramic 2.5D Outdoor Backdrops (`garden_zone_0..6`)
 * with Smooth Pan/Zoom Camera, Mini-Radar, 4-Edge Offscreen Pills, Weather, Reparo Beam & Visitor Mode!
 */

import { GARDENSCAPES_AREAS } from '../data/gardenscapesStory.js';
import { normalizeHogwartsHouse } from '../data/houseCommonRooms.js';
import { sprites } from '../utils/spriteLoader.js';
import { isGraphics3dEnabled } from '../world3d/sharedWebgl.js';
import { getWorld3DStage } from '../world3d/world3dStage.js';
import {
  computeWanderingPetPos,
  computeWanderingPetWorld3D,
  drawLongPressRing,
  drawReparoSpellBeam,
  drawWeatherAtmosphere,
  handleWorldHotspotTap,
  handleWorldLongPress,
  shouldShowHotspotPin,
  tryHandleActorTap,
  updateWorldHoldRing,
} from './gardenscapesExtras.js';
import {
  GARDEN_ANCHORS,
  prepareGardenGroundAndHotspots,
  renderGardenZoneSlots,
} from './gardenscapesSlots.js';
import { drawFloatingMagicMotes } from './gardenscapesVfx.js';
import {
  drawAustin,
  drawHotspotPin,
  drawPet,
  drawSceneBackdrop,
} from './isoMath.js';
import { WorldCameraController } from './worldCamera.js';

export class GardenscapesWorldRenderer {
  constructor(canvas, onSlotClick) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onSlotClick = onSlotClick;

    this.areaIndex = 0;
    this.house = 'gryffindor';
    this.completedTasks = {};
    this.previewOverride = null;
    this.petName = 'Niffler';
    this.weather = 'day';
    this.readOnlyVisitor = false;
    this.petHop = 0;
    this.spellCast = null;
    this._lastActors = null;
    this.austinLine = 'Khuôn viên Hogwarts mở rộng 12 khu vực! Kéo map hoặc chạm cổ vật để chọn 3 kiểu yểm bùa nhé!';

    this.sparkles = [];
    this.starArc = null;
    this.hotspots = [];
    this.hoveredTaskId = null;
    this.running = false;
    this.rafId = null;
    this._scene = null;
    this._focusedArea = -1;
    this._wasVisitor = false;

    this.camera = new WorldCameraController(this.canvas, {
      isActive: () => this.running,
      onTap: (clientX, clientY, pointerType) => {
        if (tryHandleActorTap(this, clientX, clientY, 0.6)) return;
        if (!this.readOnlyVisitor) {
          const hs = this._findHotspotAt(clientX, clientY, pointerType);
          if (hs) {
            handleWorldHotspotTap(this, hs);
            return;
          }
        }
        tryHandleActorTap(this, clientX, clientY);
      },
      onLongPress: (clientX, clientY, pointerType) => handleWorldLongPress(this, clientX, clientY, pointerType),
      onHoldProgress: (clientX, clientY, prog, pointerType) => updateWorldHoldRing(this, clientX, clientY, prog, pointerType),
      onHover: (clientX, clientY) => {
        const hs = this.readOnlyVisitor ? null : this._findHotspotAt(clientX, clientY, 'mouse');
        this.hoveredTaskId = hs ? hs.task.id : null;
        this.canvas.style.cursor = hs ? 'pointer' : this.camera.maxPanX > 4 ? 'grab' : 'default';
      },
      onLeave: () => {
        this.hoveredTaskId = null;
        this.canvas.style.cursor = 'default';
      },
    });

    this._bindInput();
  }

  _getActiveAnchors() {
    const area = GARDENSCAPES_AREAS[this.areaIndex] || GARDENSCAPES_AREAS[0];
    const sIdx = (area.sceneIndex ?? this.areaIndex) % GARDEN_ANCHORS.length;
    return GARDEN_ANCHORS[sIdx] || GARDEN_ANCHORS[0];
  }

  setState({ areaIndex, house, completedTasks, petName, weather, readOnlyVisitor, previewOverride = null, austinLine = null }) {
    const prevArea = this._focusedArea;
    const prevVisitor = this._wasVisitor;
    if (areaIndex !== undefined) this.areaIndex = areaIndex;
    if (house) this.house = normalizeHogwartsHouse(house);
    if (completedTasks) this.completedTasks = completedTasks;
    if (petName) this.petName = petName;
    if (weather) this.weather = weather;
    if (readOnlyVisitor !== undefined) this.readOnlyVisitor = Boolean(readOnlyVisitor);
    this.previewOverride = previewOverride;
    if (austinLine !== null) {
      this.austinLine = austinLine;
      this.austinTimer = austinLine ? 4.2 : 0;
    }

    if (!isGraphics3dEnabled()) {
      const activeArea = GARDENSCAPES_AREAS[this.areaIndex] || GARDENSCAPES_AREAS[0];
      const sIdx = (activeArea.sceneIndex ?? this.areaIndex) % GARDEN_ANCHORS.length;
      sprites.ensure(activeArea.sceneKey || `garden_zone_${sIdx}`, 'high');
    }

    if (this.areaIndex !== prevArea || this.readOnlyVisitor !== prevVisitor) {
      this._focusedArea = this.areaIndex;
      this._wasVisitor = this.readOnlyVisitor;
      this.camera.reset();
      const area = GARDENSCAPES_AREAS[this.areaIndex] || GARDENSCAPES_AREAS[0];
      const nextTask = this.readOnlyVisitor ? null : area.tasks.find((t) => this.completedTasks[t.id] === undefined);
      this.focusSlot(nextTask ? nextTask.slot : 'centerpiece', false, true);
    }
  }

  focusSlot(slot, forStylePicker = false, instant = false) {
    const anchors = this._getActiveAnchors();
    const [nx, ny] = (slot && anchors[slot]) || [0.5, 0.6];
    const vw = this.viewW || window.innerWidth || 800;
    const vh = this.viewH || window.innerHeight || 520;
    const biasY = forStylePicker ? (vh > vw ? -0.1 : -0.05) : 0;
    this.camera.focusNormalized(nx, ny, biasY, instant);
  }

  clearSlotFocus() {
    this.camera.clearFocus();
  }

  _slotScreenPoint(slot) {
    const anchors = this._getActiveAnchors();
    const [nx, ny] = (slot && anchors[slot]) || [0.5, 0.58];
    if (this._scene) return this._scene.pt(nx, ny, 0, slot);
    return { x: (this.viewW || 800) * nx, y: (this.viewH || 520) * ny };
  }

  triggerStylePreviewPop(slot = null, customX = null, customY = null) {
    const pt = customX !== null && customY !== null ? { x: customX, y: customY } : this._slotScreenPoint(slot);
    const { x: tx, y: ty } = pt;
    for (let i = 0; i < 22; i++) {
      const ang = (i / 22) * Math.PI * 2;
      const spd = 42 + Math.random() * 105;
      this.sparkles.push({
        x: tx + (Math.random() - 0.5) * 44,
        y: ty + (Math.random() - 0.5) * 32,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 28,
        life: 0.72 + Math.random() * 0.25,
        maxLife: 0.95,
        color: i % 2 === 0 ? '#ffea9c' : '#72efdd',
      });
    }
  }

  triggerRenovationBurst(slot = null) {
    const { x: tx, y: ty } = this._slotScreenPoint(slot);
    const anchors = this._getActiveAnchors();
    const [nx, ny] = (slot && anchors[slot]) || [0.5, 0.58];
    const worldTarget = this._scene?.isFull3D ? this._scene.normToWorld(nx, ny, 0, slot) : null;
    this.starArc = { x1: 68, y1: 28, x2: tx, y2: ty, t: 0 };
    this.spellCast = { slot, tx, ty, worldTarget, t: 0, duration: 1.35 };
    for (let i = 0; i < 48; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 48 + Math.random() * 170;
      this.sparkles.push({
        x: tx + (Math.random() - 0.5) * 110,
        y: ty + (Math.random() - 0.5) * 70,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 45,
        life: 1.05 + Math.random() * 0.35,
        maxLife: 1.4,
        color: i % 3 === 0 ? '#ffea9c' : i % 3 === 1 ? '#38b87c' : '#72efdd',
      });
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    const area = GARDENSCAPES_AREAS[this.areaIndex] || GARDENSCAPES_AREAS[0];
    const sIdx = (area.sceneIndex ?? this.areaIndex) % GARDEN_ANCHORS.length;
    sprites.preloadForGame('gardenscapes', isGraphics3dEnabled() ? null : (area.sceneKey || `garden_zone_${sIdx}`));
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
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.hoveredTaskId = null;
    if (this.canvas) this.canvas.style.cursor = 'default';
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

  _findHotspotAt(clientX, clientY, pointerType = 'mouse') {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const touchPad = pointerType === 'touch' ? 12 : 0;
    let best = null;
    let bestDist = Infinity;
    for (const hs of this.hotspots) {
      const dGround = Math.hypot(x - hs.x, y - hs.y);
      const dPin = Math.hypot(x - hs.x, y - (hs.pinY ?? hs.y));
      const hit = dGround <= hs.r + touchPad || dPin <= hs.r * 0.85 + touchPad;
      const d = Math.min(dGround, dPin);
      if (hit && d < bestDist) {
        bestDist = d;
        best = hs;
      }
    }
    return best;
  }

  _bindInput() {
    window.addEventListener('resize', () => {
      if (this.running) this.resize();
    });
    if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
      this._ro = new ResizeObserver(() => {
        if (this.running) this.resize();
      });
      this._ro.observe(this.canvas.parentElement);
    }
  }

  _getTaskStyle(task) {
    if (this.previewOverride && this.previewOverride.taskId === task.id) {
      const sIdx = this.previewOverride.styleIndex ?? 0;
      return { done: true, styleIdx: sIdx, style: task.styles[sIdx] || task.styles[0], preview: true };
    }
    const idx = this.completedTasks[task.id];
    if (idx !== undefined) {
      return { done: true, styleIdx: idx, style: task.styles[idx] || task.styles[0], preview: false };
    }
    return { done: false, styleIdx: 0, style: null, preview: false };
  }

  _update(dt) {
    this.camera.update(dt);
    if (this.petHop > 0) this.petHop = Math.max(0, this.petHop - dt * 2.2);
    if (this.austinTimer > 0) {
      this.austinTimer = Math.max(0, this.austinTimer - dt);
      if (this.austinTimer <= 0 && !this.previewOverride) this.austinLine = '';
    }
    if (this.spellCast) {
      this.spellCast.t += dt;
      if (this.spellCast.slot) {
        const pt = this._slotScreenPoint(this.spellCast.slot);
        this.spellCast.tx = pt.x;
        this.spellCast.ty = pt.y;
      }
      if (this.spellCast.t >= this.spellCast.duration) this.spellCast = null;
    }
    if (this.starArc) {
      this.starArc.t += dt * 2.4;
      if (this.starArc.t >= 1) this.starArc = null;
    }
    this.sparkles = this.sparkles.filter((s) => {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 82 * dt;
      s.life -= dt;
      return s.life > 0;
    });
  }

  _render(timeSec) {
    const ctx = this.ctx;
    const w = this.viewW || 800;
    const h = this.viewH || 520;
    const area = GARDENSCAPES_AREAS[this.areaIndex] || GARDENSCAPES_AREAS[0];
    const zoneMod = (area.sceneIndex ?? this.areaIndex) % GARDEN_ANCHORS.length;
    const anchors = GARDEN_ANCHORS[zoneMod] || GARDEN_ANCHORS[0];

    const stage3D = getWorld3DStage('gardenscapes');
    const scene3D = stage3D.prepareSceneFrame(this, w, h, false);

    let sc;
    let ax;
    let ay;
    let px;
    let py;
    let pass3D = { active: false, renderedTaskIds: null, prefectReady: false, petReady: false };

    if (scene3D) {
      this._scene = scene3D;
      sc = scene3D.scale;
      this.hotspots = [];
      const orderedSlots = prepareGardenGroundAndHotspots(this, ctx, area, scene3D, sc, timeSec, true);

      const pathTask = area.tasks.find((t) => t.slot === 'path');
      const pathSt = this._getTaskStyle(pathTask);
      const pathW = scene3D.normToWorld(anchors.path[0], anchors.path[1], 0, 'path');
      const medallionSpec = {
        isCastle: false,
        done: pathSt.done,
        styleIdx: pathSt.styleIdx,
        primary: pathSt.style?.primary || '#d4af37',
        secondary: pathSt.style?.secondary || '#166541',
        accent: pathSt.style?.accent || '#fff8d6',
        worldX: pathW.x,
        worldZ: pathW.z,
      };

      const baseAW = scene3D.normToWorld(anchors.austin[0], anchors.austin[1], 0, 'austin');
      const austinWorld = { x: baseAW.x, z: baseAW.z };
      if (this.spellCast?.worldTarget) {
        const walkAmt = Math.sin(Math.min(1, this.spellCast.t / this.spellCast.duration) * Math.PI) * 0.36;
        austinWorld.x += (this.spellCast.worldTarget.x - austinWorld.x) * walkAmt;
        austinWorld.z += (this.spellCast.worldTarget.z - austinWorld.z) * walkAmt;
      }
      const basePW = scene3D.normToWorld(anchors.pet[0], anchors.pet[1], 0, 'pet');
      const petWorld = computeWanderingPetWorld3D(basePW, this.hotspots, timeSec);

      pass3D = stage3D.renderPass(this, area, scene3D, timeSec, {
        envIdx: zoneMod,
        austinWorld,
        petWorld,
        medallionSpec,
      });

      const aScr = scene3D.projectWorld(austinWorld.x, 0, austinWorld.z);
      const pScr = scene3D.projectWorld(petWorld.x, 0, petWorld.z);
      ax = aScr.x;
      ay = aScr.y;
      px = pScr.x;
      py = pScr.y;

      renderGardenZoneSlots(this, ctx, area, scene3D, sc, timeSec, pass3D.renderedTaskIds, orderedSlots);
    } else {
      const scene = drawSceneBackdrop(
        ctx,
        w,
        h,
        area.sceneKey || `garden_zone_${zoneMod}`,
        '#164a31',
        '#071b11',
        this.camera,
        `garden_zone_${zoneMod % 4}`
      );
      this._scene = scene;
      sc = scene.scale;
      if (area.accentTint) {
        ctx.fillStyle = area.accentTint;
        ctx.fillRect(0, 0, w, h);
      }
      const pathTask = area.tasks.find((t) => t.slot === 'path');
      const pathSt = this._getTaskStyle(pathTask);
      if (!pathSt.done) {
        ctx.fillStyle = 'rgba(18, 26, 20, 0.14)';
        ctx.fillRect(0, 0, w, h);
      }
      this.hotspots = [];
      const orderedSlots = prepareGardenGroundAndHotspots(this, ctx, area, scene, sc, timeSec, false);

      const baseAustin = scene.pt(anchors.austin[0], anchors.austin[1]);
      ax = baseAustin.x;
      ay = baseAustin.y;
      if (this.spellCast) {
        const walkAmt = Math.sin(Math.min(1, this.spellCast.t / this.spellCast.duration) * Math.PI) * 0.36;
        ax += (this.spellCast.tx - ax) * walkAmt;
        ay += (this.spellCast.ty - ay) * walkAmt;
      }
      const pPt = scene.pt(anchors.pet[0], anchors.pet[1]);
      const pPos = computeWanderingPetPos(pPt, this.hotspots, sc, timeSec, this.petHop);
      px = pPos.x;
      py = pPos.y;

      renderGardenZoneSlots(this, ctx, area, scene, sc, timeSec, null, orderedSlots);
      drawFloatingMagicMotes(ctx, w, h, sc, timeSec);
      drawWeatherAtmosphere(ctx, w, h, sc, timeSec, this.weather);
    }

    if (!this.readOnlyVisitor) {
      for (const hs of this.hotspots) {
        const isPrev = Boolean(this.previewOverride && this.previewOverride.taskId === hs.task.id);
        if (shouldShowHotspotPin(this, hs, isPrev)) {
          drawHotspotPin(ctx, hs, isPrev, timeSec, sc, true, this.hoveredTaskId === hs.task.id);
        }
      }
      drawLongPressRing(ctx, this.holdRing, sc);
    }

    drawReparoSpellBeam(ctx, this.spellCast, { x: ax, y: ay }, sc, timeSec);
    drawAustin(ctx, ax, ay, sc * 1.08, timeSec, true, this.austinLine, pass3D.prefectReady);
    drawPet(ctx, px, py, true, timeSec, pass3D.petReady && this.petHop <= 0 ? '' : this.petName, sc * 1.04, pass3D.petReady);
    this._lastActors = { austin: { x: ax, y: ay }, pet: { x: px, y: py }, scale: sc };

    if (!this.readOnlyVisitor) {
      this.camera.drawOffscreenIndicators(ctx, w, h, this.hotspots, timeSec, false);
    }

    if (this.starArc) {
      const t = this.starArc.t;
      const sx = this.starArc.x1 + (this.starArc.x2 - this.starArc.x1) * t;
      const sy = this.starArc.y1 + (this.starArc.y2 - this.starArc.y1) * t - Math.sin(t * Math.PI) * 92;
      ctx.font = `${Math.round(30 * sc)}px system-ui`;
      ctx.fillText('✨', sx - 14, sy + 10);
    }
    for (const s of this.sparkles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life / s.maxLife);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
