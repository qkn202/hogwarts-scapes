/**
 * Playrix Signature "Pull the Pin" (24 Physics-Driven Vaults: 12 Castle + 12 Grounds)
 * Genuine 2D segment-collision & multi-particle fluid/treasure simulation:
 * - Slanted stone chutes, unpulled golden pins, gated drain pits, and Wizard/Pet receptor
 * - Water + Lava => Solid Obsidian + Steam! Gold + Active Lava => Melted Slag (Lose)!
 */

import { getGamePinPuzzles } from '../data/pinPuzzles.js';
import { sound } from '../utils/sound.js';
import { renderPinVaultScene } from './pinRenderer.js';

export class PinMinigameController {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {(result: { puzzle: object, status: 'win' | 'lose', reason: string }) => void} onOutcome
   */
  constructor(canvas, onOutcome) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.onOutcome = onOutcome;

    this.gameId = 'homescapes';
    this.isGarden = false;
    this.puzzleIndex = 0;
    this.puzzle = null;
    this.pulledOrder = [];
    this.pinStates = [];
    this.particles = [];
    this.steamPuffs = [];
    this.resolved = false;
    this.rafId = null;
    this._outcomeTimer = null;

    this._lastPointerTs = 0;
    if (this.canvas) {
      this.canvas.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        this._lastPointerTs = performance.now();
        this._onPullInput(e.clientX, e.clientY, e.pointerType === 'touch');
      });
      this.canvas.addEventListener('click', (e) => {
        if (performance.now() - this._lastPointerTs < 350) return;
        this._onPullInput(e.clientX, e.clientY, false);
      });
      this.canvas.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'mouse') this._onMove(e);
      });
      this.canvas.addEventListener('mouseleave', () => {
        this.canvas.style.cursor = 'default';
      });
    }
  }

  loadPuzzle(index, gameIdOrGarden = false) {
    if (this._outcomeTimer) {
      clearTimeout(this._outcomeTimer);
      this._outcomeTimer = null;
    }
    this.gameId =
      typeof gameIdOrGarden === 'string'
        ? gameIdOrGarden
        : gameIdOrGarden
          ? 'gardenscapes'
          : 'homescapes';
    this.isGarden = this.gameId === 'gardenscapes';
    const list = getGamePinPuzzles(this.gameId);
    this.puzzleIndex = ((index % list.length) + list.length) % list.length;
    const puz = list[this.puzzleIndex];
    this.puzzle = puz;
    this.pulledOrder = [];
    this.resolved = false;
    this.steamPuffs = [];

    this.pinStates = puz.pins.map((p) => ({
      ...p,
      pulled: false,
      slide: 0,
    }));

    this.particles = [];
    for (const el of puz.elements) {
      const count = el.type === 'gold' ? 20 : 26;
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / 7);
        const col = (i % 7) - 3;
        this.particles.push({
          kind: el.type,
          heldBy: el.heldBy || null,
          x: el.x + col * 5.6 + (((i * 17) % 5) - 2) * 0.4,
          y: el.y - row * 5.8,
          vx: (((i * 13) % 7) - 3) * 2.2,
          vy: 0,
          r: el.type === 'gold' ? 5.1 : 5.3,
          stone: false,
          melted: false,
          saved: false,
          drained: false,
          cooled: 0,
          gem: el.type === 'gold' && i % 4 === 0,
          phase: i * 0.65,
        });
      }
    }

    if (this.ctx) this._startLoop();
    return puz;
  }

  stop() {
    if (this._outcomeTimer) {
      clearTimeout(this._outcomeTimer);
      this._outcomeTimer = null;
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  pullPinById(pinId) {
    if (this.resolved) return false;
    const pin = this.pinStates.find((p) => p.id === pinId && !p.pulled);
    if (!pin) return false;
    pin.pulled = true;
    this.pulledOrder.push(pin.id);
    if (this.canvas) this.canvas.style.cursor = 'default';
    sound.sfxSwap();
    return true;
  }

  _startLoop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    const FIXED_DT = 1 / 60;
    let last = performance.now();
    let acc = 0;
    const tick = (now) => {
      acc += Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      while (acc >= FIXED_DT) {
        this._update(FIXED_DT);
        acc -= FIXED_DT;
      }
      this._render(now / 1000);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  _hitPinAt(clientX, clientY, coarseTouch = false) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = (clientX - rect.left) * (480 / rect.width);
    const y = (clientY - rect.top) * (320 / rect.height);
    const ringR = coarseTouch ? 36 : 28;
    const barHalfH = coarseTouch ? 24 : 18;
    for (const pin of this.pinStates) {
      if (pin.pulled) continue;
      const ang = -(pin.angle || 0);
      const dx = x - pin.x;
      const dy = y - pin.y;
      const lx = dx * Math.cos(ang) - dy * Math.sin(ang);
      const ly = dx * Math.sin(ang) + dy * Math.cos(ang);
      const handleLx = -pin.length / 2 - 13;
      if (Math.hypot(lx - handleLx, ly) <= ringR || (Math.abs(lx) <= pin.length * 0.6 && Math.abs(ly) <= barHalfH)) {
        return pin;
      }
    }
    return null;
  }

  _onMove(e) {
    this.canvas.style.cursor = !this.resolved && this._hitPinAt(e.clientX, e.clientY, false) ? 'pointer' : 'default';
  }

  _onPullInput(clientX, clientY, coarseTouch = false) {
    if (this.resolved) return;
    const pin = this._hitPinAt(clientX, clientY, coarseTouch);
    if (pin) this.pullPinById(pin.id);
  }

  _spawnSteam(x, y) {
    if (this.steamPuffs.length > 36) return;
    this.steamPuffs.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y - 3,
      vy: -30 - Math.random() * 20,
      r: 4 + Math.random() * 4,
      life: 0.7,
    });
  }

  _collideSegment(pt, x1, y1, x2, y2, segR, dt) {
    const vxS = x2 - x1;
    const vyS = y2 - y1;
    const len2 = vxS * vxS + vyS * vyS;
    if (len2 < 1) return;
    const t = Math.max(0, Math.min(1, ((pt.x - x1) * vxS + (pt.y - y1) * vyS) / len2));
    const cx = x1 + t * vxS;
    const cy = y1 + t * vyS;
    const nx = pt.x - cx;
    const ny = pt.y - cy;
    const dist = Math.hypot(nx, ny);
    const minD = pt.r + segR;
    if (dist < minD) {
      const ux = dist > 0.001 ? nx / dist : 0;
      const uy = dist > 0.001 ? ny / dist : -1;
      pt.x = cx + ux * minD;
      pt.y = cy + uy * minD;
      const vn = pt.vx * ux + pt.vy * uy;
      if (vn < 0) {
        pt.vx -= 1.15 * vn * ux;
        pt.vy -= 1.15 * vn * uy;
      }
      if (Math.abs(vyS) > 1.5 && !pt.stone) {
        const len = Math.sqrt(len2);
        const dir = y2 > y1 ? 1 : -1;
        pt.vx += (vxS / len) * dir * 135 * dt;
      }
    }
  }

  _triggerOutcome(status, reason) {
    if (this.resolved) return;
    this.resolved = true;
    const puz = this.puzzle;
    if (!this.ctx) {
      this.onOutcome?.({ puzzle: puz, status, reason });
      return;
    }
    this._outcomeTimer = setTimeout(() => {
      this._outcomeTimer = null;
      if (status === 'win') sound.sfxVictory();
      else sound.sfxDefeat();
      this.onOutcome?.({ puzzle: puz, status, reason });
    }, 480);
  }

  _update(dt) {
    const puz = this.puzzle;
    if (!puz) return;
    this._simTime = (this._simTime || 0) + dt;

    for (const pin of this.pinStates) {
      if (pin.pulled && pin.slide < 1) {
        pin.slide = Math.min(1, pin.slide + dt * 5.2);
      }
    }

    const openDrains = (puz.drains || []).filter((d) => !d.gatedBy || this.pulledOrder.includes(d.gatedBy));
    const rec = puz.receptor || { x: 246, y: 276 };

    for (const pt of this.particles) {
      if (pt.drained || pt.melted || pt.saved) continue;
      const holder = pt.heldBy ? this.pinStates.find((p) => p.id === pt.heldBy) : null;
      if (holder && !holder.pulled) {
        pt.x += Math.sin(pt.phase + this._simTime * 3) * 0.08;
        continue;
      }

      pt.vy += (pt.stone ? 360 : 450) * dt;
      pt.vx *= pt.stone ? 0.8 : 0.985;

      // Floor roll toward open drain (if close) or toward Wizard/Pet receptor
      if (pt.y > 224 && !pt.stone) {
        let pulledToDrain = false;
        for (const d of openDrains) {
          if (Math.abs(pt.x - d.x) < 130) {
            pt.vx += Math.sign(d.x - pt.x) * 240 * dt;
            pulledToDrain = true;
          }
        }
        if (!pulledToDrain) {
          pt.vx += Math.sign(rec.x - pt.x) * 135 * dt;
        }
      }

      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;

      // Collide slanted stone walls
      for (const w of puz.walls || []) {
        this._collideSegment(pt, w[0], w[1], w[2], w[3], 5.5, dt);
      }
      // Collide unpulled pins
      for (const pin of this.pinStates) {
        if (pin.slide >= 0.45) continue;
        const cx = pin.x - pin.slide * 165;
        const ang = pin.angle || 0;
        const hx = Math.cos(ang) * (pin.length / 2);
        const hy = Math.sin(ang) * (pin.length / 2);
        this._collideSegment(pt, cx - hx, pin.y - hy, cx + hx, pin.y + hy, 6.0, dt);
      }

      // Outer Gringotts shaft bounds
      if (pt.x < 102) { pt.x = 102; pt.vx = Math.abs(pt.vx) * 0.35; }
      if (pt.x > 378) { pt.x = 378; pt.vx = -Math.abs(pt.vx) * 0.35; }
      const floorY = pt.stone ? 284 : 280;
      if (pt.y > floorY) {
        pt.y = floorY;
        pt.vy *= -0.18;
        pt.vx *= pt.stone ? 0.5 : 0.88;
      }

      // Open drain capture
      for (const d of openDrains) {
        if (Math.hypot(pt.x - d.x, pt.y - d.y) < (d.r || 28)) {
          pt.drained = true;
          break;
        }
      }
      if (pt.drained) continue;

      // Receptor check for gold
      if (pt.kind === 'gold' && Math.hypot(pt.x - rec.x, pt.y - rec.y) < 32) {
        pt.saved = true;
      }
    }

    // Reactions: Water + Lava -> Obsidian Stone | Gold + Active Lava -> Melted Gold!
    for (let i = 0; i < this.particles.length; i++) {
      const a = this.particles[i];
      if (a.drained || a.melted || a.saved) continue;
      if (a.kind !== 'water' && a.kind !== 'gold') continue;
      for (let j = 0; j < this.particles.length; j++) {
        const b = this.particles[j];
        if (b.kind !== 'lava' || b.stone || b.drained) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (a.kind === 'water' && d < 32) {
          b.stone = true;
          b.vx *= 0.15;
          b.vy = Math.min(b.vy, 18);
          // Propagate thermal shock across connected magma pool
          for (const c of this.particles) {
            if (c.kind === 'lava' && !c.stone && !c.drained && Math.hypot(c.x - b.x, c.y - b.y) < 34) {
              c.stone = true;
              c.vx *= 0.15;
            }
          }
          a.cooled += 1;
          if (a.cooled >= 2) a.drained = true;
          this._spawnSteam(b.x, b.y);
          if (a.drained) break;
        } else if (a.kind === 'gold' && d < 22) {
          a.melted = true;
          this._spawnSteam(a.x, a.y);
          break;
        }
      }
    }

    // Soft pairwise repulsion
    for (let i = 0; i < this.particles.length; i++) {
      const a = this.particles[i];
      if (a.drained || a.melted || a.saved) continue;
      for (let j = i + 1; j < this.particles.length; j++) {
        const b = this.particles[j];
        if (b.drained || b.melted || b.saved) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        const minD = a.r + b.r - 1.4;
        if (d2 > 0.01 && d2 < minD * minD) {
          const d = Math.sqrt(d2);
          const push = (minD - d) * 0.28;
          a.x -= (dx / d) * push;
          a.y -= (dy / d) * push;
          b.x += (dx / d) * push;
          b.y += (dy / d) * push;
        }
      }
    }

    if (!this.resolved) {
      let lavaHits = 0;
      let goldSaved = 0;
      let goldMelted = 0;
      let goldDrained = 0;
      for (const pt of this.particles) {
        if (pt.kind === 'lava' && !pt.stone && !pt.drained && Math.hypot(pt.x - rec.x, pt.y - rec.y) < 30) {
          lavaHits++;
        } else if (pt.kind === 'gold') {
          if (pt.saved) goldSaved++;
          else if (pt.melted) goldMelted++;
          else if (pt.drained) goldDrained++;
        }
      }
      if (lavaHits >= 2) {
        this._triggerOutcome('lose', '🔥 Lửa Quỷ tràn trúng Pháp sư — hãy hóa đá bằng Nước hoặc xả cống trước!');
      } else if (goldMelted >= 5) {
        this._triggerOutcome('lose', '🔥 Kho báu Galleon đã bị Lửa Quỷ nung chảy mất!');
      } else if (goldDrained >= 7) {
        this._triggerOutcome('lose', '🕳️ Kho báu Galleon đã rơi mất xuống hố bẫy!');
      } else if (goldSaved >= 10) {
        this._triggerOutcome('win', puz.winReason);
      }
    }

    this.steamPuffs = this.steamPuffs.filter((s) => {
      s.y += s.vy * dt;
      s.r += 10 * dt;
      s.life -= dt;
      return s.life > 0;
    });
  }

  _render(timeSec) {
    renderPinVaultScene(this, timeSec);
  }
}
