/**
 * Wizarding Farmscapes Controller (`farmController.js`)
 * Connects `FarmHomesteadRenderer`, Floating Seed & Tool Belt (`#farm-tool-belt`),
 * HUD Toggle Button (`#btn-toggle-farm`), and Online Teammate Dewdrop Watering (`#btn-visitor-water`)
 * cleanly to `ScapesApp` while keeping `appShell.js` strictly modular and < 500 lines!
 */

import { FARM_CROPS } from '../data/farmDefs.js';
import {
  countFarmReadyActions,
  getBarnTotalCount,
  loadFarmState,
  saveFarmState,
} from '../utils/farmStorage.js';
import { haptics } from '../utils/haptics.js';
import { sound } from '../utils/sound.js';
import { FarmHomesteadRenderer } from '../world/farmHomesteadRenderer.js';
import { spawnCelebrationFireworks } from '../world/gardenscapesExtras.js';
import { applyRecipeRewardEffect, openFarmBarnModal } from './farmBarnModal.js';

export function initFarmSystem(app) {
  app.farm = loadFarmState();
  app.inFarmMode = false;

  const worldCanvas = document.getElementById('world-canvas');
  app.farmRenderer = new FarmHomesteadRenderer(worldCanvas, {
    onToast: (msg) => app.toast(msg),
    onStateChanged: () => {
      app.persistAndSyncHud();
      renderFarmToolBelt(app);
    },
    onToolChange: () => renderFarmToolBelt(app),
    onOpenFarmModal: (tab) => openFarmBarnModal(app, tab),
    onCollectStationRecipe: (rec, x, y) => {
      const msg = applyRecipeRewardEffect(app, rec);
      sound.sfxVictory();
      app.farmRenderer._spawnHarvestFly(x, y, rec.icon, `+1 ${rec.icon}`);
      app.toast(msg);
    },
  });

  document.getElementById('btn-toggle-farm')?.addEventListener('click', () => {
    sound.sfxClick();
    if (app.visitingGarden) {
      app.exitVisitorGarden();
    }
    toggleFarmMode(app);
  });

  document.getElementById('btn-visitor-water')?.addEventListener('click', () => {
    handleVisitorWatering(app);
  });

  setInterval(() => {
    if (app.screen === 'world') {
      syncFarmHudBadge(app);
    }
  }, 1500);
}

export function stopFarmIfActive(app) {
  if (!app.farmRenderer) return;
  app.inFarmMode = false;
  app.farmRenderer.stop();
  app.shellEl?.removeAttribute('data-farm-mode');
  document.getElementById('farm-tool-belt')?.classList.add('hidden');
  syncFarmToggleButtonLabel(app);
}

export function toggleFarmMode(app, forceEnable = null) {
  const target = forceEnable !== null ? Boolean(forceEnable) : !app.inFarmMode;
  if (!target) {
    stopFarmIfActive(app);
    const place = app.gameId === 'homescapes' ? 'Lâu Đài Hogwarts' : 'Khuôn Viên Hogwarts';
    app.enterWorldView(`Đã trở về ${place} — Dùng ⭐ Sao & 💰 Vàng từ Nông Trại để tân trang tiếp nhé!`);
    return;
  }

  // Reload fresh shared farm state in case player switched between Homescapes & Gardenscapes
  app.farm = loadFarmState();
  app.inFarmMode = true;
  app.pendingDesign = null;
  app.styleBarEl?.classList.add('hidden');

  app.homeRenderer.stop();
  app.gardenRenderer.stop();
  app.shellEl?.setAttribute('data-farm-mode', 'true');

  const weather = app.save.weather || 'day';
  app.farmRenderer.setState({
    farm: app.farm,
    appSave: app.save,
    weather,
    petName: app.save.petName || 'Niffler',
  });
  app.farmRenderer.start();
  if (window.innerWidth <= 640 && app.farmRenderer.camera.zoom > app.farmRenderer.camera.minZoom + 0.05) {
    const isOv = app.farmRenderer.camera.toggleOverview();
    document.getElementById('btn-map-overview')?.classList.toggle('is-overview', isOv);
  }

  renderFarmToolBelt(app);
  document.getElementById('farm-tool-belt')?.classList.remove('hidden');
  syncFarmToggleButtonLabel(app);
  syncFarmHudBadge(app);
  sound.setWeather(weather);
  sound.playBgm('gardenscapes_world');
}

export function syncFarmToggleButtonLabel(app) {
  const btn = document.getElementById('btn-toggle-farm');
  if (!btn) return;
  const badgeVal = countFarmReadyActions(app.farm);
  if (app.inFarmMode) {
    const backIcon = app.gameId === 'homescapes' ? '🏰' : '🌿';
    const backLbl = app.gameId === 'homescapes' ? 'Về Lâu Đài' : 'Về Vườn';
    btn.classList.add('is-farm-active');
    btn.innerHTML = `${backIcon} <span class="dock-btn-label">${backLbl}</span>`;
  } else {
    btn.classList.remove('is-farm-active');
    btn.innerHTML = `🌾 <span class="dock-btn-label">Trang Trại</span> <span id="farm-badge" class="notif-badge ${badgeVal > 0 ? '' : 'hidden'}">${badgeVal}</span>`;
  }
}

