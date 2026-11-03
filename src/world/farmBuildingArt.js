/**
 * 2.5D Isometric Farmstead Architectural, Creature & Botanical Art (`farmBuildingArt.js`)
 * Renders 16 multi-tile isometric structures (`burrow_manor` 3x3, `owl_post` 2x2, `molly_bakery` 2x2,
 * `butterbeer_mill` 2x2 with spinning sails, `apothecary_cauldron` 2x2, `greenhouse` 2x2,
 * 4 Creature Pens, `soil_plot`, `apple_tree`, `wood_fence`, `lantern_flower`, `weasley_car`)!
 */

import { CREATURE_SPECS, FARM_CROPS, FARM_RECIPES } from '../data/farmDefs.js';
import { getBuildingDef } from '../data/farmGridDefs.js';
import {
  canFulfillOrder,
  getEntityFootprint,
  hasGreenhouseAura,
} from '../utils/farmStorage.js';
import { traceIsoRect } from './farmTerrainRenderer.js';

export function formatShortTimer(ms) {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}p${String(s).padStart(2, '0')}s` : `${m}p`;
}

function drawIsoPrism(ctx, proj, col, row, w, h, z0, zH, cTop, cLeft, cRight, stroke = '#2b1808') {
  const pTop = proj.vertex(col, row);
  const pRight = proj.vertex(col + w, row);
  const pBottom = proj.vertex(col + w, row + h);
  const pLeft = proj.vertex(col, row + h);
  const y0 = -z0 * proj.sc;
  const y1 = -(z0 + zH) * proj.sc;

  // Left-front wall (from pLeft to pBottom)
  ctx.fillStyle = cLeft;
  ctx.beginPath();
  ctx.moveTo(pLeft.x, pLeft.y + y0);
  ctx.lineTo(pBottom.x, pBottom.y + y0);
  ctx.lineTo(pBottom.x, pBottom.y + y1);
  ctx.lineTo(pLeft.x, pLeft.y + y1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.4 * proj.sc;
  ctx.stroke();

  // Right-front wall (from pRight to pBottom)
  ctx.fillStyle = cRight;
  ctx.beginPath();
  ctx.moveTo(pRight.x, pRight.y + y0);
  ctx.lineTo(pBottom.x, pBottom.y + y0);
  ctx.lineTo(pBottom.x, pBottom.y + y1);
  ctx.lineTo(pRight.x, pRight.y + y1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Top roof / deck face
  ctx.fillStyle = cTop;
  ctx.beginPath();
  ctx.moveTo(pTop.x, pTop.y + y1);
  ctx.lineTo(pRight.x, pRight.y + y1);
  ctx.lineTo(pBottom.x, pBottom.y + y1);
  ctx.lineTo(pLeft.x, pLeft.y + y1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawIsoPeakRoof(ctx, proj, col, row, w, h, zBase, peakH, cLeftSlope, cRightSlope) {
  const pTop = proj.vertex(col, row);
  const pRight = proj.vertex(col + w, row);
  const pBottom = proj.vertex(col + w, row + h);
  const pLeft = proj.vertex(col, row + h);
  const ctr = proj.cellCenter(col, row, w, h);
  const yB = -zBase * proj.sc;
  const apexY = ctr.y - (zBase + peakH) * proj.sc;

  ctx.strokeStyle = '#3b1c0a';
  ctx.lineWidth = 1.4 * proj.sc;

  // Back-left & Front-left slopes
  ctx.fillStyle = cLeftSlope;
  ctx.beginPath();
  ctx.moveTo(pTop.x, pTop.y + yB);
  ctx.lineTo(pLeft.x, pLeft.y + yB);
  ctx.lineTo(ctr.x, apexY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(pLeft.x, pLeft.y + yB);
  ctx.lineTo(pBottom.x, pBottom.y + yB);
  ctx.lineTo(ctr.x, apexY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Back-right & Front-right slopes
  ctx.fillStyle = cRightSlope;
  ctx.beginPath();
  ctx.moveTo(pTop.x, pTop.y + yB);
  ctx.lineTo(pRight.x, pRight.y + yB);
  ctx.lineTo(ctr.x, apexY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(pRight.x, pRight.y + yB);
  ctx.lineTo(pBottom.x, pBottom.y + yB);
  ctx.lineTo(ctr.x, apexY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawStatusPill(ctx, x, y, sc, text, variant = 'normal') {
  const padX = Math.max(36 * sc, (text.length * 4.3 + 14) * sc);
  const h = 21 * sc;
  ctx.fillStyle =
    variant === 'ready'
      ? '#b5172c'
      : variant === 'dew'
        ? '#0a9396'
        : variant === 'action'
          ? 'rgba(22, 101, 65, 0.94)'
          : 'rgba(24, 18, 12, 0.88)';
  ctx.strokeStyle = variant === 'dew' ? '#94d2bd' : '#ffd166';
  ctx.lineWidth = 1.8 * sc;
  ctx.beginPath();
  ctx.roundRect(x - padX, y - h * 0.5, padX * 2, h, 10 * sc);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fffdf0';
  ctx.font = `800 ${Math.round(10.5 * sc)}px Fredoka, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y + 3.5 * sc);
}

