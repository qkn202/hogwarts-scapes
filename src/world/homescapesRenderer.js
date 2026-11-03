/**
 * Harry Potter Hogwarts Castle 2.5D Isometric World Renderer (Homescapes)
 * - Every decoration slot across all 4 Castle rooms swaps between 3 distinct 3D furniture models
 *   (_s0, _s1, _s2) AND 3 distinct Hogwarts House floor inlays / magical flame styles!
 * - Full parity with Gardenscapes: Smooth Pan & Pinch-to-Zoom Camera, Off-Screen Hotspot Arrows,
 *   3 Atmosphere Modes (Day / Starry Night / Great Hall Snow), Reparo Wand Beam, Actor Taps & Visitor Mode!
 */

import { getHomescapesAreasForTier } from '../data/homescapesStory.js';
import { normalizeHogwartsHouse } from '../data/houseCommonRooms.js';
import { sprites } from '../utils/spriteLoader.js';
import { getWorld3DStage } from '../world3d/world3dStage.js';
import {
  computeWanderingPetPos,
  drawReparoSpellBeam,
  drawWeatherAtmosphere,
  tryHandleActorTap,
} from './gardenscapesExtras.js';
import {
  ROOM_ANCHORS,
  drawCornerCobwebs,
  prepareCastleGroundAndHotspots,
  renderCastleRoomSlots,
} from './homescapesVfx.js';
import {
  drawAustin,
  drawHotspotPin,
  drawPet,
  drawSceneBackdrop,
} from './isoMath.js';
import { WorldCameraController } from './worldCamera.js';

export class HomescapesWorldRenderer {
  constructor(canvas, onSlotClick) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onSlotClick = onSlotClick;
    this.isCastle = true;

