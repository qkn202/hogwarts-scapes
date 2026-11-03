/**
 * 2.5D Isometric Farmstead Terrain, Parcel Expansion & Auto-Tiling Road Renderer (`farmTerrainRenderer.js`)
 * Projects the 14x14 Isometric Diamond Grid (`196` tiles) with smooth Pan/Zoom,
 * Ottery Brook river, unlocked vs expandable land parcels, auto-connecting cobblestone roads,
 * Greenhouse +25% aura visualization, and Build Mode footprint ghost highlights!
 */

import {
  FARM_PARCELS,
  GRID_COLS,
  GRID_ROWS,
  getParcelForCell,
} from '../data/farmGridDefs.js';
import {
  findEntityAtCell,
  hasGreenhouseAura,
  isTileUnlocked,
} from '../utils/farmStorage.js';

export function createIsoGridProjector(viewW, viewH, camera) {
  const baseScale = Math.max(0.58, Math.min(1.18, Math.min(viewW / 1180, viewH / 760)));
  const zoom = camera?.zoom || 1;
  const sc = baseScale * zoom;
  const tw = 42 * sc;
  const th = 21 * sc;

  // Update camera pan bounds so player can comfortably pan across the entire 14x14 plateau
  if (camera) {
    camera.maxPanX = Math.max(140, GRID_COLS * tw * 0.65);
    camera.maxPanY = Math.max(110, GRID_ROWS * th * 0.65);
  }

  const panX = camera?.panX || 0;
  const panY = camera?.panY || 0;
  const originX = viewW * 0.5 + panX;
  const originY = viewH * 0.48 - GRID_ROWS * th * 0.82 + panY;

  return {
    sc,
    tw,
    th,
    originX,
    originY,
    vertex(c, r) {
      return {
        x: originX + (c - r) * tw,
        y: originY + (c + r) * th,
      };
    },
    cellCenter(col, row, w = 1, h = 1) {
      const c = col + w * 0.5;
      const r = row + h * 0.5;
      return {
        x: originX + (c - r) * tw,
        y: originY + (c + r) * th,
      };
    },
    screenToCell(sx, sy) {
      const dx = (sx - originX) / tw;
      const dy = (sy - originY) / th;
      const fc = (dy + dx) * 0.5;
      const fr = (dy - dx) * 0.5;
      return {
        col: Math.floor(fc),
        row: Math.floor(fr),
        fc,
        fr,
      };
    },
  };
}

export function traceIsoRect(ctx, proj, col, row, w = 1, h = 1) {
  const pTop = proj.vertex(col, row);
  const pRight = proj.vertex(col + w, row);
  const pBottom = proj.vertex(col + w, row + h);
  const pLeft = proj.vertex(col, row + h);
  ctx.beginPath();
  ctx.moveTo(pTop.x, pTop.y);
  ctx.lineTo(pRight.x, pRight.y);
  ctx.lineTo(pBottom.x, pBottom.y);
  ctx.lineTo(pLeft.x, pLeft.y);
  ctx.closePath();
}

