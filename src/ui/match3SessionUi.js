/**
 * Match-3 Active Session HUD, Booster Consumption, Victory (Season XP + Frog Cards + 77,777 Cap),
 * and Out-of-Moves Modal Handlers (Extracted from ScapesApp for clean < 400-line modularity).
 */

import { MAX_GARDENSCAPES_LEVEL } from '../data/gardenscapesLevels.js';
import { MAX_HOMESCAPES_LEVEL } from '../data/homescapesLevels.js';
import {
  computeSeasonXpForLevel,
  onTournamentLevelFail,
  onTournamentLevelWin,
  rollLevelVictoryCardDrop,
} from '../data/liveOpsDefs.js';
import { getGoalBadgeMeta } from '../match3/pieceArt.js';
import { closeModal, openModal } from '../utils/dialogHelper.js';
import { sound } from '../utils/sound.js';
import { refreshLives } from '../utils/storage.js';
import { INGAME_BOOSTER_DEFS, openLevelBriefingModal, renderBadgeVisual } from './modals.js';
import { syncOnlineProfile } from './onlineHubModal.js';
import { openMatch3PauseModal } from './settingsAndStyle.js';
import { dismissLevelTour } from './tutorialTour.js';

export function syncMatch3SessionHud(app, board, armedBooster) {
  const stageBadge =
    board.totalStages > 1 ? ` · GĐ ${board.stageIndex + 1}/${board.totalStages}` : '';
  const modeBadge = board.nightmare ? ' 🔥' : '';
  document.getElementById('m3-level-label').textContent =
    `Màn ${board.levelDef.level}${stageBadge}${modeBadge}`;

  const movesEl = document.getElementById('m3-moves-val');
  movesEl.textContent = String(board.movesLeft);
  movesEl.style.color = board.movesLeft <= 5 ? '#ff595e' : '#ffd166';
  document.getElementById('m3-score-val').textContent = board.score.toLocaleString();

  const moodEl = document.getElementById('m3-austin-mood');
  if (moodEl) {
    moodEl.textContent =
      board.movesLeft <= 5
        ? '⚡ Cẩn thận lượt phép cuối!'
        : board.superRainbow
          ? app.gameId === 'homescapes'
            ? '⏳✨ Siêu Xoay 2 Màu!'
            : '🦌✨ Siêu Patronus 2 Màu!'
          : board.score > 1200
            ? '🤩 Lumos Maxima!'
            : `🎩 Liên thắng: 🔥${app.save.winStreak}`;
  }

  document.getElementById('m3-goals-list').innerHTML = board.goals
    .map((g) => {
      const meta = getGoalBadgeMeta(app.gameId, g);
      const rem = Math.max(0, g.target - g.current);
      return `<div class="goal-chip ${rem === 0 ? 'done' : ''}">
        <div style="display:grid; place-items:center; height:30px;">${renderBadgeVisual(meta, 28)}</div>
        <div>${rem === 0 ? '✓' : rem}</div>
      </div>`;
    })
    .join('');

  const pct = Math.min(100, Math.round(board.rainbowCharge));
  const fillEl = document.getElementById('rainbow-charge-fill');
  if (fillEl) fillEl.style.width = `${pct}%`;
  const dialEl = document.getElementById('rainbow-dial-ring');
  if (dialEl) dialEl.style.setProperty('--charge-deg', `${Math.round(pct * 3.6)}deg`);
  const pctEl = document.getElementById('rainbow-charge-pct');
  if (pctEl) pctEl.textContent = `${pct}%`;

  const boosterCol = document.getElementById('m3-boosters-col');
  const defs = INGAME_BOOSTER_DEFS[app.gameId];
  boosterCol.innerHTML =
    defs
      .map((b) => {
        const cnt = app.save.boosters[b.key] || 0;
        return `<button type="button" class="booster-btn ${armedBooster === b.key ? 'armed' : ''}" data-ingame-booster="${b.key}">
          <span style="display:grid; place-items:center; height:30px;">${renderBadgeVisual(b, 28)}</span>
          <span>${b.name}</span>
          <span style="color:#ffd166;">${cnt > 0 ? `x${cnt}` : `+3 (${b.price}💰)`}</span>
        </button>`;
      })
      .join('') +
    `<button type="button" class="m3-pause-btn" id="m3-pause-btn" title="Tạm dừng / Thoát màn" aria-label="Tạm dừng">⚙️</button>`;

  boosterCol.querySelector('#m3-pause-btn')?.addEventListener('click', () => {
    if (app.m3Controller.finaleActive) return;
    sound.sfxClick();
    openMatch3PauseModal(app);
  });

  for (const btn of boosterCol.querySelectorAll('[data-ingame-booster]')) {
    btn.addEventListener('click', () => {
      if (app.m3Controller.busy || app.m3Controller.finaleActive) return;
      const key = btn.getAttribute('data-ingame-booster');
      const bDef = defs.find((d) => d.key === key);
      if ((app.save.boosters[key] || 0) <= 0) {
        if (app.save.coins >= bDef.price) {
          app.save.coins -= bDef.price;
          app.save.boosters[key] = 3;
          sound.sfxCoin();
          app.persistAndSyncHud();
        } else {
          app.toast(`Cần ${bDef.price} 💰 Galleon để mua gói +3 ${bDef.name}!`);
          return;
        }
      }
      app.m3Controller.setBoosterMode(key);
    });
  }
}

