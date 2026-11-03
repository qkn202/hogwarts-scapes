/**
 * Wizarding Farmscapes Controller (`farmController.js`)
 * Connects the 14×14 Isometric Tile-Grid `FarmHomesteadRenderer`, Dual-Mode Floating Belt
 * (Play/Harvest Mode + Grid Architect Build Mode), HUD Toggle (`#btn-toggle-farm`),
 * Area 7 (`Khu Vực 7: Trang Trại Hang Sóc`) seamless integration, and Friend Watering!
 */

import { FARM_CROPS } from '../data/farmDefs.js';
import {
  FARM_BUILDINGS,
  FARM_BUILDING_CATEGORIES,
  getBuildingDef,
} from '../data/farmGridDefs.js';
import {
  countBuildingType,
  countFarmReadyActions,
  getBarnTotalCount,
  getEntityFootprint,
  loadFarmState,
  saveFarmState,
} from '../utils/farmStorage.js';
import { haptics } from '../utils/haptics.js';
import { sound } from '../utils/sound.js';
import { FarmHomesteadRenderer } from '../world/farmHomesteadRenderer.js';
import { spawnCelebrationFireworks } from '../world/gardenscapesExtras.js';
import { applyRecipeRewardEffect, openFarmBarnModal } from './farmBarnModal.js';

export function shouldAutoEnterBurrowFarm(app) {
  if (app.gameId !== 'gardenscapes' || app.visitingGarden || app.save.currentArea !== 6) {
    app.viewingBurrowStoryScene = false;
    return false;
  }
  return !app.viewingBurrowStoryScene;
}

export function initFarmSystem(app) {
  app.farm = loadFarmState();
  app.inFarmMode = false;
  app.farmFromAreaNav = false;
  app.viewingBurrowStoryScene = false;
  app.farmBuildCategory = 'fields';

  const worldCanvas = document.getElementById('world-canvas');
  app.farmRenderer = new FarmHomesteadRenderer(worldCanvas, {
    onToast: (msg) => app.toast(msg),
    onStateChanged: () => {
      app.persistAndSyncHud();
      renderFarmToolBelt(app);
    },
    onToolChange: () => renderFarmToolBelt(app),
    onBuildStateChange: () => renderFarmToolBelt(app),
    onOpenFarmModal: (tab, uid) => openFarmBarnModal(app, tab, uid),
    onCollectStationRecipe: (rec, x, y) => {
      const msg = applyRecipeRewardEffect(app, rec);
      sound.sfxVictory();
      app.farmRenderer._spawnHarvestFly(x, y, rec.icon, `+1 ${rec.icon}`);
      app.toast(msg);
    },
  });

  app.openFarmBuildCategory = (cat = 'workshops', placeType = null) => {
    if (!app.inFarmMode) toggleFarmMode(app, true);
    app.farmBuildCategory = cat;
    app.farmRenderer.setBuildMode(true, placeType ? `place:${placeType}` : 'move');
  };

  document.getElementById('btn-toggle-farm')?.addEventListener('click', () => {
    sound.sfxClick();
    if (app.visitingGarden) app.exitVisitorGarden();
    if (app.gameId === 'gardenscapes' && app.save.currentArea === 6) {
      if (app.inFarmMode && app.farmFromAreaNav) {
        app.viewingBurrowStoryScene = true;
        app.enterWorldView(
          '🌿 Đang xem Sân Cổ Vật Hang Sóc (9 ⭐) — Bấm "🌾 Trang Trại" để về Lưới Nông Trại 14×14!'
        );
      } else {
        app.viewingBurrowStoryScene = false;
        app.enterWorldView();
      }
      return;
    }
    toggleFarmMode(app);
  });

  document.getElementById('btn-visitor-water')?.addEventListener('click', () => {
    handleVisitorWatering(app);
  });

  setInterval(() => {
    if (app.screen === 'world') syncFarmHudBadge(app);
  }, 1500);
}

export function stopFarmIfActive(app) {
  if (!app.farmRenderer) return;
  app.inFarmMode = false;
  app.farmFromAreaNav = false;
  app.farmRenderer.stop();
  app.shellEl?.removeAttribute('data-farm-mode');
  const belt = document.getElementById('farm-tool-belt');
  belt?.classList.add('hidden');
  belt?.classList.remove('is-build-mode');
  syncFarmToggleButtonLabel(app);
}

