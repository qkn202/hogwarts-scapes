/**
 * Hogwarts Live-Ops & Tournaments Modal (4 Tabs):
 * - Tab 1: 🏆 Vé Mùa Phượng Hoàng + Két Vàng Phượng Hoàng Vô Cực (+600 XP repeatable vault)
 * - Tab 2: 🐸 Bộ Sưu Tập 12 Thẻ Ếch Sô-cô-la + Xin Thẻ Hội Nhà Online
 * - Tab 3: 🧹 Đua Chổi Quidditch (10-Level Sprint)
 * - Tab 4: 🔥 Chiếc Cốc Lửa (7-Streak 10,000 💰 Jackpot)
 */

import {
  ALL_FROG_CARDS,
  CHOCOLATE_FROG_SETS,
  SEASON_PASS_TIERS,
  applyRewardBundle,
  drawRandomFrogCards,
  ensureBroomRace,
  ensureGobletState,
  getBonusVaultStatus,
  getCardSetRewardLabel,
  getSeasonTierLabel,
} from '../data/liveOpsDefs.js';
import { openModal } from '../utils/dialogHelper.js';
import { haptics } from '../utils/haptics.js';
import { sound } from '../utils/sound.js';
import { apiRequest } from './onlineApi.js';
import { syncOnlineProfile } from './onlineHubModal.js';
import {
  bindTournamentActions,
  renderGobletOfFireHtml,
  renderQuidditchRaceHtml,
} from './tournamentsTab.js';