export function drawFarmValleyBackdrop(ctx, w, h, proj, weather, timeSec) {
  // 1. Pastoral Sky & Rolling Devon Hills Backdrop
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  if (weather === 'night') {
    grad.addColorStop(0, '#0b132b');
    grad.addColorStop(0.45, '#1c2541');
    grad.addColorStop(1, '#16302b');
  } else if (weather === 'snow') {
    grad.addColorStop(0, '#a9d6e5');
    grad.addColorStop(0.45, '#d9ed92');
    grad.addColorStop(1, '#cfe1b9');
  } else {
    grad.addColorStop(0, '#74c69d');
    grad.addColorStop(0.35, '#95d5b2');
    grad.addColorStop(1, '#40916c');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Rolling background hills
  ctx.fillStyle = weather === 'night' ? '#132a23' : weather === 'snow' ? '#e2ece9' : '#52b788';
  ctx.beginPath();
  ctx.ellipse(w * 0.22, h * 0.24, w * 0.42, h * 0.22, 0, 0, Math.PI * 2);
  ctx.ellipse(w * 0.78, h * 0.22, w * 0.46, h * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Sparkling Ottery Brook River along North-West edge of Plateau
  const rStart = proj.vertex(-1.6, 0);
  const rEnd = proj.vertex(-1.6, GRID_ROWS + 1);
  const rInnerStart = proj.vertex(-0.2, 0);
  const rInnerEnd = proj.vertex(-0.2, GRID_ROWS + 1);
  ctx.fillStyle = weather === 'night' ? '#1d4e89' : '#48cae4';
  ctx.beginPath();
  ctx.moveTo(rStart.x, rStart.y);
  ctx.lineTo(rInnerStart.x, rInnerStart.y);
  ctx.lineTo(rInnerEnd.x, rInnerEnd.y);
  ctx.lineTo(rEnd.x, rEnd.y);
  ctx.closePath();
  ctx.fill();

  // Animated water shimmer ripples
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 2 * proj.sc;
  for (let i = 0; i < 6; i++) {
    const t = ((i / 6) + timeSec * 0.08) % 1;
    const wx = rStart.x + (rEnd.x - rStart.x) * t + 16 * proj.sc;
    const wy = rStart.y + (rEnd.y - rStart.y) * t + 8 * proj.sc;
    ctx.beginPath();
    ctx.moveTo(wx - 10 * proj.sc, wy + 5 * proj.sc);
    ctx.lineTo(wx + 10 * proj.sc, wy - 5 * proj.sc);
    ctx.stroke();
  }

  // 3. Raised 2.5D Earthen Cliff Skirt beneath the 14x14 Plateau
  const pLeft = proj.vertex(0, GRID_ROWS);
  const pBottom = proj.vertex(GRID_COLS, GRID_ROWS);
  const pRight = proj.vertex(GRID_COLS, 0);
  const cliffH = 22 * proj.sc;

  ctx.fillStyle = '#6f4518';
  ctx.beginPath();
  ctx.moveTo(pLeft.x, pLeft.y);
  ctx.lineTo(pBottom.x, pBottom.y);
  ctx.lineTo(pBottom.x, pBottom.y + cliffH);
  ctx.lineTo(pLeft.x, pLeft.y + cliffH);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#583101';
  ctx.beginPath();
  ctx.moveTo(pRight.x, pRight.y);
  ctx.lineTo(pBottom.x, pBottom.y);
  ctx.lineTo(pBottom.x, pBottom.y + cliffH);
  ctx.lineTo(pRight.x, pRight.y + cliffH);
  ctx.closePath();
  ctx.fill();

  // Decorative perimeter trees around the plateau
  const borderTrees = [
    [-0.9, -0.8], [3, -0.9], [7, -0.9], [11, -0.8],
    [14.7, 2], [14.7, 6], [14.7, 10], [-2.2, 4], [-2.2, 9],
  ];
  for (const [tc, tr] of borderTrees) {
    const pt = proj.vertex(tc, tr);
    const sc = proj.sc;
    ctx.fillStyle = '#582f0e';
    ctx.fillRect(pt.x - 4 * sc, pt.y - 8 * sc, 8 * sc, 12 * sc);
    ctx.fillStyle = weather === 'snow' ? '#cad2c5' : weather === 'night' ? '#1b4332' : '#2d6a4f';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y - 18 * sc, 17 * sc, 0, Math.PI * 2);
    ctx.arc(pt.x - 10 * sc, pt.y - 12 * sc, 12 * sc, 0, Math.PI * 2);
    ctx.arc(pt.x + 10 * sc, pt.y - 12 * sc, 12 * sc, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawFarmGridTilesAndPaths(ctx, proj, farm, weather, buildMode) {
  // 1. Render 14x14 Isometric Meadow & Locked Parcel Tiles
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const unlocked = isTileUnlocked(farm, c, r);
      const checker = (c + r) % 2 === 0;
      let fill;
      if (!unlocked) {
        fill = checker
          ? (weather === 'night' ? '#162b22' : '#3a6b35')
          : (weather === 'night' ? '#13251d' : '#335f2e');
      } else if (weather === 'night') {
        fill = checker ? '#234937' : '#1e4030';
      } else if (weather === 'snow') {
        fill = checker ? '#e2f1f5' : '#d5e8ee';
      } else {
        fill = checker ? '#70b84f' : '#65ad45';
      }

      traceIsoRect(ctx, proj, c, r, 1, 1);
      ctx.fillStyle = fill;
      ctx.fill();

      // Greenhouse +25% speed aura glow in Build Mode
      if (buildMode && unlocked && hasGreenhouseAura(farm, c, r)) {
        ctx.fillStyle = 'rgba(114, 239, 221, 0.22)';
        ctx.fill();
      }

      // Crisp grid lines: vivid golden-cream in Build Mode, subtle mowed edge in Play Mode
      ctx.strokeStyle = buildMode
        ? (unlocked ? 'rgba(255, 243, 176, 0.55)' : 'rgba(255, 255, 255, 0.16)')
        : (unlocked ? 'rgba(255, 255, 255, 0.11)' : 'rgba(0, 0, 0, 0.14)');
      ctx.lineWidth = (buildMode ? 1.35 : 0.8) * proj.sc;
      ctx.stroke();

      // Wild clover / pebbles on locked outer parcel tiles
      if (!unlocked && (c * 7 + r * 13) % 5 === 0) {
        const ctr = proj.cellCenter(c, r);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.beginPath();
        ctx.arc(ctr.x, ctr.y, 4.5 * proj.sc, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 2. Render Auto-Connecting Cobblestone Paths (`cobble_path`) flat on the ground
  const pathSet = new Set(
    (farm.entities || []).filter((e) => e.type === 'cobble_path').map((e) => `${e.col},${e.row}`)
  );
  for (const ent of farm.entities || []) {
    if (ent.type !== 'cobble_path') continue;
    const { col: c, row: r } = ent;
    const ctr = proj.cellCenter(c, r);
    const sc = proj.sc;

    traceIsoRect(ctx, proj, c, r, 1, 1);
    ctx.fillStyle = '#c89f6d';
    ctx.fill();

    // Inner warm cobblestones + neighbor connectors
    ctx.fillStyle = '#e6ccb2';
    ctx.strokeStyle = '#8d633a';
    ctx.lineWidth = 1.2 * sc;
    ctx.beginPath();
    ctx.ellipse(ctr.x, ctr.y, 15 * sc, 8 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const dirs = [
      [0, -1], [1, 0], [0, 1], [-1, 0],
    ];
    for (const [dc, dr] of dirs) {
      if (pathSet.has(`${c + dc},${r + dr}`) || findEntityAtCell(farm, c + dc, r + dr)) {
        const edgeMid = proj.cellCenter(c + dc * 0.42, r + dr * 0.42);
        ctx.fillStyle = '#ddb892';
        ctx.beginPath();
        ctx.ellipse(edgeMid.x, edgeMid.y, 9 * sc, 5 * sc, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

export function drawLockedParcelSigns(ctx, proj, farm, hoveredParcelId) {
  const signHits = [];
  for (const p of FARM_PARCELS) {
    if (farm.unlockedParcels?.includes(p.id)) continue;
    // Dashed parcel border
    ctx.save();
    ctx.setLineDash([6 * proj.sc, 5 * proj.sc]);
    traceIsoRect(ctx, proj, p.c0, p.r0, p.c1 - p.c0 + 1, p.r1 - p.r0 + 1);
    ctx.strokeStyle = hoveredParcelId === p.id ? '#ffd166' : 'rgba(255, 234, 156, 0.55)';
    ctx.lineWidth = 2.2 * proj.sc;
    ctx.stroke();
    ctx.restore();

    const pt = proj.cellCenter(p.signCol, p.signRow);
    const sc = proj.sc;
    const isHov = hoveredParcelId === p.id;

    // Wooden signpost & unlock pill
    ctx.fillStyle = '#582f0e';
    ctx.fillRect(pt.x - 2.5 * sc, pt.y - 16 * sc, 5 * sc, 18 * sc);

    const w = 128 * sc;
    const h = 32 * sc;
    ctx.fillStyle = isHov ? '#b45309' : 'rgba(38, 24, 12, 0.92)';
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2 * sc;
    ctx.beginPath();
    ctx.roundRect(pt.x - w * 0.5, pt.y - 36 * sc, w, h, 10 * sc);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff8e6';
    ctx.font = `800 ${Math.round(10 * sc)}px Fredoka, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`🔓 ${p.name}`, pt.x, pt.y - 22 * sc);
    ctx.fillStyle = '#ffd166';
    ctx.fillText(`Mở rộng: ${p.costCoins} 💰`, pt.x, pt.y - 10 * sc);

    signHits.push({ parcelId: p.id, x: pt.x, y: pt.y - 20 * sc, r: 52 * sc });
  }
  return signHits;
}

export function drawBuildGhostFootprint(ctx, proj, col, row, w, h, isFree) {
  for (let c = col; c < col + w; c++) {
    for (let r = row; r < row + h; r++) {
      traceIsoRect(ctx, proj, c, r, 1, 1);
      ctx.fillStyle = isFree ? 'rgba(64, 192, 87, 0.46)' : 'rgba(224, 49, 49, 0.52)';
      ctx.fill();
      ctx.strokeStyle = isFree ? '#d3f9d8' : '#ffc9c9';
      ctx.lineWidth = 2.2 * proj.sc;
      ctx.stroke();
    }
  }
}

export function getParcelAtCell(farm, col, row) {
  const p = getParcelForCell(col, row);
  if (p && !farm.unlockedParcels?.includes(p.id)) return p;
  return null;
}
