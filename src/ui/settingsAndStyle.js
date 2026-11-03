/**
 * Playrix 3-Style Live Customization Bar (with Area 6/6 Cutscene + Fireworks),
 * Master Volume Range Slider (`slider`), Colorblind Aid & Settings/Pause Modal Helpers.
 */

import { countUnclaimedLiveOps, onTournamentLevelFail } from '../data/liveOpsDefs.js';
import { countUnsolvedUnlockedPins } from '../data/pinPuzzles.js';
import { closeModal, openModal } from '../utils/dialogHelper.js';
import { haptics } from '../utils/haptics.js';
import { sound } from '../utils/sound.js';
import {
  escapeHtml,
  exportSaveJson,
  importSaveJson,
  refreshLives,
  resetGameSave,
  sanitizePlainText,
  savePrefs,
} from '../utils/storage.js';
import { spawnCelebrationFireworks } from '../world/gardenscapesExtras.js';
import { bindGraphics3DToggle, renderGraphics3DToggleHtml } from '../world3d/world3dPrefsUi.js';
import { getGameAreas } from './modals.js';
import { bindSortingHatSelector, renderSortingHatSelectorHtml } from './houseSwitcherUi.js';
import { syncOnlineProfile } from './onlineHubModal.js';
import { dismissLevelTour } from './tutorialTour.js';

function bindVolumeSlider(root, app) {
  const slider = root.querySelector('#rng-master-vol');
  const valEl = root.querySelector('#vol-pct-val');
  if (!slider) return;
  const syncSlider = () => {
    const v = Math.max(0, Math.min(100, Math.round(Number(slider.value) || 0)));
    slider.style.setProperty('--attr-min', slider.min || '0');
    slider.style.setProperty('--attr-max', slider.max || '100');
    slider.style.setProperty('--control-value', String(v));
    slider.setAttribute('aria-valuetext', `${v}% âm lượng`);
    if (valEl) valEl.textContent = `${v}%`;
  };
  syncSlider();
  slider.addEventListener('input', () => {
    syncSlider();
    app.prefs.volume = Math.max(0, Math.min(100, Math.round(Number(slider.value) || 0)));
    savePrefs(app.prefs);
    sound.setPrefs(app.prefs);
  });
}

function renderVolumeAndColorblindControls(app, idPrefix = '') {
  const vol = app.prefs.volume ?? 80;
  return `
    ${renderGraphics3DToggleHtml(app, idPrefix)}
    <div class="task-card" style="flex-direction:column; align-items:stretch; gap:6px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <label for="rng-master-vol" style="font-weight:800; cursor:pointer;">🎚️ Âm Lượng Tổng</label>
        <strong id="vol-pct-val" style="color:#b45309;">${vol}%</strong>
      </div>
      <input type="range" class="scapes-slider" id="rng-master-vol" min="0" max="100" step="5" value="${vol}" />
    </div>
    <div class="task-card">
      <div>
        <strong>👁️ Ký Hiệu Phân Biệt 6 Màu</strong>
        <div style="font-size:0.75rem; color:#5c4738;">Hiện huy hiệu hình học (★ ◆ ▲ ● ✚ ⬟) hỗ trợ mù màu trên bàn Match-3</div>
      </div>
      <button type="button" class="btn-playrix ${app.prefs.colorblind ? 'btn-gold' : 'btn-purple'}" id="${idPrefix}tog-colorblind">
        ${app.prefs.colorblind ? 'Đang Bật' : 'Đang Tắt'}
      </button>
    </div>`;
}

