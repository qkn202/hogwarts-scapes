/**
 * Hogwarts House Teams, SSE Real-Time Chat, Life & Frog Card Trading, Claimable Team Chest,
 * Dual-World House Cup & Friend Castle/Garden Visiting Modal (/api/*).
 */

import { ALL_FROG_CARDS, HOGWARTS_HOUSES } from '../data/liveOpsDefs.js';
import { closeModal, openModal } from '../utils/dialogHelper.js';
import { haptics } from '../utils/haptics.js';
import { sound } from '../utils/sound.js';
import { refreshLives, sanitizePlainText } from '../utils/storage.js';
import { apiRequest } from './onlineApi.js';
import { renderChatFeed, startTeamChatPolling, stopTeamChatPolling } from './teamChatFeed.js';

let hubRenderSeq = 0;

export async function syncOnlineProfile(app) {
  try {
    const res = await apiRequest('/api/sync', 'POST', {
      id: app.save.playerId,
      gameId: app.gameId,
      name: app.save.playerName,
      house: app.save.house,
      level: app.save.level,
      stars: app.save.stars,
      masteryTier: app.save.masteryTier,
      winStreak: app.save.winStreak,
      petName: app.save.petName,
      weather: app.save.weather,
      completedTasks: app.save.completedTasks,
    });

    if (res.unclaimedCards > 0) {
      const cRes = await apiRequest('/api/claim-cards', 'POST', {
        playerId: app.save.playerId,
        gameId: app.gameId,
      });
      if (cRes.cards?.length > 0) {
        for (const row of cRes.cards) {
          app.save.cards[row.cardId] = (app.save.cards[row.cardId] || 0) + 1;
        }
        app.persistAndSyncHud();
        const names = cRes.cards
          .map((r) => ALL_FROG_CARDS.find((c) => c.id === r.cardId)?.name || r.cardId)
          .join(', ');
        app.toast(`🐸 Đã nhận Thẻ Ếch đồng đội tặng: ${names}!`);
      }
    }

    if (res.unclaimedKudos > 0) {
      const kRes = await apiRequest('/api/claim-kudos', 'POST', {
        playerId: app.save.playerId,
        gameId: app.gameId,
      });
      if (kRes.count > 0) {
        app.save.coins += kRes.rewardCoins || kRes.count * 25;
        app.persistAndSyncHud();
        app.toast(`🎆 ${kRes.visitors.join(', ')} vừa khen ngợi công trình của bạn (+${kRes.rewardCoins} 💰)!`);
      }
    }

    app.unclaimedOnlineLives = res.unclaimedGifts || 0;
    const badge = document.getElementById('online-badge');
    if (badge) {
      badge.textContent = String(app.unclaimedOnlineLives);
      badge.classList.toggle('hidden', app.unclaimedOnlineLives <= 0);
    }
    return res;
  } catch {
    return null;
  }
}

export async function visitWizardGardenById(app, rawId, parentDialog = null) {
  const cleanId = String(rawId || '').trim().toUpperCase();
  if (!cleanId) return app.toast('Hãy nhập Mã Phù Thủy (VD: HW-LUNALV)!');
  try {
    const { garden } = await apiRequest(`/api/visit/${encodeURIComponent(cleanId)}`);
    haptics.tap();
    sound.sfxRainbow();
    if (parentDialog?.open) await closeModal(parentDialog);
    app.enterVisitorGarden(garden);
  } catch (err) {
    app.toast(`⚠️ ${err.message}`);
  }
}

export async function openOnlineHubModal(app, activeTab = 'team') {
  const dialog = document.getElementById('dialog-online');
  const body = document.getElementById('online-body');
  if (!dialog || !body) return;
  const seq = ++hubRenderSeq;
  const isStale = () => seq !== hubRenderSeq || !dialog.open;
  const titleEl = document.getElementById('online-title');
  if (titleEl) {
    titleEl.textContent =
      app.gameId === 'homescapes'
        ? '🏰 Hội Nhà Hogwarts & Thăm Lâu Đài Online'
        : '🏰 Hội Nhà Hogwarts & Thăm Vườn Online';
  }

  body.innerHTML = `<div style="text-align:center; padding:18px; font-weight:800;">🦉 Đang triệu hồi Mạng Lưới Cú Đưa Thư Hogwarts...</div>`;
  openModal(dialog);
  stopTeamChatPolling();

  await syncOnlineProfile(app);
  if (isStale()) return;

  if (activeTab === 'team') await renderTeamRoomTab(app, dialog, body, isStale);
  else if (activeTab === 'cup') await renderHouseCupTab(app, dialog, body, isStale);
  else renderVisitByIdTab(app, dialog, body);
}

