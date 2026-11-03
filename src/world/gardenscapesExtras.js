/**
 * Hogwarts Grounds 2.5D Interactive World Extras:
 * - Atmosphere & Weather Rendering (Day / Moonlight Night / Hogwarts Christmas Snow)
 * - Wizard Walking & Reparo Wand Spell Beam Cutscene on Relic Renovation
 * - Tappable Wizard & Niffler Reactions
 * - Postcard PNG Snapshot Exporter (for own or visited Friend's Garden!)
 */

import { haptics } from '../utils/haptics.js';
import { sound } from '../utils/sound.js';

export const WEATHER_MODES = [
  { id: 'day', icon: '☀️', label: 'Ngày Nắng' },
  { id: 'night', icon: '🌙', label: 'Đêm Trăng' },
  { id: 'snow', icon: '❄️', label: 'Tuyết Rơi' },
];

const WIZARD_TAP_LINES = [
  '⚡ Lumos! Đạt chuỗi 10 thắng liên tiếp để triệu hồi Siêu Thần Hộ Mệnh quét 2 màu nhé!',
  '🌿 Nhớ ghé Hội Nhà Hogwarts xin Tim ❤️ và thăm Khuôn Viên của bạn bè nha!',
  '🐚 Mẹo nhỏ: Vỏ Sò Phép chỉ vỡ khi hé mở ngọc trai — canh đúng nhịp lượt đi nhé!',
  '🏆 Mỗi bậc Tinh Luyện Khuôn Viên giúp Nhà của bạn vươn lên dẫn đầu Cúp Nhà!',
];

const CASTLE_WIZARD_TAP_LINES = [
  '⏳ Đạt chuỗi 10 thắng liên tiếp để kích hoạt Siêu Xoay Thời Gian quét sạch 2 màu cùng lúc!',
  '✉️ Ghép ô vuông 2×2 tạo Thư Sấm Howler — nó tự bay thẳng tới mục tiêu khó nhất trong Lâu Đài!',
  '🏰 Mở Hội Nhà Hogwarts để trò chuyện, xin Tim ❤️ và Độn Thổ sang thăm Lâu Đài 2.5D của bạn bè!',
  '👑 Hoàn tất 108 hạng mục qua 12 Chương để Thăng Cấp Tinh Luyện Lâu Đài và đua Cúp 4 Nhà Hogwarts!',
];

export function nextWeatherMode(current = 'day') {
  const idx = WEATHER_MODES.findIndex((m) => m.id === current);
  return WEATHER_MODES[(idx + 1) % WEATHER_MODES.length];
}