export function renderStylePickerBar(app) {
  const bar = app.styleBarEl;
  if (!app.pendingDesign) {
    bar.classList.add('hidden');
    return;
  }

  const { task, isRestyle, styleIndex } = app.pendingDesign;
  const renderer = app.getActiveWorldRenderer();
  renderer.setState({
    previewOverride: { taskId: task.id, styleIndex },
    austinLine: `Đang thử kiểu: "${task.styles[styleIndex].name}" — đẹp quá!`,
  });
  renderer.focusSlot?.(task.slot, true);

  bar.classList.remove('hidden');
  bar.innerHTML = `
    <div class="style-picker-head">
      <div class="style-picker-title">${task.icon} ${task.title}:</div>
      <div class="style-picker-actions">
        <button type="button" class="btn-playrix" id="btn-confirm-style">
          ✓ ${isRestyle ? 'Lưu Kiểu' : `Xác Nhận (-${task.cost} ⭐)`}
        </button>
        <button type="button" class="btn-playrix btn-red" id="btn-cancel-style" aria-label="Hủy chọn kiểu">✕</button>
      </div>
    </div>
    <div class="style-picker-grid" role="radiogroup" aria-label="Chọn phong cách trang trí">
      ${task.styles
        .map(
          (st, idx) => `
        <button type="button" role="radio" aria-checked="${idx === styleIndex}" class="style-option-btn ${idx === styleIndex ? 'active' : ''}" data-pick-style="${idx}">
          <span class="style-swatch" style="background:linear-gradient(135deg, ${st.primary} 55%, ${st.secondary} 55%);"></span>
          <span class="style-option-name">${st.name}</span>
        </button>`
        )
        .join('')}
    </div>
  `;

  for (const btn of bar.querySelectorAll('[data-pick-style]')) {
    btn.addEventListener('click', () => {
      app.pendingDesign.styleIndex = Number(btn.getAttribute('data-pick-style'));
      sound.sfxClick();
      renderer.triggerStylePreviewPop?.(task.slot);
      renderStylePickerBar(app);
    });
  }

  bar.querySelector('#btn-confirm-style')?.addEventListener('click', () => {
    if (!isRestyle) {
      app.save.stars = Math.max(0, app.save.stars - task.cost);
    }
    app.save.completedTasks[task.id] = app.pendingDesign.styleIndex;
    app.pendingDesign = null;
    bar.classList.add('hidden');

    const areas = getGameAreas(app.gameId, app.save.masteryTier, app.save.house);
    const curArea = areas[app.save.currentArea];
    const justFinishedArea = !isRestyle && curArea?.tasks.every((t) => app.save.completedTasks[t.id] !== undefined);
    const rawCut = justFinishedArea ? curArea.cutscene : null;
    const cutText = typeof rawCut === 'string'
      ? `🎆 ${rawCut}`
      : rawCut?.line1 ? `🎆 ${rawCut.speaker1}: "${rawCut.line1}" — ${rawCut.speaker2}: "${rawCut.line2}"` : null;

    sound.sfxRenovate();
    renderer.setState({
      completedTasks: app.save.completedTasks,
      previewOverride: null,
      austinLine: cutText || task.afterDialogue,
    });
    renderer.triggerRenovationBurst(task.slot);
    if (justFinishedArea) {
      spawnCelebrationFireworks(renderer);
      sound.sfxRainbow();
      app.toast(cutText || `🎆 Hoàn thành trọn vẹn ${curArea.tasks.length}/${curArea.tasks.length} "${curArea.name}" — Mở Bản Đồ để nhận Rương Khu Vực!`);
    }
    app.persistAndSyncHud();
    syncOnlineProfile(app);
  });

  bar.querySelector('#btn-cancel-style')?.addEventListener('click', () => {
    app.pendingDesign = null;
    bar.classList.add('hidden');
    renderer.clearSlotFocus?.();
    renderer.setState({ previewOverride: null });
    sound.sfxClick();
  });
}

