/**
 * Interactive 2D Panning Hogwarts Estate World Map (`🗺️ Bản Đồ` tab in Tablet Modal)
 * Visualizes all 12 Iconic Chapters / 12 Zones (108 customization spots per game) connected by
 * golden Marauder trails on a 2D scrollable canvas (`scroll-axis-lock: none` + `overscroll-behavior: none`
 * + conditional `wheel`/`pointermove` fallback updating `scrollLeft`/`scrollTop`).
 */

import { escapeHtml } from '../utils/storage.js';
import { sprites } from '../utils/spriteLoader.js';

const ATLAS_COORDS = [
  [125, 110],
  [335, 95],
  [545, 118],
  [765, 96],
  [955, 145],
  [895, 315],
  [685, 295],
  [465, 318],
  [245, 296],
  [135, 485],
  [445, 515],
  [815, 505],
];

export function buildInteractiveWorldAtlasHtml(app, areas) {
  const isHome = app.gameId === 'homescapes';
  const scenePrefix = isHome ? 'home_room_' : 'garden_zone_';
  const maxUnlocked = app.getMaxUnlockedArea?.() ?? areas.length - 1;
  const totalSpots = areas.reduce((sum, a) => sum + a.tasks.length, 0);
  const totalDone = areas.reduce(
    (sum, a) => sum + a.tasks.filter((t) => app.save.completedTasks[t.id] !== undefined).length,
    0
  );

  const pathPoints = ATLAS_COORDS.slice(0, areas.length)
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`)
    .join(' ');

  const nodesHtml = areas
    .map((area, idx) => {
      const [cx, cy] = ATLAS_COORDS[idx] || [140 + idx * 80, 300];
      const done = area.tasks.filter((t) => app.save.completedTasks[t.id] !== undefined).length;
      const pct = Math.round((done / area.tasks.length) * 100);
      const isCurrent = app.save.currentArea === idx;
      const isLocked = idx > maxUnlocked;
      const sceneIdx = area.sceneIndex ?? idx % 4;
      const imgUrl = sprites.url(area.sceneKey || `${scenePrefix}${sceneIdx}`) || sprites.url(`${scenePrefix}${idx % 4}`);
      const badge = isCurrent ? '📍 Đang ở' : isLocked ? '🔒 Khóa' : done === area.tasks.length ? '✅ 9/9' : `${done}/${area.tasks.length} ⭐`;

      return `
        <button type="button"
          class="atlas-node ${isCurrent ? 'is-current' : ''} ${isLocked ? 'is-locked' : ''}"
          style="left:${cx}px; top:${cy}px;"
          data-jump-area="${idx}"
          ${isLocked ? 'aria-disabled="true"' : ''}>
          <img class="atlas-node-thumb" src="${imgUrl}" alt="${escapeHtml(area.name)}" width="128" height="72" loading="lazy" decoding="async" />
          <div class="atlas-node-title">${escapeHtml(area.dayLabel)}: ${escapeHtml(area.name)}</div>
          <div class="atlas-node-meta">
            <span>${badge}</span>
            <span>${pct}%</span>
          </div>
        </button>
      `;
    })
    .join('');

  const quickListHtml = areas
    .map((area, idx) => {
      const done = area.tasks.filter((t) => app.save.completedTasks[t.id] !== undefined).length;
      const pct = Math.round((done / area.tasks.length) * 100);
      const isCurrent = app.save.currentArea === idx;
      const isLocked = idx > maxUnlocked;
      const sceneIdx = area.sceneIndex ?? idx % 4;
      const imgUrl = sprites.url(area.sceneKey || `${scenePrefix}${sceneIdx}`) || sprites.url(`${scenePrefix}${idx % 4}`);
      return `
        <div class="task-card ${isCurrent ? 'completed' : ''}" style="gap:10px;${isLocked ? ' opacity:0.64;' : ''}">
          <img src="${imgUrl}" alt="${escapeHtml(area.name)}" width="88" height="54" loading="lazy" decoding="async" style="width:88px; height:54px; object-fit:cover; border-radius:10px; border:2px solid #e09f3e; flex-shrink:0;${isLocked ? ' filter:grayscale(0.85);' : ''}" />
          <div style="flex:1;">
            <div style="font-weight:800;">${escapeHtml(area.dayLabel)}: ${escapeHtml(area.name)}</div>
            <div style="font-size:0.78rem; color:#5c4738;">Trang trí: ${done}/${area.tasks.length} (${pct}%)</div>
          </div>
          <button type="button" class="btn-playrix ${isCurrent ? 'btn-purple' : ''}" data-jump-area="${idx}" ${isLocked ? 'aria-disabled="true"' : ''}>
            ${isCurrent ? 'Đang Ở Đây' : isLocked ? '🔒 Chưa Mở' : 'Tới Ngay ▶'}
          </button>
        </div>
      `;
    })
    .join('');

  return `
    <div class="hogwarts-atlas-hint">
      <span>🗺️ Đại Bản Đồ ${areas.length} Khu Vực (${totalDone}/${totalSpots} chỗ trang trí)</span>
      <span style="font-weight:700; color:#7f4f24;">✋ Kéo 2 chiều hoặc chạm địa danh để Độn Thổ</span>
    </div>
    <div class="hogwarts-atlas-viewport" id="hogwarts-atlas-viewport" tabindex="0" role="region"
      aria-label="Đại bản đồ 12 khu vực Hogwarts — Kéo tự do 2 chiều hoặc dùng phím mũi tên để di chuyển">
      <div class="hogwarts-atlas-surface">
        <svg class="hogwarts-atlas-svg" viewBox="0 0 1080 620" aria-hidden="true">
          <path d="${pathPoints}" fill="none" stroke="rgba(255, 209, 102, 0.32)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />
          <path d="${pathPoints}" fill="none" stroke="#ffd166" stroke-width="3.2" stroke-dasharray="10 9" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        ${nodesHtml}
      </div>
    </div>
    <div class="task-list">${quickListHtml}</div>
  `;
}

export function bindInteractiveWorldAtlas(rootEl, currentAreaIdx = 0) {
  const viewport = rootEl.querySelector('#hogwarts-atlas-viewport');
  if (!viewport) return;

  // Center initial scroll position around active landmark
  const [targetX, targetY] = ATLAS_COORDS[currentAreaIdx] || ATLAS_COORDS[0];
  requestAnimationFrame(() => {
    viewport.scrollLeft = Math.max(0, targetX - viewport.clientWidth * 0.5);
    viewport.scrollTop = Math.max(0, targetY - viewport.clientHeight * 0.5);
  });

  // Conditional 2D panning fallback when native CSS `scroll-axis-lock: none` is unsupported
  if (typeof CSS !== 'undefined' && !CSS.supports('scroll-axis-lock', 'none')) {
    let dragState = null;

    viewport.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        viewport.scrollLeft += e.deltaX;
        viewport.scrollTop += e.deltaY;
      },
      { passive: false }
    );

    viewport.addEventListener('pointerdown', (e) => {
      const rect = viewport.getBoundingClientRect();
      if (
        !e.isPrimary ||
        e.button !== 0 ||
        e.clientX - rect.left - viewport.clientLeft >= viewport.clientWidth ||
        e.clientY - rect.top - viewport.clientTop >= viewport.clientHeight
      ) {
        return;
      }
      dragState = { x: e.clientX, y: e.clientY, moved: 0, captured: false, pointerId: e.pointerId };
    });

    viewport.addEventListener('pointermove', (e) => {
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      const dx = e.clientX - dragState.x;
      const dy = e.clientY - dragState.y;
      dragState.moved += Math.hypot(dx, dy);
      if (!dragState.captured && dragState.moved > 6) {
        dragState.captured = true;
        viewport.classList.add('is-dragging');
        try {
          viewport.setPointerCapture(e.pointerId);
        } catch {
          // Synthetic pointer events safe fallback
        }
      }
      if (dragState.captured) {
        viewport.scrollLeft -= dx;
        viewport.scrollTop -= dy;
      }
      dragState.x = e.clientX;
      dragState.y = e.clientY;
    });

    const endPan = () => {
      dragState = null;
      viewport.classList.remove('is-dragging');
    };
    viewport.addEventListener('pointerup', endPan);
    viewport.addEventListener('pointercancel', endPan);
    viewport.addEventListener('lostpointercapture', endPan);
  }
}
