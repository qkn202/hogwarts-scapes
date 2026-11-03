/**
 * Interactive Panoramic 2.5D Hogwarts World Camera Controller
 * - Smooth 2D drag panning across expanded `1.32x` panoramic rooms/gardens at default `1.0x` zoom
 * - Overview Mode (`0.76x` Toàn Cảnh) up to Close-Up (`2.15x` Cận Cảnh) via pinch, wheel, keyboard, or HUD
 * - 4-Directional tappable off-screen hotspot pills (Left / Right / Top / Bottom)
 * - Tappable Corner Mini-Radar showing live viewport box & all 9 decoration spots!
 */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class WorldCameraController {
  constructor(canvas, { isActive, onTap, onHover, onLeave }) {
    this.canvas = canvas;
    this.isActive = isActive;
    this.onTap = onTap;
    this.onHover = onHover;
    this.onLeave = onLeave;

    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    this.minZoom = 0.76;
    this.maxZoom = 2.15;

    this.maxPanX = 0;
    this.maxPanY = 0;
    this.dw = 1376;
    this.dh = 768;
    this.viewW = 800;
    this.viewH = 520;

    this.velX = 0;
    this.velY = 0;
    this.focusRequest = null;
    this.animTarget = null;
    this.edgePills = [];
    this.radarRect = null;

    this.pointers = new Map();
    this.gestureMovedPx = 0;
    this.downPointerType = 'mouse';
    this.wasMultiTouch = false;
    this.lastMoveTs = 0;
    this.pinchStartDist = 1;
    this.pinchStartZoom = 1;

    this._bindEvents();
  }

  _syncOverviewBtn() {
    if (typeof document !== 'undefined' && this.isActive()) {
      document.getElementById('btn-map-overview')?.classList.toggle('is-overview', this.zoom <= this.minZoom + 0.05);
    }
  }

  reset() {
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    this.velX = 0;
    this.velY = 0;
    this.focusRequest = null;
    this.animTarget = null;
    this.pointers.clear();
    this.wasMultiTouch = false;
    this._syncOverviewBtn();
  }

  zoomBy(delta) {
    this.animTarget = null;
    this._zoomAround(this.zoom + delta, this.viewW * 0.5, this.viewH * 0.5);
  }

  toggleOverview() {
    this.velX = 0;
    this.velY = 0;
    this.animTarget = null;
    if (this.zoom <= this.minZoom + 0.05) {
      this._zoomAround(1, this.viewW * 0.5, this.viewH * 0.5);
    } else {
      this.zoom = this.minZoom;
      this.panX = 0;
      this.panY = 0;
    }
    this._syncOverviewBtn();
    return this.zoom <= this.minZoom + 0.05;
  }

  syncBounds(maxPanX, maxPanY, dw, dh, viewW, viewH) {
    this.maxPanX = maxPanX;
    this.maxPanY = maxPanY;
    this.dw = dw;
    this.dh = dh;
    this.viewW = viewW;
    this.viewH = viewH;

    if (this.focusRequest) {
      const { nx, ny, biasYRatio, instant } = this.focusRequest;
      const tx = clamp((0.5 - nx) * dw, -maxPanX, maxPanX);
      const ty = clamp((0.5 + biasYRatio - ny) * dh, -maxPanY, maxPanY);
      if (instant) {
        this.panX = tx;
        this.panY = ty;
        this.animTarget = null;
      } else {
        this.animTarget = { panX: tx, panY: ty };
      }
      this.focusRequest = null;
    }

    this.panX = clamp(this.panX, -maxPanX, maxPanX);
    this.panY = clamp(this.panY, -maxPanY, maxPanY);
  }

  focusNormalized(nx, ny, biasYRatio = 0, instant = false) {
    this.velX = 0;
    this.velY = 0;
    const reduced = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    const snap = instant || reduced;
    if (this.viewW > 0 && this.dw > 0) {
      const tx = clamp((0.5 - nx) * this.dw, -this.maxPanX, this.maxPanX);
      const ty = clamp((0.5 + biasYRatio - ny) * this.dh, -this.maxPanY, this.maxPanY);
      if (snap) {
        this.panX = tx;
        this.panY = ty;
        this.animTarget = null;
      } else {
        this.animTarget = { panX: tx, panY: ty };
      }
      this.focusRequest = null;
      return;
    }
    this.focusRequest = { nx, ny, biasYRatio, instant: snap };
  }

  clearFocus() {
    this.focusRequest = null;
    this.animTarget = null;
  }

  update(dt) {
    if (this.pointers.size > 0) return;

    if (this.animTarget) {
      const k = 1 - Math.exp(-dt * 9.5);
      this.panX += (this.animTarget.panX - this.panX) * k;
      this.panY += (this.animTarget.panY - this.panY) * k;
      if (Math.hypot(this.animTarget.panX - this.panX, this.animTarget.panY - this.panY) < 0.75) {
        this.panX = this.animTarget.panX;
        this.panY = this.animTarget.panY;
        this.animTarget = null;
      }
      return;
    }

    if (Math.hypot(this.velX, this.velY) > 6) {
      this.panX = clamp(this.panX + this.velX * dt, -this.maxPanX, this.maxPanX);
      this.panY = clamp(this.panY + this.velY * dt, -this.maxPanY, this.maxPanY);
      const decay = Math.exp(-dt * 6.5);
      this.velX *= decay;
      this.velY *= decay;
      if (Math.abs(this.panX) >= this.maxPanX) this.velX = 0;
      if (Math.abs(this.panY) >= this.maxPanY) this.velY = 0;
    } else {
      this.velX = 0;
      this.velY = 0;
    }
  }

  drawOffscreenIndicators(ctx, viewW, viewH, hotspots, timeSec, isCastle = false) {
    this.edgePills = [];
    this.radarRect = null;

    if (viewH >= 360 && viewW >= 340 && hotspots.length > 0) {
      this._drawMiniRadar(ctx, viewW, viewH, hotspots, isCastle);
    }

    if (this.maxPanX < 18 && this.maxPanY < 18) return;

    const todo = hotspots.filter((hs) => !hs.completed);
    const leftOff = todo.filter((hs) => hs.x < 16).sort((a, b) => b.x - a.x);
    const rightOff = todo.filter((hs) => hs.x > viewW - 16).sort((a, b) => a.x - b.x);
    const topOff = todo.filter((hs) => hs.x >= 16 && hs.x <= viewW - 16 && hs.y < 52).sort((a, b) => b.y - a.y);
    const btmLimit = viewH - 86;
    const btmOff = todo.filter((hs) => hs.x >= 16 && hs.x <= viewW - 16 && hs.y > btmLimit).sort((a, b) => a.y - b.y);
    const bob = Math.sin(timeSec * 4.2) * 3;

    const drawPill = (side, list) => {
      const target = list[0];
      const pw = side === 'top' || side === 'bottom' ? 68 : 62;
      const ph = 36;
      let px = Math.round(viewW * 0.5 - pw * 0.5);
      let py = Math.round(viewH * 0.48 - ph * 0.5);
      if (side === 'left') px = 8 + Math.max(0, bob);
      else if (side === 'right') px = viewW - pw - 8 + Math.min(0, bob);
      else if (side === 'top') py = 54 + Math.max(0, bob);
      else py = viewH - ph - 92 + Math.min(0, bob);

      this.edgePills.push({ x: px, y: py, w: pw, h: ph, nx: target.nx, ny: target.ny });

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 9;
      const grad = ctx.createLinearGradient(px, py, px, py + ph);
      grad.addColorStop(0, isCastle ? '#8b1e2b' : '#1e7a4e');
      grad.addColorStop(1, isCastle ? '#3d0b12' : '#0b3621');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#ffea9c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 18);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffea9c';
      ctx.font = '800 12.5px Fredoka, Nunito, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const ic = isCastle ? '⭐' : '🪄';
      const label =
        side === 'left'
          ? `◀ ${ic}${list.length}`
          : side === 'right'
            ? `${list.length}${ic} ▶`
            : side === 'top'
              ? `▲ ${ic}${list.length}`
              : `▼ ${ic}${list.length}`;
      ctx.fillText(label, px + pw * 0.5, py + ph * 0.5 + 0.5);
      ctx.restore();
    };

    if (leftOff.length > 0) drawPill('left', leftOff);
    if (rightOff.length > 0) drawPill('right', rightOff);
    if (topOff.length > 0) drawPill('top', topOff);
    if (btmOff.length > 0) drawPill('bottom', btmOff);
  }

  _drawMiniRadar(ctx, viewW, viewH, hotspots, isCastle) {
    const compact = viewW < 640;
    const rw = compact ? 86 : 112;
    const rh = compact ? 50 : 64;
    const rx = 12;
    const ry = compact ? 52 : 56;
    this.radarRect = { x: rx, y: ry, w: rw, h: rh };

    ctx.save();
    ctx.fillStyle = isCastle ? 'rgba(32, 12, 18, 0.76)' : 'rgba(9, 28, 19, 0.76)';
    ctx.strokeStyle = 'rgba(255, 234, 156, 0.82)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 9);
    ctx.fill();
    ctx.stroke();

    // Live viewport rectangle inside the panoramic world
    const dx = (viewW - this.dw) * 0.5 + this.panX;
    const dy = (viewH - this.dh) * 0.5 + this.panY;
    const vx0 = clamp(-dx / Math.max(1, this.dw), 0, 1);
    const vy0 = clamp(-dy / Math.max(1, this.dh), 0, 1);
    const vwFrac = clamp(viewW / Math.max(1, this.dw), 0.12, 1);
    const vhFrac = clamp(viewH / Math.max(1, this.dh), 0.12, 1);

    ctx.fillStyle = 'rgba(255, 234, 156, 0.16)';
    ctx.strokeStyle = '#ffea9c';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(
      rx + vx0 * rw,
      ry + vy0 * rh,
      Math.min(rw - vx0 * rw, vwFrac * rw),
      Math.min(rh - vy0 * rh, vhFrac * rh)
    );

    for (const hs of hotspots) {
      const px = rx + clamp(hs.nx, 0.05, 0.95) * rw;
      const py = ry + clamp(hs.ny, 0.08, 0.92) * rh;
      ctx.fillStyle = hs.completed ? (isCastle ? '#72efdd' : '#52b788') : '#ffd166';
      ctx.beginPath();
      ctx.arc(px, py, hs.completed ? 2.6 : 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _hitOverlay(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (this.radarRect) {
      const r = this.radarRect;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return {
          nx: clamp((x - r.x) / r.w, 0.05, 0.95),
          ny: clamp((y - r.y) / r.h, 0.08, 0.92),
        };
      }
    }
    for (const pill of this.edgePills) {
      if (x >= pill.x - 6 && x <= pill.x + pill.w + 6 && y >= pill.y - 6 && y <= pill.y + pill.h + 6) {
        return pill;
      }
    }
    return null;
  }

  _zoomAround(nextZoom, focalX, focalY) {
    const prevZoom = this.zoom;
    const clampedZoom = clamp(nextZoom, this.minZoom, this.maxZoom);
    if (Math.abs(clampedZoom - prevZoom) < 0.001) return;
    const ratio = clampedZoom / prevZoom;
    const cx = focalX - this.viewW * 0.5;
    const cy = focalY - this.viewH * 0.5;
    this.panX = (this.panX - cx) * ratio + cx;
    this.panY = (this.panY - cy) * ratio + cy;
    this.zoom = clampedZoom;
    this._syncOverviewBtn();
  }

  _initPinch() {
    const [a, b] = [...this.pointers.values()];
    if (!a || !b) return;
    this.pinchStartDist = Math.max(20, Math.hypot(b.x - a.x, b.y - a.y));
    this.pinchStartZoom = this.zoom;
  }

  _bindEvents() {
    const endPointer = (e, allowTap) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0 && !this.isActive()) return;

      const tapLimit = this.downPointerType === 'touch' ? 11 : 6;
      if (allowTap && !this.wasMultiTouch && this.gestureMovedPx <= tapLimit && this.isActive()) {
        this._lastPointerTapTs = performance.now();
        this.velX = 0;
        this.velY = 0;
        const ov = this._hitOverlay(e.clientX, e.clientY);
        if (ov) this.focusNormalized(ov.nx, ov.ny, 0, false);
        else this.onTap?.(e.clientX, e.clientY, this.downPointerType);
      }

      if (this.pointers.size === 0) {
        this.wasMultiTouch = false;
        this.canvas.classList.remove('is-panning');
      }
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.isActive()) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      try {
        this.canvas.setPointerCapture?.(e.pointerId);
      } catch {
        // Synthetic events without active pointerId can safely proceed
      }
      this.animTarget = null;
      this.focusRequest = null;
      this.velX = 0;
      this.velY = 0;

      if (this.pointers.size === 0) {
        this.gestureMovedPx = 0;
        this.downPointerType = e.pointerType || 'mouse';
        this.lastMoveTs = performance.now();
      }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size >= 2) {
        this.wasMultiTouch = true;
        this._initPinch();
      }
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.isActive()) return;
      const prev = this.pointers.get(e.pointerId);
      if (!prev) {
        if (e.pointerType === 'mouse') {
          const ov = this._hitOverlay(e.clientX, e.clientY);
          if (ov) this.canvas.style.cursor = 'pointer';
          else this.onHover?.(e.clientX, e.clientY);
        }
        return;
      }

      const now = performance.now();
      const dt = Math.max(0.008, Math.min(0.06, (now - this.lastMoveTs) / 1000));
      this.lastMoveTs = now;

      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      prev.x = e.clientX;
      prev.y = e.clientY;
      this.gestureMovedPx += Math.hypot(dx, dy);

      if (this.pointers.size >= 2) {
        const [a, b] = [...this.pointers.values()];
        const dist = Math.max(20, Math.hypot(b.x - a.x, b.y - a.y));
        const rect = this.canvas.getBoundingClientRect();
        const midX = (a.x + b.x) * 0.5 - rect.left;
        const midY = (a.y + b.y) * 0.5 - rect.top;
        this._zoomAround(this.pinchStartZoom * (dist / this.pinchStartDist), midX, midY);
        return;
      }

      if (!this.wasMultiTouch && this.gestureMovedPx > 4 && (this.maxPanX > 2 || this.maxPanY > 2)) {
        this.canvas.classList.add('is-panning');
        this.panX = clamp(this.panX + dx, -this.maxPanX, this.maxPanX);
        this.panY = clamp(this.panY + dy, -this.maxPanY, this.maxPanY);
        this.velX = this.velX * 0.45 + (dx / dt) * 0.55;
        this.velY = this.velY * 0.45 + (dy / dt) * 0.55;
      }
    });

    this.canvas.addEventListener('pointerup', (e) => endPointer(e, true));
    this.canvas.addEventListener('pointercancel', (e) => endPointer(e, false));
    this.canvas.addEventListener('lostpointercapture', (e) => endPointer(e, false));
    this.canvas.addEventListener('click', (e) => {
      if (!this.isActive() || performance.now() - (this._lastPointerTapTs || 0) < 350) return;
      if (this.gestureMovedPx > 11) return;
      const ov = this._hitOverlay(e.clientX, e.clientY);
      if (ov) this.focusNormalized(ov.nx, ov.ny, 0, false);
      else this.onTap?.(e.clientX, e.clientY, 'mouse');
    });
    this.canvas.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && this.pointers.size === 0 && this.isActive()) {
        this.onLeave?.();
      }
    });

    this.canvas.addEventListener(
      'wheel',
      (e) => {
        if (!this.isActive()) return;
        e.preventDefault();
        this.animTarget = null;
        if (e.ctrlKey || Math.abs(e.deltaX) < 2) {
          const rect = this.canvas.getBoundingClientRect();
          const factor = e.deltaY < 0 ? 1.09 : 0.92;
          const nextZ = clamp(this.zoom * factor, this.minZoom, this.maxZoom);
          if (Math.abs(nextZ - this.zoom) > 0.002) {
            this._zoomAround(nextZ, e.clientX - rect.left, e.clientY - rect.top);
            return;
          }
        }
        this.panX = clamp(this.panX - (e.deltaX || e.deltaY * 0.7), -this.maxPanX, this.maxPanX);
        this.panY = clamp(this.panY - (e.deltaX ? e.deltaY : 0), -this.maxPanY, this.maxPanY);
      },
      { passive: false }
    );

    this.canvas.addEventListener('keydown', (e) => {
      if (!this.isActive()) return;
      const step = 76;
      if (e.key === 'ArrowLeft') this.panX = clamp(this.panX + step, -this.maxPanX, this.maxPanX);
      else if (e.key === 'ArrowRight') this.panX = clamp(this.panX - step, -this.maxPanX, this.maxPanX);
      else if (e.key === 'ArrowUp') this.panY = clamp(this.panY + step, -this.maxPanY, this.maxPanY);
      else if (e.key === 'ArrowDown') this.panY = clamp(this.panY - step, -this.maxPanY, this.maxPanY);
      else if (e.key === '+' || e.key === '=') this.zoomBy(0.2);
      else if (e.key === '-') this.zoomBy(-0.2);
      else if (e.key === '0' || e.key === 'Home') this.toggleOverview();
      else return;
      e.preventDefault();
      this.animTarget = null;
    });
  }
}
