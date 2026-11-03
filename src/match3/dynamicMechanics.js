/**
 * Advanced Dynamic Match-3 Board Mechanics (Gardenscapes Hardcore 77,777 Campaign):
 * 1. Enchanted Water Streams / Conveyor Belts (Dòng Chảy Phép — shifts pieces 1 step/turn)
 * 2. Apparition Portals (Cổng Độn Thổ — teleports falling pieces/drops across island gaps)
 * 3. Enchanted Clams (Vỏ Sò Phép — opens/closes on alternating turns; immune to matches when shut)
 * 4. Two-Stage Scrolling Boss Transition helper
 */

import { roundRect } from './pieceIcons.js';

export function attachDynamicGridMetadata(grid, def) {
  for (const [r, c] of def.clams || []) {
    if (grid[r]?.[c]?.active && !grid[r][c].blocker) {
      grid[r][c].blocker = { type: 'clam', hp: 1, open: true };
    }
  }
  for (const [r, c, hp = 2] of def.portraits || []) {
    if (grid[r]?.[c]?.active && !grid[r][c].blocker) {
      grid[r][c].blocker = { type: 'portrait', hp, open: true };
    }
  }
  for (const [r, c, hp = 3] of def.fireflies || []) {
    if (grid[r]?.[c]?.active && !grid[r][c].blocker) {
      grid[r][c].blocker = { type: 'firefly', hp };
    }
  }

  for (const path of def.streams || []) {
    if (!Array.isArray(path) || path.length < 2) continue;
    const isLoop =
      Math.abs(path[0][0] - path[path.length - 1][0]) +
        Math.abs(path[0][1] - path[path.length - 1][1]) ===
      1;
    for (let i = 0; i < path.length; i++) {
      const [r, c] = path[i];
      const next = path[(i + 1) % path.length];
      if (!grid[r]?.[c]?.active) continue;
      const dr = i === path.length - 1 && !isLoop ? path[i][0] - path[i - 1][0] : next[0] - r;
      const dc = i === path.length - 1 && !isLoop ? path[i][1] - path[i - 1][1] : next[1] - c;
      grid[r][c].stream = { dr: Math.sign(dr), dc: Math.sign(dc) };
    }
  }

  for (const p of def.portals || []) {
    const [r1, c1] = p.from;
    const [r2, c2] = p.to;
    if (grid[r1]?.[c1]?.active && grid[r2]?.[c2]?.active) {
      grid[r1][c1].portalOut = { toR: r2, toC: c2, color: p.color || '#4cc9f0' };
      grid[r2][c2].portalIn = { fromR: r1, fromC: c1, color: p.color || '#4cc9f0' };
    }
  }
}

export function applyPortalTeleport(board, isEmptyCell, isMovableCell, transferCellPayload) {
  const portals = board.activeStageDef?.portals || board.levelDef?.portals || [];
  if (portals.length === 0) return false;
  let moved = false;
  for (const p of portals) {
    const src = board.grid[p.from[0]]?.[p.from[1]];
    const dst = board.grid[p.to[0]]?.[p.to[1]];
    if (!src || !dst) continue;
    if (isMovableCell(src) && isEmptyCell(dst)) {
      transferCellPayload(dst, src, 1.15, 0);
      board.emitFx('spark', dst.r, dst.c, p.color || '#4cc9f0');
      moved = true;
    }
  }
  return moved;
}

function canShiftOnStream(cell) {
  if (!cell || !cell.active || cell.chain > 0 || cell.foam) return false;
  if (cell.blocker) return cell.blocker.type === 'acorn' || cell.blocker.type === 'cookie';
  return true;
}

