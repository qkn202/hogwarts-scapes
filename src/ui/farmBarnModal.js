/**
 * Wizarding Farmscapes Modal (`farmBarnModal.js`)
 * 4-Tab Grid Homestead Hub:
 * 1. 🦉 Đơn Hàng Cú (Owl Post Order Board -> Coins + Farm XP + Season XP + Dewdrops)
 * 2. 🥧 Xưởng Trên Lưới (Grid-Placed Bakeries, Butterbeer Windmills & Rescue Cauldrons!)
 * 3. 🍽️ Đại Tiệc Lâu Đài (Cross-World Feast -> +1 ⭐ Renovation Star + 350 💰!)
 * 4. 🏠 Kho Lẫm & Hạt Giống (Barn Inventory, Quick Sell & Capacity Upgrade)
 */

import {
  FARM_CROPS,
  FARM_ITEM_META,
  FARM_RECIPES,
  FARM_SEEDS_META,
  OWL_CUSTOMERS,
  getFarmXpForNextLevel,
} from '../data/farmDefs.js';
import { getBuildingDef } from '../data/farmGridDefs.js';
import { closeModal, openModal } from '../utils/dialogHelper.js';
import {
  addFarmXp,
  canCraftRecipe,
  canFulfillOrder,
  generateOwlOrder,
  getBarnTotalCount,
  saveFarmState,
} from '../utils/farmStorage.js';
import { haptics } from '../utils/haptics.js';
import { sound } from '../utils/sound.js';

const WORKSHOP_TYPES = ['molly_bakery', 'butterbeer_mill', 'apothecary_cauldron'];

const FEAST_POINTS = {
  wheat: 5,
  pumpkin: 9,
  berry: 14,
  egg: 14,
  pure_snow: 15,
  mandrake: 18,
  honey: 18,
  cream: 20,
  moonshroom: 26,
  feather: 30,
  pumpkin_pie: 34,
  egg_custard: 38,
  goldapple: 38,
  butterbeer: 48,
  berry_tart: 56,
};

export function applyRecipeRewardEffect(app, recipe) {
  const eff = recipe.rewardEffect;
  if (!eff) {
    app.farm.barn[recipe.id] = (app.farm.barn[recipe.id] || 0) + 1;
    saveFarmState(app.farm);
    return `${recipe.icon} Đã cất +1 ${recipe.name} vào Kho Lẫm!`;
  }
  if (eff.type === 'life') {
    const maxLv = app.save.maxLives || 5;
    if ((app.save.lives || 0) < maxLv) {
      app.save.lives = Math.min(maxLv, (app.save.lives || 0) + (eff.amount || 1));
      app.persistAndSyncHud();
      return `❤️‍🔥 Vạc Cứu Trợ: Đã hồi +1 Tim Phép (${app.save.lives}/${maxLv})!`;
    }
    const baseUntil = Math.max(Date.now(), app.save.infiniteLivesUntil || 0);
    app.save.infiniteLivesUntil = baseUntil + 15 * 60 * 1000;
    app.persistAndSyncHud();
    return '❤️‍🔥 Tim đang đầy — Chuyển hóa thành ♾️ +15 Phút Tim Bất Tử!';
  }
  if (eff.type === 'ingame_single') {
    const key = app.gameId === 'homescapes' ? 'hammer' : 'shovel';
    app.save.boosters[key] = (app.save.boosters[key] || 0) + (eff.amount || 1);
    app.persistAndSyncHud();
    return '🪄 Đã rèn +1 Đũa Cơm Nguội Phá Ô mang vào Match-3!';
  }
  if (eff.type === 'ingame_sweep') {
    const key = app.gameId === 'homescapes' ? 'kettlebell' : 'rake';
    app.save.boosters[key] = (app.save.boosters[key] || 0) + (eff.amount || 1);
    app.persistAndSyncHud();
    return '🧹 Đã rèn +1 Chổi Thần Quét Hàng & Cột mang vào Match-3!';
  }
  if (eff.type === 'pre_bomb') {
    const key = app.gameId === 'homescapes' ? 'pre_rocket_bomb' : 'pre_bomb_dynamite';
    app.save.boosters[key] = (app.save.boosters[key] || 0) + (eff.amount || 1);
    app.persistAndSyncHud();
    return '💣 Đã luyện +1 Combo Vạc Nổ Đầu Màn!';
  }
  return `✨ Đã nhận ${recipe.name}!`;
}