export function toggleFarmMode(app, forceEnable = null, opts = {}) {
  const target = forceEnable !== null ? Boolean(forceEnable) : !app.inFarmMode;
  if (!target) {
    stopFarmIfActive(app);
    const place = app.gameId === 'homescapes' ? 'Lâu Đài Hogwarts' : 'Khuôn Viên Hogwarts';
    app.enterWorldView(`Đã trở về ${place} — Dùng ⭐ Sao & 💰 Vàng từ Nông Trại để tân trang tiếp nhé!`);
    return;
  }

  app.farm = loadFarmState();
  app.inFarmMode = true;
  app.farmFromAreaNav = Boolean(opts.fromAreaNav);
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
    const isBurrowNav = app.farmFromAreaNav && app.gameId === 'gardenscapes' && app.save.currentArea === 6;
    const backIcon = isBurrowNav ? '🌿' : app.gameId === 'homescapes' ? '🏰' : '🌿';
    const backLbl = isBurrowNav ? 'Sân Cổ Vật' : app.gameId === 'homescapes' ? 'Về Lâu Đài' : 'Về Vườn';
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
      const prefix = app.farmFromAreaNav ? '🌾 Khu 7: Trang Trại Hang Sóc' : '🌾 Trang Trại Hang Sóc';
      areaNameEl.textContent = `${prefix} · Lưới 14×14 Cấp ${app.farm.farmLevel} (Kho ${totalBarn}/${app.farm.barnCapacity} · 💧${app.farm.dewdrops || 0})`;
    }
    if (!app.farmFromAreaNav) {
      document.getElementById('btn-area-prev')?.setAttribute('aria-disabled', 'true');
      document.getElementById('btn-area-next')?.setAttribute('aria-disabled', 'true');
    }
  }
}