export function openSettingsModal(app) {
  const dialog = document.getElementById('dialog-settings');
  const titleEl = document.getElementById('settings-title');
  const isGarden = app.gameId === 'gardenscapes';
  if (titleEl) titleEl.textContent = '⚙️ Cài Đặt Phép Thuật';
  const body = document.getElementById('settings-body');
  body.innerHTML = `
    ${renderSortingHatSelectorHtml(app.save.house)}
    ${renderVolumeAndColorblindControls(app, '')}
    <div class="task-card">
      <strong>🎵 Nhạc Nền Đa Âm &amp; Thời Tiết (BGM)</strong>
      <button type="button" class="btn-playrix ${app.prefs.bgm ? '' : 'btn-red'}" id="tog-bgm" autofocus>
        ${app.prefs.bgm ? 'Đang Bật' : 'Đang Tắt'}
      </button>
    </div>
    <div class="task-card">
      <strong>🔊 Hiệu Ứng Âm Thanh (SFX)</strong>
      <button type="button" class="btn-playrix ${app.prefs.sfx ? '' : 'btn-red'}" id="tog-sfx">
        ${app.prefs.sfx ? 'Đang Bật' : 'Đang Tắt'}
      </button>
    </div>
    <div class="task-card">
      <strong>📳 Rung Xúc Giác (Haptics)</strong>
      <button type="button" class="btn-playrix ${app.prefs.haptics !== false ? '' : 'btn-red'}" id="tog-haptics">
        ${app.prefs.haptics !== false ? 'Đang Bật' : 'Đang Tắt'}
      </button>
    </div>
    <div class="task-card">
      <div>
        <strong>🔥 Chế Độ Ác Mộng Thần Sáng (+2.5 Bậc)</strong>
        <div style="font-size:0.76rem; color:#5c4738;">Giảm 15% lượt, tăng 6 màu &amp; bùa nổ — nhận x2 💰 Galleon &amp; x2 XP Vé Mùa!</div>
      </div>
      <button type="button" class="btn-playrix ${app.prefs.nightmare ? 'btn-gold' : 'btn-purple'}" id="tog-nightmare">
        ${app.prefs.nightmare ? '🔥 Ác Mộng' : '⚔️ Hardcore'}
      </button>
    </div>
    <div class="task-card">
      <label for="pet-name-input" style="font-weight:700; cursor:pointer;">🦉 Đặt Tên Bạn Đồng Hành</label>
      <div style="display:flex; gap:6px;">
        <input id="pet-name-input" type="text" maxlength="16"
          style="padding:7px 10px; border-radius:10px; border:2px solid #c69f47; width:130px; font-size:1rem; font-weight:700;" />
        <button type="button" class="btn-playrix" id="save-pet-name">Lưu</button>
      </div>
    </div>
    <div class="task-card">
      <div>
        <strong>💾 Sao Lưu &amp; Khôi Phục Tiến Trình</strong>
        <div style="font-size:0.76rem; color:#5c4738;">Hộ Chiếu Phù Thủy: <strong>${escapeHtml(app.save.playerId)}</strong></div>
      </div>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <button type="button" class="btn-playrix btn-gold" id="btn-export-save">⬇ Xuất</button>
        <label class="btn-playrix btn-purple" style="cursor:pointer; display:inline-flex; align-items:center;">
          ⬆ Nhập
          <input type="file" id="inp-import-save" accept=".json,application/json" style="display:none;" />
        </label>
      </div>
    </div>
    <div class="task-card">
      <strong>🗑️ Đặt Lại Tiến Trình (${isGarden ? 'KHUÔN VIÊN' : 'LÂU ĐÀI'})</strong>
      <button type="button" class="btn-playrix btn-red" id="btn-reset-save">Chơi Lại Từ Đầu</button>
    </div>
  `;

  bindVolumeSlider(body, app);
  bindGraphics3DToggle(body, app, '', () => openSettingsModal(app));
  bindSortingHatSelector(body, app, () => openSettingsModal(app));
  const petInputEl = body.querySelector('#pet-name-input');
  if (petInputEl) petInputEl.value = app.save.petName;

  body.querySelector('#tog-colorblind').onclick = () => {
    app.prefs.colorblind = !app.prefs.colorblind;
    savePrefs(app.prefs);
    app.m3Controller?.setColorblind(app.prefs.colorblind);
    sound.sfxClick();
    openSettingsModal(app);
  };
  body.querySelector('#tog-bgm').onclick = () => {
    app.prefs.bgm = !app.prefs.bgm;
    savePrefs(app.prefs);
    sound.setPrefs(app.prefs);
    openSettingsModal(app);
  };
  body.querySelector('#tog-sfx').onclick = () => {
    app.prefs.sfx = !app.prefs.sfx;
    savePrefs(app.prefs);
    sound.setPrefs(app.prefs);
    openSettingsModal(app);
  };
  body.querySelector('#tog-haptics').onclick = () => {
    app.prefs.haptics = app.prefs.haptics === false;
    savePrefs(app.prefs);
    haptics.setPrefs(app.prefs);
    haptics.tap();
    openSettingsModal(app);
  };
  body.querySelector('#tog-nightmare')?.addEventListener('click', () => {
    app.prefs.nightmare = !app.prefs.nightmare;
    savePrefs(app.prefs);
    sound.sfxClick();
    app._renderTopHud();
    app.toast(
      app.prefs.nightmare
        ? '🔥 Đã bật Chế Độ Ác Mộng Thần Sáng (+2.5 bậc khó · x2 Vàng & XP)!'
        : '⚔️ Đã chuyển về Chế Độ Hardcore Chiến Thuật (+1.5 bậc khó)!'
    );
    openSettingsModal(app);
  });
  body.querySelector('#save-pet-name').onclick = () => {
    const val = sanitizePlainText(petInputEl ? petInputEl.value : '', '', 16);
    if (val) {
      if (petInputEl) petInputEl.value = val;
      app.save.petName = val;
      app.persistAndSyncHud();
      if (!app.visitingGarden) app.getActiveWorldRenderer().setState({ petName: val });
      syncOnlineProfile(app);
      app.toast(`🦉 Đã đổi tên bạn đồng hành thành "${val}"!`);
    }
  };
  body.querySelector('#btn-export-save').onclick = () => {
    const blob = new Blob([exportSaveJson(app.gameId)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hogwarts-${app.gameId}-lv${app.save.level}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    app.toast('💾 Đã tải xuống tệp sao lưu tiến trình!');
  };
  body.querySelector('#inp-import-save')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      app.save = importSaveJson(app.gameId, await file.text());
      sound.sfxVictory();
      await closeModal(dialog);
      app.launchGame(app.gameId);
      app.toast(`✨ Đã khôi phục tiến trình Màn ${app.save.level}!`);
    } catch (err) {
      app.toast(`⚠️ Không thể nhập tệp: ${err.message}`);
    }
  });
  body.querySelector('#btn-reset-save').onclick = () => {
    app.save = resetGameSave(app.gameId);
    closeModal(dialog).then(() => app.launchGame(app.gameId));
  };

  openModal(dialog);
}

