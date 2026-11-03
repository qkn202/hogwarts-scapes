/**
 * Shared 2.5D Isometric Scene Framing, Full-Body 3D Austin, 3-Style 3D Prop Sprites & Pin Badges
 * Powers both Homescapes Mansion Rooms and Gardenscapes Estate Zones.
 */

import { sprites } from '../utils/spriteLoader.js';

export function isoProject(cx, cy, tileW, tileH, u, v, z = 0) {
  return {
    x: cx + (u - v) * (tileW * 0.5),
    y: cy + (u + v) * (tileH * 0.5) - z * tileH * 0.85,
  };
}

export const PANORAMA_SPAN = 1.32;

/**
 * Draws a pre-rendered 16:9 isometric room/garden image with panoramic expansion (`PANORAMA_SPAN`),
 * pan/zoom camera (`cam` from `0.76x` Overview to `2.15x` Close-Up), and returns `pt(nx, ny)`.
 */
export function drawSceneBackdrop(ctx, w, h, sceneKey, fallbackTop, fallbackBtm, cam = null, fallbackKey = null) {
  const img = sprites.get(sceneKey) || (fallbackKey ? sprites.get(fallbackKey) : null);
  const minZ = cam?.minZoom || 0.76;
  const maxZ = cam?.maxZoom || 2.15;
  const zoom = cam ? Math.max(minZ, Math.min(maxZ, cam.zoom || 1)) : 1;
  if (img) {
    const iw = img.naturalWidth || 1376;
    const ih = img.naturalHeight || 768;
    const scale = Math.max(w / iw, h / ih) * Math.max(1.005, PANORAMA_SPAN * zoom);
    const dw = iw * scale;
    const dh = ih * scale;
    const maxPanX = Math.max(0, (dw - w) * 0.5);
    const maxPanY = Math.max(0, (dh - h) * 0.5);
    if (cam) cam.syncBounds(maxPanX, maxPanY, dw, dh, w, h);
    const dx = (w - dw) * 0.5 + (cam ? cam.panX : 0);
    const dy = (h - dh) * 0.5 + (cam ? cam.panY : 0);
    ctx.drawImage(img, dx, dy, dw, dh);
    const unitScale = Math.min(dw / 1280, dh / 720);
    return {
      loaded: true,
      scale: unitScale,
      dx,
      dy,
      dw,
      dh,
      maxPanX,
      maxPanY,
      pt: (nx, ny) => ({ x: dx + nx * dw, y: dy + ny * dh }),
    };
  }

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, fallbackTop);
  g.addColorStop(1, fallbackBtm);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const span = Math.max(1.005, PANORAMA_SPAN * zoom);
  const dw = Math.max(w, h * (16 / 9)) * span;
  const dh = Math.max(h, w * (9 / 16)) * span;
  const maxPanX = Math.max(0, (dw - w) * 0.5);
  const maxPanY = Math.max(0, (dh - h) * 0.5);
  if (cam) cam.syncBounds(maxPanX, maxPanY, dw, dh, w, h);
  const dx = (w - dw) * 0.5 + (cam ? cam.panX : 0);
  const dy = (h - dh) * 0.5 + (cam ? cam.panY : 0);
  const unitScale = Math.min(dw / 1280, dh / 720);
  return {
    loaded: false,
    scale: unitScale,
    dx,
    dy,
    dw,
    dh,
    maxPanX,
    maxPanY,
    pt: (nx, ny) => ({ x: dx + nx * dw, y: dy + ny * dh }),
  };
}

export function fillPoly(ctx, pts, fill, stroke = null, lineWidth = 1.5) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

/**
 * Draws an isometric diamond rug/plaza centered at (x, y) with width rx*2, height ry*2.
 */
export function drawIsoDiamond(ctx, x, y, rx, ry, fill, borderCol, accentCol = null) {
  ctx.save();
  const outer = [
    { x, y: y - ry },
    { x: x + rx, y },
    { x, y: y + ry },
    { x: x - rx, y },
  ];
  fillPoly(ctx, outer, fill, borderCol, 3);
  if (accentCol) {
    const inner = [
      { x, y: y - ry * 0.68 },
      { x: x + rx * 0.68, y },
      { x, y: y + ry * 0.68 },
      { x: x - rx * 0.68, y },
    ];
    fillPoly(ctx, inner, accentCol, borderCol, 1.5);
  }
  ctx.restore();
}