function buildTabsHeader(app, body, activeTab) {
  const isHome = app.gameId === 'homescapes';
  const nav = document.createElement('div');
  nav.className = 'tablet-tabs';
  nav.setAttribute('role', 'tablist');
  const tabs = [
    ['team', '🏰 Hội Nhà & Chat'],
    ['cup', '🏆 Cúp 4 Nhà'],
    ['visit', isHome ? '⚡ Thăm Lâu Đài ID' : '⚡ Thăm Vườn ID'],
  ];
  for (const [id, label] of tabs) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(activeTab === id));
    btn.className = `tablet-tab-btn ${activeTab === id ? 'active' : ''}`;
    btn.textContent = label;
    btn.onclick = () => {
      sound.sfxClick();
      openOnlineHubModal(app, id);
    };
    nav.appendChild(btn);
  }
  body.replaceChildren(nav);
}

async function renderTeamRoomTab(app, dialog, body, isStale) {
  buildTabsHeader(app, body, 'team');
  let state;
  try {
    state = await apiRequest(`/api/house/${app.save.house}?playerId=${encodeURIComponent(app.save.playerId)}`);
  } catch (err) {
    if (isStale()) return;
    body.appendChild(buildOfflineBox(app, err.message, 'team'));
    return;
  }
  if (isStale()) return;

  const profileBox = document.createElement('form');
  profileBox.className = 'modal-parchment-box';
  profileBox.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
      <div>
        <label for="wizard-nick-input" style="font-weight:800; font-size:0.84rem; display:block;">🧙‍♂️ Hộ Chiếu Phù Thủy Chung (Lâu Đài &amp; Vườn):</label>
        <input id="wizard-nick-input" type="text" maxlength="20" required
          style="padding:7px 10px; border-radius:10px; border:2px solid #c69f47; font-size:1rem; font-weight:700; width:180px;" />
      </div>
      <div style="text-align:right;">
        <div style="font-size:0.75rem; color:#5c4738; font-weight:700;">Mã Định Danh Của Bạn:</div>
        <button type="button" class="btn-playrix btn-gold" id="btn-copy-wiz-id" style="padding:5px 10px; font-size:0.82rem;"></button>
      </div>
    </div>
    <fieldset style="border:0; padding:0; margin:6px 0 10px;">
      <legend style="font-weight:800; font-size:0.83rem; margin-bottom:6px;">🛡️ Chọn Nhà Hogwarts (Đồng đội cùng Nhà):</legend>
      <div class="house-radio-grid">
        ${HOGWARTS_HOUSES.map(
          (h) => `
          <label class="house-radio-pill ${app.save.house === h.id ? 'checked' : ''}" style="--house-accent:${h.color};">
            <input type="radio" name="hogwarts-house" value="${h.id}" ${app.save.house === h.id ? 'checked' : ''} />
            <span>${h.crest} ${h.name}</span>
          </label>`
        ).join('')}
      </div>
    </fieldset>
    <button type="submit" class="btn-playrix" style="width:100%; padding:8px;">💾 Lưu Danh Xưng &amp; Đồng Bộ Nhà</button>
  `;
  profileBox.querySelector('#wizard-nick-input').value = app.save.playerName;
  const copyBtn = profileBox.querySelector('#btn-copy-wiz-id');
  copyBtn.textContent = `📋 ${app.save.playerId}`;
  copyBtn.onclick = () => {
    navigator.clipboard?.writeText(app.save.playerId).catch(() => {});
    app.toast(`📋 Đã sao chép mã ${app.save.playerId} — Bạn bè dùng mã này thăm cả Lâu Đài lẫn Khuôn Viên của bạn!`);
  };
  profileBox.onsubmit = async (e) => {
    e.preventDefault();
    const nick = sanitizePlainText(profileBox.querySelector('#wizard-nick-input').value, '', 20);
    const pickedHouse = profileBox.querySelector('input[name="hogwarts-house"]:checked')?.value || 'gryffindor';
    if (nick) app.save.playerName = nick;
    app.save.house = pickedHouse;
    if (!app.visitingGarden && app.gameId === 'homescapes') {
      app.homeRenderer.setState({ house: pickedHouse });
    }
    app.persistAndSyncHud();
    await syncOnlineProfile(app);
    sound.sfxCoin();
    app.toast('🏰 Đã cập nhật Hộ Chiếu Phù Thủy & Phòng Sinh Hoạt Nhà cho cả 2 thế giới!');
    openOnlineHubModal(app, 'team');
  };
  body.appendChild(profileBox);

  // Sync server-persisted Team Chest claims and find the lowest unclaimed unlocked tier
  let syncedChestChange = false;
  for (const t of state.claimedChestTiers || []) {
    const k = `${app.save.house}_t${t}`;
    if (!app.save.claimedTeamChests.includes(k)) {
      app.save.claimedTeamChests.push(k);
      syncedChestChange = true;
    }
  }
  if (syncedChestChange) app.persistAndSyncHud();

  let nextClaimTier = null;
  for (let t = 1; t <= (state.unlockedChestTier || 0); t++) {
    if (!app.save.claimedTeamChests.includes(`${app.save.house}_t${t}`)) {
      nextClaimTier = t;
      break;
    }
  }

  // Team Chest + Claimable Milestone + Request/Claim Lives
  const chestBox = document.createElement('div');
  chestBox.className = 'modal-parchment-box';
  const stepBase = (state.unlockedChestTier || 0) * (state.chestStep || 150);
  const inStep = Math.max(0, state.totalLevels - stepBase);
  const chestPct = Math.min(100, Math.round((inStep / (state.chestStep || 150)) * 100));

  chestBox.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
      <strong>🎁 Rương Chung Nhà: ${state.totalLevels}/${state.chestTarget} Màn (${state.members.length} phù thủy)</strong>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        ${nextClaimTier !== null ? `<button type="button" class="btn-playrix btn-gold" id="btn-claim-team-chest" style="padding:6px 11px; font-size:0.8rem;">🎁 Mở Rương Bậc ${nextClaimTier} (+400💰+1⭐)</button>` : ''}
        <button type="button" class="btn-playrix btn-red" id="btn-req-life" style="padding:6px 11px; font-size:0.82rem;">❤️ Xin Tim</button>
        ${state.unclaimedGifts > 0 ? `<button type="button" class="btn-playrix btn-gold" id="btn-claim-gifts" style="padding:6px 11px; font-size:0.82rem;">📥 Nhận +${state.unclaimedGifts} ❤️</button>` : ''}
      </div>
    </div>
    <div class="rainbow-bar-track" style="margin-top:6px; background:rgba(92,71,56,0.16);">
      <div class="rainbow-bar-fill" style="width:${chestPct}%;"></div>
    </div>
  `;
  chestBox.querySelector('#btn-claim-team-chest')?.addEventListener('click', async () => {
    if (nextClaimTier === null) return;
    try {
      const r = await apiRequest('/api/claim-team-chest', 'POST', {
        playerId: app.save.playerId,
        tier: nextClaimTier,
      });
      const tierKey = `${app.save.house}_t${nextClaimTier}`;
      if (!app.save.claimedTeamChests.includes(tierKey)) app.save.claimedTeamChests.push(tierKey);
      app.save.coins += r.rewardCoins || 400;
      app.save.stars += 1;
      app.persistAndSyncHud();
      haptics.victory();
      sound.sfxVictory();
      app.toast(`🎁 Đã mở Rương Chung Nhà Bậc ${nextClaimTier}: +400 💰 & +1 ⭐!`);
      openOnlineHubModal(app, 'team');
    } catch (err) {
      app.toast(`⚠️ ${err.message}`);
    }
  });
  chestBox.querySelector('#btn-req-life').onclick = async () => {
    try {
      await apiRequest('/api/request-life', 'POST', { playerId: app.save.playerId });
      sound.sfxClick();
      app.toast('❤️ Đã gửi lời xin Tim lên Phòng Sinh Hoạt Nhà!');
      openOnlineHubModal(app, 'team');
    } catch (err) {
      app.toast(`⏳ ${err.message}`);
    }
  };
  chestBox.querySelector('#btn-claim-gifts')?.addEventListener('click', async () => {
    refreshLives(app.save);
    const room = Math.max(0, app.save.maxLives - app.save.lives);
    if (room <= 0) return app.toast('Tim của bạn đang đầy — để dành nhận khi hết Tim nhé!');
    try {
      const res = await apiRequest('/api/claim-lives', 'POST', { playerId: app.save.playerId, maxClaim: room });
      app.save.lives = Math.min(app.save.maxLives, app.save.lives + res.claimedCount);
      app.persistAndSyncHud();
      sound.sfxVictory();
      app.toast(`❤️ Đã nhận +${res.claimedCount} Tim từ đồng đội (${res.donors.join(', ')})!`);
      openOnlineHubModal(app, 'team');
    } catch (err) {
      app.toast(`⚠️ ${err.message}`);
    }
  });
  body.appendChild(chestBox);

  const chatList = document.createElement('div');
  chatList.className = 'online-chat-feed';
  chatList.setAttribute('aria-live', 'polite');
  const feedHooks = {
    onVisit: (playerId) => visitWizardGardenById(app, playerId, dialog),
    onRefresh: () => openOnlineHubModal(app, 'team'),
    onGiftsChanged: (count) => {
      app.unclaimedOnlineLives = count;
      const badge = document.getElementById('online-badge');
      if (badge) {
        badge.textContent = String(count);
        badge.classList.toggle('hidden', count <= 0);
      }
      const claimBtn = chestBox.querySelector('#btn-claim-gifts');
      if (claimBtn) claimBtn.textContent = `📥 Nhận +${count} ❤️`;
    },
  };
  renderChatFeed(app, chatList, state.messages, feedHooks);
  body.appendChild(chatList);
  startTeamChatPolling(app, dialog, chatList, feedHooks);

  const chatForm = document.createElement('form');
  chatForm.style.cssText = 'display:flex; gap:8px; align-items:center;';
  chatForm.innerHTML = `
    <label for="team-chat-input" class="sr-only">Nhập tin nhắn Phòng Sinh Hoạt</label>
    <input id="team-chat-input" type="text" maxlength="150" placeholder="Trò chuyện thời gian thực (SSE)..."
      style="flex:1; padding:9px 12px; border-radius:12px; border:2px solid #c69f47; font-size:1rem;" />
    <button type="submit" class="btn-playrix">Gửi 🦉</button>
  `;
  const chatInput = chatForm.querySelector('#team-chat-input');
  chatInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.isComposing || event.keyCode === 229)) event.preventDefault();
  });
  chatForm.onsubmit = async (e) => {
    e.preventDefault();
    const val = chatInput.value.trim();
    if (!val) return;
    chatInput.value = '';
    try {
      await apiRequest('/api/chat', 'POST', { playerId: app.save.playerId, text: val });
      sound.sfxClick();
      openOnlineHubModal(app, 'team');
    } catch (err) {
      app.toast(`⚠️ ${err.message}`);
    }
  };
  body.appendChild(chatForm);
}

