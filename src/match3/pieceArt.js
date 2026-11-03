/**
 * High-Fidelity 3D Sprite & Contoured Playrix Board Renderer
 */

import { sprites } from '../utils/spriteLoader.js';
import { tryDrawMatch3Model3D } from '../world3d/match3Stage3d.js';
import {
  drawColorblindBadge,
  drawEnchantedClam3D,
  drawEnchantedPortrait3D,
  drawFireflyJar3D,
  drawPortalOverlay,
  drawStreamUnderlay,
  drawSuperRainbowHalo,
} from './dynamicMechanics.js';
import {
  drawAlarmClock3D,
  drawChainOrVineOverlay,
  drawColorButterfly3D,
  drawFoamOrHoneyOverlay,
  drawGardenscapesPiece,
  drawHomescapesPiece,
  drawRocketDirectionalChevrons,
  roundRect,
} from './pieceIcons.js';

export { roundRect };

export const PIECE_PALETTES = {
  homescapes: ['#29b6f6', '#43a047', '#e63946', '#ffca28', '#9d4edd', '#f77f00'],
  gardenscapes: ['#e63946', '#f59f00', '#2d8a5e', '#1d4ed8', '#9d4edd', '#8d5524'],
};

const GARDEN_PIECE_NAMES = [
  'Đá Phù Thủy',
  'Snitch Vàng',
  'Lọ Độc Dược',
  'Ếch Sô-cô-la',
  'Củ Mandrake',
  'Sách Quái Vật',
];

export function getGoalBadgeMeta(gameId, goal) {
  const homeIcons = ['📘', '🧪', '♦️', '🟡', '🎩', '🍺'];
  const gardenIcons = ['♦️', '🟡', '🧪', '🐸', '🪴', '📕'];
  if (goal.type === 'color') {
    const key = `${gameId === 'homescapes' ? 'h' : 'g'}_piece_${goal.color}`;
    const list = gameId === 'homescapes' ? homeIcons : gardenIcons;
    return {
      icon: list[goal.color] || '⭐',
      img: sprites.url(key),
      color: PIECE_PALETTES[gameId][goal.color] || '#ffd166',
      name: gameId === 'homescapes' ? 'Cổ Vật' : GARDEN_PIECE_NAMES[goal.color] || 'Bảo Vật',
    };
  }
  const map = {
    carpet: { icon: '🟥', img: '', color: '#9b2226', name: 'Thảm Gryffindor' },
    box: { icon: '🧳', img: sprites.url('h_box'), color: '#9c6644', name: 'Rương Hogwarts' },
    cookie: { icon: '🐸', img: sprites.url('h_cookie'), color: '#b07d62', name: 'Ếch Sô-cô-la' },
    cherry: { icon: '🍬', img: sprites.url('cherry_jelly'), color: '#e63946', name: 'Đậu Bertie' },
    chain: {
      icon: gameId === 'homescapes' ? '⛓️' : '🌿',
      img: '',
      color: '#6c757d',
      name: gameId === 'homescapes' ? 'Xích Azkaban' : 'Dây Gai Quỷ',
    },
    donut: { icon: '🔑', img: sprites.url('h_donut'), color: '#ffd166', name: 'Chìa Khóa Vàng' },
    foam: {
      icon: gameId === 'homescapes' ? '🧪' : '🍯',
      img: '',
      color: gameId === 'homescapes' ? '#c77dff' : '#ffb703',
      name: gameId === 'homescapes' ? 'Bọt Đa Dịch' : 'Mật Công Tước',
    },
    clock: { icon: '⏳', img: '', color: '#ff4d6d', name: 'Đồng Hồ Nổ' },
    gnome: { icon: '🧙‍♂️', img: sprites.url('g_gnome'), color: '#2d8a5e', name: 'Tượng Phù Thủy' },
    grass: { icon: '🌿', img: '', color: '#2d8a5e', name: 'Rêu Cổ Ngữ' },
    crate: { icon: '🧳', img: sprites.url('g_crate'), color: '#7a1f2b', name: 'Rương Trường' },
    lemonade: { icon: '🏆', img: sprites.url('g_lemonade'), color: '#d4af37', name: 'Cúp Bia Bơ' },
    bloom: { icon: '🪴', img: sprites.url('g_flowerbed'), color: '#2d8a5e', name: 'Bồn Thảo Dược' },
    butterfly: { icon: '🦋', img: '', color: '#9d4edd', name: 'Bướm Phép' },
    acorn: { icon: '🔮', img: sprites.url('g_acorn'), color: '#d4af37', name: 'Cầu Tiên Tri' },
    clam: { icon: '🐚', img: '', color: '#c77dff', name: 'Vỏ Sò Phép' },
    portrait: { icon: '🖼️', img: '', color: '#ffd166', name: 'Tranh Phép' },
    firefly: { icon: '🫙', img: '', color: '#72efdd', name: 'Đom Đóm Rừng' },
  };
  return map[goal.type] || { icon: '⭐', img: '', color: '#ffd166', name: goal.type };
}