export function openEventsModal(app, activeTab = 'pass') {
  const dialog = document.getElementById('dialog-events');
  const body = document.getElementById('events-body');
  if (!dialog || !body) return;

  ensureBroomRace(app.save);
  ensureGobletState(app.save);
  const xp = app.save.seasonXp || 0;
  const streak = app.save.winStreak || 0;
  const ownedUnique = ALL_FROG_CARDS.filter((c) => (app.save.cards?.[c.id] || 0) > 0).length;

  const panelHtml =
    activeTab === 'cards'
      ? renderFrogCardsHtml(app, ownedUnique)
      : activeTab === 'race'
        ? renderQuidditchRaceHtml(app)
        : activeTab === 'goblet'
          ? renderGobletOfFireHtml(app)
          : renderSeasonPassHtml(app, xp, streak);

  body.innerHTML = `
    <div class="tablet-tabs" role="tablist" aria-label="Sự kiện phép thuật Hogwarts" style="flex-wrap:wrap;">
      <button type="button" role="tab" aria-selected="${activeTab === 'pass'}"
        class="tablet-tab-btn ${activeTab === 'pass' ? 'active' : ''}" data-ev-tab="pass">
        🏆 Vé Mùa
      </button>
      <button type="button" role="tab" aria-selected="${activeTab === 'cards'}"
        class="tablet-tab-btn ${activeTab === 'cards' ? 'active' : ''}" data-ev-tab="cards">
        🐸 Thẻ (${ownedUnique}/${ALL_FROG_CARDS.length})
      </button>
      <button type="button" role="tab" aria-selected="${activeTab === 'race'}"
        class="tablet-tab-btn ${activeTab === 'race' ? 'active' : ''}" data-ev-tab="race">
        🧹 Đua Chổi
      </button>
      <button type="button" role="tab" aria-selected="${activeTab === 'goblet'}"
        class="tablet-tab-btn ${activeTab === 'goblet' ? 'active' : ''}" data-ev-tab="goblet">
        🔥 Cốc Lửa
      </button>
    </div>
    <div id="ev-tabpanel" role="tabpanel" style="display:flex; flex-direction:column; gap:12px;">
      ${panelHtml}
    </div>
  `;

  for (const btn of body.querySelectorAll('[data-ev-tab]')) {
    btn.addEventListener('click', () => {
      sound.sfxClick();
      openEventsModal(app, btn.getAttribute('data-ev-tab'));
    });
  }

  body.querySelector('#btn-claim-bonus-vault')?.addEventListener('click', () => {
    const v = getBonusVaultStatus(app.save);
    if (v.claimable <= 0) return;
    app.save.vaultClaims = (app.save.vaultClaims || 0) + 1;
    applyRewardBundle(app.save, { coins: 350, pre_rainbow: 1 }, app.gameId);
    haptics.victory();
    sound.sfxVictory();
    app.persistAndSyncHud();
    app.toast('🔐 Đã mở Két Vàng Phượng Hoàng Vô Cực: +350 💰 & +1 Bảo Bối Cầu Vồng!');
    openEventsModal(app, 'pass');
  });

  for (const claimBtn of body.querySelectorAll('[data-claim-tier]')) {
    claimBtn.addEventListener('click', () => {
      const tierNum = Number(claimBtn.getAttribute('data-claim-tier'));
      const def = SEASON_PASS_TIERS.find((t) => t.tier === tierNum);
      if (!def || xp < def.xp || app.save.claimedSeasonTiers.includes(tierNum)) return;
      app.save.claimedSeasonTiers.push(tierNum);
      const cards = applyRewardBundle(app.save, def.reward, app.gameId);
      haptics.victory();
      sound.sfxVictory();
      app.persistAndSyncHud();
      const cardMsg = cards.length > 0 ? ` (Mở thẻ: ${cards.map((c) => c.name).join(', ')})` : '';
      app.toast(`🏆 Đã nhận Bậc ${tierNum}: ${getSeasonTierLabel(def, app.gameId)}${cardMsg}!`);
      openEventsModal(app, 'pass');
    });
  }

  for (const setBtn of body.querySelectorAll('[data-claim-set]')) {
    setBtn.addEventListener('click', () => {
      const setId = setBtn.getAttribute('data-claim-set');
      const setDef = CHOCOLATE_FROG_SETS.find((s) => s.id === setId);
      if (!setDef || app.save.claimedCardSets.includes(setId)) return;
      if (!setDef.cards.every((c) => (app.save.cards?.[c.id] || 0) > 0)) return;
      app.save.claimedCardSets.push(setId);
      applyRewardBundle(app.save, setDef.reward, app.gameId);
      haptics.victory();
      sound.sfxVictory();
      app.persistAndSyncHud();
      app.toast(`🐸 Hoàn tất "${setDef.title}": ${getCardSetRewardLabel(setDef, app.gameId)}!`);
      openEventsModal(app, 'cards');
    });
  }

  for (const reqBtn of body.querySelectorAll('[data-req-card]')) {
    reqBtn.addEventListener('click', async () => {
      const cardId = reqBtn.getAttribute('data-req-card');
      const cardDef = ALL_FROG_CARDS.find((c) => c.id === cardId);
      if (!cardDef) return;
      reqBtn.disabled = true;
      try {
        await syncOnlineProfile(app);
        await apiRequest('/api/request-card', 'POST', {
          playerId: app.save.playerId,
          gameId: app.gameId,
          cardId: cardDef.id,
          cardName: cardDef.name,
        });
        sound.sfxClick();
        app.toast(`📣 Đã đăng lời xin Thẻ "${cardDef.name}" lên Phòng Sinh Hoạt Nhà!`);
      } catch (err) {
        reqBtn.disabled = false;
        app.toast(`⚠️ ${err.message}`);
      }
    });
  }

  body.querySelector('#btn-buy-frog-pack')?.addEventListener('click', () => {
    if (app.save.coins < 350) {
      app.toast('Cần 350 💰 Galleon để mở hộp Ếch Sô-cô-la Công Tước Mật!');
      return;
    }
    app.save.coins -= 350;
    const [drawn] = drawRandomFrogCards(app.save, 1);
    haptics.tap();
    sound.sfxVictory();
    app.persistAndSyncHud();
    app.toast(
      drawn.isNew
        ? `🐸 THẺ MỚI! Bạn nhận được "${drawn.name}" (${drawn.rarity})!`
        : `🐸 Nhận thẻ "${drawn.name}" trùng — quy đổi ngay +60 💰!`
    );
    openEventsModal(app, 'cards');
  });

  bindTournamentActions(app, body, (tab) => openEventsModal(app, tab));
  openModal(dialog);
}