function formatSec(sec) {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}p ${String(r).padStart(2, '0')}s` : `${r}s`;
}

function findIdleWorkshopForRecipe(stations, rec, focusUid) {
  const matching = stations.filter((s) => s.type === rec.stationType || s.type === rec.altStationType);
  const idle = matching.filter((s) => !s.recipeId);
  const target =
    idle.find((s) => s.uid === focusUid) ||
    idle.find((s) => s.type === rec.stationType) ||
    idle[0] ||
    null;
  return { hasPlaced: matching.length > 0, target };
}

export function openFarmBarnModal(app, initialTab = 'orders', focusStationUid = null) {
  const dialog = document.getElementById('dialog-farm');
  const body = document.getElementById('farm-modal-body');
  if (!dialog || !body) return;

  let activeTab = initialTab;

  const render = () => {
    const farm = app.farm;
    const now = Date.now();
    const nextXp = getFarmXpForNextLevel(farm.farmLevel);
    const xpPct = Math.min(100, Math.round((farm.farmXp / nextXp) * 100));
    const totalBarn = getBarnTotalCount(farm);

    let tabHtml = '';
    if (activeTab === 'orders') {
      tabHtml = `
        <div class="owl-orders-grid">
          ${farm.owlOrders
            .map((ord, idx) => {
              const cust = OWL_CUSTOMERS.find((c) => c.id === ord.customerId) || OWL_CUSTOMERS[0];
              const ready = canFulfillOrder(farm, ord);
              const reqChips = Object.entries(ord.items)
                .map(([k, qty]) => {
                  const meta = FARM_ITEM_META[k] || { icon: '📦', name: k };
                  const have = farm.barn[k] || 0;
                  return `<span class="farm-req-chip ${have >= qty ? 'ok' : 'lack'}">${meta.icon} ${meta.name}: <strong>${have}/${qty}</strong></span>`;
                })
                .join('');
              return `
                <article class="owl-order-card ${ready ? 'is-ready' : ''}">
                  <div class="owl-order-head">
                    <span class="owl-avatar">${cust.avatar}</span>
                    <div><strong>${cust.name}</strong><small>${cust.title}</small></div>
                  </div>
                  <p class="owl-quote">“${cust.quote}”</p>
                  <div class="farm-req-list">${reqChips}</div>
                  <div class="owl-reward-row">
                    <span>💰 +${ord.rewardCoins}</span>
                    <span>🌾 +${ord.rewardFarmXp} XP</span>
                    <span>🏆 +${ord.rewardSeasonXp} Vé Mùa</span>
                    ${ord.bonusDewdrop ? '<span>💧 +1 Sương</span>' : ''}
                  </div>
                  <div class="owl-card-actions">
                    <button type="button" class="btn-playrix ${ready ? 'btn-gold' : ''}" data-deliver-order="${idx}" ${ready ? '' : 'disabled'}>
                      🦉 ${ready ? 'Giao Hàng Ngay!' : 'Chưa Đủ Hàng'}
                    </button>
                    <button type="button" class="btn-playrix btn-purple farm-mini-btn" data-reroll-order="${idx}" title="Đổi đơn hàng khác (15 💰)">
                      🔄 Đổi (15💰)
                    </button>
                  </div>
                </article>`;
            })
            .join('')}
        </div>`;
    } else if (activeTab === 'workshops') {
      const stations = (farm.entities || [])
        .filter((e) => WORKSHOP_TYPES.includes(e.type))
        .sort((a, b) => (a.uid === focusStationUid ? -1 : b.uid === focusStationUid ? 1 : 0));

      const stationBanner = stations
        .map((st) => {
          const def = getBuildingDef(st.type);
          const title = `${def?.icon || '🏭'} ${def?.name || st.type} · Ô (${st.col},${st.row})`;
          if (!st.recipeId) {
            return `<div class="workshop-slot-card ${st.uid === focusStationUid ? 'is-focused' : ''}">
              <strong>${title}</strong>
              <span class="workshop-idle">Đang rảnh — Chọn công thức bên dưới để chế biến!</span>
            </div>`;
          }
          const rec = FARM_RECIPES.find((r) => r.id === st.recipeId);
          const remSec = (st.readyAt - now) / 1000;
          if (remSec <= 0) {
            return `<div class="workshop-slot-card is-ready">
              <strong>${title}</strong>
              <span>✨ Đã xong: <b>${rec?.icon || ''} ${rec?.name || ''}</b></span>
              <button type="button" class="btn-playrix btn-gold farm-mini-btn" data-collect-uid="${st.uid}">🎁 Thu Ngay!</button>
            </div>`;
          }
          return `<div class="workshop-slot-card is-busy">
            <strong>${title}</strong>
            <span>🔥 Đang nấu <b>${rec?.icon || ''} ${rec?.name || ''}</b> (${formatSec(remSec)})</span>
            <button type="button" class="btn-playrix btn-purple farm-mini-btn" data-dew-uid="${st.uid}" ${(farm.dewdrops || 0) > 0 ? '' : 'disabled'}>
              💧 Chín Ngay (-1 💧)
            </button>
          </div>`;
        })
        .join('');

      const hasMill = stations.some((s) => s.type === 'butterbeer_mill');
      tabHtml = `
        <div class="workshop-build-tip">
          <span>🏗️ Đã đặt <strong>${stations.length}</strong> Xưởng trên lưới 14×14${hasMill ? ' (Đã có Cối Xay Gió Ủ Bia Bơ!)' : ' — Xây thêm Cối Xay Ủ Bia Bơ hoặc Lò thứ 2 để nấu song song!'}</span>
          <button type="button" class="btn-playrix btn-gold farm-mini-btn" id="btn-jump-build-workshops">🔨 Ra Lưới Xây Thêm Xưởng</button>
        </div>
        <div class="workshop-status-row">${stationBanner || '<div class="workshop-slot-card">Chưa có xưởng nào trên lưới — Bấm nút xây bên trên nhé!</div>'}</div>
        <div class="workshop-recipes-grid">
          ${FARM_RECIPES.map((rec) => {
            const { hasPlaced, target } = findIdleWorkshopForRecipe(stations, rec, focusStationUid);
            const hasInputs = canCraftRecipe(farm, rec);
            const canStart = Boolean(hasPlaced && target && hasInputs);
            const isCauldron = rec.stationType === 'apothecary_cauldron';
            const reqHtml = Object.entries(rec.inputs)
              .map(([k, qty]) => {
                const m = FARM_ITEM_META[k] || { icon: '📦', name: k };
                const have = farm.barn[k] || 0;
                return `<span class="farm-req-chip ${have >= qty ? 'ok' : 'lack'}">${m.icon} ${have}/${qty}</span>`;
              })
              .join('');
            const btnLabel = !hasPlaced
              ? `🏗️ Cần Xây ${rec.stationName}`
              : !target
                ? '⏳ Xưởng Đang Bận'
                : hasInputs
                  ? '🔥 Chế Biến Ngay'
                  : 'Thiếu Nguyên Liệu';
            return `
              <article class="recipe-card ${isCauldron ? 'is-cauldron' : ''}">
                <div class="recipe-card-top">
                  <span class="recipe-icon">${rec.icon}</span>
                  <div>
                    <strong>${rec.name}</strong>
                    <small>${rec.stationName} · ⏱️ ${formatSec(rec.craftSec)} · +${rec.xp} XP</small>
                  </div>
                </div>
                <p class="recipe-desc">${rec.desc}</p>
                <div class="farm-req-list">${reqHtml}</div>
                <button type="button" class="btn-playrix ${canStart ? 'btn-gold' : ''}" data-start-recipe="${rec.id}" ${canStart ? '' : 'disabled'}>
                  ${btnLabel}
                </button>
              </article>`;
          }).join('')}
        </div>`;
    } else if (activeTab === 'feast') {
      const pct = Math.min(100, farm.feastProgress || 0);
      const goods = Object.entries(FEAST_POINTS).filter(([k]) => (farm.barn[k] || 0) > 0);
      tabHtml = `
        <div class="feast-hero-card">
          <div class="feast-title-row">
            <div>
              <h3>🍽️ Đại Tiệc Đại Sảnh Đường — Bậc ${farm.feastTier || 1}</h3>
              <p>Góp nông sản & bánh ngọt từ Trang Trại Hang Sóc để nhận <strong>+1 ⭐ Sao Cải Tạo</strong> &amp; <strong>+350 💰 Galleon</strong> dùng cho cả Lâu Đài lẫn Khuôn Viên!</p>
            </div>
            <div class="feast-reward-pill">🎁 Đầy 100đ: <strong>+1 ⭐ &amp; +350 💰</strong></div>
          </div>
          <div class="feast-progress-track">
            <div class="feast-progress-fill" style="width:${pct}%;"></div>
            <span>${pct} / 100 Điểm Ẩm Thực</span>
          </div>
        </div>
        <div class="barn-items-grid">
          ${
            goods.length === 0
              ? '<p style="grid-column:1/-1; text-align:center; font-weight:700; color:#5c4738;">Kho Lẫm chưa có nông sản! Hãy ra Trang Trại thu hoạch lúa mạch, bí ngô, trứng, mật ong nhé!</p>'
              : goods
                  .map(([k, pts]) => {
                    const m = FARM_ITEM_META[k];
                    const cnt = farm.barn[k] || 0;
                    return `<div class="barn-item-card">
                      <span class="barn-item-icon">${m.icon}</span>
                      <strong>${m.name}</strong>
                      <small>Đang có: x${cnt}</small>
                      <button type="button" class="btn-playrix btn-gold farm-mini-btn" data-donate-feast="${k}">
                        🍽️ Góp 1 (+${pts}đ)
                      </button>
                    </div>`;
                  })
                  .join('')
          }
        </div>`;
    } else {
      const upgCost = 180 + Math.floor((farm.barnCapacity - 100) / 30) * 140;
      const seedPills = Object.entries(FARM_SEEDS_META)
        .map(([sk, sm]) => `<span class="farm-seed-pill">${sm.icon} ${sm.name}: <strong>x${farm.seeds[sk] || 0}</strong></span>`)
        .join('');
      const unlockPills = FARM_CROPS.map(
        (c) => `<span class="farm-seed-pill">${c.icon} ${c.name}: <strong>${farm.farmLevel >= c.unlockFarmLv ? 'Đã mở' : `Cấp ${c.unlockFarmLv}`}</strong></span>`
      ).join('');
      tabHtml = `
        <div class="barn-summary-box">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <strong>🏠 Sức Chứa Kho Lẫm: ${totalBarn} / ${farm.barnCapacity}</strong>
              <div style="font-size:0.8rem; color:#5c4738;">Thắng màn Match-3 sẽ rơi thêm 💧 Sương Phép &amp; Hạt Giống Thảo Dược quý!</div>
            </div>
            <button type="button" class="btn-playrix btn-gold farm-mini-btn" id="btn-upgrade-barn">
              🔨 Mở Rộng +30 Ô (${upgCost} 💰)
            </button>
          </div>
          <div class="farm-seed-row">${seedPills}</div>
          <div class="farm-seed-row" style="margin-top:4px;">${unlockPills}</div>
        </div>
        <div class="barn-items-grid">
          ${Object.entries(FARM_ITEM_META)
            .map(([k, m]) => {
              const cnt = farm.barn[k] || 0;
              return `<div class="barn-item-card ${cnt === 0 ? 'is-empty' : ''}">
                <span class="barn-item-icon">${m.icon}</span>
                <strong>${m.name}</strong>
                <small>Trong kho: <b>x${cnt}</b></small>
                <button type="button" class="btn-playrix btn-purple farm-mini-btn" data-sell-item="${k}" ${cnt > 0 ? '' : 'disabled'}>
                  💰 Bán 1 (+${m.sellCoins}💰)
                </button>
              </div>`;
            })
            .join('')}
        </div>`;
    }

    body.innerHTML = `
      <div class="farm-top-strip">
        <div>🌾 <strong>Cấp Nông Trại ${farm.farmLevel}</strong> (${farm.farmXp}/${nextXp} XP)
          <span class="farm-xp-mini"><i style="width:${xpPct}%;"></i></span>
        </div>
        <div>🏠 Kho: <strong>${totalBarn}/${farm.barnCapacity}</strong> · 💧 Sương Phép: <strong>${farm.dewdrops || 0}</strong></div>
      </div>
      <div class="farm-modal-tabs" role="tablist">
        <button type="button" class="farm-tab-btn ${activeTab === 'orders' ? 'active' : ''}" data-farm-tab="orders">🦉 Đơn Hàng Cú</button>
        <button type="button" class="farm-tab-btn ${activeTab === 'workshops' ? 'active' : ''}" data-farm-tab="workshops">🥧 Bếp &amp; Vạc Phép</button>
        <button type="button" class="farm-tab-btn ${activeTab === 'feast' ? 'active' : ''}" data-farm-tab="feast">🍽️ Đại Tiệc (+⭐)</button>
        <button type="button" class="farm-tab-btn ${activeTab === 'barn' ? 'active' : ''}" data-farm-tab="barn">🏠 Kho Lẫm</button>
      </div>
      <div class="farm-tab-panel">${tabHtml}</div>
    `;

    for (const tb of body.querySelectorAll('[data-farm-tab]')) {
      tb.onclick = () => {
        sound.sfxClick();
        activeTab = tb.getAttribute('data-farm-tab');
        render();
      };
    }

    for (const btn of body.querySelectorAll('[data-deliver-order]')) {
      btn.onclick = () => {
        const idx = Number(btn.getAttribute('data-deliver-order'));
        const ord = farm.owlOrders[idx];
        if (!ord || !canFulfillOrder(farm, ord)) return;
        for (const [k, qty] of Object.entries(ord.items)) farm.barn[k] -= qty;
        app.save.coins += ord.rewardCoins;
        app.save.seasonXp = (app.save.seasonXp || 0) + ord.rewardSeasonXp;
        if (ord.bonusDewdrop) farm.dewdrops = (farm.dewdrops || 0) + ord.bonusDewdrop;
        const lvUp = addFarmXp(farm, ord.rewardFarmXp);
        farm.owlOrders[idx] = generateOwlOrder(farm.farmLevel, idx);
        saveFarmState(farm);
        app.persistAndSyncHud();
        sound.sfxVictory();
        haptics.victory?.();
        app.toast(
          `🦉 Cú Đưa Thư đã giao đơn! +${ord.rewardCoins} 💰, +${ord.rewardFarmXp} XP Nông Trại${lvUp ? ` (Lên Cấp ${farm.farmLevel}!)` : ''}!`
        );
        render();
      };
    }

    for (const btn of body.querySelectorAll('[data-reroll-order]')) {
      btn.onclick = () => {
        if (app.save.coins < 15) return app.toast('Cần 15 💰 để gọi Cú mang đơn hàng mới!');
        const idx = Number(btn.getAttribute('data-reroll-order'));
        app.save.coins -= 15;
        farm.owlOrders[idx] = generateOwlOrder(farm.farmLevel, idx);
        saveFarmState(farm);
        app.persistAndSyncHud();
        sound.sfxClick();
        render();
      };
    }

    body.querySelector('#btn-jump-build-workshops')?.addEventListener('click', () => {
      sound.sfxClick();
      closeModal(dialog).then(() => {
        app.openFarmBuildCategory?.('workshops', 'butterbeer_mill');
      });
    });

    for (const btn of body.querySelectorAll('[data-start-recipe]')) {
      btn.onclick = () => {
        const rec = FARM_RECIPES.find((r) => r.id === btn.getAttribute('data-start-recipe'));
        const stations = (farm.entities || []).filter((e) => WORKSHOP_TYPES.includes(e.type));
        const { target } = rec ? findIdleWorkshopForRecipe(stations, rec, focusStationUid) : { target: null };
        if (!rec || !target || !canCraftRecipe(farm, rec)) return;
        for (const [k, qty] of Object.entries(rec.inputs)) farm.barn[k] -= qty;
        const fastMill = rec.id === 'butterbeer' && target.type === 'butterbeer_mill' ? 0.75 : 1.0;
        const durationMs = Math.round(rec.craftSec * 1000 * fastMill);
        target.recipeId = rec.id;
        target.startedAt = Date.now();
        target.readyAt = Date.now() + durationMs;
        saveFarmState(farm);
        app.persistAndSyncHud();
        sound.sfxClick();
        const def = getBuildingDef(target.type);
        app.toast(`🔥 Đã đưa "${rec.name}" vào ${def?.name || rec.stationName} tại Ô (${target.col},${target.row})!`);
        render();
      };
    }

    for (const btn of body.querySelectorAll('[data-dew-uid]')) {
      btn.onclick = () => {
        const uid = btn.getAttribute('data-dew-uid');
        const st = (farm.entities || []).find((e) => e.uid === uid);
        if (!st?.recipeId || (farm.dewdrops || 0) <= 0) return;
        farm.dewdrops -= 1;
        st.readyAt = Date.now() - 1;
        saveFarmState(farm);
        app.persistAndSyncHud();
        sound.sfxRainbow();
        render();
      };
    }

    for (const btn of body.querySelectorAll('[data-collect-uid]')) {
      btn.onclick = () => {
        const uid = btn.getAttribute('data-collect-uid');
        const st = (farm.entities || []).find((e) => e.uid === uid);
        const rec = FARM_RECIPES.find((r) => r.id === st?.recipeId);
        if (!rec || Date.now() < st.readyAt) return;
        st.recipeId = null;
        const msg = applyRecipeRewardEffect(app, rec);
        addFarmXp(farm, rec.xp);
        saveFarmState(farm);
        app.persistAndSyncHud();
        sound.sfxVictory();
        app.toast(msg);
        render();
      };
    }

    for (const btn of body.querySelectorAll('[data-donate-feast]')) {
      btn.onclick = () => {
        const k = btn.getAttribute('data-donate-feast');
        const pts = FEAST_POINTS[k] || 10;
        if ((farm.barn[k] || 0) <= 0) return;
        farm.barn[k] -= 1;
        farm.feastProgress = (farm.feastProgress || 0) + pts;
        addFarmXp(farm, Math.ceil(pts * 0.5));
        if (farm.feastProgress >= 100) {
          farm.feastProgress -= 100;
          farm.feastTier = (farm.feastTier || 1) + 1;
          app.save.stars += 1;
          app.save.coins += 350;
          app.save.seasonXp = (app.save.seasonXp || 0) + 60;
          sound.sfxVictory();
          haptics.victory?.();
          app.toast('🎉 ĐẠI TIỆC HOÀN TẤT! Bạn nhận được +1 ⭐ Sao Cải Tạo & +350 💰 Galleon!');
        } else {
          sound.sfxCoin();
        }
        saveFarmState(farm);
        app.persistAndSyncHud();
        render();
      };
    }

    for (const btn of body.querySelectorAll('[data-sell-item]')) {
      btn.onclick = () => {
        const k = btn.getAttribute('data-sell-item');
        const meta = FARM_ITEM_META[k];
        if (!meta || (farm.barn[k] || 0) <= 0) return;
        farm.barn[k] -= 1;
        app.save.coins += meta.sellCoins;
        saveFarmState(farm);
        app.persistAndSyncHud();
        sound.sfxCoin();
        render();
      };
    }

    body.querySelector('#btn-upgrade-barn')?.addEventListener('click', () => {
      const upgCost = 180 + Math.floor((farm.barnCapacity - 100) / 30) * 140;
      if (app.save.coins < upgCost) return app.toast(`Cần ${upgCost} 💰 để mở rộng Kho Lẫm!`);
      app.save.coins -= upgCost;
      farm.barnCapacity += 30;
      saveFarmState(farm);
      app.persistAndSyncHud();
      sound.sfxVictory();
      app.toast(`🏠 Đã nâng sức chứa Kho Lẫm lên ${farm.barnCapacity} ô!`);
      render();
    });
  };

  render();
  openModal(dialog);
}
