/**
 * Glossy Shaded Piece Icons for Homescapes & Gardenscapes
 */

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function drawHomescapesPiece(ctx, color, cx, cy, r) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.arc(cx, cy + 3, r * 0.9, 0, Math.PI * 2);
  ctx.fill();

  if (color === 0) {
    // 0: Glossy Blue Teacup
    ctx.fillStyle = '#039be5';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.52, r * 0.88, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    g.addColorStop(0, '#4fc3f7');
    g.addColorStop(1, '#0277bd');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.05, r * 0.72, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx + r * 0.62, cy + r * 0.08, r * 0.25, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();
  } else if (color === 1) {
    // 1: Emerald Hardcover Book
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, '#66bb6a');
    g.addColorStop(1, '#2e7d32');
    ctx.fillStyle = g;
    roundRect(ctx, cx - r * 0.74, cy - r * 0.84, r * 1.48, r * 1.68, 6);
    ctx.fill();
    ctx.fillStyle = '#fff8e1';
    ctx.fillRect(cx - r * 0.54, cy + r * 0.52, r * 1.15, r * 0.2);
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(cx - r * 0.15, cy - r * 0.45, r * 0.35, r * 0.55);
  } else if (color === 2) {
    // 2: Plush Pink/Crimson Bow Tie
    const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    g.addColorStop(0, '#ff6090');
    g.addColorStop(1, '#c2185b');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - r * 0.92, cy - r * 0.65);
    ctx.quadraticCurveTo(cx - r * 1.05, cy, cx - r * 0.92, cy + r * 0.65);
    ctx.closePath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * 0.92, cy - r * 0.65);
    ctx.quadraticCurveTo(cx + r * 1.05, cy, cx + r * 0.92, cy + r * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff80ab';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (color === 3) {
    // 3: Golden Table Lamp
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(cx - r * 0.12, cy + r * 0.15, r * 0.24, r * 0.58);
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.74, r * 0.48, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r * 0.25);
    g.addColorStop(0, '#fff59d');
    g.addColorStop(1, '#ffb300');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.45, cy - r * 0.78);
    ctx.lineTo(cx + r * 0.45, cy - r * 0.78);
    ctx.lineTo(cx + r * 0.85, cy + r * 0.22);
    ctx.lineTo(cx - r * 0.85, cy + r * 0.22);
    ctx.closePath();
    ctx.fill();
  } else if (color === 4) {
    // 4: Royal Purple Teapot
    const g = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 2, cx, cy, r);
    g.addColorStop(0, '#ce93d8');
    g.addColorStop(1, '#6a1b9a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.08, r * 0.76, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9c27b0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.55, cy + r * 0.1);
    ctx.quadraticCurveTo(cx + r * 1.05, cy - r * 0.35, cx + r * 0.9, cy - r * 0.55);
    ctx.stroke();
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.72, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 5: Glossy Coral Button
    const g = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, 2, cx, cy, r);
    g.addColorStop(0, '#ffab91');
    g.addColorStop(1, '#d84315');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.84, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3e0';
    for (const [dx, dy] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) {
      ctx.beginPath();
      ctx.arc(cx + r * dx, cy + r * dy, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.26, cy - r * 0.32, r * 0.22, r * 0.11, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawGardenscapesPiece(ctx, color, cx, cy, r) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath();
  ctx.arc(cx, cy + 3, r * 0.88, 0, Math.PI * 2);
  ctx.fill();

  if (color === 0) {
    // 0: Crisp Red Apple
    const g = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, 2, cx, cy, r);
    g.addColorStop(0, '#ff8a80');
    g.addColorStop(1, '#c62828');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx - r * 0.22, cy + r * 0.08, r * 0.62, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.22, cy + r * 0.08, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#43a047';
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.22, cy - r * 0.65, r * 0.28, r * 0.14, -0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (color === 1) {
    // 1: Golden Pear
    const g = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 2, cx, cy, r);
    g.addColorStop(0, '#fff59d');
    g.addColorStop(1, '#f9a825');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.24, r * 0.64, 0, Math.PI * 2);
    ctx.arc(cx, cy - r * 0.3, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6d4c41';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.68);
    ctx.lineTo(cx + r * 0.14, cy - r * 0.9);
    ctx.stroke();
  } else if (color === 2) {
    // 2: Lush Green Leaf
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, '#81c784');
    g.addColorStop(1, '#1b5e20');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.72, cy + r * 0.72);
    ctx.quadraticCurveTo(cx - r * 0.85, cy - r * 0.65, cx + r * 0.75, cy - r * 0.75);
    ctx.quadraticCurveTo(cx + r * 0.65, cy + r * 0.85, cx - r * 0.72, cy + r * 0.72);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.55, cy + r * 0.55);
    ctx.lineTo(cx + r * 0.52, cy - r * 0.52);
    ctx.stroke();
  } else if (color === 3) {
    // 3: Crystal Water Drop
    const g = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.1, 2, cx, cy + r * 0.1, r);
    g.addColorStop(0, '#80d8ff');
    g.addColorStop(1, '#0277bd');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.88);
    ctx.bezierCurveTo(cx + r * 0.9, cy - r * 0.05, cx + r * 0.82, cy + r * 0.85, cx, cy + r * 0.85);
    ctx.bezierCurveTo(cx - r * 0.82, cy + r * 0.85, cx - r * 0.9, cy - r * 0.05, cx, cy - r * 0.88);
    ctx.fill();
  } else if (color === 4) {
    // 4: 5-Petal Blossom Flower
    ctx.fillStyle = '#ec407a';
    for (let i = 0; i < 5; i++) {
      const ang = (i * Math.PI * 2) / 5 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * r * 0.44, cy + Math.sin(ang) * r * 0.44, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffee58';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 5: Chestnut Acorn
    ctx.fillStyle = '#a1662f';
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.18, r * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.15, r * 0.72, Math.PI, 0);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.48)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.24, cy - r * 0.24, r * 0.2, r * 0.1, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const COLOR_HEX_SETS = {
  homescapes: [
    ['#4fc3f7', '#0277bd'], // 0 Blue Spellbook
    ['#66bb6a', '#2e7d32'], // 1 Green Potion
    ['#ff6b6b', '#c1121f'], // 2 Crimson Philosopher's Stone
    ['#ffee58', '#f57f17'], // 3 Golden Snitch
    ['#ce93d8', '#6a1b9a'], // 4 Purple Sorting Hat
    ['#ffb703', '#ca6702'], // 5 Amber Butterbeer
  ],
  gardenscapes: [
    ['#ff6b6b', '#c1121f'], // 0 Crimson Philosopher's Stone
    ['#ffee58', '#d98200'], // 1 Golden Snitch
    ['#52b788', '#166541'], // 2 Emerald Potion Vial
    ['#4ea8de', '#1d3557'], // 3 Sapphire Box Chocolate Frog
    ['#c77dff', '#7209b7'], // 4 Purple-Leaf Mandrake
    ['#d4a373', '#6f4e37'], // 5 Monster Book of Monsters
  ],
};

