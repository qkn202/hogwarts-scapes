/**
 * Friend Castle/Garden Visitor Banner (with Firework Kudos + Dual-World Toggle)
 * & Hogwarts Weather + Ambient Soundscape Switcher helpers.
 */

import { HOGWARTS_HOUSES } from '../data/liveOpsDefs.js';
import { haptics } from '../utils/haptics.js';
import { sound } from '../utils/sound.js';
import {
  WEATHER_MODES,
  exportWorldSnapshotPng,
  nextWeatherMode,
  spawnCelebrationFireworks,
} from '../world/gardenscapesExtras.js';
import { getGameAreas } from './modals.js';
import { syncVisitorWaterButton } from './farmController.js';
import { apiRequest } from './onlineApi.js';
import { syncOnlineProfile } from './onlineHubModal.js';

export function syncVisitorBanner(app) {
  const banner = document.getElementById('visitor-banner');
  if (!banner) return;
  if (!app.visitingGarden) {
    banner.classList.add('hidden');
    document.querySelector('.world-dock')?.classList.remove('hidden');
    return;
  }
  const vg = app.visitingGarden;
  const vWorld = app.visitorWorld || app.gameId;
  const isVHome = vWorld === 'homescapes';
  const hMeta = HOGWARTS_HOUSES.find((h) => h.id === vg.house) || HOGWARTS_HOUSES[0];
  const worldLv = isVHome ? vg.homeLevel || vg.level : vg.gardenLevel || vg.level;

  const txtEl = document.getElementById('visitor-banner-text');
  if (txtEl) {
    txtEl.textContent = `👀 ${isVHome ? '🏰 Lâu Đài' : '🌿 Khuôn Viên'} ${hMeta.crest} ${vg.name} · Màn ${worldLv} · 🎆 ${vg.kudosCount || 0}`;
  }
  const togBtn = document.getElementById('btn-visitor-toggle-world');
  if (togBtn) {
    togBtn.textContent = isVHome ? '🌿 Xem Khuôn Viên' : '🏰 Xem Lâu Đài';
  }
  const kudosBtn = document.getElementById('btn-visitor-kudos');
  if (kudosBtn) {
    const sentTs = app.save.kudosSent?.[vg.id] || 0;
    const recentlySent = Date.now() - sentTs < 12 * 3600 * 1000;
    kudosBtn.disabled = recentlySent;
    kudosBtn.textContent = recentlySent ? `🎆 Đã Khen (${vg.kudosCount || 0})` : '🎆 Khen Đẹp (+20 💰)';
  }
  const exitBtn = document.getElementById('btn-exit-visitor');
  if (exitBtn) {
    exitBtn.textContent = app.gameId === 'homescapes' ? '🚪 Về Lâu Đài Tôi' : '🚪 Về Vườn Tôi';
  }
  syncVisitorWaterButton(app);
  banner.classList.remove('hidden');
  document.querySelector('.world-dock')?.classList.add('hidden');
}