export function advanceStreamsAndClams(board) {
  let changed = false;
  const stageDef = board.activeStageDef || board.levelDef;
  board.turnCounter = (board.turnCounter || 0) + 1;

  // 0. Homescapes Shifting Staircase Conveyor: reverses direction every 2 turns!
  if (stageDef?.shiftingStreams && board.turnCounter % 2 === 0) {
    board.streamReversed = !board.streamReversed;
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const st = board.grid[r][c]?.stream;
        if (st) {
          st.dr = -st.dr;
          st.dc = -st.dc;
        }
      }
    }
    const firstPath = stageDef.streams?.[0]?.[0];
    if (firstPath) board.emitFloatingText(firstPath[0], firstPath[1], '🪜 Cầu Thang Đổi Chiều!', '#ffd166');
  }

  // 1. Advance Enchanted Water Streams 1 step along each path
  for (const rawPath of stageDef?.streams || []) {
    if (!Array.isArray(rawPath) || rawPath.length < 2) continue;
    const path = board.streamReversed ? [...rawPath].reverse() : rawPath;
    const cells = path.map(([r, c]) => board.grid[r]?.[c]).filter(Boolean);
    if (cells.length < 2) continue;

    const isLoop =
      Math.abs(cells[0].r - cells[cells.length - 1].r) +
        Math.abs(cells[0].c - cells[cells.length - 1].c) ===
      1;

    if (isLoop && cells.every(canShiftOnStream)) {
      const snaps = cells.map((cl) => ({
        piece: cl.piece,
        dropItem: cl.dropItem,
        blocker: cl.blocker,
      }));
      for (let i = 0; i < cells.length; i++) {
        const nextIdx = (i + 1) % cells.length;
        const dst = cells[nextIdx];
        const srcPos = cells[i];
        dst.piece = snaps[i].piece;
        dst.dropItem = snaps[i].dropItem;
        dst.blocker = snaps[i].blocker;
        dst.fallOffset = srcPos.r - dst.r === 0 ? 0 : (dst.r - srcPos.r) * 0.65;
        dst.fallOffsetX = srcPos.c - dst.c === 0 ? 0 : (dst.c - srcPos.c) * 0.65;
      }
      changed = true;
    } else {
      // Open stream or partially blocked loop: shift movable segments from tail to head
      for (let i = cells.length - 2; i >= 0; i--) {
        const src = cells[i];
        const dst = cells[i + 1];
        if (!canShiftOnStream(src) || !canShiftOnStream(dst)) continue;
        if (!dst.piece && !dst.dropItem && !dst.blocker && (src.piece || src.dropItem || src.blocker)) {
          dst.piece = src.piece;
          dst.dropItem = src.dropItem;
          dst.blocker = src.blocker;
          src.piece = null;
          src.dropItem = null;
          src.blocker = null;
          dst.fallOffset = (dst.r - src.r) * 0.65;
          dst.fallOffsetX = (dst.c - src.c) * 0.65;
          changed = true;
        } else if (canShiftOnStream(src) && canShiftOnStream(dst) && src.piece && dst.piece) {
          const tmpP = dst.piece;
          const tmpD = dst.dropItem;
          dst.piece = src.piece;
          dst.dropItem = src.dropItem;
          src.piece = tmpP;
          src.dropItem = tmpD;
          dst.fallOffset = (dst.r - src.r) * 0.55;
          dst.fallOffsetX = (dst.c - src.c) * 0.55;
          changed = true;
        }
      }
    }
  }

  // 2. Toggle Enchanted Clams & Castle Portraits open <-> shut each turn
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const b = board.grid[r][c]?.blocker;
      if (b?.type === 'clam' || b?.type === 'portrait') {
        b.open = !b.open;
        board.grid[r][c].bounce = 0.55;
        changed = true;
      }
    }
  }

  return changed;
}

