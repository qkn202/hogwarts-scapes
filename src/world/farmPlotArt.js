/**
 * 2.5D Isometric Farmstead Art & Botanical Renderer (`farmPlotArt.js`)
 * Hand-crafted warm Playrix-style isometric timber soil beds, 4-stage animated crops,
 * Honeybee Skep, Grazing Cow Paddock, Molly's Brick Oven, Apothecary Cauldron & Owl Post!
 */

import { FARM_CROPS, FARM_RECIPES } from '../data/farmDefs.js';
import { canFulfillOrder } from '../utils/farmStorage.js';

export function formatShortTimer(ms) {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}p${String(s).padStart(2, '0')}s` : `${m}p`;
}

export function drawIsometricFarmPlot(ctx, x, y, sc, plotDef, slotState, farmLv, selectedTool, hovered, timeSec, now) {
  const rx = 56 * sc;
  const ry = 30 * sc;
  const depth = 11 * sc;
  const locked = farmLv < plotDef.minFarmLv;

  ctx.save();
  ctx.translate(x, y);

  // Soft ground shadow
  ctx.fillStyle = 'rgba(12, 24, 14, 0.34)';
  ctx.beginPath();
  ctx.ellipse(0, 7 * sc, rx * 1.06, ry * 1.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Left & Right 2.5D extruded timber bevels
  ctx.fillStyle = locked ? '#5c5346' : '#6f4518';
  ctx.beginPath();
  ctx.moveTo(-rx, 0);
  ctx.lineTo(0, ry);
  ctx.lineTo(0, ry + depth);
  ctx.lineTo(-rx, depth);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = locked ? '#474035' : '#583101';
  ctx.beginPath();
  ctx.moveTo(rx, 0);
  ctx.lineTo(0, ry);
  ctx.lineTo(0, ry + depth);
  ctx.lineTo(rx, depth);
  ctx.closePath();
  ctx.fill();

  // Top timber frame diamond
  ctx.fillStyle = locked ? '#7f7566' : '#9c6644';
  ctx.strokeStyle = hovered ? '#ffea9c' : '#3d2208';
  ctx.lineWidth = (hovered ? 2.8 : 1.8) * sc;
  ctx.beginPath();
  ctx.moveTo(0, -ry);
  ctx.lineTo(rx, 0);
  ctx.lineTo(0, ry);
  ctx.lineTo(-rx, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner fertile dark-loam diamond soil
  const irx = rx * 0.85;
  const iry = ry * 0.82;
  ctx.fillStyle = locked ? '#595248' : slotState?.cropId ? '#4a2c11' : '#5c3a1b';
  ctx.beginPath();
  ctx.moveTo(0, -iry);
  ctx.lineTo(irx, 0);
  ctx.lineTo(0, iry);
  ctx.lineTo(-irx, 0);
  ctx.closePath();
  ctx.fill();

  // Tilled soil furrows
  if (!locked) {
    ctx.strokeStyle = 'rgba(34, 18, 6, 0.48)';
    ctx.lineWidth = 2.4 * sc;
    for (const f of [-0.45, 0, 0.45]) {
      ctx.beginPath();
      ctx.moveTo(-irx * 0.55 + f * irx * 0.45, f * iry * 0.45 - iry * 0.28);
      ctx.lineTo(irx * 0.35 + f * irx * 0.45, f * iry * 0.45 + iry * 0.36);
      ctx.stroke();
    }
  }

  if (locked) {
    ctx.font = `800 ${Math.round(13 * sc)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffea9c';
    ctx.fillText(`🔒 Cấp ${plotDef.minFarmLv}`, 0, 3 * sc);
    ctx.restore();
    return;
  }

  // Empty Soil Hint when holding a seed
  if (!slotState?.cropId) {
    if (hovered || (selectedTool && selectedTool.startsWith('crop:'))) {
      const pulse = 0.72 + Math.sin(timeSec * 5) * 0.2;
      ctx.fillStyle = `rgba(255, 234, 156, ${pulse * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, irx * 0.52, iry * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `${Math.round(18 * sc)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText('🌱', 0, 5 * sc);
    }
    ctx.restore();
    return;
  }

  const crop = FARM_CROPS.find((c) => c.id === slotState.cropId) || FARM_CROPS[0];
  const totalDur = Math.max(1000, slotState.readyAt - slotState.plantedAt);
  const progress = Math.max(0, Math.min(1, (now - slotState.plantedAt) / totalDur));
  const isRipe = now >= slotState.readyAt;
  const sway = Math.sin(timeSec * 3.2 + plotDef.idx * 1.3) * 3.2 * sc;

  const spots = [
    [-16 * sc, -3 * sc],
    [16 * sc, -3 * sc],
    [0, 6 * sc],
  ];

  if (!isRipe && progress < 0.45) {
    // Stage 1: Tender emerald sprouts
    for (const [sx, sy] of spots) {
      ctx.fillStyle = '#52b788';
      ctx.beginPath();
      ctx.ellipse(sx - 4 * sc + sway * 0.4, sy - 6 * sc, 5 * sc, 2.8 * sc, -0.5, 0, Math.PI * 2);
      ctx.ellipse(sx + 4 * sc + sway * 0.4, sy - 6 * sc, 5 * sc, 2.8 * sc, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (!isRipe) {
    // Stage 2: Leafy bush + flower buds
    for (const [sx, sy] of spots) {
      ctx.fillStyle = '#2d8a5e';
      ctx.beginPath();
      ctx.arc(sx + sway * 0.5, sy - 9 * sc, 9.5 * sc, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = crop.colors[0];
      ctx.beginPath();
      ctx.arc(sx + sway * 0.5, sy - 13 * sc, 3.6 * sc, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Stage 3: Bountiful Ripe Harvest + Lush Foliage + Golden Aura!
    const bob = Math.sin(timeSec * 4.4 + plotDef.idx) * 3.5 * sc;
    ctx.fillStyle = 'rgba(255, 214, 102, 0.32)';
    ctx.beginPath();
    ctx.ellipse(0, -5 * sc, irx * 0.74, iry * 0.74, 0, 0, Math.PI * 2);
    ctx.fill();

    for (const [sx, sy] of spots) {
      ctx.fillStyle = '#2d8a5e';
      ctx.beginPath();
      ctx.ellipse(sx, sy - 4 * sc, 11 * sc, 6.5 * sc, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.round(25 * sc)}px system-ui`;
    ctx.textAlign = 'center';
    for (const [sx, sy] of spots) {
      ctx.fillText(crop.icon, sx + sway * 0.35, sy - 3 * sc + bob * 0.4);
    }

    // Floating harvest sickle / ready badge
    const pillY = -34 * sc + bob;
    ctx.fillStyle = 'rgba(20, 83, 45, 0.94)';
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2 * sc;
    ctx.beginPath();
    ctx.roundRect(-34 * sc, pillY - 12 * sc, 68 * sc, 22 * sc, 11 * sc);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff8d6';
    ctx.font = `800 ${Math.round(11.5 * sc)}px Fredoka, system-ui, sans-serif`;
    ctx.fillText(`${crop.icon} Thu Hoạch!`, 0, pillY + 2.5 * sc);
  }

  // Growing Countdown Pill
  if (!isRipe) {
    const remMs = Math.max(0, slotState.readyAt - now);
    const pillY = -28 * sc;
    ctx.fillStyle = 'rgba(28, 21, 14, 0.84)';
    ctx.strokeStyle = selectedTool === 'dew' ? '#72efdd' : 'rgba(255, 234, 156, 0.75)';
    ctx.lineWidth = 1.6 * sc;
    ctx.beginPath();
    ctx.roundRect(-32 * sc, pillY - 10 * sc, 64 * sc, 20 * sc, 10 * sc);
    ctx.fill();
    ctx.stroke();

    // Mini progress bar fill
    ctx.fillStyle = 'rgba(82, 183, 136, 0.45)';
    ctx.beginPath();
    ctx.roundRect(-30 * sc, pillY - 8 * sc, 60 * sc * progress, 16 * sc, 8 * sc);
    ctx.fill();

    ctx.fillStyle = '#ffea9c';
    ctx.font = `800 ${Math.round(10.5 * sc)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(
      selectedTool === 'dew' ? '💧 Chín Ngay' : `${crop.icon} ${formatShortTimer(remMs)}`,
      0,
      pillY + 3.5 * sc
    );
  }

  ctx.restore();
}

export function drawCreaturePen2D(ctx, x, y, sc, creatureDef, st, hovered, timeSec, now) {
  const isReady = st?.active && now >= st.readyAt;
  const isBusy = st?.active && now < st.readyAt;
  const bob = Math.sin(timeSec * 3.8 + x * 0.02) * 3 * sc;

  ctx.save();
  ctx.translate(x, y);

  // Cozy wooden paddock ellipse
  ctx.fillStyle = 'rgba(18, 36, 22, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 8 * sc, 50 * sc, 26 * sc, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4f772d';
  ctx.strokeStyle = hovered ? '#ffea9c' : '#7f4f24';
  ctx.lineWidth = (hovered ? 3.2 : 2.4) * sc;
  ctx.beginPath();
  ctx.ellipse(0, 2 * sc, 46 * sc, 23 * sc, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Animated Creature Sprite
  ctx.font = `${Math.round(34 * sc)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText(creatureDef.icon, Math.sin(timeSec * 2.1) * 5 * sc, -2 * sc + bob * 0.5);

  if (creatureDef.id === 'honeybee') {
    for (let i = 0; i < 2; i++) {
      const ang = timeSec * 3.6 + i * Math.PI;
      ctx.font = `${Math.round(13 * sc)}px system-ui`;
      ctx.fillText('🐝', Math.cos(ang) * 24 * sc, -14 * sc + Math.sin(ang * 2) * 6 * sc);
    }
  }

  // Status Bubble
  const pillY = -36 * sc + (isReady ? bob : 0);
  ctx.fillStyle = isReady ? '#9b2226' : isBusy ? 'rgba(28, 21, 14, 0.86)' : 'rgba(22, 101, 65, 0.92)';
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2 * sc;
  ctx.beginPath();
  ctx.roundRect(-48 * sc, pillY - 12 * sc, 96 * sc, 23 * sc, 11 * sc);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fff8d6';
  ctx.font = `800 ${Math.round(11 * sc)}px Fredoka, system-ui, sans-serif`;
  const label = isReady
    ? `${creatureDef.productIcon} Thu ${creatureDef.productName}!`
    : isBusy
      ? `${creatureDef.productIcon} ${formatShortTimer(st.readyAt - now)}`
      : `🌾 Cho Ăn (${creatureDef.feedQty})`;
  ctx.fillText(label, 0, pillY + 3 * sc);

  ctx.restore();
}

export function drawFarmStation2D(ctx, x, y, sc, stationKey, meta, farm, hovered, timeSec, now) {
  ctx.save();
  ctx.translate(x, y);
  const bob = Math.sin(timeSec * 3.9 + y * 0.02) * 3.2 * sc;

  let badgeText = meta.label;
  let isReady = false;

  if (stationKey === 'owlpost') {
    const readyOrders = (farm.owlOrders || []).filter((o) => canFulfillOrder(farm, o)).length;
    isReady = readyOrders > 0;
    badgeText = readyOrders > 0 ? `🦉 Giao Ngay (${readyOrders})!` : `🦉 Đơn Cú (${farm.owlOrders?.length || 4})`;
  } else {
    const st = farm.stations[stationKey];
    if (st?.recipeId) {
      const rec = FARM_RECIPES.find((r) => r.id === st.recipeId);
      if (now >= st.readyAt) {
        isReady = true;
        badgeText = `${rec?.icon || '✨'} Lấy ${rec?.name.split(' ')[0] || 'Món'}!`;
      } else {
        badgeText = `${rec?.icon || '⏳'} ${formatShortTimer(st.readyAt - now)}`;
        // Rising smoke / potion bubbles while active!
        for (let i = 0; i < 3; i++) {
          const p = ((timeSec * 0.7 + i * 0.33) % 1);
          ctx.fillStyle = stationKey === 'cauldron'
            ? `rgba(114, 239, 221, ${(1 - p) * 0.65})`
            : `rgba(255, 248, 231, ${(1 - p) * 0.55})`;
          ctx.beginPath();
          ctx.arc(Math.sin(p * 6 + i) * 10 * sc, -24 * sc - p * 34 * sc, (5 + p * 7) * sc, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      badgeText = stationKey === 'cauldron' ? '🧪 Nấu Tim & Bùa' : '🥧 Nướng Bánh & Bia';
    }
  }

  // Stone Cobble Base Plinth
  ctx.fillStyle = 'rgba(15, 23, 18, 0.42)';
  ctx.beginPath();
  ctx.ellipse(0, 10 * sc, 48 * sc, 24 * sc, 0, 0, Math.PI * 2);
  ctx.fill();

  const grad = ctx.createLinearGradient(0, -24 * sc, 0, 16 * sc);
  grad.addColorStop(0, stationKey === 'cauldron' ? '#3c096c' : stationKey === 'owlpost' ? '#1d3557' : '#7f4f24');
  grad.addColorStop(1, '#24150e');
  ctx.fillStyle = grad;
  ctx.strokeStyle = hovered || isReady ? '#ffd166' : '#e09f3e';
  ctx.lineWidth = (hovered || isReady ? 3.2 : 2.2) * sc;
  ctx.beginPath();
  ctx.ellipse(0, 2 * sc, 42 * sc, 21 * sc, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.font = `${Math.round(36 * sc)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText(meta.icon, 0, -2 * sc + (isReady ? bob * 0.6 : 0));

  const pillY = -38 * sc + (isReady ? bob : 0);
  ctx.fillStyle = isReady ? '#b5172c' : 'rgba(20, 33, 28, 0.92)';
  ctx.strokeStyle = '#ffea9c';
  ctx.lineWidth = 2 * sc;
  ctx.beginPath();
  ctx.roundRect(-56 * sc, pillY - 12 * sc, 112 * sc, 24 * sc, 12 * sc);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fffdf0';
  ctx.font = `800 ${Math.round(11 * sc)}px Fredoka, system-ui, sans-serif`;
  ctx.fillText(badgeText, 0, pillY + 3.5 * sc);

  ctx.restore();
}