export function openMatch3PauseModal(app) {
  dismissLevelTour();
  const dialog = document.getElementById('dialog-settings');
  const titleEl = document.getElementById('settings-title');
  if (titleEl) titleEl.textContent = `⏸️ Tạm Dừng — Màn ${app.activePlayingLevel}`;
  const board = app.m3Controller.board;
  const willLoseLife = Boolean(board && board.hasActed && !board.allGoalsComplete());
  const body = document.getElementById('settings-body');
  body.innerHTML = `
    ${willLoseLife ? '<div class="modal-parchment-box" style="text-align:center; font-size:0.82rem; font-weight:800; color:#9e1f28;">⚠️ Bạn đã hành động trong màn — Chơi lại hoặc rời màn lúc này sẽ mất 1 ❤️, chuỗi thắng &amp; lượt Cốc Lửa!</div>' : ''}
    ${renderVolumeAndColorblindControls(app, 'm3-')}
    <div class="task-card">
      <strong>🎵 Nhạc Nền (BGM)</strong>
      <button type="button" class="btn-playrix ${app.prefs.bgm ? '' : 'btn-red'}" id="m3-tog-bgm">
        ${app.prefs.bgm ? 'Đang Bật' : 'Đang Tắt'}
      </button>
    </div>
    <div class="task-card">
      <strong>🔊 Âm Thanh Hiệu Ứng (SFX)</strong>
      <button type="button" class="btn-playrix ${app.prefs.sfx ? '' : 'btn-red'}" id="m3-tog-sfx">
        ${app.prefs.sfx ? 'Đang Bật' : 'Đang Tắt'}
      </button>
    </div>
    <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:8px;">
      <button type="button" class="btn-playrix" id="m3-resume-btn" autofocus>▶ Tiếp Tục</button>
      <button type="button" class="btn-playrix btn-gold" id="m3-restart-btn">🔄 Chơi Lại</button>
      <button type="button" class="btn-playrix btn-red" id="m3-quit-btn">
        ${app.gameId === 'homescapes' ? '🏰 Về Lâu Đài' : '🌲 Về Khuôn Viên'}
      </button>
    </div>
  `;

  bindVolumeSlider(body, app);
  bindGraphics3DToggle(body, app, 'm3-', () => openMatch3PauseModal(app));
  body.querySelector('#m3-tog-colorblind').onclick = () => {
    app.prefs.colorblind = !app.prefs.colorblind;
    savePrefs(app.prefs);
    app.m3Controller?.setColorblind(app.prefs.colorblind);
    sound.sfxClick();
    openMatch3PauseModal(app);
  };
  body.querySelector('#m3-tog-bgm').onclick = () => {
    app.prefs.bgm = !app.prefs.bgm;
    savePrefs(app.prefs);
    sound.setPrefs(app.prefs);
    openMatch3PauseModal(app);
  };
  body.querySelector('#m3-tog-sfx').onclick = () => {
    app.prefs.sfx = !app.prefs.sfx;
    savePrefs(app.prefs);
    sound.setPrefs(app.prefs);
    openMatch3PauseModal(app);
  };

  const applyMidLevelPenalty = () => {
    const lifeStatus = refreshLives(app.save);
    const curBoard = app.m3Controller.board;
    if (curBoard && curBoard.hasActed && !curBoard.allGoalsComplete()) {
      if (!lifeStatus.hasInfinite) {
        app.save.lives = Math.max(0, app.save.lives - 1);
        app.save.lastLifeTimestamp = Date.now();
      }
      app.save.winStreak = 0;
      onTournamentLevelFail(app.save);
      app.persistAndSyncHud();
    }
  };

  body.querySelector('#m3-resume-btn').onclick = () => closeModal(dialog);
  body.querySelector('#m3-restart-btn').onclick = () => {
    applyMidLevelPenalty();
    closeModal(dialog).then(() => app.enterMatch3Level(app.activePlayingLevel));
  };
  body.querySelector('#m3-quit-btn').onclick = () => {
    applyMidLevelPenalty();
    closeModal(dialog).then(() => app.enterWorldView());
  };
  openModal(dialog);
}

