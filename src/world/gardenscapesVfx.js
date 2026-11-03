/**
 * Magical VFX, 3-Style Plaza Rune Seals & Enchanted Lake Boat Helpers for Gardenscapes
 */

import { drawStyledPropSprite } from './isoMath.js';

export function drawHogwartsRuneCircle(ctx, x, y, sc, timeSec, styleIdx, style, isPreview) {
  ctx.save();
  const rx = 112 * sc;
  const ry = 46 * sc;
  const col = style?.primary || '#d4af37';
  const sec = style?.secondary || '#166541';
  const acc = style?.accent || '#fff8d6';

  const g = ctx.createRadialGradient(x, y, 6, x, y, rx * 1.08);
  g.addColorStop(0, `${col}78`);
  g.addColorStop(0.58, `${sec}52`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 1.06, ry * 1.06, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = col;
  ctx.lineWidth = (isPreview ? 3.8 : 3.0) * sc;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  if (styleIdx === 0) {
    // Style 0: Golden 8-Point Hogwarts Astrolabe Star + 4 Golden Brazier Orbs
    for (let k = 0; k < 2; k++) {
      const rot = timeSec * 0.18 + (k * Math.PI) / 4;
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) {
        const a = rot + (i * Math.PI) / 2;
        const px = x + Math.cos(a) * rx * 0.86;
        const py = y + Math.sin(a) * ry * 0.86;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  } else if (styleIdx === 1) {
    // Style 1: Slytherin Emerald-Jade Interlocking Diamond Mosaic
    ctx.fillStyle = `${col}3d`;
    ctx.beginPath();
    ctx.moveTo(x, y - ry * 0.92);
    ctx.lineTo(x + rx * 0.92, y);
    ctx.lineTo(x, y + ry * 0.92);
    ctx.lineTo(x - rx * 0.92, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = acc;
    ctx.stroke();
  } else {
    // Style 2: Celestial Sapphire Crescent-Moon & Constellation Rings
    ctx.setLineDash([8 * sc, 5 * sc]);
    ctx.strokeStyle = acc;
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 0.74, ry * 0.74, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = `${acc}66`;
    ctx.beginPath();
    ctx.ellipse(x - 14 * sc, y, rx * 0.34, ry * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const bx = x + Math.cos(a) * rx * 0.96;
    const by = y + Math.sin(a) * ry * 0.96 - Math.abs(Math.sin(timeSec * 3 + i)) * 4 * sc;
    ctx.fillStyle = sec;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2 * sc;
    ctx.beginPath();
    ctx.arc(bx, by, 7.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = acc;
    ctx.beginPath();
    ctx.arc(bx, by, 3.6 * sc, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawDormantRuneSeal(ctx, x, y, sc, timeSec) {
  ctx.save();
  ctx.globalAlpha = 0.42 + Math.sin(timeSec * 2.2) * 0.1;
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 1.6 * sc;
  ctx.setLineDash([4 * sc, 4 * sc]);
  ctx.beginPath();
  ctx.ellipse(x, y, 32 * sc, 14 * sc, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawEnchantedLakeBoat(ctx, x, y, sc, timeSec, st) {
  const driftX = x + Math.sin(timeSec * 0.65) * 16 * sc;
  const driftY = y + Math.cos(timeSec * 1.1) * 4 * sc;

  ctx.save();
  ctx.strokeStyle = `${st.style?.primary || '#72efdd'}99`;
  ctx.lineWidth = 2.0 * sc;
  for (const rMul of [0.85, 1.18]) {
    ctx.beginPath();
    ctx.ellipse(driftX, driftY + 26 * sc, 58 * sc * rMul, 16 * sc * rMul, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  drawStyledPropSprite(ctx, 'g_prop_boat', driftX, driftY, 180 * sc, st.styleIdx, {
    flatFloor: true,
    preview: st.preview,
    timeSec,
  });
}

export function drawPensieveWisps(ctx, x, y, sc, timeSec, colorHex) {
  ctx.save();
  ctx.strokeStyle = colorHex || '#72efdd';
  ctx.lineWidth = 2.2 * sc;
  ctx.globalAlpha = 0.72;
  for (let i = 0; i < 3; i++) {
    const ph = timeSec * 2.2 + i * 2.1;
    ctx.beginPath();
    ctx.ellipse(x + Math.sin(ph) * 6 * sc, y - i * 8 * sc, (26 - i * 5) * sc, (9 - i * 1.5) * sc, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCandleSparkles(ctx, x, y, sc, timeSec, primaryHex, accentHex) {
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const sx = x + Math.sin(timeSec * 1.8 + i * 1.3) * 32 * sc;
    const sy = y + Math.cos(timeSec * 2.4 + i) * 18 * sc;
    ctx.fillStyle = i % 2 === 0 ? primaryHex || '#ffea9c' : accentHex || '#ffd166';
    ctx.globalAlpha = 0.6 + 0.38 * Math.abs(Math.sin(timeSec * 5 + i));
    ctx.beginPath();
    ctx.arc(sx, sy, 3.0 * sc, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawTriwizardAura(ctx, x, y, sc, timeSec, colorHex) {
  ctx.save();
  const r = (30 + Math.sin(timeSec * 3.5) * 4) * sc;
  const g = ctx.createRadialGradient(x, y, 2, x, y, r);
  g.addColorStop(0, 'rgba(255, 250, 220, 0.58)');
  g.addColorStop(0.5, `${colorHex || '#48cae4'}55`);
  g.addColorStop(1, 'rgba(72, 202, 228, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawWillowSpiritCascade(ctx, x, y, sc, timeSec, style) {
  ctx.save();
  for (let i = 0; i < 14; i++) {
    const px = x + Math.sin(timeSec * 1.1 + i * 1.7) * 68 * sc;
    const py = y + (((timeSec * 20 + i * 17) % 86) - 34) * sc;
    ctx.fillStyle = i % 2 === 0 ? style?.primary || '#ffd166' : style?.accent || '#fff3b0';
    ctx.globalAlpha = 0.82;
    ctx.beginPath();
    ctx.arc(px, py, 3.5 * sc, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawFloatingMagicMotes(ctx, w, h, sc, timeSec) {
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const mx = w * (0.14 + i * 0.12) + Math.sin(timeSec * 0.9 + i * 1.9) * 36 * sc;
    const my = h * (0.28 + (i % 3) * 0.16) + Math.cos(timeSec * 1.3 + i) * 22 * sc;
    ctx.globalAlpha = 0.45 + 0.45 * Math.abs(Math.sin(timeSec * 2.8 + i));
    ctx.fillStyle = i % 3 === 0 ? '#ffea9c' : '#72efdd';
    ctx.beginPath();
    ctx.arc(mx, my, 2.8 * sc, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

