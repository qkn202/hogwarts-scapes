/**
 * Playrix Match-3 Visual FX, Screen Shake, 3D Paper Plane Flight & Goal Trail Renderer
 */

import { sprites } from '../utils/spriteLoader.js';
import { PIECE_PALETTES, getGoalBadgeMeta } from './pieceArt.js';

export class Match3FxSystem {
  constructor() {
    this.reset();
  }

  reset() {
    this.particles = [];
    this.beams = [];
    this.shockwaves = [];
    this.planes = [];
    this.lightnings = [];
    this.flyers = [];
    this.floatTexts = [];
    this.shakeTime = 0;
    this.shakeMag = 0;
  }

  triggerShake(mag = 6, duration = 0.24) {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  getShakeOffset() {
    if (this.shakeTime <= 0) return { x: 0, y: 0 };
    const m = this.shakeMag * Math.min(1, this.shakeTime * 5);
    return {
      x: (Math.random() - 0.5) * 2 * m,
      y: (Math.random() - 0.5) * 2 * m,
    };
  }

  /**
   * Drains board.fxEvents into juicy Playrix animations.
   * @returns {boolean} true if a Paper Plane flight was spawned
   */
  ingest(board, originX, originY, tileSize) {
    if (!board) return false;
    let hasPlane = false;
    const events = board.fxEvents.splice(0, board.fxEvents.length);

    for (const ev of events) {
      const cx = originX + (ev.c + 0.5) * tileSize;
      const cy = originY + (ev.r + 0.5) * tileSize;

      if (ev.type === 'piece_pop' || ev.type === 'particles' || ev.type === 'power_spawn') {
        const col = ev.color || PIECE_PALETTES[board.gameId][ev.colorIndex ?? 0] || '#ffd166';
        const count = ev.type === 'power_spawn' ? 12 : 8;
        for (let i = 0; i < count; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 55 + Math.random() * 135;
          this.particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 30,
            life: 0.48,
            maxLife: 0.48,
            color: col,
            r: ev.type === 'power_spawn' ? 5.5 : 4.2,
          });
        }
      } else if (ev.type === 'beam') {
        this.triggerShake(4, 0.16);
        this.beams.push({ r: ev.r, c: ev.c, axis: ev.axis, life: 0.3, maxLife: 0.3 });
      } else if (ev.type === 'shockwave') {
        this.triggerShake(Math.min(14, (ev.radius || 2) * 3.2), 0.28);
        this.shockwaves.push({
          x: cx,
          y: cy,
          maxR: (ev.radius + 0.65) * tileSize,
          life: 0.36,
          maxLife: 0.36,
        });
      } else if (ev.type === 'plane_flight') {
        hasPlane = true;
        this.planes.push({
          x1: originX + (ev.c1 + 0.5) * tileSize,
          y1: originY + (ev.r1 + 0.5) * tileSize,
          x2: originX + (ev.c2 + 0.5) * tileSize,
          y2: originY + (ev.r2 + 0.5) * tileSize,
          t: 0,
          duration: 0.36,
        });
      } else if (ev.type === 'lightning') {
        this.triggerShake(5, 0.2);
        this.lightnings.push({
          x1: originX + (ev.c1 + 0.5) * tileSize,
          y1: originY + (ev.r1 + 0.5) * tileSize,
          x2: originX + (ev.c2 + 0.5) * tileSize,
          y2: originY + (ev.r2 + 0.5) * tileSize,
          life: 0.28,
        });
      } else if (ev.type === 'goal_fly') {
        const meta = getGoalBadgeMeta(board.gameId, { type: ev.goalType, color: ev.color });
        this.flyers.push({
          x1: cx,
          y1: cy,
          x2: Math.max(18, originX * 0.25),
          y2: originY + tileSize * 2.2,
          t: 0,
          duration: 0.48,
          color: meta.color,
          icon: meta.icon,
        });
      } else if (ev.type === 'charge_orb') {
        this.flyers.push({
          x1: cx,
          y1: cy,
          x2: Math.max(18, originX * 0.25),
          y2: originY + tileSize * 5.2,
          t: 0,
          duration: 0.44,
          color: '#ffd166',
          icon: '⚡',
        });
      } else if (ev.type === 'float_text') {
        this.floatTexts.push({
          x: cx,
          y: cy,
          text: ev.text,
          color: ev.color || '#ffffff',
          life: 1.0,
          maxLife: 1.0,
        });
      }
    }
    return hasPlane;
  }

  update(dt) {
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      if (this.shakeTime === 0) this.shakeMag = 0;
    }
    this.particles = this.particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt;
      p.life -= dt;
      return p.life > 0;
    });
    this.beams = this.beams.filter((b) => (b.life -= dt) > 0);
    this.shockwaves = this.shockwaves.filter((s) => (s.life -= dt) > 0);
    this.planes = this.planes.filter((pl) => {
      pl.t += dt / pl.duration;
      if (Math.random() < 0.7) {
        const x = pl.x1 + (pl.x2 - pl.x1) * pl.t;
        const y = pl.y1 + (pl.y2 - pl.y1) * pl.t - Math.sin(pl.t * Math.PI) * 54;
        this.particles.push({ x, y, vx: 0, vy: 12, life: 0.22, maxLife: 0.22, color: '#90e0ef', r: 3.2 });
      }
      return pl.t < 1;
    });
    this.flyers = this.flyers.filter((fl) => (fl.t += dt / fl.duration) < 1);
    this.lightnings = this.lightnings.filter((l) => (l.life -= dt) > 0);
    this.floatTexts = this.floatTexts.filter((ft) => {
      ft.y -= 34 * dt;
      ft.life -= dt;
      return ft.life > 0;
    });
  }

  render(ctx, originX, originY, ts, bw, bh) {
    for (const b of this.beams) {
      const alpha = b.life / b.maxLife;
      const grad =
        b.axis === 'h'
          ? ctx.createLinearGradient(originX, originY + b.r * ts, originX, originY + (b.r + 1) * ts)
          : ctx.createLinearGradient(originX + b.c * ts, originY, originX + (b.c + 1) * ts, originY);
      grad.addColorStop(0, `rgba(255, 159, 28, 0)`);
      grad.addColorStop(0.5, `rgba(255, 243, 176, ${alpha * 0.92})`);
      grad.addColorStop(1, `rgba(255, 159, 28, 0)`);
      ctx.fillStyle = grad;
      if (b.axis === 'h') ctx.fillRect(originX, originY + b.r * ts, bw, ts);
      else ctx.fillRect(originX + b.c * ts, originY, ts, bh);
    }

    for (const sw of this.shockwaves) {
      const prog = 1 - sw.life / sw.maxLife;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 209, 102, ${1 - prog})`;
      ctx.lineWidth = 8 * (1 - prog);
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.maxR * prog, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const l of this.lightnings) {
      ctx.save();
      ctx.strokeStyle = '#fff3b0';
      ctx.shadowColor = '#4cc9f0';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      const midX = (l.x1 + l.x2) / 2 + (Math.random() - 0.5) * 24;
      const midY = (l.y1 + l.y2) / 2 + (Math.random() - 0.5) * 24;
      ctx.lineTo(midX, midY);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
      ctx.restore();
    }

    const planeImg = sprites.get('h_plane');
    for (const pl of this.planes) {
      const t = pl.t;
      const x = pl.x1 + (pl.x2 - pl.x1) * t;
      const y = pl.y1 + (pl.y2 - pl.y1) * t - Math.sin(t * Math.PI) * 54;
      const dx = pl.x2 - pl.x1;
      const dy = pl.y2 - pl.y1 - Math.cos(t * Math.PI) * Math.PI * 54;
      const ang = Math.atan2(dy, dx);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang + 0.35);
      if (planeImg) {
        const d = ts * 0.92;
        ctx.drawImage(planeImg, -d / 2, -d / 2, d, d);
      } else {
        ctx.font = `${Math.round(ts * 0.5)}px system-ui`;
        ctx.fillText('✈️', -10, 8);
      }
      ctx.restore();
    }

    for (const fl of this.flyers) {
      const ease = 1 - Math.pow(1 - fl.t, 2);
      const x = fl.x1 + (fl.x2 - fl.x1) * ease;
      const y = fl.y1 + (fl.y2 - fl.y1) * ease - Math.sin(fl.t * Math.PI) * 42;
      ctx.save();
      ctx.fillStyle = fl.color;
      ctx.shadowColor = fl.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fl.icon, x, y);
      ctx.restore();
    }

    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const ft of this.floatTexts) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (ft.life / ft.maxLife) * 1.4);
      ctx.font = '900 18px Fredoka, Nunito, system-ui';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(25, 14, 8, 0.82)';
      ctx.lineWidth = 4.5;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }
}