async function renderHouseCupTab(app, dialog, body, isStale) {
  buildTabsHeader(app, body, 'cup');
  let data;
  try {
    data = await apiRequest('/api/leaderboard');
  } catch (err) {
    if (isStale()) return;
    body.appendChild(buildOfflineBox(app, err.message, 'cup'));
    return;
  }
  if (isStale()) return;

  const cupBox = document.createElement('div');
  cupBox.className = 'modal-parchment-box';
  const cupTitle = document.createElement('div');
  cupTitle.style.cssText = 'font-weight:900; margin-bottom:8px;';
  cupTitle.textContent = '🏆 Đua Cúp 4 Nhà (Tổng Màn Lâu Đài + Khuôn Viên × 10 + Tinh Luyện × 250)';
  cupBox.appendChild(cupTitle);

  for (const [idx, hRow] of data.houses.entries()) {
    const hMeta = HOGWARTS_HOUSES.find((x) => x.id === hRow.house) || HOGWARTS_HOUSES[0];
    const line = document.createElement('div');
    line.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:6px 10px; border-radius:10px; margin-bottom:5px; color:#fff; font-weight:800;';
    line.style.background = hMeta.color;
    line.textContent = `#${idx + 1} ${hMeta.crest} ${hMeta.name} (${hRow.members} phù thủy) — ${hRow.cupPoints.toLocaleString()} điểm`;
    cupBox.appendChild(line);
  }
  body.appendChild(cupBox);

  const list = document.createElement('div');
  list.className = 'task-list';
  for (const [idx, w] of data.topWizards.entries()) {
    const hMeta = HOGWARTS_HOUSES.find((x) => x.id === w.house) || HOGWARTS_HOUSES[0];
    const card = document.createElement('div');
    card.className = 'task-card';
    const info = document.createElement('div');
    const nameEl = document.createElement('strong');
    nameEl.textContent = `#${idx + 1} ${hMeta.crest} ${w.name}`;
    const subEl = document.createElement('div');
    subEl.style.cssText = 'font-size:0.77rem; color:#5c4738;';
    subEl.textContent = `🏰 Màn ${w.homeLevel || w.level} · 🌿 Màn ${w.gardenLevel || 1} · 🎆 ${w.kudosCount || 0} khen · ${w.id}`;
    info.append(nameEl, subEl);

    const isHome = app.gameId === 'homescapes';
    const vBtn = document.createElement('button');
    vBtn.type = 'button';
    vBtn.className = 'btn-playrix btn-purple';
    vBtn.textContent =
      w.id === app.save.playerId
        ? isHome ? '🏰 Lâu Đài Bạn' : '🏡 Vườn Bạn'
        : isHome ? '⚡ Thăm Lâu Đài' : '⚡ Thăm Vườn';
    vBtn.disabled = w.id === app.save.playerId;
    vBtn.onclick = () => visitWizardGardenById(app, w.id, dialog);
    card.append(info, vBtn);
    list.appendChild(card);
  }
  body.appendChild(list);
}