/** @type {Map<string, HTMLCanvasElement>} */
const TINT_CACHE = new Map();

/**
 * Safari/WebKit-safe cached pixel hue-rotation & saturation shader (zero reliance on `ctx.filter`).
 */
function getTintedSpriteCanvas(img, cacheKey, deg, satMul = 1.18) {
  const hit = TINT_CACHE.get(cacheKey);
  if (hit) return hit;

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d');
  octx.drawImage(img, 0, 0, w, h);

  const imgData = octx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const rad = (deg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  // Luminance-preserving 3x3 hue rotation matrix + saturation boost
  const m00 = 0.213 + cosA * 0.787 - sinA * 0.213;
  const m01 = 0.715 - cosA * 0.715 - sinA * 0.715;
  const m02 = 0.072 - cosA * 0.072 + sinA * 0.928;
  const m10 = 0.213 - cosA * 0.213 + sinA * 0.143;
  const m11 = 0.715 + cosA * 0.285 + sinA * 0.14;
  const m12 = 0.072 - cosA * 0.072 - sinA * 0.283;
  const m20 = 0.213 - cosA * 0.213 - sinA * 0.787;
  const m21 = 0.715 - cosA * 0.715 + sinA * 0.715;
  const m22 = 0.072 + cosA * 0.928 + sinA * 0.072;

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    let nr = r * m00 + g * m01 + b * m02;
    let ng = r * m10 + g * m11 + b * m12;
    let nb = r * m20 + g * m21 + b * m22;
    const lum = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
    nr = lum + (nr - lum) * satMul;
    ng = lum + (ng - lum) * satMul;
    nb = lum + (nb - lum) * satMul;
    d[i] = nr < 0 ? 0 : nr > 255 ? 255 : nr;
    d[i + 1] = ng < 0 ? 0 : ng > 255 ? 255 : ng;
    d[i + 2] = nb < 0 ? 0 : nb > 255 ? 255 : nb;
  }
  octx.putImageData(imgData, 0, 0);
  TINT_CACHE.set(cacheKey, off);
  return off;
}

/**
 * Draws a 3D isometric prop sprite:
 * 1) Uses dedicated 3D variant model (`${spriteKey}_s1` / `${spriteKey}_s2`) whenever available!
 * 2) Falls back to Safari/Chrome-universal cached pixel shader for non-variant props.
 */