export function handleMatch3Victory(app, { score, bonusCoins, starReward, coinReward }) {
  dismissLevelTour();
  const isFrontier = app.activePlayingLevel === app.save.level;
  const earnedStars = isFrontier ? starReward : 0;
  const totalCoins = coinReward + bonusCoins;
  const boardDef = app.m3Controller.board?.levelDef || app.getLevelDef(app.activePlayingLevel);

  const gainedXp = computeSeasonXpForLevel(boardDef, Boolean(boardDef.nightmare));
  app.save.seasonXp = (app.save.seasonXp || 0) + gainedXp;
  const droppedCards = isFrontier
    ? rollLevelVictoryCardDrop(boardDef, app.save, Boolean(boardDef.nightmare))
    : [];

  app.save.stars += earnedStars;
  app.save.coins += totalCoins;
  app.save.winStreak += 1;
  onTournamentLevelWin(app.save);
  app.save.levelBestScores[app.activePlayingLevel] = Math.max(
    app.save.levelBestScores[app.activePlayingLevel] || 0,
    score
  );
  if (isFrontier) {
    const cap = app.gameId === 'gardenscapes' ? MAX_GARDENSCAPES_LEVEL : MAX_HOMESCAPES_LEVEL;
    app.save.level = Math.min(cap, app.save.level + 1);
  }
  app.persistAndSyncHud();
  syncOnlineProfile(app);

  const cardBanner =
    droppedCards.length > 0
      ? `<div style="margin:8px 0; padding:8px 12px; border-radius:12px; background:#fff3b0; border:2px solid #d4af37; font-weight:800; font-size:0.84rem;">
          🐸 Rơi Thẻ Ếch Sô-cô-la: ${droppedCards.map((c) => `${c.icon} ${c.name}${c.isNew ? ' (MỚI!)' : ' (+60💰)'}`).join(', ')}
        </div>`
      : '';

  const superBadge =
    app.save.winStreak >= 10
      ? app.gameId === 'homescapes'
        ? ' · ⏳✨ SIÊU XOAY THỜI GIAN!'
        : ' · 🦌✨ SIÊU PATRONUS!'
      : '';
  const dialog = document.getElementById('dialog-victory');
  document.getElementById('victory-body').innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:2.8rem;">🏆⚡</div>
      <h3 style="margin:6px 0;">Phép Màu Tuyệt Đỉnh! Màn ${app.activePlayingLevel} Hoàn Thành!</h3>
      <p style="margin:4px 0; color:#5c4738;">
        Điểm: <strong>${score.toLocaleString()}</strong> | Chuỗi thắng: 🔥 ${app.save.winStreak}${superBadge}
      </p>
      <div style="display:flex; justify-content:center; gap:10px; margin:12px 0; flex-wrap:wrap;">
        <div class="goal-chip">⭐ +${earnedStars} Sao</div>
        <div class="goal-chip">💰 +${totalCoins} Galleon</div>
        ${gainedXp > 0 ? `<div class="goal-chip">🏆 +${gainedXp} XP Vé Mùa</div>` : ''}
        <div class="goal-chip">🧹 ${app.save.raceState?.playerWins || 0}/10 · 🔥 ${app.save.gobletState?.step || 0}/7</div>
      </div>
      ${cardBanner}
      <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
        <button type="button" class="btn-playrix btn-purple" id="vic-world-btn">
          ${app.gameId === 'homescapes' ? '🏰 Về Lâu Đài' : '🌲 Về Khuôn Viên'}
        </button>
        <button type="button" class="btn-playrix" id="vic-next-btn" autofocus>
          ▶ Chơi Tiếp Màn ${app.save.level}
        </button>
      </div>
    </div>
  `;
  document.getElementById('vic-world-btn').onclick = () => {
    closeModal(dialog).then(() =>
      app.enterWorldView('Dùng Ngôi Sao Phép vừa nhận để khôi phục Hogwarts thôi nào!')
    );
  };
  document.getElementById('vic-next-btn').onclick = () => {
    // Leave the finished board first so closing the briefing never strands the player on a dead level
    closeModal(dialog).then(() => {
      app.enterWorldView();
      openLevelBriefingModal(app, app.save.level);
    });
  };
  openModal(dialog);
}

export function handleMatch3OutOfMoves(app, clockExploded = false) {
  dismissLevelTour();
  const dialog = document.getElementById('dialog-outofmoves');
  const titleEl = document.getElementById('oom-title');
  if (titleEl) {
    titleEl.textContent = clockExploded ? '⏳ Bùa Đếm Ngược Phát Nổ!' : '⏳ Hết Lượt Niệm Chú!';
  }
  document.getElementById('oom-body').innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:2.6rem;">${clockExploded ? '⏳💥' : '🪄😮'}</div>
      <h3 style="margin:6px 0;">${clockExploded ? 'Đồng Hồ Cát Đã Nổ Tung!' : 'Hết Lượt Phép Rồi!'}</h3>
      <p style="margin:4px 0 14px; color:#5c4738;">
        Đổi thêm <strong>+5 Lượt Phép${clockExploded ? ' &amp; Hóa Giải Bùa' : ''}</strong> để giữ chuỗi thắng 🔥 ${app.save.winStreak}?
      </p>
      <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
        <button type="button" class="btn-playrix btn-gold" id="oom-buy-btn" autofocus>+5 Lượt Phép (900 💰)</button>
        <button type="button" class="btn-playrix btn-red" id="oom-quit-btn">Rút Lui (-1 ❤️)</button>
      </div>
    </div>
  `;
  document.getElementById('oom-buy-btn').onclick = () => {
    if (app.save.coins < 900) {
      return app.toast(`Chưa đủ 900 💰 (Đang có ${app.save.coins} 💰)!`);
    }
    app.save.coins -= 900;
    sound.sfxCoin();
    app.persistAndSyncHud();
    closeModal(dialog).then(() => app.m3Controller.grantExtraMoves(5));
  };
  document.getElementById('oom-quit-btn').onclick = () => {
    dismissLevelTour();
    const lifeStatus = refreshLives(app.save);
    if (!lifeStatus.hasInfinite) {
      app.save.lives = Math.max(0, app.save.lives - 1);
      app.save.lastLifeTimestamp = Date.now();
    }
    app.save.winStreak = 0;
    onTournamentLevelFail(app.save);
    app.persistAndSyncHud();
    closeModal(dialog).then(() =>
      app.enterWorldView('Đừng nản lòng! Mở Hội Nhà Hogwarts để xin thêm Tim ❤️ từ đồng đội nhé!')
    );
  };
  openModal(dialog);
}