export function renderFarmToolBelt(app) {
  const belt = document.getElementById('farm-tool-belt');
  if (!belt || !app.farm || !app.farmRenderer) return;
  const fr = app.farmRenderer;

  if (fr.buildMode) {
    belt.classList.add('is-build-mode');
    const cat = app.farmBuildCategory || 'fields';
    const pickedEnt = fr.movingUid ? app.farm.entities.find((e) => e.uid === fr.movingUid) : null;
    const pickedDef = pickedEnt ? getBuildingDef(pickedEnt.type) : null;
    const refund = pickedDef?.removable ? Math.floor((pickedDef.costCoins || 0) * 0.5) : 0;

    const catBtns = FARM_BUILDING_CATEGORIES.map(
      (c) => `<button type="button" class="farm-bcat-btn ${cat === c.id ? 'active' : ''}" data-build-cat="${c.id}">${c.label}</button>`
    ).join('');

    const cards = FARM_BUILDINGS.filter((b) => b.category === cat)
      .map((b) => {
        const built = countBuildingType(app.farm, b.type);
        const cap = b.maxCount(app.farm.farmLevel);
        const locked = app.farm.farmLevel < b.unlockFarmLv;
        const isSel =
          fr.buildAction === `place:${b.type}` || (pickedEnt && pickedEnt.type === b.type && b.costCoins === 0);
        const fp = getEntityFootprint(b.type, fr.placeFlip);
        const priceTag = locked
          ? `🔒 Cấp ${b.unlockFarmLv}`
          : b.costCoins === 0
            ? '✥ Đổi chỗ'
            : built >= cap
              ? `Đầy ${built}/${cap}`
              : `${b.costCoins}💰`;
        return `
          <button type="button" class="farm-build-card ${isSel ? 'active' : ''} ${locked ? 'locked' : ''}" data-place-building="${b.type}" title="${b.name}: ${b.desc}">
            <span class="bcard-head">
              <span class="bcard-ico">${b.icon}</span>
              <span class="bcard-size">${fp.w}×${fp.h}</span>
            </span>
            <span class="bcard-name">${b.name.replace(/\s*\(.*\)/, '')}</span>
            <small class="bcard-sub">${priceTag} · ${built}/${cap}</small>
          </button>`;
      })
      .join('');

    belt.innerHTML = `
      <div class="farm-build-top-row">
        <div class="farm-bcat-group">${catBtns}</div>
        <div class="farm-bact-group">
          <button type="button" class="farm-bact-btn ${fr.buildAction === 'move' ? 'active' : ''}" id="btn-build-move" title="Chạm công trình trên lưới để nhấc lên & đặt sang ô mới">✥ Di Chuyển</button>
          <button type="button" class="farm-bact-btn ${fr.placeFlip || fr.movingFlip ? 'active' : ''}" id="btn-build-rotate" title="Xoay hướng công trình (VD: Xe Bay 2×1 ↔ 1×2)">🔄 Xoay</button>
          <button type="button" class="farm-bact-btn ${fr.buildAction === 'erase' ? 'active is-danger' : ''}" id="btn-build-erase" title="Lướt hoặc chạm để dỡ đường đá, hàng rào, công trình (hoàn 50% Vàng)">🧹 Dỡ Ô</button>
          ${
            pickedEnt && pickedDef?.removable
              ? `<button type="button" class="farm-bact-btn is-danger" id="btn-build-demolish">🗑️ Thu Hồi (+${refund}💰)</button>`
              : ''
          }
          <button type="button" class="farm-bact-btn is-done" id="btn-exit-build-mode">✅ Xong</button>
        </div>
      </div>
      <div class="farm-build-cards-row">${cards}</div>
    `;

    for (const cb of belt.querySelectorAll('[data-build-cat]')) {
      cb.onclick = () => {
        sound.sfxClick();
        app.farmBuildCategory = cb.getAttribute('data-build-cat');
        renderFarmToolBelt(app);
      };
    }
    for (const pb of belt.querySelectorAll('[data-place-building]')) {
      pb.onclick = () => {
        const type = pb.getAttribute('data-place-building');
        const def = getBuildingDef(type);
        if (!def) return;
        if (app.farm.farmLevel < def.unlockFarmLv) {
          sound.sfxInvalid();
          app.toast(`🔒 Cần đạt Cấp Nông Trại ${def.unlockFarmLv} để xây "${def.name}"!`);
          return;
        }
        const built = countBuildingType(app.farm, type);
        if (def.costCoins === 0 && built >= def.maxCount(app.farm.farmLevel)) {
          const existing = app.farm.entities.find((e) => e.type === type);
          if (existing) {
            sound.sfxClick();
            fr.buildAction = 'move';
            fr.movingUid = existing.uid;
            fr.movingFlip = Boolean(existing.flip);
            app.toast(`✥ Đã chọn "${def.name}" — Chạm vào ô lưới trống bất kỳ để dời sang vị trí mới!`);
            renderFarmToolBelt(app);
          }
          return;
        }
        sound.sfxClick();
        fr.setBuildAction(`place:${type}`);
      };
    }
    belt.querySelector('#btn-build-move')?.addEventListener('click', () => {
      sound.sfxClick();
      fr.setBuildAction('move');
    });
    belt.querySelector('#btn-build-rotate')?.addEventListener('click', () => fr.toggleRotateSelection());
    belt.querySelector('#btn-build-erase')?.addEventListener('click', () => {
      sound.sfxClick();
      fr.setBuildAction('erase');
    });
    belt.querySelector('#btn-build-demolish')?.addEventListener('click', () => fr.demolishSelectedEntity());
    belt.querySelector('#btn-exit-build-mode')?.addEventListener('click', () => {
      sound.sfxClick();
      fr.setBuildMode(false);
    });
    return;
  }

  // Play / Harvest Mode Belt
  belt.classList.remove('is-build-mode');
  const tool = fr.selectedTool || 'harvest';
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
    <button type="button" class="farm-tool-chip is-build-cta" id="btn-enter-build-mode" title="Bật Lưới 14×14 để mua, đặt, dời & xoay công trình tự do!">
      <span class="chip-ico">🔨</span>
      <span class="chip-name">Xây &amp; Xếp Lưới</span>
      <small class="chip-sub">14×14 Ô</small>
    </button>
    <div class="farm-tool-divider" aria-hidden="true"></div>
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
    <button type="button" class="farm-tool-chip is-barn-cta" id="btn-belt-open-barn" title="Mở Đơn Hàng Cú, Xưởng Nướng Bánh, Cối Xay Bia Bơ & Kho Lẫm">
      <span class="chip-ico">🦉</span>
      <span class="chip-name">Đơn Cú &amp; Bếp</span>
      <small class="chip-sub">${readyOrders > 0 ? `✨ ${readyOrders} Xong` : 'Kho & Vạc'}</small>
    </button>
  `;

  belt.querySelector('#btn-enter-build-mode')?.addEventListener('click', () => {
    sound.sfxClick();
    fr.setBuildMode(true, `place:soil_plot`);
  });

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
      fr.setTool(nextTool);
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