export function drawStyledPropSprite(ctx, spriteKey, x, y, sizePx, styleIdx = 0, opts = {}) {
  const effectiveVariant = opts.style?.spriteVariant ?? styleIdx;
  const customHue = opts.style?.hueShift;
  const variantKey = effectiveVariant > 0 ? `${spriteKey}_s${effectiveVariant}` : spriteKey;
  const variantImg = effectiveVariant > 0 ? sprites.get(variantKey) : null;
  const baseImg = variantImg || sprites.get(spriteKey);
  if (!baseImg) return false;

  const {
    hanging = false,
    flatFloor = false,
    flipX = false,
    alpha = 1,
    preview = false,
    timeSec = 0,
  } = opts;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);

  if (preview) {
    const pulse = 0.72 + Math.sin(timeSec * 5.5) * 0.22;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 234, 156, ${pulse})`;
    ctx.fillStyle = 'rgba(56, 184, 124, 0.22)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(0, sizePx * 0.25, sizePx * 0.44, sizePx * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    const popScale = 1 + Math.sin(timeSec * 5.2) * 0.032;
    ctx.scale(popScale, popScale);
  }

  if (!hanging && !flatFloor) {
    ctx.fillStyle = 'rgba(18, 10, 6, 0.26)';
    ctx.beginPath();
    ctx.ellipse(0, sizePx * 0.26, sizePx * 0.36, sizePx * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (flipX) ctx.scale(-1, 1);

  let sourceDrawable = baseImg;
  if (typeof customHue === 'number' && customHue !== 0) {
    const srcKey = variantImg ? variantKey : spriteKey;
    sourceDrawable = getTintedSpriteCanvas(baseImg, `${srcKey}:hue:${customHue}`, customHue, 1.18);
  } else if (effectiveVariant > 0 && !variantImg) {
    const deg = effectiveVariant === 1 ? 142 : -62;
    sourceDrawable = getTintedSpriteCanvas(baseImg, `${spriteKey}:${effectiveVariant}`, deg, 1.24);
  }

  ctx.drawImage(sourceDrawable, -sizePx * 0.5, -sizePx * 0.54, sizePx, sizePx);
  ctx.restore();
  return true;
}

/**
 * Draws Full-Body Standing 3D Austin the Butler anchored at his feet (x, y) with 2-line speech bubble!
 */
export function drawAustin(ctx, x, y, scale = 1, timeSec = 0, isGarden = false, bubbleText = '') {
  ctx.save();
  ctx.translate(x, y);

  // Ground contact shadow right beneath Austin's shoes
  ctx.fillStyle = 'rgba(15, 10, 6, 0.32)';
  ctx.beginPath();
  ctx.ellipse(0, 2 * scale, 22 * scale, 8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  const fullKey = isGarden ? 'austin_full_garden' : 'austin_full_home';
  const img = sprites.get(fullKey) || sprites.get('austin');
  const isFull = Boolean(sprites.get(fullKey));

  if (img) {
    const sz = (isFull ? 132 : 88) * scale;
    const breathe = 1 + Math.sin(timeSec * 3.0) * 0.018;
    const sway = Math.sin(timeSec * 2.1) * 0.018;
    ctx.save();
    ctx.rotate(sway);
    ctx.scale(1, breathe);
    if (isFull) {
      ctx.drawImage(img, -sz * 0.5, -sz * 0.96, sz, sz);
    } else {
      ctx.drawImage(img, -sz * 0.5, -sz * 0.85, sz, sz);
    }
    ctx.restore();
  } else {
    ctx.fillStyle = isGarden ? '#2d6a4f' : '#3a5a40';
    ctx.beginPath();
    ctx.arc(0, -34 * scale, 22 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  if (bubbleText) {
    drawSpeechBubble(ctx, 0, -(isFull ? 130 : 84) * scale, bubbleText, isGarden);
  }
  ctx.restore();
}

/**
 * Draws 3D Ginger Cat (Homescapes) or Golden Retriever Puppy (Gardenscapes) sprite!
 */
export function drawPet(ctx, x, y, isPuppy, timeSec = 0, petName = '', scale = 1) {
  ctx.save();
  const hop = Math.abs(Math.sin(timeSec * 4.2)) * (isPuppy ? 4.5 : 2.0);
  ctx.translate(x, y - hop);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
  ctx.beginPath();
  ctx.ellipse(0, 18 * scale + hop, 20 * scale, 7.5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  const img = sprites.get(isPuppy ? 'puppy' : 'cat');
  if (img) {
    const sz = 68 * scale;
    ctx.drawImage(img, -sz / 2, -sz * 0.68, sz, sz);
  } else {
    ctx.fillStyle = isPuppy ? '#f4a261' : '#f77f00';
    ctx.beginPath();
    ctx.arc(0, 0, 14 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  if (petName) {
    ctx.font = '800 11.5px Fredoka, Nunito, system-ui';
    const tw = Math.max(58, ctx.measureText(petName).width + 18);
    ctx.fillStyle = 'rgba(28, 18, 38, 0.85)';
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-tw / 2, -52 * scale, tw, 19, 9);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff3b0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(petName, 0, -42.5 * scale);
  }
  ctx.restore();
}

/**
 * Draws Playrix floating interactive Star / Hogwarts Wax-Seal Pin over renovation hotspots.
 */
export function drawHotspotPin(ctx, hs, isPreviewing, timeSec, scale = 1, isGarden = false, isHovered = false) {
  const bounce = Math.sin(timeSec * 4.2 + hs.x * 0.02) * 3.5;
  const baseR = (hs.completed && !isPreviewing ? 12.5 : 16.5) * Math.max(0.85, scale);
  const r = isHovered ? baseR * 1.15 : baseR;
  const py = hs.y - 24 * scale + bounce;

  ctx.save();
  ctx.globalAlpha = isHovered ? 1 : hs.completed && !isPreviewing ? 0.88 : 0.98;
  ctx.shadowColor = isHovered ? 'rgba(255, 234, 156, 0.92)' : 'rgba(0,0,0,0.52)';
  ctx.shadowBlur = isHovered ? 14 : 9;

  const grad = ctx.createLinearGradient(hs.x, py - r, hs.x, py + r);
  if (isGarden) {
    if (hs.completed) {
      grad.addColorStop(0, '#38b87c');
      grad.addColorStop(1, '#0b3923');
    } else {
      grad.addColorStop(0, '#ffea9c');
      grad.addColorStop(1, '#b8860b');
    }
    ctx.fillStyle = grad;
    ctx.strokeStyle = hs.completed ? '#ffea9c' : '#231509';
  } else {
    if (hs.completed) {
      grad.addColorStop(0, '#72efdd');
      grad.addColorStop(1, '#0096c7');
    } else {
      grad.addColorStop(0, '#ffe066');
      grad.addColorStop(1, '#f77f00');
    }
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#ffffff';
  }
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(hs.x, py, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.font = `${Math.round(r * 1.05)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const icon = isGarden ? (hs.completed ? '✨' : '🪄') : hs.completed ? '🎨' : '⭐';
  ctx.fillText(icon, hs.x, py + 0.5);
  ctx.restore();
}