export function drawWeatherAtmosphere(ctx, w, h, sc, timeSec, weather = 'day') {
  if (!weather || weather === 'day') return;

  ctx.save();
  if (weather === 'night') {
    const nightGrad = ctx.createLinearGradient(0, 0, 0, h);
    nightGrad.addColorStop(0, 'rgba(8, 15, 42, 0.44)');
    nightGrad.addColorStop(0.55, 'rgba(13, 27, 58, 0.30)');
    nightGrad.addColorStop(1, 'rgba(6, 18, 28, 0.38)');
    ctx.fillStyle = nightGrad;
    ctx.fillRect(0, 0, w, h);

    // Silver Full Moon glow in upper-right sky
    const mx = w * 0.84;
    const my = h * 0.16;
    const mGlow = ctx.createRadialGradient(mx, my, 4 * sc, mx, my, 58 * sc);
    mGlow.addColorStop(0, 'rgba(255, 250, 220, 0.85)');
    mGlow.addColorStop(0.35, 'rgba(180, 215, 255, 0.28)');
    mGlow.addColorStop(1, 'rgba(180, 215, 255, 0)');
    ctx.fillStyle = mGlow;
    ctx.beginPath();
    ctx.arc(mx, my, 58 * sc, 0, Math.PI * 2);
    ctx.fill();

    // Floating Lumos fireflies
    for (let i = 0; i < 26; i++) {
      const fx = ((i * 137.5 + Math.sin(timeSec * 0.7 + i) * 38) % w + w) % w;
      const fy = ((i * 89.3 + Math.cos(timeSec * 0.9 + i * 1.3) * 26) % (h * 0.82)) + h * 0.1;
      const alpha = 0.35 + 0.55 * Math.abs(Math.sin(timeSec * 2.4 + i * 1.7));
      ctx.fillStyle = i % 3 === 0 ? `rgba(114, 239, 221, ${alpha})` : `rgba(255, 225, 120, ${alpha})`;
      ctx.beginPath();
      ctx.arc(fx, fy, (2.1 + (i % 3) * 0.9) * sc, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (weather === 'snow') {
    const snowTint = ctx.createLinearGradient(0, 0, 0, h);
    snowTint.addColorStop(0, 'rgba(210, 235, 255, 0.22)');
    snowTint.addColorStop(1, 'rgba(185, 220, 250, 0.10)');
    ctx.fillStyle = snowTint;
    ctx.fillRect(0, 0, w, h);

    // 54 gentle drifting Hogwarts snowflakes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    for (let i = 0; i < 54; i++) {
      const speed = 26 + (i % 5) * 11;
      const drift = Math.sin(timeSec * 1.3 + i * 0.8) * 24;
      const sx = (((i * 97.7 + drift) % w) + w) % w;
      const sy = ((i * 61.3 + timeSec * speed) % (h + 20)) - 10;
      const rad = (1.6 + (i % 4) * 0.85) * Math.max(0.75, sc * 0.85);
      ctx.globalAlpha = 0.55 + (i % 4) * 0.11;
      ctx.beginPath();
      ctx.arc(sx, sy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawReparoSpellBeam(ctx, spell, fromPt, sc, timeSec) {
  if (!spell) return;
  const { tx, ty, t, duration } = spell;
  const p = Math.min(1, t / duration);
  const fade = Math.sin(p * Math.PI);

  const sx = fromPt.x - 10 * sc;
  const sy = fromPt.y - 44 * sc;
  const cx = (sx + tx) * 0.5;
  const cy = Math.min(sy, ty) - 70 * sc;

  ctx.save();
  ctx.globalAlpha = Math.max(0, fade);
  ctx.lineCap = 'round';

  // Outer emerald-gold Reparo aura beam
  ctx.shadowColor = '#72efdd';
  ctx.shadowBlur = 16;
  ctx.strokeStyle = '#38b87c';
  ctx.lineWidth = 7 * sc;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(cx, cy, tx, ty);
  ctx.stroke();

  // Inner bright golden core
  ctx.strokeStyle = '#fff3b0';
  ctx.lineWidth = 2.8 * sc;
  ctx.stroke();

  // Impact spell ring at target relic
  const ringR = (18 + p * 44) * sc;
  ctx.strokeStyle = '#ffea9c';
  ctx.lineWidth = 2.5 * sc;
  ctx.beginPath();
  ctx.ellipse(tx, ty, ringR, ringR * 0.52, timeSec * 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function tryHandleActorTap(renderer, clientX, clientY, radiusScale = 1) {
  if (!renderer._lastActors) return false;
  const rect = renderer.canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const { austin, pet, scale } = renderer._lastActors;

  if (austin && Math.hypot(x - austin.x, y - (austin.y - 32 * scale)) <= 44 * scale * radiusScale) {
    haptics.tap();
    sound.sfxClick();
    const lines = renderer.isCastle ? CASTLE_WIZARD_TAP_LINES : WIZARD_TAP_LINES;
    renderer._tapLineIdx = ((renderer._tapLineIdx || 0) + 1) % lines.length;
    renderer.austinLine = lines[renderer._tapLineIdx];
    renderer.austinTimer = 4.0;
    renderer.triggerStylePreviewPop(null, austin.x, austin.y - 36 * scale);
    return true;
  }

  if (pet && Math.hypot(x - pet.x, y - (pet.y - 18 * scale)) <= 38 * scale * radiusScale) {
    haptics.tap();
    sound.sfxCoin();
    renderer.petHop = 1.0;
    renderer.austinLine = renderer.isCastle
      ? `🦉 ${renderer.petName} vỗ cánh tuyết trắng mang thư sáp đỏ Hogwarts chào bạn kìa!`
      : `🐾 ${renderer.petName} hớn hở tung đồng xu Galleon lấp lánh chào bạn kìa!`;
    renderer.austinTimer = 4.0;
    renderer.triggerStylePreviewPop(null, pet.x, pet.y - 20 * scale);
    return true;
  }
  return false;
}

export function computeWanderingPetWorld3D(baseWorld, hotspots, timeSec) {
  const doneSpots = (hotspots || []).filter((h) => h.completed && typeof h.wx === 'number' && (h.wy || 0) < 40);
  const waypoints = [
    baseWorld,
    ...doneSpots.slice(0, 7).map((h) => ({ x: h.wx + 28, z: h.wz + 26 })),
  ];
  let wx = baseWorld.x;
  let wz = baseWorld.z;
  if (waypoints.length > 1) {
    const legDur = 5.5;
    const total = waypoints.length;
    const cyc = (timeSec / legDur) % total;
    const idx = Math.floor(cyc);
    const frac = cyc - idx;
    const moveT = frac < 0.35 ? 0 : 0.5 - 0.5 * Math.cos(((frac - 0.35) / 0.65) * Math.PI);
    const a = waypoints[idx];
    const b = waypoints[(idx + 1) % total];
    wx = a.x + (b.x - a.x) * moveT;
    wz = a.z + (b.z - a.z) * moveT;
  }
  return {
    x: wx + Math.sin(timeSec * 1.35) * 11,
    z: wz + Math.cos(timeSec * 2.1) * 8,
  };
}

export function computeWanderingPetPos(basePt, hotspots, sc, timeSec, petHop = 0) {
  const doneSpots = (hotspots || []).filter((h) => h.completed);
  const waypoints = [
    basePt,
    ...doneSpots.slice(0, 7).map((h) => ({ x: h.x + 20 * sc, y: h.y + 12 * sc })),
  ];
  let wx = basePt.x;
  let wy = basePt.y;
  if (waypoints.length > 1) {
    const legDur = 5.5;
    const total = waypoints.length;
    const cyc = (timeSec / legDur) % total;
    const idx = Math.floor(cyc);
    const frac = cyc - idx;
    // Pause briefly at each landmark (0..0.35), then glide smoothly (0.35..1.0)
    const moveT = frac < 0.35 ? 0 : 0.5 - 0.5 * Math.cos(((frac - 0.35) / 0.65) * Math.PI);
    const a = waypoints[idx];
    const b = waypoints[(idx + 1) % total];
    wx = a.x + (b.x - a.x) * moveT;
    wy = a.y + (b.y - a.y) * moveT - Math.sin(moveT * Math.PI) * 14 * sc;
  }
  const figX = Math.sin(timeSec * 1.35) * 9 * sc;
  const figY = Math.sin(timeSec * 2.7) * 3.5 * sc - Math.sin(petHop * Math.PI) * 24 * sc;
  return { x: wx + figX, y: wy + figY };
}

export function spawnCelebrationFireworks(renderer) {
  if (!renderer) return;
  const w = renderer.viewW || 800;
  const h = renderer.viewH || 520;
  const palette = ['#ffd166', '#ff4d6d', '#72efdd', '#ff9f1c', '#c77dff', '#ffffff'];
  for (const [rx, ry] of [[0.26, 0.24], [0.5, 0.19], [0.74, 0.25]]) {
    const cx = w * rx;
    const cy = h * ry;
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2 + Math.random() * 0.18;
      const spd = 65 + Math.random() * 145;
      renderer.sparkles.push({
        x: cx,
        y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 36,
        life: 1.15 + Math.random() * 0.45,
        maxLife: 1.6,
        color: palette[(i + Math.floor(rx * 10)) % palette.length],
      });
    }
  }
}

export function exportWorldSnapshotPng(canvas, fileLabel = 'khuon-vien-hogwarts') {
  if (!canvas) return;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileLabel}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }, 'image/png');
}

export function shouldShowHotspotPin(renderer, hs, isPreview) {
  return !hs.completed || Boolean(renderer.designMode) || Boolean(isPreview);
}

export function updateWorldHoldRing(renderer, clientX, clientY, progress, pointerType = 'mouse') {
  if (!progress || progress <= 0 || renderer.readOnlyVisitor) {
    renderer.holdRing = null;
    return;
  }
  const hs = renderer._findHotspotAt(clientX, clientY, pointerType);
  if (!hs || !hs.completed) {
    renderer.holdRing = null;
    return;
  }
  renderer.holdRing = { x: hs.x, y: hs.y - 16, progress };
}

export function handleWorldLongPress(renderer, clientX, clientY, pointerType = 'mouse') {
  renderer.holdRing = null;
  if (renderer.readOnlyVisitor) return false;
  const hs = renderer._findHotspotAt(clientX, clientY, pointerType);
  if (!hs) return false;
  sound.sfxClick();
  haptics.tap();
  renderer.triggerStylePreviewPop?.(hs.task.slot, hs.x, hs.y);
  renderer.onSlotClick(hs.task, hs.completed);
  return true;
}

export function handleWorldHotspotTap(renderer, hs) {
  if (!hs.completed || renderer.designMode || renderer.previewOverride) {
    renderer.onSlotClick(hs.task, hs.completed);
    return;
  }
  sound.sfxClick();
  renderer.triggerStylePreviewPop?.(hs.task.slot, hs.x, hs.y);
  renderer.austinLine = '🎨 Nhấn giữ 0.4s vào cổ vật (hoặc bật nút 🎨 góc phải) để đổi 3 phong cách nhé!';
}

export function drawLongPressRing(ctx, holdRing, sc = 1) {
  if (!holdRing || holdRing.progress <= 0) return;
  const r = Math.max(24, 30 * sc);
  ctx.save();
  ctx.beginPath();
  ctx.arc(holdRing.x, holdRing.y, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(16, 28, 20, 0.55)';
  ctx.fill();
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(holdRing.x, holdRing.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * holdRing.progress);
  ctx.strokeStyle = '#ffd166';
  ctx.lineCap = 'round';
  ctx.lineWidth = 5.5;
  ctx.shadowColor = '#ffd166';
  ctx.shadowBlur = 10;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.font = `${Math.round(18 * sc)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎨', holdRing.x, holdRing.y + 1);
  ctx.restore();
}