    this.areaIndex = 0;
    this.house = 'gryffindor';
    this.completedTasks = {};
    this.previewOverride = null;
    this.petName = 'Hedwig';
    this.weather = 'day';
    this.readOnlyVisitor = false;
    this.petHop = 0;
    this.spellCast = null;
    this._lastActors = null;
    this.austinLine = 'Chạm vào cổ vật phép thuật để chọn 3 phong cách Nhà Hogwarts bất kỳ lúc nào!';

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
            this.onSlotClick(hs.task, hs.completed);
            return;
          }
        }
        tryHandleActorTap(this, clientX, clientY);
      },
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

  setState({ areaIndex, completedTasks, petName, weather, house, readOnlyVisitor, previewOverride = null, austinLine = null }) {
    const prevArea = this._focusedArea;
    const prevVisitor = this._wasVisitor;
    if (areaIndex !== undefined) this.areaIndex = areaIndex;
    if (house) this.house = normalizeHogwartsHouse(house);
    if (completedTasks) this.completedTasks = completedTasks;
    if (petName) this.petName = petName;
    if (weather) this.weather = weather;
    if (readOnlyVisitor !== undefined) this.readOnlyVisitor = Boolean(readOnlyVisitor);
    this.previewOverride = previewOverride;
    if (austinLine !== null) this.austinLine = austinLine;

    const activeArea = this._getActiveArea();
    const sIdx = (activeArea.sceneIndex ?? this.areaIndex) % 6;
    sprites.ensure(activeArea.sceneKey || `home_room_${sIdx}`, 'high');

    if (this.areaIndex !== prevArea || this.readOnlyVisitor !== prevVisitor) {
      this._focusedArea = this.areaIndex;
      this._wasVisitor = this.readOnlyVisitor;
      this.camera.reset();
      const nextTask = this.readOnlyVisitor ? null : activeArea.tasks.find((t) => this.completedTasks[t.id] === undefined);
      this.focusSlot(nextTask ? nextTask.slot : 'rug', false, true);
    }
  }

  _getActiveArea() {
    const areas = getHomescapesAreasForTier(0, this.house);
    return areas[this.areaIndex] || areas[0];
  }

  _getActiveAnchors() {
    const area = this._getActiveArea();
    const sIdx = (area.sceneIndex ?? this.areaIndex) % ROOM_ANCHORS.length;
    return ROOM_ANCHORS[sIdx] || ROOM_ANCHORS[0];
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
    const [nx, ny] = (slot && anchors[slot]) || [0.5, 0.6];
    if (this._scene) return this._scene.pt(nx, ny);
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
        color: i % 2 === 0 ? '#ffd166' : '#ff9f1c',
      });
    }
  }

  triggerRenovationBurst(slot = null) {
    const { x: tx, y: ty } = this._slotScreenPoint(slot);
    this.starArc = { x1: 68, y1: 28, x2: tx, y2: ty, t: 0 };
    this.spellCast = { slot, tx, ty, t: 0, duration: 1.35 };
    for (let i = 0; i < 48; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 48 + Math.random() * 170;
      this.sparkles.push({
        x: tx + (Math.random() - 0.5) * 105,
        y: ty + (Math.random() - 0.5) * 65,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 42,
        life: 1.05 + Math.random() * 0.35,
        maxLife: 1.4,
        color: i % 3 === 0 ? '#ffd166' : i % 3 === 1 ? '#e63946' : '#ffffff',
      });
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    const area = this._getActiveArea();
    const sIdx = (area.sceneIndex ?? this.areaIndex) % 6;
    sprites.preloadForGame('homescapes', area.sceneKey || `home_room_${sIdx}`);
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
      s.vy += 88 * dt;
      s.life -= dt;
      return s.life > 0;
    });
  }

  _render(timeSec) {
    const ctx = this.ctx;
    const w = this.viewW || 800;
    const h = this.viewH || 520;
    const area = this._getActiveArea();
    const roomMod = (area.sceneIndex ?? this.areaIndex) % ROOM_ANCHORS.length;
    const anchors = ROOM_ANCHORS[roomMod] || ROOM_ANCHORS[0];
    const sceneKey = area.sceneKey || `home_room_${roomMod}`;
    const [fbTop, fbBtm] = area.fallbackBg || ['#3b1c26', '#1c0d13'];

    const scene = drawSceneBackdrop(
      ctx,
      w,
      h,
      sceneKey,
      fbTop,
      fbBtm,
      this.camera,
      `home_room_${roomMod % 4}`
    );
    this._scene = scene;
    const sc = scene.scale;
    if (area.accentTint) {
      ctx.fillStyle = area.accentTint;
      ctx.fillRect(0, 0, w, h);
    }

    const floorTask = area.tasks.find((t) => t.slot === 'floor');
    const floorSt = this._getTaskStyle(floorTask);
    if (!floorSt.done) {
      ctx.fillStyle = 'rgba(38, 26, 20, 0.24)';
      ctx.fillRect(0, 0, w, h);
      drawCornerCobwebs(ctx, scene, sc);
    } else if (floorSt.style) {
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = floorSt.style.primary;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    this.hotspots = [];
    prepareCastleGroundAndHotspots(this, ctx, area, scene, sc, timeSec);

    const baseAustin = scene.pt(anchors.austin[0], anchors.austin[1]);
    let ax = baseAustin.x;
    let ay = baseAustin.y;
    if (this.spellCast) {
      const walkAmt = Math.sin(Math.min(1, this.spellCast.t / this.spellCast.duration) * Math.PI) * 0.36;
      ax += (this.spellCast.tx - ax) * walkAmt;
      ay += (this.spellCast.ty - ay) * walkAmt;
    }
    const pPt = scene.pt(anchors.pet[0], anchors.pet[1]);
    const { x: px, y: py } = computeWanderingPetPos(pPt, this.hotspots, sc, timeSec, this.petHop);

    // Hybrid 3D WebGL Pass (locked isometric camera + real Blender .glb Castle furniture, Prefect & Hedwig!)
    const pass3D = getWorld3DStage('homescapes').renderPass(this, area, scene, sc, timeSec, {
      austinPt: { x: ax, y: ay },
      petPt: { x: px, y: py },
    });

    renderCastleRoomSlots(this, ctx, area, scene, sc, timeSec, pass3D.renderedTaskIds, true);

    // Ambient Dust Motes + Castle Weather Atmosphere (Day / Starry Night / Great Hall Snow)
    ctx.fillStyle = 'rgba(255, 244, 189, 0.55)';
    for (let m = 0; m < 10; m++) {
      const mx = w * (0.25 + ((m * 0.07) % 0.55)) + Math.sin(timeSec * 0.8 + m) * 18;
      const my = h * (0.22 + ((m * 0.06) % 0.5)) + Math.cos(timeSec * 0.6 + m * 1.7) * 14;
      ctx.beginPath();
      ctx.arc(mx, my, 2.2 * sc, 0, Math.PI * 2);
      ctx.fill();
    }
    drawWeatherAtmosphere(ctx, w, h, sc, timeSec, this.weather);

    // Interactive Pin Badges (hidden when visiting a friend's Castle!)
    if (!this.readOnlyVisitor) {
      for (const hs of this.hotspots) {
        const isPrev = Boolean(this.previewOverride && this.previewOverride.taskId === hs.task.id);
        drawHotspotPin(ctx, hs, isPrev, timeSec, sc, false, this.hoveredTaskId === hs.task.id);
      }
    }

    drawReparoSpellBeam(ctx, this.spellCast, { x: ax, y: ay }, sc, timeSec);
    drawAustin(ctx, ax, ay, sc * 1.05, timeSec, false, this.austinLine, pass3D.prefectReady);
    drawPet(ctx, px, py, false, timeSec, this.petName, sc * 1.02, pass3D.petReady);
    this._lastActors = { austin: { x: ax, y: ay }, pet: { x: px, y: py }, scale: sc };

    if (!this.readOnlyVisitor) {
      this.camera.drawOffscreenIndicators(ctx, w, h, this.hotspots, timeSec, true);
    }

    // Flying Star Arc + Sparkles
    if (this.starArc) {
      const t = this.starArc.t;
      const sx = this.starArc.x1 + (this.starArc.x2 - this.starArc.x1) * t;
      const sy = this.starArc.y1 + (this.starArc.y2 - this.starArc.y1) * t - Math.sin(t * Math.PI) * 90;
      ctx.font = `${Math.round(30 * sc)}px system-ui`;
      ctx.fillText('⭐', sx - 14, sy + 10);
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