function drawSmokePuffs(ctx, x, y, sc, timeSec, colorRgb = '255, 248, 231') {
  for (let i = 0; i < 3; i++) {
    const p = (timeSec * 0.55 + i * 0.33) % 1;
    ctx.fillStyle = `rgba(${colorRgb}, ${(1 - p) * 0.58})`;
    ctx.beginPath();
    ctx.arc(x + Math.sin(p * 6 + i) * 8 * sc, y - p * 28 * sc, (4 + p * 6) * sc, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawFarmGridEntity(ctx, proj, ent, farm, opts) {
  const { selectedTool, hovered, isMovingGhost, buildMode = false, timeSec, now, fenceSet } = opts;
  const showPills = !buildMode || isMovingGhost;
  const def = getBuildingDef(ent.type);
  if (!def || ent.type === 'cobble_path') return;
  const { w, h } = getEntityFootprint(ent);
  const sc = proj.sc;
  const ctr = proj.cellCenter(ent.col, ent.row, w, h);

  ctx.save();
  if (isMovingGhost) ctx.globalAlpha = 0.78;

  // Hover highlight border on footprint
  if (hovered && !isMovingGhost) {
    traceIsoRect(ctx, proj, ent.col, ent.row, w, h);
    ctx.strokeStyle = '#ffea9c';
    ctx.lineWidth = 2.6 * sc;
    ctx.stroke();
  }

  // 1. SOIL PLOT (1x1)
  if (ent.type === 'soil_plot') {
    drawIsoPrism(ctx, proj, ent.col + 0.06, ent.row + 0.06, 0.88, 0.88, 0, 7, '#583101', '#7f4f24', '#5c3a1b');
    const boosted = hasGreenhouseAura(farm, ent.col, ent.row);
    if (!ent.cropId) {
      if (hovered || selectedTool?.startsWith('crop:')) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.round(16 * sc)}px system-ui`;
        ctx.textAlign = 'center';
        ctx.fillText('🌱', ctr.x, ctr.y - 3 * sc);
      }
      ctx.restore();
      return;
    }
    const crop = FARM_CROPS.find((c) => c.id === ent.cropId) || FARM_CROPS[0];
    const dur = Math.max(1000, ent.readyAt - ent.plantedAt);
    const prog = Math.max(0, Math.min(1, (now - ent.plantedAt) / dur));
    const isRipe = now >= ent.readyAt;
    const sway = Math.sin(timeSec * 3.2 + ent.col + ent.row) * 2.5 * sc;
    const spots = [[-10 * sc, -5 * sc], [10 * sc, -5 * sc], [0, 2 * sc]];

    if (!isRipe && prog < 0.45) {
      ctx.fillStyle = '#52b788';
      for (const [sx, sy] of spots) {
        ctx.beginPath();
        ctx.ellipse(ctr.x + sx + sway * 0.4, ctr.y + sy - 5 * sc, 5 * sc, 2.8 * sc, -0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (!isRipe) {
      for (const [sx, sy] of spots) {
        ctx.fillStyle = '#2d8a5e';
        ctx.beginPath();
        ctx.arc(ctr.x + sx + sway * 0.4, ctr.y + sy - 8 * sc, 7.5 * sc, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = crop.colors[0];
        ctx.beginPath();
        ctx.arc(ctr.x + sx + sway * 0.4, ctr.y + sy - 11 * sc, 3 * sc, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const bob = Math.sin(timeSec * 4.2 + ent.col) * 3 * sc;
      ctx.fillStyle = 'rgba(255, 214, 102, 0.34)';
      ctx.beginPath();
      ctx.ellipse(ctr.x, ctr.y - 6 * sc, 22 * sc, 12 * sc, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const [sx, sy] of spots) {
        ctx.fillStyle = '#2d8a5e';
        ctx.beginPath();
        ctx.ellipse(ctr.x + sx, ctr.y + sy - 5 * sc, 8.5 * sc, 5 * sc, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.round(20 * sc)}px system-ui`;
      ctx.textAlign = 'center';
      for (const [sx, sy] of spots) {
        ctx.fillText(crop.icon, ctr.x + sx + sway * 0.3, ctr.y + sy - 3 * sc + bob * 0.35);
      }
      if (showPills) drawStatusPill(ctx, ctr.x, ctr.y - 28 * sc + bob, sc, `${crop.icon} Gặt!`, 'ready');
    }
    if (showPills && !isRipe && (hovered || selectedTool === 'dew')) {
      const txt = selectedTool === 'dew' ? '💧 Chín Ngay' : `${crop.icon} ${formatShortTimer(ent.readyAt - now)}${boosted ? '⚡' : ''}`;
      drawStatusPill(ctx, ctr.x, ctr.y - 25 * sc, sc, txt, selectedTool === 'dew' ? 'dew' : 'normal');
    }
    ctx.restore();
    return;
  }

  // 2. PERENNIAL APPLE TREE (1x1)
  if (ent.type === 'apple_tree') {
    const isRipe = now >= (ent.readyAt || 0);
    ctx.fillStyle = '#582f0e';
    ctx.fillRect(ctr.x - 4.5 * sc, ctr.y - 22 * sc, 9 * sc, 22 * sc);
    ctx.fillStyle = '#2d6a4f';
    ctx.beginPath();
    ctx.arc(ctr.x, ctr.y - 30 * sc, 19 * sc, 0, Math.PI * 2);
    ctx.arc(ctr.x - 11 * sc, ctr.y - 23 * sc, 13 * sc, 0, Math.PI * 2);
    ctx.arc(ctr.x + 11 * sc, ctr.y - 23 * sc, 13 * sc, 0, Math.PI * 2);
    ctx.fill();
    if (isRipe) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.round(14 * sc)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText('🍎', ctr.x - 8 * sc, ctr.y - 25 * sc);
      ctx.fillText('🍎', ctr.x + 8 * sc, ctr.y - 28 * sc);
      ctx.fillText('🍎', ctr.x, ctr.y - 17 * sc);
      if (showPills) drawStatusPill(ctx, ctr.x, ctr.y - 54 * sc, sc, '🍎 Hái Táo!', 'ready');
    } else if (showPills && (hovered || selectedTool === 'dew')) {
      drawStatusPill(ctx, ctr.x, ctr.y - 50 * sc, sc, selectedTool === 'dew' ? '💧 Chín Ngay' : `🍎 ${formatShortTimer(ent.readyAt - now)}`, selectedTool === 'dew' ? 'dew' : 'normal');
    }
    ctx.restore();
    return;
  }

  // 3. AUTO-CONNECTING WOOD FENCE (1x1) & LANTERN FLOWER (1x1) & WEASLEY CAR (2x1 / 1x2)
  if (ent.type === 'wood_fence') {
    ctx.strokeStyle = '#7f4f24';
    ctx.lineWidth = 3.5 * sc;
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    for (const [dc, dr] of dirs) {
      if (fenceSet?.has(`${ent.col + dc},${ent.row + dr}`)) {
        const nb = proj.cellCenter(ent.col + dc * 0.5, ent.row + dr * 0.5);
        ctx.beginPath();
        ctx.moveTo(ctr.x, ctr.y - 9 * sc);
        ctx.lineTo(nb.x, nb.y - 9 * sc);
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#582f0e';
    ctx.fillRect(ctr.x - 3.5 * sc, ctr.y - 16 * sc, 7 * sc, 16 * sc);
    ctx.fillStyle = '#ff758f';
    ctx.beginPath();
    ctx.arc(ctr.x + 3 * sc, ctr.y - 14 * sc, 3.2 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (ent.type === 'lantern_flower') {
    drawIsoPrism(ctx, proj, ent.col + 0.22, ent.row + 0.22, 0.56, 0.56, 0, 8, '#74c69d', '#bc6c25', '#9c6644');
    ctx.fillStyle = '#2b2d42';
    ctx.fillRect(ctr.x - 2 * sc, ctr.y - 34 * sc, 4 * sc, 26 * sc);
    ctx.fillStyle = 'rgba(255, 214, 102, 0.35)';
    ctx.beginPath();
    ctx.arc(ctr.x, ctr.y - 35 * sc, 15 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(ctr.x, ctr.y - 35 * sc, 5.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (ent.type === 'weasley_car') {
    const hoverBob = Math.sin(timeSec * 3.4) * 4 * sc;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(ctr.x, ctr.y + 2 * sc, 28 * sc, 13 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    drawIsoPrism(ctx, proj, ent.col + 0.15, ent.row + 0.15, w - 0.3, h - 0.3, 6 + hoverBob / sc, 13, '#48cae4', '#0096c7', '#0077b6');
    drawIsoPrism(ctx, proj, ent.col + 0.3, ent.row + 0.22, Math.max(0.4, w - 0.65), Math.max(0.4, h - 0.45), 19 + hoverBob / sc, 10, '#ffffff', '#caf0f8', '#90e0ef');
    ctx.restore();
    return;
  }

  // 4. GREENHOUSE (2x2)
  if (ent.type === 'greenhouse') {
    drawIsoPrism(ctx, proj, ent.col + 0.1, ent.row + 0.1, 1.8, 1.8, 0, 10, '#d8f3dc', '#7f5539', '#582f0e');
    drawIsoPrism(ctx, proj, ent.col + 0.14, ent.row + 0.14, 1.72, 1.72, 10, 26, 'rgba(183,244,232,0.72)', 'rgba(144,224,239,0.62)', 'rgba(72,202,228,0.58)', '#e0fbfc');
    drawIsoPeakRoof(ctx, proj, ent.col + 0.12, ent.row + 0.12, 1.76, 1.76, 36, 20, 'rgba(202,240,248,0.78)', 'rgba(144,224,239,0.72)');
    if (hovered) drawStatusPill(ctx, ctr.x, ctr.y - 68 * sc, sc, '🏡 Hào Quang +25% Tốc Độ!', 'action');
    ctx.restore();
    return;
  }

  // 5. THE BURROW MANOR (3x3 Iconic Crooked Weasley House!)
  if (ent.type === 'burrow_manor') {
    drawIsoPrism(ctx, proj, ent.col + 0.15, ent.row + 0.15, 2.7, 2.7, 0, 30, '#d4a373', '#bc6c25', '#9c6644');
    drawIsoPeakRoof(ctx, proj, ent.col + 0.08, ent.row + 0.08, 2.84, 2.84, 30, 18, '#c1121f', '#9b2226');
    // Crooked 2nd & 3rd stacked stories!
    drawIsoPrism(ctx, proj, ent.col + 0.55, ent.row + 0.45, 1.75, 1.75, 38, 26, '#e9c46a', '#ca6702', '#9b2226');
    drawIsoPeakRoof(ctx, proj, ent.col + 0.45, ent.row + 0.35, 1.95, 1.95, 64, 18, '#d62828', '#9b2226');
    drawIsoPrism(ctx, proj, ent.col + 0.85, ent.row + 0.85, 1.05, 1.05, 72, 22, '#dda15e', '#b56576', '#6d597a');
    drawIsoPeakRoof(ctx, proj, ent.col + 0.78, ent.row + 0.78, 1.2, 1.2, 94, 18, '#c1121f', '#780000');
    drawSmokePuffs(ctx, ctr.x + 8 * sc, ctr.y - 114 * sc, sc, timeSec);
    // Warm glowing windows
    ctx.fillStyle = '#ffd166';
    for (const [wx, wy] of [[-18, -22], [14, -20], [-4, -52], [4, -80]]) {
      ctx.fillRect(ctr.x + wx * sc, ctr.y + wy * sc, 9 * sc, 11 * sc);
    }
    if (showPills && (hovered || isMovingGhost)) {
      drawStatusPill(ctx, ctr.x, ctr.y - 122 * sc, sc, '🏠 Nhà Hang Sóc (Kho & Tiệc)', 'action');
    } else if (showPills) {
      drawStatusPill(ctx, ctr.x, ctr.y - 122 * sc, sc, '🏠 Kho & Tiệc', 'action');
    }
    ctx.restore();
    return;
  }

  // 6. OWL POST TOWER (2x2)
  if (ent.type === 'owl_post') {
    const readyCnt = (farm.owlOrders || []).filter((o) => canFulfillOrder(farm, o)).length;
    drawIsoPrism(ctx, proj, ent.col + 0.25, ent.row + 0.25, 1.5, 1.5, 0, 52, '#adb5bd', '#6c757d', '#495057');
    drawIsoPeakRoof(ctx, proj, ent.col + 0.15, ent.row + 0.15, 1.7, 1.7, 52, 28, '#1d3557', '#0d1b2a');
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.round(22 * sc)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('🦉', ctr.x, ctr.y - 54 * sc);
    if (showPills) {
      drawStatusPill(
        ctx,
        ctr.x,
        ctr.y - 90 * sc,
        sc,
        readyCnt > 0 ? `🦉 Giao Đơn (${readyCnt})!` : '🦉 Đơn Cú',
        readyCnt > 0 ? 'ready' : 'action'
      );
    }
    ctx.restore();
    return;
  }

  // 7. CREATURE PENS (2x2: chicken_coop, beehive, cow_barn, hippogriff_pen)
  if (CREATURE_SPECS[ent.type]) {
    const spec = CREATURE_SPECS[ent.type];
    const isReady = ent.active && now >= ent.readyAt;
    const isBusy = ent.active && now < ent.readyAt;

    // Fenced green pasture base
    traceIsoRect(ctx, proj, ent.col + 0.06, ent.row + 0.06, 1.88, 1.88);
    ctx.fillStyle = '#52b788';
    ctx.fill();
    ctx.strokeStyle = '#7f4f24';
    ctx.lineWidth = 3 * sc;
    ctx.stroke();

    // Shelter hut in back corner
    const roofCol = ent.type === 'cow_barn' ? '#c1121f' : ent.type === 'hippogriff_pen' ? '#3a5a40' : '#e09f3e';
    drawIsoPrism(ctx, proj, ent.col + 0.15, ent.row + 0.15, 0.9, 0.9, 0, 20, '#ddb892', '#b08968', '#7f5539');
    drawIsoPeakRoof(ctx, proj, ent.col + 0.1, ent.row + 0.1, 1.0, 1.0, 20, 12, roofCol, '#6f1d1b');

    // Animated animals in front paddock
    const bob = Math.sin(timeSec * 3.8 + ent.col) * 3 * sc;
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.round(26 * sc)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(spec.icon, ctr.x + 8 * sc, ctr.y + 4 * sc + bob * 0.4);
    ctx.font = `${Math.round(19 * sc)}px system-ui`;
    ctx.fillText(spec.icon, ctr.x - 12 * sc, ctr.y + 10 * sc - bob * 0.3);

    const lbl = isReady
      ? `${spec.productIcon} Thu ${spec.productName}!`
      : isBusy
        ? (selectedTool === 'dew' ? '💧 Chín Ngay' : `${spec.productIcon} ${formatShortTimer(ent.readyAt - now)}`)
        : `${spec.feedKey === 'pumpkin' ? '🎃' : '🌾'} Cho Ăn (${spec.feedQty})`;
    if (showPills) {
      drawStatusPill(ctx, ctr.x, ctr.y - 46 * sc, sc, lbl, isReady ? 'ready' : selectedTool === 'dew' && isBusy ? 'dew' : 'action');
    }
    ctx.restore();
    return;
  }

  // 8. WORKSHOPS (2x2: molly_bakery, butterbeer_mill, apothecary_cauldron)
  const rec = ent.recipeId ? FARM_RECIPES.find((r) => r.id === ent.recipeId) : null;
  const isReady = Boolean(rec && now >= ent.readyAt);
  const isBusy = Boolean(rec && now < ent.readyAt);

  if (ent.type === 'molly_bakery') {
    drawIsoPrism(ctx, proj, ent.col + 0.12, ent.row + 0.12, 1.76, 1.76, 0, 8, '#e6ccb2', '#b08968', '#7f5539');
    drawIsoPrism(ctx, proj, ent.col + 0.2, ent.row + 0.2, 1.15, 1.15, 8, 26, '#c1121f', '#9b2226', '#780000');
    // Glowing brick oven mouth
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.arc(ctr.x - 4 * sc, ctr.y - 12 * sc, 7 * sc, Math.PI, 0);
    ctx.fill();
    if (isBusy) drawSmokePuffs(ctx, ctr.x - 6 * sc, ctr.y - 38 * sc, sc, timeSec);
  } else if (ent.type === 'butterbeer_mill') {
    drawIsoPrism(ctx, proj, ent.col + 0.28, ent.row + 0.28, 1.44, 1.44, 0, 46, '#e9c46a', '#bc6c25', '#8d5524');
    drawIsoPeakRoof(ctx, proj, ent.col + 0.2, ent.row + 0.2, 1.6, 1.6, 46, 20, '#6f1d1b', '#432818');
    // Rotating 4-Blade Windmill Sails!
    ctx.save();
    ctx.translate(ctr.x + 12 * sc, ctr.y - 38 * sc);
    ctx.rotate(timeSec * (isBusy ? 2.4 : 0.9));
    ctx.strokeStyle = '#fff8e6';
    ctx.fillStyle = 'rgba(255, 234, 156, 0.85)';
    ctx.lineWidth = 2.2 * sc;
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI * 0.5);
      ctx.fillRect(-3 * sc, 0, 6 * sc, 28 * sc);
      ctx.strokeRect(-3 * sc, 0, 6 * sc, 28 * sc);
    }
    ctx.restore();
  } else if (ent.type === 'apothecary_cauldron') {
    drawIsoPrism(ctx, proj, ent.col + 0.15, ent.row + 0.15, 1.7, 1.7, 0, 24, '#7209b7', '#560bad', '#3c096c');
    drawIsoPeakRoof(ctx, proj, ent.col + 0.08, ent.row + 0.08, 1.84, 1.84, 24, 20, '#9d4edd', '#5a189a');
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.round(22 * sc)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('🧪', ctr.x, ctr.y - 4 * sc);
    if (isBusy) drawSmokePuffs(ctx, ctr.x, ctr.y - 44 * sc, sc, timeSec, '114, 239, 221');
  }

  const topOff = ent.type === 'butterbeer_mill' ? 76 * sc : 54 * sc;
  const shortIdle = ent.type === 'molly_bakery' ? '🥧 Lò Bánh' : ent.type === 'butterbeer_mill' ? '🍺 Cối Xay' : '🧪 Vạc Phép';
  const stLabel = isReady
    ? `${rec.icon} Lấy ${rec.name.split(' ')[0]}!`
    : isBusy
      ? (selectedTool === 'dew' ? '💧 Chín Ngay' : `${rec.icon} ${formatShortTimer(ent.readyAt - now)}`)
      : hovered || isMovingGhost
        ? `${def.icon} ${def.name}`
        : shortIdle;
  if (showPills) {
    drawStatusPill(ctx, ctr.x, ctr.y - topOff, sc, stLabel, isReady ? 'ready' : selectedTool === 'dew' && isBusy ? 'dew' : 'action');
  }

  ctx.restore();
}