function wrapTextLines(ctx, text, maxLineWidth) {
  const words = text.trim().split(/\s+/);
  const lines = [];
  let current = '';
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width <= maxLineWidth || !current) {
      current = test;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function drawSpeechBubble(ctx, x, y, text, isGarden = false) {
  const tf = ctx.getTransform();
  const dpr = tf.a || 1;
  const viewW = (ctx.canvas?.width || 800) / dpr;
  const viewH = (ctx.canvas?.height || 520) / dpr;
  const screenX = tf.e / dpr + x;
  if (screenX < -28 || screenX > viewW + 28) return;

  const isCompact = viewW < 520 || viewH < 450;
  ctx.save();
  ctx.font = `700 ${isCompact ? 11.5 : 12.5}px Nunito, system-ui, sans-serif`;
  const maxWrapW = Math.min(isCompact ? 220 : 265, Math.max(145, viewW - 52));
  const lines = wrapTextLines(ctx, text, maxWrapW);
  let widest = 96;
  for (const ln of lines) widest = Math.max(widest, ctx.measureText(ln).width);

  const boxW = Math.min(viewW - 20, widest + (isCompact ? 22 : 28));
  const lineH = isCompact ? 15 : 16.5;
  const boxH = lines.length * lineH + (isCompact ? 12 : 15);
  let topY = y - boxH - 8;
  const screenTopY = tf.f / dpr + topY;
  const minScreenTop = viewH < 450 ? 54 : 92;
  if (screenTopY < minScreenTop) topY += minScreenTop - screenTopY;

  let bx = x;
  const leftEdge = screenX - boxW / 2;
  const rightEdge = screenX + boxW / 2;
  if (leftEdge < 10) bx += 10 - leftEdge;
  else if (rightEdge > viewW - 10) bx -= rightEdge - (viewW - 10);
  const tailX = Math.max(bx - boxW / 2 + 16, Math.min(bx + boxW / 2 - 16, x));

  const borderCol = isGarden ? '#c99b2e' : '#f59f00';
  ctx.shadowColor = 'rgba(0,0,0,0.42)';
  ctx.shadowBlur = 11;
  if (isGarden) {
    const pg = ctx.createLinearGradient(bx, topY, bx, topY + boxH);
    pg.addColorStop(0, '#fcf4df');
    pg.addColorStop(1, '#e7d2a4');
    ctx.fillStyle = pg;
  } else {
    ctx.fillStyle = 'rgba(255, 252, 244, 0.98)';
  }
  ctx.strokeStyle = borderCol;
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  ctx.roundRect(bx - boxW / 2, topY, boxW, boxH, isGarden ? 10 : 14);
  ctx.fill();
  ctx.stroke();

  // Speech pointer tail anchored toward speaker
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(tailX - 7, topY + boxH - 1);
  ctx.lineTo(tailX, topY + boxH + 8);
  ctx.lineTo(tailX + 7, topY + boxH - 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = borderCol;
  ctx.beginPath();
  ctx.moveTo(tailX - 7, topY + boxH - 0.5);
  ctx.lineTo(tailX, topY + boxH + 8);
  ctx.lineTo(tailX + 7, topY + boxH - 0.5);
  ctx.stroke();

  ctx.fillStyle = isGarden ? '#231509' : '#2d1e12';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((ln, idx) => {
    ctx.fillText(ln, bx, topY + (isCompact ? 12.5 : 14) + idx * lineH + 1);
  });
  ctx.restore();
}