export function drawContouredBoardFrame(ctx, board, originX, originY, ts) {
  const isHome = board.gameId === 'homescapes';
  ctx.save();

  // Outer drop shadow + deep Hogwarts Emerald / Castle stone rim
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 7;
  ctx.fillStyle = isHome ? '#4a1219' : '#09291a';
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      if (!board.grid[r][c].active) continue;
      roundRect(ctx, originX + c * ts - 9, originY + r * ts - 9, ts + 18, ts + 18, 15);
      ctx.fill();
    }
  }

  // Burnished Hogwarts Brass Filigree middle bevel
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = isHome ? '#e09f3e' : '#d4af37';
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      if (!board.grid[r][c].active) continue;
      roundRect(ctx, originX + c * ts - 5, originY + r * ts - 5, ts + 10, ts + 10, 12);
      ctx.fill();
    }
  }

  // Deep recessed emerald / burgundy channel
  ctx.fillStyle = isHome ? '#2b0d12' : '#0d3622';
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      if (!board.grid[r][c].active) continue;
      roundRect(ctx, originX + c * ts - 1.5, originY + r * ts - 1.5, ts + 3, ts + 3, 10);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawCellUnderlay(ctx, gameId, cell, x, y, size, timeSec = 0) {
  const pad = 1.5;
  const rx = x + pad;
  const ry = y + pad;
  const rw = size - pad * 2;

  const isEven = (cell.r + cell.c) % 2 === 0;
  ctx.fillStyle = gameId === 'homescapes' ? (isEven ? '#fbf3e0' : '#eedec0') : (isEven ? '#fbf2dc' : '#ecdcB4');
  roundRect(ctx, rx, ry, rw, rw, 8);
  ctx.fill();

  if (gameId === 'gardenscapes') {
    ctx.strokeStyle = 'rgba(140, 98, 20, 0.22)';
    ctx.lineWidth = 1;
    roundRect(ctx, rx + 1, ry + 1, rw - 2, rw - 2, 7);
    ctx.stroke();
  }
  if (cell.stream) drawStreamUnderlay(ctx, cell, x, y, size, timeSec);
  if (cell.portalOut || cell.portalIn) drawPortalOverlay(ctx, cell, x, y, size, timeSec);

  if (cell.carpet) {
    const grad = ctx.createLinearGradient(rx, ry, rx + rw, ry + rw);
    grad.addColorStop(0, '#b5172c');
    grad.addColorStop(0.5, '#8d0801');
    grad.addColorStop(1, '#640d14');
    ctx.fillStyle = grad;
    roundRect(ctx, rx + 0.5, ry + 0.5, rw - 1, rw - 1, 8);
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    roundRect(ctx, rx + 4, ry + 4, rw - 8, rw - 8, 5);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (cell.isExit) {
    ctx.save();
    ctx.fillStyle = '#ff9f1c';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + size * 0.32, y + size - 4);
    ctx.lineTo(x + size * 0.68, y + size - 4);
    ctx.lineTo(x + size * 0.5, y + size + 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Draws buried 3D Gnome sprite BEFORE translucent grass overlay so Gnomes visibly peek through!
 */
export function drawBuriedGnome(ctx, gnome, originX, originY, ts) {
  let minR = 99, maxR = -1, minC = 99, maxC = -1;
  for (const [r, c] of gnome.cells) {
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  }
  const x = originX + minC * ts;
  const y = originY + minR * ts;
  const w = (maxC - minC + 1) * ts;
  const h = (maxR - minR + 1) * ts;

  ctx.save();
  const img = sprites.get('g_gnome');
  if (img) {
    ctx.globalAlpha = 0.88;
    const scale = Math.min((w * 0.86) / img.naturalWidth, (h * 0.88) / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = 'rgba(214, 40, 40, 0.65)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w * 0.34, h * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draws Grass patches (translucent over buried Gnomes so their red hat peeks out!).
 */
export function drawGrassLayer(ctx, cell, x, y, size) {
  if (cell.grass <= 0) return;
  const pad = 2;
  const rx = x + pad;
  const ry = y + pad;
  const rw = size - pad * 2;

  ctx.save();
  ctx.globalAlpha = cell.gnomeId ? (cell.grass >= 2 ? 0.82 : 0.58) : 0.94;
  const g = ctx.createLinearGradient(rx, ry, rx, ry + rw);
  if (cell.grass >= 2) {
    g.addColorStop(0, '#40916c');
    g.addColorStop(1, '#1b4332');
  } else {
    g.addColorStop(0, '#74c69d');
    g.addColorStop(1, '#40916c');
  }
  ctx.fillStyle = g;
  roundRect(ctx, rx, ry, rw, rw, 8);
  ctx.fill();

  ctx.strokeStyle = '#b7e4c7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rx + rw * 0.22, ry + rw * 0.78);
  ctx.lineTo(rx + rw * 0.16, ry + rw * 0.52);
  ctx.moveTo(rx + rw * 0.76, ry + rw * 0.8);
  ctx.lineTo(rx + rw * 0.82, ry + rw * 0.54);
  ctx.stroke();

  if (cell.grass >= 2) {
    for (const [fx, fy] of [[0.26, 0.26], [0.74, 0.3], [0.5, 0.7]]) {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(rx + rw * fx, ry + rw * fy, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawPartitionWalls(ctx, board, originX, originY, ts) {
  const isHome = board.gameId === 'homescapes';
  ctx.save();
  ctx.lineCap = 'round';
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = board.grid[r][c];
      const x = originX + c * ts;
      const y = originY + r * ts;
      if (cell.wallRight) {
        ctx.strokeStyle = isHome ? '#5c3317' : '#0d3823';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(x + ts, y + 3);
        ctx.lineTo(x + ts, y + ts - 3);
        ctx.stroke();
        ctx.strokeStyle = isHome ? '#ffd166' : '#e5c158';
        ctx.lineWidth = 3.5;
        ctx.stroke();
      }
      if (cell.wallBottom) {
        ctx.strokeStyle = isHome ? '#5c3317' : '#0d3823';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(x + 3, y + ts);
        ctx.lineTo(x + ts - 3, y + ts);
        ctx.stroke();
        ctx.strokeStyle = isHome ? '#ffd166' : '#e5c158';
        ctx.lineWidth = 3.5;
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

export function drawCellContent(ctx, gameId, cell, cx, cy, size, timeSec = 0, colorblind = false) {
  if (cell.jelly > 0) {
    const chImg = sprites.get('cherry_jelly');
    if (chImg) {
      ctx.drawImage(chImg, cx - size * 0.44, cy - size * 0.44, size * 0.88, size * 0.88);
    } else {
      ctx.fillStyle = 'rgba(255, 77, 109, 0.34)';
      roundRect(ctx, cx - size * 0.42, cy - size * 0.42, size * 0.84, size * 0.84, 10);
      ctx.fill();
    }
  }

  const bAmt = cell.bounce || 0;
  const sx = 1 + Math.sin(bAmt * Math.PI) * 0.14;
  const sy = 1 - Math.sin(bAmt * Math.PI) * 0.12;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sx, sy);

  if (cell.blocker) {
    drawBlocker3D(ctx, cell.blocker, size, timeSec);
  } else if (cell.dropItem) {
    drawDropItem3D(ctx, cell.dropItem, size, timeSec);
  } else if (cell.piece) {
    // Subtle Playrix drop shadow beneath every 3D piece
    ctx.fillStyle = 'rgba(20, 12, 6, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.31, size * 0.3, size * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();

    if (cell.piece.power) {
      drawPowerup3D(ctx, cell.piece.power, size, timeSec, Boolean(cell.piece.super));
    } else if (cell.piece.butterfly) {
      drawColorButterfly3D(ctx, gameId, cell.piece.color, size, timeSec);
      if (colorblind) drawColorblindBadge(ctx, cell.piece.color, size);
    } else if (cell.piece.fuse !== undefined) {
      drawAlarmClock3D(ctx, gameId, cell.piece.color, cell.piece.fuse, size, timeSec);
      if (colorblind) drawColorblindBadge(ctx, cell.piece.color, size);
    } else {
      const m3Kind =
        (gameId === 'gardenscapes' && cell.piece.color === 1) || (gameId === 'homescapes' && cell.piece.color === 3)
          ? 'snitch'
          : (gameId === 'gardenscapes' && cell.piece.color === 2) || (gameId === 'homescapes' && cell.piece.color === 1)
            ? 'potion'
            : null;
      if (!m3Kind || !tryDrawMatch3Model3D(ctx, m3Kind, size * 0.96)) {
        const spKey = `${gameId === 'homescapes' ? 'h' : 'g'}_piece_${cell.piece.color}`;
        const img = sprites.get(spKey);
        if (img) {
          const d = size * 0.86;
          ctx.drawImage(img, -d / 2, -d / 2, d, d);
        } else if (gameId === 'homescapes') {
          drawHomescapesPiece(ctx, cell.piece.color, 0, 0, size * 0.38);
        } else {
          drawGardenscapesPiece(ctx, cell.piece.color, 0, 0, size * 0.38);
        }
      }
      if (colorblind) drawColorblindBadge(ctx, cell.piece.color, size);
    }
  }

  ctx.restore();

  if (cell.foam) drawFoamOrHoneyOverlay(ctx, gameId, cx, cy, size, timeSec);
  if (cell.chain > 0) drawChainOrVineOverlay(ctx, gameId, cx, cy, size, cell.chain);
}

function drawPowerup3D(ctx, power, size, timeSec, isSuper = false) {
  const pulse = 1 + Math.sin(timeSec * 6) * 0.055;
  const d = size * 0.9 * pulse;
  ctx.save();
  if (isSuper && (power === 'g_rainbow' || power === 'rainbow_ball')) {
    drawSuperRainbowHalo(ctx, size, timeSec);
  }
  if ((power === 'rainbow_ball' || power === 'g_rainbow') && tryDrawMatch3Model3D(ctx, 'rainbow', d * 1.06)) {
    ctx.restore();
    return;
  }
  if ((power === 'h_bomb' || power === 'g_bomb' || power === 'g_tnt') && tryDrawMatch3Model3D(ctx, 'bomb', d * 1.06)) {
    ctx.restore();
    return;
  }

  const spriteMap = {
    rocket_h: 'h_rocket',
    rocket_v: 'h_rocket',
    paper_plane: 'h_plane',
    h_bomb: 'h_bomb',
    g_bomb: 'h_bomb',
    rainbow_ball: 'h_rainbow',
    g_firecracker: 'g_firecracker',
    g_dynamite: 'g_dynamite',
    g_tnt: 'g_tnt',
    g_rainbow: 'g_rainbow',
  };
  const img = sprites.get(spriteMap[power]);
  if (img) {
    ctx.save();
    if (power === 'rocket_h') ctx.rotate(Math.PI / 4);
    else if (power === 'rocket_v') ctx.rotate(-Math.PI / 4);
    else if (power === 'paper_plane') ctx.rotate(Math.sin(timeSec * 4) * 0.08);
    else if (power === 'rainbow_ball' || power === 'g_rainbow') ctx.rotate(timeSec * 1.1);
    ctx.drawImage(img, -d / 2, -d / 2, d, d);
    ctx.restore();
    if (power === 'rocket_h' || power === 'rocket_v') {
      drawRocketDirectionalChevrons(ctx, power === 'rocket_h', size, timeSec);
    }
    ctx.restore();
    return;
  }

  ctx.fillStyle = '#ffbe0b';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBlocker3D(ctx, blocker, size, timeSec = 0) {
  if (blocker.type === 'clam') return drawEnchantedClam3D(ctx, blocker, size, timeSec);
  if (blocker.type === 'portrait') return drawEnchantedPortrait3D(ctx, blocker, size, timeSec);
  if (blocker.type === 'firefly') return drawFireflyJar3D(ctx, blocker, size, timeSec);
  const d = size * 0.9;
  if (blocker.type === 'box' || blocker.type === 'crate') {
    const key = blocker.type === 'crate' ? 'g_crate' : 'h_box';
    const img = sprites.get(key) || sprites.get('h_box');
    if (img) {
      ctx.drawImage(img, -d / 2, -d / 2, d, d);
    } else {
      ctx.fillStyle = '#c68b59';
      roundRect(ctx, -d * 0.45, -d * 0.45, d * 0.9, d * 0.9, 8);
      ctx.fill();
    }
    if (blocker.hp >= 2) {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 3;
      roundRect(ctx, -d * 0.34, -d * 0.34, d * 0.68, d * 0.68, 5);
      ctx.stroke();
    }
  } else if (blocker.type === 'cherry') {
    const chImg = sprites.get('cherry_jelly');
    if (chImg) ctx.drawImage(chImg, -d * 0.46, -d * 0.46, d * 0.92, d * 0.92);
    if (blocker.hp >= 2) {
      // Translucent glossy Playrix pink gelatin cube encasing the cherries!
      const jg = ctx.createLinearGradient(-d * 0.44, -d * 0.44, d * 0.44, d * 0.44);
      jg.addColorStop(0, 'rgba(255, 133, 161, 0.56)');
      jg.addColorStop(1, 'rgba(217, 4, 41, 0.42)');
      ctx.fillStyle = jg;
      ctx.strokeStyle = 'rgba(255, 225, 234, 0.9)';
      ctx.lineWidth = 2.2;
      roundRect(ctx, -d * 0.44, -d * 0.44, d * 0.88, d * 0.88, 11);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.62)';
      roundRect(ctx, -d * 0.34, -d * 0.36, d * 0.28, d * 0.14, 5);
      ctx.fill();
    }
  } else if (blocker.type === 'cookie') {
    const img = sprites.get('h_cookie');
    if (img) ctx.drawImage(img, -d / 2, -d / 2, d, d);
  } else if (blocker.type === 'acorn') {
    const img = sprites.get('g_acorn') || sprites.get('g_piece_5');
    if (img) ctx.drawImage(img, -d * 0.48, -d * 0.48, d * 0.96, d * 0.96);
    if (blocker.hp >= 2) {
      ctx.fillStyle = '#5c3317';
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(d * 0.26, d * 0.26, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffd166';
      ctx.font = '900 10px Fredoka, system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('2', d * 0.26, d * 0.27);
    }
  } else if (blocker.type === 'flowerbed') {
    const img = sprites.get('g_flowerbed');
    if (img) ctx.drawImage(img, -d * 0.52, -d * 0.52, d * 1.04, d * 1.04);
    const stage = blocker.stage || 0;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < stage ? '#ff4d6d' : 'rgba(255,255,255,0.65)';
      ctx.beginPath();
      ctx.arc((i - 1) * 10, d * 0.34, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawDropItem3D(ctx, type, size, timeSec) {
  const bob = Math.sin(timeSec * 4.2) * 2.4;
  const d = size * 0.9;
  const img = sprites.get(type === 'donut' ? 'h_donut' : 'g_lemonade');
  if (img) {
    ctx.drawImage(img, -d / 2, -d / 2 + bob, d, d);
  }
}