export function bindVisitorControls(app) {
  document.getElementById('btn-visitor-toggle-world')?.addEventListener('click', () => {
    if (!app.visitingGarden) return;
    const cur = app.visitorWorld || app.gameId;
    app.visitorWorld = cur === 'homescapes' ? 'gardenscapes' : 'homescapes';
    app.visitorAreaIndex = 0;
    sound.sfxRainbow();
    app.enterWorldView();
    const label = app.visitorWorld === 'homescapes' ? 'Lâu Đài Hogwarts' : 'Khuôn Viên Hogwarts';
    app.toast(`⚡ Đã chuyển sang tham quan ${label} của ${app.visitingGarden.name}!`);
  });

  document.getElementById('btn-visitor-kudos')?.addEventListener('click', async () => {
    const vg = app.visitingGarden;
    if (!vg) return;
    const btn = document.getElementById('btn-visitor-kudos');
    if (btn) btn.disabled = true;
    try {
      await syncOnlineProfile(app);
      const res = await apiRequest('/api/kudos', 'POST', {
        fromId: app.save.playerId,
        toId: vg.id,
        fromName: app.save.playerName,
        targetWorld: app.visitorWorld || app.gameId,
      });
      vg.kudosCount = res.kudosCount ?? (vg.kudosCount || 0) + 1;
      app.save.kudosSent[vg.id] = Date.now();
      app.save.coins += res.rewardCoins || 20;
      app.persistAndSyncHud();
      spawnCelebrationFireworks(app.getActiveWorldRenderer());
      haptics.victory();
      sound.sfxVictory();
      syncVisitorBanner(app);
      app.toast(`🎆 Pháo hoa rực sáng! Đã khen ${vg.name} và nhận +${res.rewardCoins || 20} 💰!`);
    } catch (err) {
      if (btn) btn.disabled = false;
      app.toast(`⚠️ ${err.message}`);
    }
  });

  document.getElementById('btn-exit-visitor')?.addEventListener('click', () => {
    app.exitVisitorGarden();
  });

  document.getElementById('btn-area-prev')?.addEventListener('click', () => {
    if (app.inFarmMode && !app.farmFromAreaNav) {
      sound.sfxClick();
      app.enterWorldView();
      return;
    }
    if (app.visitingGarden) {
      if (app.visitorAreaIndex > 0) {
        app.visitorAreaIndex -= 1;
        sound.sfxClick();
        app.enterWorldView();
      }
      return;
    }
    if (app.save.currentArea > 0) {
      app.save.currentArea -= 1;
      sound.sfxClick();
      app.enterWorldView();
    }
  });

  document.getElementById('btn-area-next')?.addEventListener('click', () => {
    if (app.inFarmMode && !app.farmFromAreaNav) {
      sound.sfxClick();
      app.enterWorldView();
      return;
    }
    const activeWorld = app.visitingGarden ? app.visitorWorld || app.gameId : app.gameId;
    const vg = app.visitingGarden;
    const activeMastery = vg
      ? (activeWorld === 'homescapes' ? vg.homeMasteryTier ?? vg.masteryTier : vg.gardenMasteryTier ?? vg.masteryTier) || 0
      : app.save.masteryTier;
    const activeHouse = vg ? vg.house : app.save.house;
    const maxIdx = getGameAreas(activeWorld, activeMastery, activeHouse).length - 1;
    if (app.visitingGarden) {
      if (app.visitorAreaIndex < maxIdx) {
        app.visitorAreaIndex += 1;
        sound.sfxClick();
        app.enterWorldView();
      }
      return;
    }
    if (app.save.currentArea < Math.min(maxIdx, app.getMaxUnlockedArea())) {
      app.save.currentArea += 1;
      sound.sfxClick();
      app.enterWorldView();
    } else if (app.save.currentArea < maxIdx) {
      sound.sfxInvalid();
      const areas = getGameAreas(app.gameId, app.save.masteryTier, app.save.house);
      const curTasks = areas[app.save.currentArea]?.tasks.length || 9;
      const noun = app.gameId === 'homescapes' ? `${curTasks} hạng mục & mở Rương Phòng` : `${curTasks} cổ vật & mở Rương Khu Vực`;
      app.toast(`🔒 Hoàn thành ${noun} để mở khóa khu tiếp theo!`);
    }
  });

  document.getElementById('btn-map-zoom-out')?.addEventListener('click', () => {
    sound.sfxClick();
    const cam = app.getActiveWorldRenderer().camera;
    cam.zoomBy(-0.22);
    document.getElementById('btn-map-overview')?.classList.toggle('is-overview', cam.zoom <= cam.minZoom + 0.05);
  });
  document.getElementById('btn-map-zoom-in')?.addEventListener('click', () => {
    sound.sfxClick();
    const cam = app.getActiveWorldRenderer().camera;
    cam.zoomBy(0.22);
    document.getElementById('btn-map-overview')?.classList.toggle('is-overview', cam.zoom <= cam.minZoom + 0.05);
  });
  document.getElementById('btn-map-overview')?.addEventListener('click', () => {
    sound.sfxClick();
    const cam = app.getActiveWorldRenderer().camera;
    const isOv = cam.toggleOverview();
    document.getElementById('btn-map-overview')?.classList.toggle('is-overview', isOv);
    app.toast(isOv ? '🗺️ Chế độ Toàn Cảnh: Hiển thị trọn 9 điểm trang trí trong khu!' : '🔍 Chế độ Khám Phá 2.5D: Kéo map để dạo quanh khu vực!');
  });

  document.getElementById('btn-weather-cycle')?.addEventListener('click', () => app.cycleWeatherMode());
  document.getElementById('btn-photo-export')?.addEventListener('click', () => {
    sound.sfxClick();
    const activeWorld = app.visitingGarden ? app.visitorWorld || app.gameId : app.gameId;
    const place = activeWorld === 'homescapes' ? 'Lâu Đài' : 'Khuôn Viên';
    exportWorldSnapshotPng(
      document.getElementById('world-canvas'),
      app.visitingGarden ? `tham-${activeWorld}-${app.visitingGarden.id}` : `hogwarts-${app.gameId}-${app.save.playerId}`
    );
    app.toast(`📸 Đã chụp và tải ảnh ${place} Hogwarts!`);
  });
}

export function cycleWeatherMode(app) {
  const next = nextWeatherMode(app.visitingGarden ? app.visitingGarden.weather : app.save.weather);
  if (app.visitingGarden) {
    app.visitingGarden.weather = next.id;
  } else {
    app.save.weather = next.id;
    app.persistAndSyncHud();
    syncOnlineProfile(app);
  }
  app.getActiveWorldRenderer().setState({ weather: next.id });
  sound.setWeather(next.id);
  haptics.tap();
  sound.sfxClick();
  syncWeatherButton(app);
  app.toast(`${next.icon} Không khí Hogwarts chuyển sang: ${next.label}!`);
}

export function syncWeatherButton(app) {
  const btn = document.getElementById('btn-weather-cycle');
  if (!btn) return;
  const cur = app.visitingGarden ? app.visitingGarden.weather : app.save.weather || 'day';
  const meta = WEATHER_MODES.find((m) => m.id === cur) || WEATHER_MODES[0];
  btn.textContent = meta.icon;
  btn.title = `Thời tiết: ${meta.label} (chạm để đổi)`;
}
