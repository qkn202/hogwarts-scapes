/**
 * 2D Canvas Renderer for the 24-Vault Gringotts & Forbidden Forest Physics Pin Mini-Game
 */

import { drawAustin, drawPet } from './isoMath.js';

export function renderPinVaultScene(ctrl, timeSec) {
  const ctx = ctrl.ctx;
  const puz = ctrl.puzzle;
  if (!ctx || !puz) return;
  ctx.clearRect(0, 0, 480, 320);

  const grad = ctx.createLinearGradient(0, 0, 0, 320);
  grad.addColorStop(0, ctrl.isGarden ? '#13241d' : '#1a142e');
  grad.addColorStop(1, '#080a12');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 480, 320);

  ctx.fillStyle = ctrl.isGarden ? '#112224' : '#121c2e';
  ctx.beginPath();
  ctx.roundRect(92, 22, 296, 276, 20);
  ctx.fill();
  ctx.strokeStyle = ctrl.isGarden ? '#1b4332' : '#4a1219';
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 4;
  ctx.stroke();

  for (const d of puz.drains || []) {
    const open = !d.gatedBy || ctrl.pulledOrder.includes(d.gatedBy);
    ctx.fillStyle = open ? '#04060c' : '#2b2d42';
    ctx.beginPath();
    ctx.roundRect(d.x - 22, d.y - 8, 44, 28, 8);
    ctx.fill();
    ctx.strokeStyle = open ? '#ff6b6b' : '#8d99ae';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.strokeStyle = ctrl.isGarden ? '#52796f' : '#8d6e63';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  for (const w of puz.walls || []) {
    ctx.beginPath();
    ctx.moveTo(w[0], w[1]);
    ctx.lineTo(w[2], w[3]);
    ctx.stroke();
  }

  const rec = puz.receptor || { x: 246, y: 276 };
  drawAustin(ctx, rec.x - 10, rec.y + 8, 0.68, timeSec, ctrl.isGarden, '');
  drawPet(ctx, rec.x + 22, rec.y + 8, ctrl.isGarden, timeSec, '', 0.72);

  for (const pt of ctrl.particles) {
    if (pt.drained || pt.melted || pt.saved) continue;
    ctx.save();
    ctx.translate(pt.x, pt.y);
    if (pt.stone) {
      ctx.fillStyle = '#5c677d';
      ctx.strokeStyle = '#33415c';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(0, 0, pt.r + 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (pt.kind === 'water') {
      ctx.fillStyle = '#00b4d8';
      ctx.beginPath();
      ctx.arc(0, 0, pt.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (pt.kind === 'lava') {
      ctx.fillStyle = '#ef233c';
      ctx.beginPath();
      ctx.arc(0, 0, pt.r + 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffbe0b';
      ctx.beginPath();
      ctx.arc(0, 0, pt.r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (pt.gem) {
      ctx.fillStyle = ctrl.isGarden ? '#2ec4b6' : '#ff4d6d';
      ctx.beginPath();
      ctx.moveTo(0, -pt.r);
      ctx.lineTo(pt.r, 0);
      ctx.lineTo(0, pt.r);
      ctx.lineTo(-pt.r, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#ffb703';
      ctx.strokeStyle = '#ca6702';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, pt.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const s of ctrl.steamPuffs) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, s.life);
    ctx.fillStyle = '#f8f9fa';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const pin of ctrl.pinStates) {
    if (pin.slide >= 1) continue;
    ctx.save();
    ctx.translate(pin.x - pin.slide * 165, pin.y);
    ctx.rotate(pin.angle || 0);
    const barGrad = ctx.createLinearGradient(0, -6, 0, 6);
    barGrad.addColorStop(0, '#fff3b0');
    barGrad.addColorStop(0.5, '#ffb703');
    barGrad.addColorStop(1, '#9c5700');
    ctx.fillStyle = barGrad;
    ctx.strokeStyle = '#5c3317';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-pin.length / 2, -5.5, pin.length, 11, 5.5);
    ctx.fill();
    ctx.stroke();

    const pulse = 1 + Math.sin(timeSec * 5) * 0.08;
    ctx.save();
    ctx.translate(-pin.length / 2 - 13, 0);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(0, 0, 11.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  }
}