function renderSeasonPassHtml(app, xp, streak) {
  const isHome = app.gameId === 'homescapes';
  const hatTier = Math.min(3, streak);
  const superReady = streak >= 10;
  const nextTier = SEASON_PASS_TIERS.find((t) => xp < t.xp) || SEASON_PASS_TIERS[SEASON_PASS_TIERS.length - 1];
  const pct = Math.min(100, Math.round((xp / nextTier.xp) * 100));
  const bannerBg = isHome ? 'linear-gradient(135deg,#6b141c,#33080d)' : 'linear-gradient(135deg,#133e28,#0b2417)';
  const vault = getBonusVaultStatus(app.save);
  const vaultPct = vault.unlocked ? Math.min(100, Math.round((vault.progressInStep / vault.step) * 100)) : 0;

  return `
    <div class="modal-parchment-box" style="background:${bannerBg}; color:#fff8e6; border-color:#d4af37;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
        <div>
          <div style="font-weight:900; font-size:1rem; color:#ffea9c;">🔥 Vé Mùa Giải Phượng Hoàng · Tim tối đa: ${app.save.maxLives} ❤️</div>
          <div style="font-size:0.8rem; color:#f9e5d8;">Điểm Kinh Nghiệm Phép: <strong>${xp.toLocaleString()} XP</strong> (Mục tiêu kế: ${nextTier.xp} XP)</div>
        </div>
        <span class="hud-pill" style="font-size:0.8rem;">🎩 Mũ Phân Loại: Bậc ${hatTier}/3</span>
      </div>
      <div class="rainbow-bar-track" style="margin:8px 0;">
        <div class="rainbow-bar-fill" style="width:${pct}%;"></div>
      </div>
      <div style="font-size:0.78rem; color:#ffe8a3;">
        ${isHome ? '⏳ <strong>Siêu Xoay Thời Gian' : '🦌 <strong>Siêu Thần Hộ Mệnh'} (Chuỗi 10 thắng):</strong>
        ${superReady ? `⚡ ĐÃ KÍCH HOẠT! ${isHome ? 'Xoay Thời Gian' : 'Cầu Patronus'} quét sạch 2 màu cùng lúc!` : `Đang có 🔥 ${streak}/10 trận thắng liên tiếp`}
      </div>
    </div>

    <div class="modal-parchment-box" style="border-color:#ffd166; background:#fffaf0;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
        <div>
          <div style="font-weight:900; color:#7f4f24;">🔐 Két Vàng Phượng Hoàng Vô Cực (Mỗi +${vault.step} XP sau Bậc 15)</div>
          <div style="font-size:0.78rem; color:#5c4738;">
            ${vault.unlocked ? `Tiến độ két tiếp: ${vault.progressInStep}/${vault.step} XP · Đã mở: ${vault.claimed} lần` : 'Đạt 6,200 XP (Bậc 15) để mở khóa Két Vàng lặp lại vô hạn!'}
          </div>
        </div>
        ${vault.claimable > 0
          ? `<button type="button" class="btn-playrix btn-gold" id="btn-claim-bonus-vault">🎁 Mở Két (x${vault.claimable})</button>`
          : `<span style="font-size:0.78rem; font-weight:800; color:#6c757d;">+350 💰 &amp; +1 Cầu Vồng</span>`
        }
      </div>
      ${vault.unlocked ? `<div class="rainbow-bar-track" style="margin-top:6px; background:rgba(0,0,0,0.08);"><div class="rainbow-bar-fill" style="width:${vaultPct}%;"></div></div>` : ''}
    </div>

    <div class="task-list">
      ${SEASON_PASS_TIERS.map((t) => {
        const unlocked = xp >= t.xp;
        const claimed = app.save.claimedSeasonTiers.includes(t.tier);
        return `
          <div class="task-card ${claimed ? 'completed' : ''}">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:1.5rem;">${t.icon}</span>
              <div>
                <div style="font-weight:800;">Bậc ${t.tier} (${t.xp} XP) · ${getSeasonTierLabel(t, app.gameId)}</div>
                <div style="font-size:0.76rem; color:#5c4738;">Thắng màn nhận +100..240 XP (Chế độ Ác Mộng x2 XP!)</div>
              </div>
            </div>
            ${claimed
              ? `<span style="font-weight:800; color:#166541;">✓ Đã nhận</span>`
              : unlocked
                ? `<button type="button" class="btn-playrix btn-gold" data-claim-tier="${t.tier}">Nhận Quà</button>`
                : `<span style="font-size:0.8rem; font-weight:700; color:#6c757d;">🔒 ${t.xp} XP</span>`
            }
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderFrogCardsHtml(app, ownedUnique) {
  return `
    <div class="modal-parchment-box" style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
      <div>
        <div style="font-weight:900;">🐸 Sưu Tập Thẻ Ếch Sô-cô-la (${ownedUnique}/${ALL_FROG_CARDS.length})</div>
        <div style="font-size:0.79rem; color:#5c4738;">Xin thẻ còn thiếu tại Hội Nhà hoặc tặng thẻ trùng (x2+) để nhận +80 💰!</div>
      </div>
      <button type="button" class="btn-playrix btn-gold" id="btn-buy-frog-pack">🐸 Mở Hộp (350 💰)</button>
    </div>

    ${CHOCOLATE_FROG_SETS.map((setDef) => {
      const doneCount = setDef.cards.filter((c) => (app.save.cards?.[c.id] || 0) > 0).length;
      const isComplete = doneCount === setDef.cards.length;
      const isClaimed = app.save.claimedCardSets.includes(setDef.id);
      return `
        <div class="modal-parchment-box">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
            <div>
              <strong>${setDef.title} (${doneCount}/4)</strong>
              <div style="font-size:0.76rem; color:#5c4738;">Thưởng trọn bộ: ${getCardSetRewardLabel(setDef, app.gameId)}</div>
            </div>
            ${isClaimed
              ? `<span style="color:#166541; font-weight:800;">🎁 Đã nhận bộ</span>`
              : isComplete
                ? `<button type="button" class="btn-playrix btn-gold" data-claim-set="${setDef.id}">🎁 Nhận Thưởng Bộ!</button>`
                : `<span style="font-size:0.78rem; color:#6c757d;">Còn thiếu ${4 - doneCount} thẻ</span>`
            }
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(135px, 1fr)); gap:8px;">
            ${setDef.cards
              .map((c) => {
                const cnt = app.save.cards?.[c.id] || 0;
                return `
                  <div style="padding:8px; border-radius:12px; border:2px solid ${cnt > 0 ? '#d4af37' : '#ccc'}; background:${cnt > 0 ? '#fffdf5' : 'rgba(0,0,0,0.05)'}; text-align:center;">
                    <div style="font-size:1.55rem;">${cnt > 0 ? c.icon : '❔'}</div>
                    <div style="font-weight:800; font-size:0.82rem;">${c.name}</div>
                    <div style="font-size:0.7rem; color:#7a5520;">${c.rarity} ${cnt > 0 ? `· x${cnt}` : '· Chưa mở'}</div>
                    ${cnt === 0 ? `<button type="button" class="btn-playrix btn-purple" data-req-card="${c.id}" style="margin-top:5px; padding:3px 8px; font-size:0.7rem;">📣 Xin Hội Nhà</button>` : ''}
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      `;
    }).join('')}
  `;
}