function renderVisitByIdTab(app, dialog, body) {
  buildTabsHeader(app, body, 'visit');
  const placeLabel = app.gameId === 'homescapes' ? 'Lâu Đài Hogwarts' : 'Khuôn Viên Hogwarts';
  const form = document.createElement('form');
  form.className = 'modal-parchment-box';
  form.innerHTML = `
    <label for="visit-wizard-id" style="font-weight:800; display:block; margin-bottom:6px;">
      ⚡ Nhập Mã Phù Thủy Bạn Bè Để Độn Thổ Tới Thăm ${placeLabel} 2.5D:
    </label>
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <input id="visit-wizard-id" type="text" maxlength="14" placeholder="VD: HW-LUNALV"
        autocorrect="off" autocapitalize="off" spellcheck="false" required
        style="flex:1; min-width:160px; padding:9px 12px; border-radius:12px; border:2px solid #c69f47; font-size:1rem; font-weight:800; text-transform:uppercase;" />
      <button type="submit" class="btn-playrix btn-gold">⚡ Độn Thổ Thăm Ngay</button>
    </div>
    <p style="margin:8px 0 0; font-size:0.8rem; color:#5c4738;">
      Chia sẻ mã <strong>${app.save.playerId}</strong> — Khi ghé thăm bạn có thể chuyển qua lại cả Lâu Đài 🏰 lẫn Khuôn Viên 🌿 và bắn Pháo Hoa Khen Đẹp 🎆!
    </p>
  `;
  form.onsubmit = (e) => {
    e.preventDefault();
    visitWizardGardenById(app, form.querySelector('#visit-wizard-id').value, dialog);
  };
  body.appendChild(form);
}

function buildOfflineBox(app, message, tab) {
  const box = document.createElement('div');
  box.className = 'modal-parchment-box';
  box.style.textAlign = 'center';
  const p = document.createElement('p');
  p.style.margin = '0 0 10px';
  p.textContent = `⚠️ ${message}`;
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'btn-playrix btn-gold';
  retry.textContent = '🔄 Thử Kết Nối Lại';
  retry.onclick = () => {
    sound.sfxClick();
    openOnlineHubModal(app, tab);
  };
  box.append(p, retry);
  return box;
}