export function syncPlayrixWorldBadges(app, area, levelDiff) {
  const activeWorld = app.visitingGarden ? app.visitorWorld || app.gameId : app.gameId;
  const vg = app.visitingGarden;
  const activeMastery = vg
    ? (activeWorld === 'homescapes' ? vg.homeMasteryTier ?? vg.masteryTier : vg.gardenMasteryTier ?? vg.masteryTier) || 0
    : app.save.masteryTier;
  const activeHouse = vg ? vg.house : app.save.house;
  const areas = getGameAreas(activeWorld, activeMastery, activeHouse);
  const activeAreaIndex = app.visitingGarden ? app.visitorAreaIndex : app.save.currentArea;
  const vTasks = vg ? (activeWorld === 'homescapes' ? vg.castleTasks || {} : vg.completedTasks || {}) : app.save.completedTasks;
  const doneCount = area.tasks.filter((t) => vTasks[t.id] !== undefined).length;
  const affordable = area.tasks.filter((t) => app.save.completedTasks[t.id] === undefined && app.save.stars >= t.cost).length;
  const cam = app.getActiveWorldRenderer?.()?.camera;
  if (cam) document.getElementById('btn-map-overview')?.classList.toggle('is-overview', cam.zoom <= cam.minZoom + 0.05);

  const areaEl = document.getElementById('hud-area-name');
  if (areaEl) {
    areaEl.textContent = app.visitingGarden
      ? activeWorld === 'homescapes'
        ? `👀 ${vg.name} · Phòng ${activeAreaIndex + 1}/${areas.length}: ${area.name} (${doneCount}/${area.tasks.length})`
        : `👀 Vườn ${vg.name} · Khu ${activeAreaIndex + 1}/${areas.length} (${doneCount}/${area.tasks.length})`
      : `${area.dayLabel}: ${area.name} (${doneCount}/${area.tasks.length})`;
  }

  const prevBtn = document.getElementById('btn-area-prev');
  if (prevBtn) prevBtn.setAttribute('aria-disabled', String(activeAreaIndex <= 0));
  const nextBtn = document.getElementById('btn-area-next');
  const maxNav = app.visitingGarden
    ? areas.length - 1
    : Math.min(areas.length - 1, app.getMaxUnlockedArea?.() ?? areas.length - 1);
  if (nextBtn) nextBtn.setAttribute('aria-disabled', String(activeAreaIndex >= maxNav));

  const tabBadge = document.getElementById('tablet-badge');
  if (tabBadge) {
    tabBadge.textContent = String(affordable);
    tabBadge.classList.toggle('hidden', affordable <= 0 || Boolean(app.visitingGarden));
  }

  const pinBadge = document.getElementById('pin-badge');
  if (pinBadge) {
    const pCount = countUnsolvedUnlockedPins(app.gameId, app.save);
    pinBadge.textContent = String(pCount);
    pinBadge.classList.toggle('hidden', pCount <= 0 || Boolean(app.visitingGarden));
  }

  const evBadge = document.getElementById('events-badge');
  if (evBadge) {
    const evCount = countUnclaimedLiveOps(app.save);
    evBadge.textContent = String(evCount);
    evBadge.classList.toggle('hidden', evCount <= 0);
  }

  for (const el of document.querySelectorAll('.garden-only-ctrl')) el.classList.remove('hidden');

  const ctaBtn = document.getElementById('btn-open-briefing');
  if (ctaBtn) {
    ctaBtn.classList.toggle('btn-purple', levelDiff === 'hard');
    ctaBtn.classList.toggle('btn-red', levelDiff === 'super_hard');
  }
}