export function syncFarmHudBadge(app) {
  if (!app.farm) return;
  const ready = countFarmReadyActions(app.farm);
  const badge = document.getElementById('farm-badge');
  if (badge) {
    badge.textContent = String(ready);
    badge.classList.toggle('hidden', ready <= 0);
  }
  if (app.inFarmMode) {
    const areaNameEl = document.getElementById('hud-area-name');
    if (areaNameEl) {
      const totalBarn = getBarnTotalCount(app.farm);
      areaNameEl.textContent = `🌾 Trang Trại Hang Sóc · Cấp ${app.farm.farmLevel} (Kho ${totalBarn}/${app.farm.barnCapacity} · 💧${app.farm.dewdrops || 0})`;
    }
    const prevBtn = document.getElementById('btn-area-prev');
    const nextBtn = document.getElementById('btn-area-next');
    if (prevBtn) prevBtn.setAttribute('aria-disabled', 'true');
    if (nextBtn) nextBtn.setAttribute('aria-disabled', 'true');
  }
}

export function renderFarmToolBelt(app) {
  const belt = document.getElementById('farm-tool-belt');
  if (!belt || !app.farm) return;
  const tool = app.farmRenderer?.selectedTool || 'harvest';
  const readyOrders = countFarmReadyActions(app.farm);

  const cropBtns = FARM_CROPS.map((c) => {
    const locked = app.farm.farmLevel < c.unlockFarmLv;
    const isSel = tool === `crop:${c.id}`;
    const seedCnt = c.seedKey ? app.farm.seeds[c.seedKey] || 0 : 0;
    const subTag = locked
      ? `🔒 Cấp ${c.unlockFarmLv}`
      : seedCnt > 0
        ? `Hạt x${seedCnt}`
        : c.seedCostCoins === 0
          ? 'Miễn Phí'
          : `${c.seedCostCoins}💰`;
    return `
      <button type="button" class="farm-tool-chip ${isSel ? 'active' : ''} ${locked ? 'locked' : ''}" data-farm-tool="crop:${c.id}" title="${c.name}: ${c.desc}">
        <span class="chip-ico">${c.icon}</span>
        <span class="chip-name">${c.name.split(' ')[0]}</span>
        <small class="chip-sub">${subTag}</small>
      </button>`;
  }).join('');

  belt.innerHTML = `
    <button type="button" class="farm-tool-chip ${tool === 'harvest' ? 'active' : ''}" data-farm-tool="harvest" title="Lướt qua luống chín để gặt hàng loạt">
      <span class="chip-ico">🧺</span>
      <span class="chip-name">Thu Hoạch</span>
      <small class="chip-sub">Lướt gặt</small>
    </button>
    <button type="button" class="farm-tool-chip ${tool === 'dew' ? 'active' : ''}" data-farm-tool="dew" title="Tưới Sương Phép chín tức thì">
      <span class="chip-ico">💧</span>
      <span class="chip-name">Sương Phép</span>
      <small class="chip-sub">x${app.farm.dewdrops || 0}</small>
    </button>
    <div class="farm-tool-divider" aria-hidden="true"></div>
    ${cropBtns}
    <div class="farm-tool-divider" aria-hidden="true"></div>
    <button type="button" class="farm-tool-chip is-barn-cta" id="btn-belt-open-barn" title="Mở Đơn Hàng Cú, Bếp Bà Molly, Vạc Độc Dược & Kho Lẫm">
      <span class="chip-ico">🦉</span>
      <span class="chip-name">Đơn Cú &amp; Bếp</span>
      <small class="chip-sub">${readyOrders > 0 ? `✨ ${readyOrders} Xong` : 'Kho & Vạc'}</small>
    </button>
  `;

  for (const b of belt.querySelectorAll('[data-farm-tool]')) {
    b.onclick = () => {
      const nextTool = b.getAttribute('data-farm-tool');
      if (nextTool.startsWith('crop:')) {
        const crop = FARM_CROPS.find((c) => c.id === nextTool.slice(5));
        if (crop && app.farm.farmLevel < crop.unlockFarmLv) {
          sound.sfxInvalid();
          app.toast(`🔒 Đạt Cấp Nông Trại ${crop.unlockFarmLv} để mở giống ${crop.name}!`);
          return;
        }
      }
      sound.sfxClick();
      app.farmRenderer.setTool(nextTool);
    };
  }

  belt.querySelector('#btn-belt-open-barn')?.addEventListener('click', () => {
    sound.sfxClick();
    openFarmBarnModal(app, 'orders');
  });
}

export function syncVisitorWaterButton(app) {
  const btn = document.getElementById('btn-visitor-water');
  if (!btn || !app.visitingGarden || !app.farm) return;
  const vg = app.visitingGarden;
  const lastTs = app.farm.wateredFriends?.[vg.id] || 0;
  const onCooldown = Date.now() - lastTs < 8 * 3600 * 1000;
  btn.disabled = onCooldown;
  btn.textContent = onCooldown ? '💧 Đã Tưới Sương' : '💧 Tưới Cây (+25💰 +1💧)';
}

function handleVisitorWatering(app) {
  const vg = app.visitingGarden;
  if (!vg || !app.farm) return;
  const lastTs = app.farm.wateredFriends?.[vg.id] || 0;
  if (Date.now() - lastTs < 8 * 3600 * 1000) return;

  app.farm.wateredFriends[vg.id] = Date.now();
  app.farm.dewdrops = (app.farm.dewdrops || 0) + 1;
  app.save.coins += 25;
  saveFarmState(app.farm);
  app.persistAndSyncHud();
  spawnCelebrationFireworks(app.getActiveWorldRenderer());
  sound.sfxRainbow();
  haptics.victory?.();
  syncVisitorWaterButton(app);
  app.toast(`💧 Đã tưới Sương Phép giúp vườn của ${vg.name}! Nhận +25 💰 & +1 💧 Sương Phép!`);
}
