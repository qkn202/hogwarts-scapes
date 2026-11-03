/**
 * Hogwarts Castle 2.5D Room VFX & 3-Style Floor / Hearth / Enchanted Prop Overlays
 * Extracted to keep HomescapesWorldRenderer clean, modular, and < 400 lines.
 */

import { sprites } from '../utils/spriteLoader.js';
import { ROOM_ANCHORS, renderExtraCastleSlots } from './homescapesSlotsExtra.js';
import { drawStyledPropSprite, fillPoly } from './isoMath.js';

export { ROOM_ANCHORS };

/**
 * Renders 3 genuinely distinct isometric Hogwarts Castle floor inlays for the 'floor' slot:
 * - Style 0: Gryffindor Royal Sunburst Medallion
 * - Style 1: Ravenclaw Astral 4-Point Compass Mosaic
 * - Style 2: Ancient Hogwarts Checkered Rune Tilework
 */
export function drawCastleFloorInlay(ctx, x, y, sc, styleIdx = 0, style = null, timeSec = 0, preview = false) {
  const pri = style?.primary || '#c68b59';
  const sec = style?.secondary || '#9b2226';
  const acc = style?.accent || '#ffd166';
  const rx = 86 * sc;
  const ry = 40 * sc;

  ctx.save();
  ctx.translate(x, y);
  if (preview) {
    const pulse = 1 + Math.sin(timeSec * 5.2) * 0.035;
    ctx.scale(pulse, pulse);
  }

  ctx.globalAlpha = preview ? 0.92 : 0.78;

  if (styleIdx === 0) {
    // Style 0: Royal Octagonal Sunburst Medallion
    ctx.fillStyle = sec;
    ctx.strokeStyle = acc;
    ctx.lineWidth = 2.6 * sc;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = pri;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.76, ry * 0.76, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + timeSec * 0.12;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * rx * 0.72, Math.sin(a) * ry * 0.72);
      ctx.stroke();
    }

    ctx.fillStyle = acc;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.24, ry * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (styleIdx === 1) {
    // Style 1: Astral Starlight Compass Mosaic
    const diamond = [
      { x: 0, y: -ry * 1.08 },
      { x: rx * 1.08, y: 0 },
      { x: 0, y: ry * 1.08 },
      { x: -rx * 1.08, y: 0 },
    ];
    fillPoly(ctx, diamond, sec, acc, 2.5 * sc);

    ctx.strokeStyle = acc;
    ctx.lineWidth = 2 * sc;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.62, ry * 0.62, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 4-point astral compass star
    const starPts = [];
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      const mul = i % 2 === 0 ? 0.85 : 0.26;
      starPts.push({ x: Math.cos(a) * rx * mul, y: Math.sin(a) * ry * mul });
    }
    fillPoly(ctx, starPts, pri, acc, 1.8 * sc);
  } else {
    // Style 2: Checkered Arcane Rune Tilework (3x3 isometric grid)
    const outer = [
      { x: 0, y: -ry * 1.12 },
      { x: rx * 1.12, y: 0 },
      { x: 0, y: ry * 1.12 },
      { x: -rx * 1.12, y: 0 },
    ];
    fillPoly(ctx, outer, sec, acc, 2.8 * sc);

    const stepX = (rx * 0.96) / 3;
    const stepY = (ry * 0.96) / 3;
    for (let u = -1; u <= 1; u++) {
      for (let v = -1; v <= 1; v++) {
        const cx = (u - v) * stepX;
        const cy = (u + v) * stepY;
        const sub = [
          { x: cx, y: cy - stepY * 0.92 },
          { x: cx + stepX * 0.92, y: cy },
          { x: cx, y: cy + stepY * 0.92 },
          { x: cx - stepX * 0.92, y: cy },
        ];
        fillPoly(ctx, sub, (u + v) % 2 === 0 ? pri : acc, sec, 1.1 * sc);
      }
    }
  }

  if (preview) {
    ctx.strokeStyle = '#ffea9c';
    ctx.lineWidth = 2.6 * sc;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 1.18, ry * 1.18, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Renders 3-style Potions Dungeon Hearth & Brazier Cauldron for Room 2 'desk' (hk_stove).
 */
export function drawPotionsHearthCauldron(ctx, fx, fy, sc, timeSec, styleIdx = 0, style = null, preview = false) {
  ctx.save();
  if (preview) {
    ctx.strokeStyle = 'rgba(255, 234, 156, 0.9)';
    ctx.lineWidth = 2.4 * sc;
    ctx.beginPath();
    ctx.ellipse(fx, fy + 16 * sc, 42 * sc, 16 * sc, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Ornate tripod brazier base (Gold / Dark Emerald Iron / Silver Astral)
  const rimCol = styleIdx === 0 ? '#d4af37' : styleIdx === 1 ? '#52b788' : '#90e0ef';
  const bodyCol = styleIdx === 0 ? '#3d2516' : styleIdx === 1 ? '#1b3a2b' : '#1b263b';
  ctx.fillStyle = bodyCol;
  ctx.strokeStyle = rimCol;
  ctx.lineWidth = 2.4 * sc;
  ctx.beginPath();
  ctx.ellipse(fx, fy + 10 * sc, 30 * sc, 15 * sc, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  drawFireplaceFlames(ctx, fx, fy + 4 * sc, sc * 0.88, timeSec, styleIdx, style);
  ctx.restore();
}

export function drawFireplaceFlames(ctx, fx, fy, sc, timeSec, styleIdx = 0, style = null) {
  ctx.save();
  const flicker = 1 + Math.sin(timeSec * 14) * 0.12;
  const coreCol = styleIdx === 1 ? '#d8f3dc' : styleIdx === 2 ? '#f3d5ff' : '#fff8d6';
  const midCol =
    style?.secondary || (styleIdx === 1 ? '#2dc653' : styleIdx === 2 ? '#9d4edd' : '#ff7b00');
  const tipCol = styleIdx === 1 ? '#80ed99' : styleIdx === 2 ? '#4cc9f0' : '#ffd166';

  const g = ctx.createRadialGradient(fx, fy, 3, fx, fy, 48 * sc * flicker);
  g.addColorStop(0, coreCol);
  g.addColorStop(0.45, midCol);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(fx, fy, 48 * sc * flicker, 0, Math.PI * 2);
  ctx.fill();

  for (const [dx, hMul, ph] of [[-11, 0.92, 0], [0, 1.25, 1.4], [11, 0.88, 2.7]]) {
    const fh = (24 + Math.sin(timeSec * 16 + ph) * 5.5) * sc * hMul;
    ctx.fillStyle = dx === 0 ? tipCol : midCol;
    ctx.beginPath();
    ctx.moveTo(fx + (dx - 8.5) * sc, fy + 8 * sc);
    ctx.quadraticCurveTo(fx + dx * sc, fy - fh, fx + (dx + 8.5) * sc, fy + 8 * sc);
    ctx.fill();
  }
  ctx.restore();
}

export function drawWindowSunbeams(ctx, wx, wy, sc, tintHex, weather = 'day') {
  ctx.save();
  const isNight = weather === 'night';
  const g = ctx.createLinearGradient(wx + 40 * sc, wy - 50 * sc, wx - 160 * sc, wy + 180 * sc);
  g.addColorStop(0, isNight ? 'rgba(180, 225, 255, 0.28)' : 'rgba(255, 248, 205, 0.34)');
  g.addColorStop(0.5, isNight ? 'rgba(130, 195, 255, 0.12)' : 'rgba(255, 232, 155, 0.15)');
  g.addColorStop(1, 'rgba(255, 224, 140, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(wx - 40 * sc, wy - 45 * sc);
  ctx.lineTo(wx + 95 * sc, wy + 10 * sc);
  ctx.lineTo(wx - 90 * sc, wy + 200 * sc);
  ctx.lineTo(wx - 220 * sc, wy + 135 * sc);
  ctx.closePath();
  ctx.fill();
  if (tintHex) {
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = tintHex;
    ctx.fill();
  }
  ctx.restore();
}

export function drawEnchantedPropMotes(ctx, x, y, sc, timeSec, colorHex = '#ffd166', isNotes = false) {
  ctx.save();
  ctx.fillStyle = colorHex;
  for (let i = 0; i < 4; i++) {
    const phase = (timeSec * 0.75 + i * 0.25) % 1;
    const px = x + Math.sin(timeSec * 2.2 + i * 1.7) * 18 * sc;
    const py = y - 16 * sc - phase * 38 * sc;
    ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.85;
    if (isNotes) {
      ctx.font = `800 ${Math.round(13 * sc)}px system-ui`;
      ctx.fillText(i % 2 === 0 ? '♪' : '♫', px, py);
    } else {
      ctx.beginPath();
      ctx.arc(px, py, (2.2 + (i % 2) * 1.1) * sc, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawMovingBoxProp(ctx, x, y, sc) {
  const boxImg = sprites.get('h_box');
  if (boxImg) {
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.drawImage(boxImg, x - 34 * sc, y - 38 * sc, 68 * sc, 68 * sc);
    ctx.restore();
  }
}

export function drawDustPatch(ctx, x, y, sc) {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 4, x, y, 42 * sc);
  g.addColorStop(0, 'rgba(85, 68, 54, 0.42)');
  g.addColorStop(1, 'rgba(85, 68, 54, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, 42 * sc, 18 * sc, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawCornerCobwebs(ctx, scene, sc) {
  const p = scene.pt(0.47, 0.16);
  ctx.save();
  ctx.strokeStyle = 'rgba(235, 230, 220, 0.35)';
  ctx.lineWidth = 1.2 * sc;
  for (let i = 0; i < 5; i++) {
    const ang = 0.3 + i * 0.45;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(ang) * 44 * sc, p.y + Math.sin(ang) * 32 * sc);
    ctx.stroke();
  }
  ctx.restore();
}

export function prepareCastleGroundAndHotspots(renderer, ctx, area, scene, sc, timeSec) {
  const rawScene = area.sceneIndex ?? renderer.areaIndex;
  const areaIdx = ((rawScene % ROOM_ANCHORS.length) + ROOM_ANCHORS.length) % ROOM_ANCHORS.length;
  const anchors = ROOM_ANCHORS[areaIdx] || ROOM_ANCHORS[0];

  for (const slot of ['floor', 'rug', 'curtain', 'bed', 'desk', 'decor', 'banner', 'alcove', 'hearth']) {
    const task = area.tasks.find((t) => t.slot === slot);
    if (!task) continue;
    const st = renderer._getTaskStyle(task);
    const [nx, ny] = anchors[slot] || [0.5, 0.6];
    const p = scene.pt(nx, ny);
    renderer.hotspots.push({
      task,
      nx,
      ny,
      x: p.x,
      y: p.y,
      pinY: p.y - 24 * sc,
      r: Math.max(32, 42 * sc),
      completed: st.done,
    });

    if (slot === 'floor') {
      if (st.done) drawCastleFloorInlay(ctx, p.x, p.y, sc, st.styleIdx, st.style, timeSec, st.preview);
      else drawDustPatch(ctx, p.x, p.y, sc * 1.15);
    } else if (slot === 'rug' && !st.done) {
      drawDustPatch(ctx, p.x, p.y, sc * 0.95);
    } else if (slot === 'hearth' && !st.done) {
      drawDustPatch(ctx, p.x, p.y + 6 * sc, sc * 0.8);
    } else if (slot === 'curtain' && st.done && areaIdx === 0) {
      const winPt = scene.pt(0.64, 0.36);
      drawWindowSunbeams(ctx, winPt.x, winPt.y, sc, st.style.primary, renderer.weather);
    }
  }
}

/**
 * Draws all 9 3-style renovation slots (or VFX accents over 3D GLB furniture when `rendered3DIds` is active).
 */
export function renderCastleRoomSlots(renderer, ctx, area, scene, sc, timeSec, rendered3DIds = null, groundPrepared = false) {
  const rawScene = area.sceneIndex ?? renderer.areaIndex;
  const areaIdx = ((rawScene % ROOM_ANCHORS.length) + ROOM_ANCHORS.length) % ROOM_ANCHORS.length;
  const anchors = ROOM_ANCHORS[areaIdx] || ROOM_ANCHORS[0];
  const has3D = (task) => Boolean(task && rendered3DIds && rendered3DIds.has(task.id));
  const addSpot = (task, done) => {
    const [nx, ny] = anchors[task.slot] || [0.5, 0.6];
    const p = scene.pt(nx, ny);
    if (!groundPrepared) {
      renderer.hotspots.push({
        task, nx, ny, x: p.x, y: p.y, pinY: p.y - 24 * sc, r: Math.max(32, 42 * sc), completed: done,
      });
    }
    return p;
  };

  if (!groundPrepared) {
    const floorTask = area.tasks.find((t) => t.slot === 'floor');
    const floorSt = renderer._getTaskStyle(floorTask);
    const floorPt = addSpot(floorTask, floorSt.done);
    if (floorSt.done) drawCastleFloorInlay(ctx, floorPt.x, floorPt.y, sc, floorSt.styleIdx, floorSt.style, timeSec, floorSt.preview);
    else drawDustPatch(ctx, floorPt.x, floorPt.y, sc * 1.15);
  }

  // 2. Rug / Potions Island Counter
  const rugTask = area.tasks.find((t) => t.slot === 'rug');
  const rugSt = renderer._getTaskStyle(rugTask);
  const rugPt = addSpot(rugTask, rugSt.done);
  if (rugSt.done) {
    if (areaIdx === 2) {
      if (!has3D(rugTask)) {
        drawStyledPropSprite(ctx, 'h_prop_island', rugPt.x, rugPt.y, 196 * sc, rugSt.styleIdx, {
          style: rugSt.style, preview: rugSt.preview, timeSec,
        });
      }
      drawEnchantedPropMotes(ctx, rugPt.x - 16 * sc, rugPt.y - 32 * sc, sc, timeSec, rugSt.style.primary);
    } else if (!has3D(rugTask)) {
      drawStyledPropSprite(ctx, 'h_prop_rug', rugPt.x, rugPt.y, 232 * sc, rugSt.styleIdx, {
        style: rugSt.style, flatFloor: true, preview: rugSt.preview, timeSec,
      });
    }
  } else if (!groundPrepared) {
    drawDustPatch(ctx, rugPt.x, rugPt.y, sc * 0.95);
  }

  // 3. Chandelier / Floo Fireplace
  const curTask = area.tasks.find((t) => t.slot === 'curtain');
  const curSt = renderer._getTaskStyle(curTask);
  const curPt = addSpot(curTask, curSt.done);
  if (curSt.done) {
    if (areaIdx === 3) {
      drawFireplaceFlames(ctx, curPt.x, curPt.y + 18 * sc, sc, timeSec, curSt.styleIdx, curSt.style);
      if (!has3D(curTask)) {
        const ceilPt = scene.pt(0.50, 0.19);
        drawStyledPropSprite(ctx, 'h_prop_chandelier', ceilPt.x, ceilPt.y, 128 * sc, curSt.styleIdx, {
          style: curSt.style, hanging: true, preview: curSt.preview, timeSec,
        });
      }
    } else {
      if (areaIdx === 0 && !groundPrepared) {
        const winPt = scene.pt(0.64, 0.36);
        drawWindowSunbeams(ctx, winPt.x, winPt.y, sc, curSt.style.primary, renderer.weather);
      }
      if (!has3D(curTask)) {
        drawStyledPropSprite(ctx, 'h_prop_chandelier', curPt.x, curPt.y, 144 * sc, curSt.styleIdx, {
          style: curSt.style, hanging: true, preview: curSt.preview, timeSec,
        });
      }
    }
  }

  // 4. Primary 3D Furniture ('bed': 4-Poster Bed / Royal Sofa / Potions Desk)
  const bedTask = area.tasks.find((t) => t.slot === 'bed');
  const bedSt = renderer._getTaskStyle(bedTask);
  const bedPt = addSpot(bedTask, bedSt.done);
  if (!has3D(bedTask)) {
    if (bedSt.done) {
      const bedKey = areaIdx === 0 ? 'h_prop_bed' : areaIdx === 2 ? 'h_prop_desk' : 'h_prop_sofa';
      const bedSize = areaIdx === 0 ? 218 : areaIdx === 1 ? 182 : areaIdx === 2 ? 156 : 206;
      drawStyledPropSprite(ctx, bedKey, bedPt.x, bedPt.y, bedSize * sc, bedSt.styleIdx, {
        style: bedSt.style, flipX: areaIdx !== 3, preview: bedSt.preview, timeSec,
      });
    } else {
      drawMovingBoxProp(ctx, bedPt.x, bedPt.y, sc);
    }
  }

  // 5. Secondary 3D Furniture ('desk': Wizard Study Desk / Potions Hearth / Grand Piano)
  const deskTask = area.tasks.find((t) => t.slot === 'desk');
  const deskSt = renderer._getTaskStyle(deskTask);
  const deskPt = addSpot(deskTask, deskSt.done);
  if (deskSt.done) {
    if (areaIdx === 3) {
      if (!has3D(deskTask)) {
        drawStyledPropSprite(ctx, 'h_prop_piano', deskPt.x, deskPt.y, 198 * sc, deskSt.styleIdx, {
          style: deskSt.style, preview: deskSt.preview, timeSec,
        });
      }
      drawEnchantedPropMotes(ctx, deskPt.x, deskPt.y - 36 * sc, sc, timeSec, deskSt.style.secondary, true);
    } else if (areaIdx === 2) {
      if (!has3D(deskTask)) {
        drawPotionsHearthCauldron(ctx, deskPt.x, deskPt.y + 6 * sc, sc, timeSec, deskSt.styleIdx, deskSt.style, deskSt.preview);
      } else {
        drawFireplaceFlames(ctx, deskPt.x, deskPt.y + 14 * sc, sc * 0.72, timeSec, deskSt.styleIdx, deskSt.style);
      }
    } else if (!has3D(deskTask)) {
      drawStyledPropSprite(ctx, 'h_prop_desk', deskPt.x, deskPt.y, 174 * sc, deskSt.styleIdx, {
        style: deskSt.style, flipX: areaIdx === 0, preview: deskSt.preview, timeSec,
      });
    }
  } else if (!has3D(deskTask)) {
    drawMovingBoxProp(ctx, deskPt.x, deskPt.y, sc * 0.82);
  }

  // 6. Decor ('decor': Hedwig Owl Perch & Cushion / 3-Style Castle Trophy Urns)
  const decTask = area.tasks.find((t) => t.slot === 'decor');
  const decSt = renderer._getTaskStyle(decTask);
  const decPt = addSpot(decTask, decSt.done);
  if (decSt.done && !has3D(decTask)) {
    const decKey = areaIdx === 0 ? 'h_prop_catbed' : 'h_prop_urn';
    drawStyledPropSprite(ctx, decKey, decPt.x, decPt.y, (areaIdx === 0 ? 122 : 128) * sc, decSt.styleIdx, {
      style: decSt.style, preview: decSt.preview, timeSec,
    });
  }

  // 7–9. Expanded Panoramic Castle Slots ('banner', 'alcove', 'hearth')
  renderExtraCastleSlots(renderer, ctx, area, scene, sc, timeSec, areaIdx, addSpot, rendered3DIds, groundPrepared);
}