const HOGWARTS_CREST_SVG = `<svg class="hp-crest-svg" viewBox="0 0 32 32" aria-hidden="true"><path d="M4 4h24v12c0 8.5-12 13.5-12 13.5S4 24.5 4 16V4z" fill="#0d3b24" stroke="#ffea9c" stroke-width="2.2"/><path d="M16 5v23M5 15h22" stroke="#d4af37" stroke-width="1.4" opacity="0.8"/><circle cx="16" cy="15" r="5.2" fill="#166541" stroke="#ffea9c" stroke-width="1.6"/><text x="16" y="18.2" text-anchor="middle" font-size="8.5" font-weight="900" fill="#ffea9c" font-family="Georgia,serif">H</text></svg>`;
const HOGWARTS_CASTLE_CREST_SVG = `<svg class="hp-crest-svg" viewBox="0 0 32 32" aria-hidden="true"><path d="M4 4h24v12c0 8.5-12 13.5-12 13.5S4 24.5 4 16V4z" fill="#590d14" stroke="#ffea9c" stroke-width="2.2"/><path d="M16 5v23M5 15h22" stroke="#d4af37" stroke-width="1.4" opacity="0.8"/><circle cx="16" cy="15" r="5.2" fill="#9e1f28" stroke="#ffea9c" stroke-width="1.6"/><text x="16" y="18.2" text-anchor="middle" font-size="8.5" font-weight="900" fill="#ffea9c" font-family="Georgia,serif">H</text></svg>`;

export function applyGameShellChrome(shellEl, gameId) {
  const isGarden = gameId === 'gardenscapes';
  document.body.setAttribute('data-active-game', gameId);
  shellEl.setAttribute('data-game', gameId);
  const m3Avatar = document.querySelector('.austin-m3-card img');
  if (m3Avatar) m3Avatar.src = isGarden ? '/assets/char-wizard-garden.webp' : '/assets/char-austin.webp';
  const dialImg = document.querySelector('#rainbow-dial-ring img');
  if (dialImg) {
    dialImg.src = isGarden ? '/assets/g-rainbow.webp' : '/assets/h-rainbow.webp';
    dialImg.alt = isGarden ? 'Patronus' : 'Xoay Thời Gian';
  }
  const dialTitle = document.querySelector('#garden-rainbow-meter .rainbow-title');
  if (dialTitle) dialTitle.textContent = isGarden ? 'THẦN HỘ MỆNH' : 'XOAY THỜI GIAN';
  const tabBtn = document.getElementById('btn-open-tablet');
  if (tabBtn) {
    const badge = document.getElementById('tablet-badge');
    const badgeHtml = badge ? badge.outerHTML : '<span id="tablet-badge" class="notif-badge hidden">0</span>';
    tabBtn.innerHTML = isGarden
      ? `📜 <span class="dock-btn-label">Sổ Cổ Vật</span><span class="dock-btn-extra"> Hogwarts</span> ${badgeHtml}`
      : `🗺️ <span class="dock-btn-label">Bản Đồ</span><span class="dock-btn-extra"> Đạo Tặc</span> ${badgeHtml}`;
  }
  const onlineBtn = document.getElementById('btn-open-online');
  if (onlineBtn) {
    onlineBtn.title = isGarden ? 'Hội Nhà Hogwarts & Thăm Vườn Online' : 'Hội Nhà Hogwarts & Thăm Lâu Đài Online';
  }
  const photoBtn = document.getElementById('btn-photo-export');
  if (photoBtn) {
    photoBtn.title = isGarden ? 'Chụp ảnh bưu thiếp Khuôn Viên' : 'Chụp ảnh bưu thiếp Lâu Đài';
    photoBtn.setAttribute('aria-label', isGarden ? 'Chụp ảnh Khuôn Viên' : 'Chụp ảnh Lâu Đài');
  }
  const visBanner = document.getElementById('visitor-banner');
  if (visBanner) visBanner.setAttribute('aria-label', isGarden ? 'Đang thăm Khuôn viên bạn bè' : 'Đang thăm Lâu đài bạn bè');
}

export function renderGameHudTitle(titleEl, gameId) {
  if (!titleEl) return;
  titleEl.innerHTML =
    gameId === 'gardenscapes'
      ? `${HOGWARTS_CREST_SVG} <span>KHUÔN VIÊN HOGWARTS</span>`
      : `${HOGWARTS_CASTLE_CREST_SVG} <span>LÂU ĐÀI HOGWARTS</span>`;
}