export function drawStreamUnderlay(ctx, cell, x, y, size, timeSec = 0) {
  if (!cell.stream) return;
  const pad = 2;
  const rx = x + pad;
  const ry = y + pad;
  const rw = size - pad * 2;

  ctx.save();
  const g = ctx.createLinearGradient(rx, ry, rx + rw, ry + rw);
  g.addColorStop(0, 'rgba(0, 150, 199, 0.72)');
  g.addColorStop(0.5, 'rgba(72, 202, 228, 0.68)');
  g.addColorStop(1, 'rgba(2, 62, 138, 0.76)');
  ctx.fillStyle = g;
  roundRect(ctx, rx, ry, rw, rw, 8);
  ctx.fill();

  const cx = x + size * 0.5;
  const cy = y + size * 0.5;
  const angle = Math.atan2(cell.stream.dr, cell.stream.dc);
  const shift = ((timeSec * 1.6) % 1) * 8 - 4;

  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.strokeStyle = 'rgba(202, 240, 248, 0.88)';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  for (const off of [-8, 4]) {
    const px = off + shift * 0.7;
    ctx.beginPath();
    ctx.moveTo(px - 4, -6);
    ctx.lineTo(px + 3, 0);
    ctx.lineTo(px - 4, 6);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPortalOverlay(ctx, cell, x, y, size, timeSec = 0) {
  const pOut = cell.portalOut;
  const pIn = cell.portalIn;
  if (!pOut && !pIn) return;

  ctx.save();
  const color = (pOut || pIn).color || '#4cc9f0';
  const yEdge = pOut ? y + size - 3 : y + 3;
  const cx = x + size * 0.5;
  const pulse = 1 + Math.sin(timeSec * 6.5) * 0.14;

  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.ellipse(cx, yEdge, size * 0.36 * pulse, 5.2, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.ellipse(cx, yEdge, size * 0.18 * pulse, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawEnchantedClam3D(ctx, blocker, size, timeSec = 0) {
  const r = size * 0.4;
  const isOpen = blocker.open !== false;
  ctx.save();

  // Lower shell
  const botGrad = ctx.createRadialGradient(0, r * 0.2, 2, 0, r * 0.1, r);
  botGrad.addColorStop(0, '#e0aaff');
  botGrad.addColorStop(0.65, '#7b2cbf');
  botGrad.addColorStop(1, '#3c096c');
  ctx.fillStyle = botGrad;
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.22, r * 0.95, r * 0.66, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (isOpen) {
    // Glowing pearl inside open shell!
    const pulse = 1 + Math.sin(timeSec * 7) * 0.1;
    const pGrad = ctx.createRadialGradient(-3, 0, 1, 0, 2, r * 0.44 * pulse);
    pGrad.addColorStop(0, '#ffffff');
    pGrad.addColorStop(0.55, '#fff3b0');
    pGrad.addColorStop(1, '#ff9ebb');
    ctx.fillStyle = pGrad;
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 9;
    ctx.beginPath();
    ctx.arc(0, r * 0.08, r * 0.38 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Lifted top shell cap
    ctx.fillStyle = '#9d4edd';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.48, r * 0.86, r * 0.42, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // Armored closed shell with ridges
    const topGrad = ctx.createLinearGradient(0, -r * 0.7, 0, r * 0.5);
    topGrad.addColorStop(0, '#9d4edd');
    topGrad.addColorStop(1, '#240046');
    ctx.fillStyle = topGrad;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.04, r * 0.96, r * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 209, 102, 0.75)';
    ctx.lineWidth = 1.6;
    for (const dx of [-0.45, 0, 0.45]) {
      ctx.beginPath();
      ctx.moveTo(0, r * 0.58);
      ctx.lineTo(dx * r, -r * 0.55);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawSuperRainbowHalo(ctx, size, timeSec = 0) {
  ctx.save();
  const r = size * 0.47;
  ctx.rotate(-timeSec * 2.2);
  ctx.strokeStyle = '#72efdd';
  ctx.lineWidth = 2.6;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawEnchantedPortrait3D(ctx, blocker, size, timeSec = 0) {
  const w = size * 0.84;
  const isOpen = blocker.open !== false;
  ctx.save();
  ctx.fillStyle = '#582f0e';
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 3;
  roundRect(ctx, -w / 2, -w / 2, w, w, 8);
  ctx.fill();
  ctx.stroke();

  const inner = w * 0.74;
  if (isOpen) {
    const g = ctx.createLinearGradient(0, -inner / 2, 0, inner / 2);
    g.addColorStop(0, '#3c096c');
    g.addColorStop(1, '#10002b');
    ctx.fillStyle = g;
    roundRect(ctx, -inner / 2, -inner / 2, inner, inner, 5);
    ctx.fill();
    // Animated wizard silhouette inside frame
    const sway = Math.sin(timeSec * 3.5) * 2;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(sway, -inner * 0.1, inner * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9d4edd';
    ctx.beginPath();
    ctx.moveTo(-inner * 0.28 + sway, inner * 0.42);
    ctx.quadraticCurveTo(sway, inner * 0.04, inner * 0.28 + sway, inner * 0.42);
    ctx.fill();
  } else {
    // Velvet crimson curtain shield
    const cg = ctx.createLinearGradient(-inner / 2, 0, inner / 2, 0);
    cg.addColorStop(0, '#640d14');
    cg.addColorStop(0.5, '#ae2012');
    cg.addColorStop(1, '#640d14');
    ctx.fillStyle = cg;
    roundRect(ctx, -inner / 2, -inner / 2, inner, inner, 5);
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -inner * 0.45);
    ctx.lineTo(0, inner * 0.45);
    ctx.stroke();
  }
  if ((blocker.hp || 1) >= 2) {
    ctx.fillStyle = '#9b2226';
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(w * 0.3, w * 0.3, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '900 9px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('2', w * 0.3, w * 0.31);
  }
  ctx.restore();
}

export function drawFireflyJar3D(ctx, blocker, size, timeSec = 0) {
  const w = size * 0.72;
  const h = size * 0.82;
  const hp = Math.max(1, blocker.hp || 1);
  ctx.save();
  // Cork lid
  ctx.fillStyle = '#a47148';
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 1.8;
  roundRect(ctx, -w * 0.32, -h * 0.52, w * 0.64, h * 0.16, 4);
  ctx.fill();
  ctx.stroke();
  // Translucent emerald glass jar
  const jg = ctx.createLinearGradient(-w / 2, -h * 0.36, w / 2, h * 0.46);
  jg.addColorStop(0, 'rgba(114, 239, 221, 0.55)');
  jg.addColorStop(1, 'rgba(19, 62, 40, 0.82)');
  ctx.fillStyle = jg;
  ctx.strokeStyle = '#b7e4c7';
  ctx.lineWidth = 2;
  roundRect(ctx, -w * 0.46, -h * 0.36, w * 0.92, h * 0.82, 10);
  ctx.fill();
  ctx.stroke();

  // Glowing orbiting fireflies inside jar (1..3 based on remaining HP!)
  for (let i = 0; i < hp; i++) {
    const ang = timeSec * 3.8 + i * 2.1;
    const fx = Math.cos(ang) * w * 0.2;
    const fy = Math.sin(ang * 1.3) * h * 0.18 + h * 0.05;
    ctx.fillStyle = i % 2 === 0 ? '#ffd166' : '#72efdd';
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 7;
    ctx.beginPath();
    ctx.arc(fx, fy, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

const CB_SYMBOLS = ['★', '◆', '▲', '●', '✚', '⬟'];
export function drawColorblindBadge(ctx, colorIdx, size) {
  if (colorIdx < 0 || colorIdx >= CB_SYMBOLS.length) return;
  const r = Math.max(7, size * 0.16);
  const bx = size * 0.25;
  const by = size * 0.25;
  ctx.save();
  ctx.fillStyle = 'rgba(18, 12, 24, 0.88)';
  ctx.strokeStyle = '#fff8e7';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(bx, by, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(r * 1.25)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(CB_SYMBOLS[colorIdx], bx, by + 0.5);
  ctx.restore();
}