/**
 * Full-cell 3D Playrix Color-Coded Monarch Butterfly (matched with pieces of the same color!).
 */
export function drawColorButterfly3D(ctx, gameId, colorIdx, size, timeSec) {
  const [lightHex, darkHex] = (COLOR_HEX_SETS[gameId] || COLOR_HEX_SETS.gardenscapes)[colorIdx] || ['#ff85a1', '#b5179e'];
  const flap = 0.66 + Math.abs(Math.sin(timeSec * 9.5 + colorIdx)) * 0.34;
  const r = size * 0.42;

  ctx.save();
  ctx.rotate(Math.sin(timeSec * 3.2 + colorIdx) * 0.08);
  ctx.scale(flap, 1);

  for (const dir of [-1, 1]) {
    // Upper forewing
    const wg = ctx.createRadialGradient(dir * r * 0.3, -r * 0.25, 2, dir * r * 0.45, -r * 0.2, r * 0.85);
    wg.addColorStop(0, lightHex);
    wg.addColorStop(0.75, darkHex);
    wg.addColorStop(1, '#241623');
    ctx.fillStyle = wg;
    ctx.strokeStyle = '#241623';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(dir * r * 0.48, -r * 0.22, r * 0.52, r * 0.42, dir * -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Lower hindwing
    ctx.beginPath();
    ctx.ellipse(dir * r * 0.38, r * 0.32, r * 0.38, r * 0.34, dir * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Monarch wing spots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.beginPath();
    ctx.arc(dir * r * 0.62, -r * 0.32, r * 0.11, 0, Math.PI * 2);
    ctx.arc(dir * r * 0.44, r * 0.36, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  // Velvet body & antennae
  ctx.fillStyle = '#2b1d28';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.12, r * 0.56, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#2b1d28';
  ctx.lineWidth = 1.8;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.48);
    ctx.quadraticCurveTo(dir * r * 0.22, -r * 0.82, dir * r * 0.34, -r * 0.76);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Full-cell 3D Playrix Color-Coded Twin-Bell Enamel Alarm Clock with bold countdown dial!
 */
export function drawAlarmClock3D(ctx, gameId, colorIdx, fuse, size, timeSec) {
  const [lightHex, darkHex] = (COLOR_HEX_SETS[gameId] || COLOR_HEX_SETS.homescapes)[colorIdx] || ['#4fc3f7', '#0277bd'];
  const urgent = fuse <= 3;
  const shake = urgent ? Math.sin(timeSec * 34) * 2.6 : 0;
  const r = size * 0.39;

  ctx.save();
  ctx.translate(shake, size * 0.03);

  // Brass feet
  ctx.strokeStyle = '#ca6702';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(dir * r * 0.42, r * 0.62);
    ctx.lineTo(dir * r * 0.64, r * 0.92);
    ctx.stroke();
  }

  // Twin golden bells + top hammer
  for (const dir of [-1, 1]) {
    const bg = ctx.createLinearGradient(dir * r * 0.6, -r * 1.05, dir * r * 0.6, -r * 0.55);
    bg.addColorStop(0, '#fff3b0');
    bg.addColorStop(1, '#e09f3e');
    ctx.fillStyle = bg;
    ctx.strokeStyle = '#7f4f24';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(dir * r * 0.58, -r * 0.68, r * 0.32, Math.PI * 0.95, Math.PI * 2.05);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-2, -r * 1.04, 4, r * 0.24);

  // Colored 3D Enamel Casing (shows matchable piece color!)
  const cg = ctx.createRadialGradient(-r * 0.25, -r * 0.25, 2, 0, 0, r * 1.05);
  cg.addColorStop(0, lightHex);
  cg.addColorStop(1, darkHex);
  ctx.fillStyle = cg;
  ctx.strokeStyle = urgent ? '#ff4d6d' : '#ffffff';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Ivory Clock Dial Face
  ctx.fillStyle = urgent ? '#fff0f3' : '#fffdf7';
  ctx.strokeStyle = '#d4a373';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Bold Countdown Number
  ctx.fillStyle = urgent ? '#d90429' : '#1b263b';
  ctx.font = `900 ${Math.round(r * 0.92)}px Fredoka, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(fuse), 0, 1);
  ctx.restore();
}

/**
 * Crisp glowing bidirectional Playrix Rocket chevrons so Row vs Column is unmistakable!
 */
export function drawRocketDirectionalChevrons(ctx, isHorizontal, size, timeSec) {
  const offset = size * 0.37 + Math.sin(timeSec * 8) * 1.8;
  ctx.save();
  ctx.fillStyle = '#ffd166';
  ctx.strokeStyle = '#5c3317';
  ctx.lineWidth = 1.6;

  for (const dir of [-1, 1]) {
    ctx.save();
    if (isHorizontal) {
      ctx.translate(dir * offset, 0);
      ctx.scale(dir, 1);
    } else {
      ctx.translate(0, dir * offset);
      ctx.rotate((dir * Math.PI) / 2);
    }
    ctx.beginPath();
    ctx.moveTo(5.5, 0);
    ctx.lineTo(-2.5, -5.2);
    ctx.lineTo(-2.5, 5.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

export function drawFoamOrHoneyOverlay(ctx, gameId, cx, cy, size, timeSec) {
  ctx.save();
  if (gameId === 'homescapes') {
    const bubbles = [[-0.2, -0.18, 0.22], [0.18, -0.14, 0.2], [-0.14, 0.18, 0.2], [0.16, 0.16, 0.23], [0, 0, 0.25]];
    for (const [bx, by, br] of bubbles) {
      ctx.fillStyle = 'rgba(232, 204, 255, 0.82)';
      ctx.strokeStyle = '#9d4edd';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.arc(cx + bx * size, cy + by * size + Math.sin(timeSec * 3 + bx * 8), br * size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = 'rgba(245, 159, 0, 0.62)';
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.2;
    roundRect(ctx, cx - size * 0.43, cy - size * 0.43, size * 0.86, size * 0.86, 12);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function drawChainOrVineOverlay(ctx, gameId, cx, cy, size, hp) {
  const half = size * 0.41;
  ctx.save();
  ctx.strokeStyle = gameId === 'homescapes' ? '#ced4da' : '#2d6a4f';
  ctx.lineWidth = hp >= 2 ? 5.5 : 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - half, cy - half);
  ctx.lineTo(cx + half, cy + half);
  ctx.moveTo(cx + half, cy - half);
  ctx.lineTo(cx - half, cy + half);
  ctx.stroke();
  ctx.fillStyle = gameId === 'homescapes' ? '#ffd166' : '#ff758f';
  ctx.beginPath();
  ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}


