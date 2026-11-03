/**
 * Playrix Modals & Overlay Renderers
 * Manages Pre-Level Briefing (with 3D Sprite Badges), Daily Lucky Wheel & Booster Shop,
 * Pull-the-Pin Mini-Game, and re-exports Austin's 3-Tab Tablet.
 */

import { MAX_GARDENSCAPES_LEVEL } from '../data/gardenscapesLevels.js';
import { MAX_HOMESCAPES_LEVEL } from '../data/homescapesLevels.js';
import { getGamePinPuzzles, getUnlockedPinCount } from '../data/pinPuzzles.js';
import { getGoalBadgeMeta } from '../match3/pieceArt.js';
import { closeModal, openModal } from '../utils/dialogHelper.js';
import { sound } from '../utils/sound.js';
import { sprites } from '../utils/spriteLoader.js';
import { getLocalCalendarDateISO, refreshLives } from '../utils/storage.js';
import { getGameAreas, getGameCharacters, openTabletModal } from './tabletModal.js';

export { getGameAreas, getGameCharacters, openTabletModal };

export const PRE_BOOSTER_DEFS = {
  homescapes: [
    { key: 'pre_rocket_bomb', icon: '🧹💣', img: sprites.url('h_rocket'), name: 'Chổi Thần + Vạc Nổ', price: 350 },
    { key: 'pre_rainbow', icon: '⏳✨', img: sprites.url('h_rainbow'), name: 'Xoay Thời Gian', price: 400 },
    { key: 'pre_planes', icon: '✉️✉️', img: sprites.url('h_plane'), name: 'Đôi Thư Sấm', price: 350 },
  ],
  gardenscapes: [
    { key: 'pre_bomb_dynamite', icon: '💣🧨', img: sprites.url('g_dynamite'), name: 'Vạc Nổ + Lửa Phép', price: 350 },
    { key: 'pre_rainbow', icon: '🦌✨', img: sprites.url('g_rainbow'), name: 'Cầu Thần Hộ Mệnh', price: 400 },
    { key: 'pre_double_bomb', icon: '💣💣', img: sprites.url('h_bomb'), name: 'Đôi Vạc Độc Dược', price: 350 },
  ],
};

export const INGAME_BOOSTER_DEFS = {
  homescapes: [
    { key: 'hammer', icon: '🪄', img: sprites.url('h_hammer'), name: 'Đũa Cơm Nguội', price: 300 },
    { key: 'hand', icon: '🪶', img: '', name: 'Bùa Leviosa', price: 350 },
    { key: 'kettlebell', icon: '🧹', img: sprites.url('h_rocket'), name: 'Chổi Tia Chớp', price: 450 },
  ],
  gardenscapes: [
    { key: 'shovel', icon: '🪄', img: sprites.url('g_shovel'), name: 'Đũa Cơm Nguội', price: 300 },
    { key: 'glove', icon: '🧤', img: sprites.url('g_glove'), name: 'Găng Da Rồng', price: 350 },
    { key: 'rake', icon: '🧹', img: sprites.url('g_rake'), name: 'Chổi Firebolt', price: 450 },
  ],
};

export function renderBadgeVisual(meta, sizePx = 30) {
  if (meta.img) {
    return `<img src="${meta.img}" alt="${meta.name || ''}" width="${sizePx}" height="${sizePx}" decoding="async" style="width:${sizePx}px; height:${sizePx}px; object-fit:contain; filter:drop-shadow(0 2px 3px rgba(0,0,0,0.28));" />`;
  }
  return `<span style="font-size:${Math.round(sizePx * 0.78)}px; line-height:1;">${meta.icon}</span>`;
}

/**
 * Opens Pre-Level Briefing Modal with Level Selector (1..100+), 3D Goal Badges & Pre-Boosters.
 */
export function openLevelBriefingModal(app, levelNum = app.save.level) {
  const dialog = document.getElementById('dialog-briefing');
  const header = document.getElementById('briefing-header');
  const titleEl = document.getElementById('briefing-title');
  const body = document.getElementById('briefing-body');

  const isGarden = app.gameId === 'gardenscapes';
  const maxCap = isGarden ? MAX_GARDENSCAPES_LEVEL : MAX_HOMESCAPES_LEVEL;
  const maxUnlocked = Math.max(1, Math.min(maxCap, app.save.level));
  const clampedLv = Math.max(1, Math.min(maxUnlocked, levelNum));
  const def = app.getLevelDef(clampedLv);

  header.className = `modal-header ${def.difficulty}`;
  const diffTag =
    def.difficulty === 'super_hard'
      ? '🔥 SIÊU KHÓ (2 ⭐)'
      : def.difficulty === 'hard'
        ? '💜 MÀN KHÓ'
        : '⭐ HARDCORE';
  const stageTag = def.stage2 ? ' · 2 GĐ' : '';
  titleEl.textContent = `Màn ${clampedLv.toLocaleString()}/${maxCap.toLocaleString()} — ${diffTag}${stageTag}`;

  const preDefs = PRE_BOOSTER_DEFS[app.gameId];
  const hatTier = Math.min(3, app.save.winStreak || 0);
  const superTxt =
    (app.save.winStreak || 0) >= 10
      ? isGarden ? ' · 🦌✨ Siêu Patronus' : ' · ⏳✨ Siêu Xoay Thời Gian'
      : '';

  body.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
      <button type="button" class="btn-playrix btn-purple" id="lv-prev" ${clampedLv <= 1 ? 'disabled' : ''}>◀ Trước</button>
      <span style="font-weight:800; font-size:0.86rem; text-align:center;">
        ⚡ ${def.moves} Lượt · ${def.colors} Màu | 🎩 Bậc ${hatTier}/3 (🔥${app.save.winStreak})${superTxt}
      </span>
      <button type="button" class="btn-playrix btn-purple" id="lv-next" ${clampedLv >= maxUnlocked ? 'disabled' : ''}>Tiếp ▶</button>
    </div>

    <div class="modal-parchment-box" style="text-align:center;">
      <div style="font-weight:800; margin-bottom:8px;">🎯 Mục tiêu màn chơi:</div>
      <div class="goals-grid">
        ${def.goals
      .map((g) => {
        const m = getGoalBadgeMeta(app.gameId, g);
        return `<div class="goal-chip">
              <div style="display:grid; place-items:center; height:34px;">${renderBadgeVisual(m, 32)}</div>
              <div style="font-size:1rem;">${g.target}</div>
              <div style="font-size:0.7rem; color:#593d20;">${m.name}</div>
            </div>`;
      })
      .join('')}
      </div>
      <p style="margin:10px 0 0; font-size:0.84rem; color:#5c4738;">💡 ${def.tip}</p>
    </div>

    <div>
      <div style="font-weight:800; text-align:center; margin-bottom:8px;">🪄 Chọn Bảo Bối Pháp Thuật Đầu Màn:</div>
      <div class="pre-boosters-row">
        ${preDefs
      .map((b) => {
        const count = app.save.boosters[b.key] || 0;
        const sel = app.selectedPreBoosters.has(b.key);
        return `<button type="button" class="pre-booster-card ${sel ? 'selected' : ''}" data-pre="${b.key}">
              <div style="display:grid; place-items:center; height:36px;">${renderBadgeVisual(b, 34)}</div>
              <div>${b.name}</div>
              <div style="color:${count > 0 ? '#2b8a3e' : '#e63946'}; margin-top:4px;">
                ${sel ? '✓ Đã chọn' : count > 0 ? `Có: ${count}` : `+3 (${b.price} 💰)`}
              </div>
            </button>`;
      })
      .join('')}
      </div>
    </div>

    <button type="button" class="btn-playrix" id="btn-launch-m3" autofocus style="font-size:1.15rem; padding:13px;">
      🪄 VUNG ĐŨA PHÉP — MÀN ${clampedLv}
    </button>
  `;

  body.querySelector('#lv-prev')?.addEventListener('click', () => {
    sound.sfxClick();
    openLevelBriefingModal(app, clampedLv - 1);
  });
  body.querySelector('#lv-next')?.addEventListener('click', () => {
    sound.sfxClick();
    openLevelBriefingModal(app, clampedLv + 1);
  });

  for (const card of body.querySelectorAll('[data-pre]')) {
    card.addEventListener('click', () => {
      const key = card.getAttribute('data-pre');
      const bDef = preDefs.find((x) => x.key === key);
      if ((app.save.boosters[key] || 0) <= 0) {
        if (app.save.coins >= bDef.price) {
          app.save.coins -= bDef.price;
          app.save.boosters[key] = 3;
          app.selectedPreBoosters.add(key);
          sound.sfxCoin();
          app.persistAndSyncHud();
        } else {
          app.toast('Chưa đủ Galleon 💰 để mua gói Bảo Bối này!');
        }
      } else if (app.selectedPreBoosters.has(key)) {
        app.selectedPreBoosters.delete(key);
        sound.sfxClick();
      } else {
        app.selectedPreBoosters.add(key);
        sound.sfxClick();
      }
      openLevelBriefingModal(app, clampedLv);
    });
  }

  body.querySelector('#btn-launch-m3')?.addEventListener('click', () => {
    closeModal(dialog).then(() => app.enterMatch3Level(clampedLv));
  });

  openModal(dialog);
}

/**
 * Opens Shop & Daily Lucky Wheel Modal.
 */
export function openShopAndWheelModal(app) {
  const dialog = document.getElementById('dialog-shop');
  const body = document.getElementById('shop-body');
  const today = getLocalCalendarDateISO();
  const freeSpinReady = app.save.lastWheelDate !== today;
  const boosters = INGAME_BOOSTER_DEFS[app.gameId];

  body.innerHTML = `
    <div style="background:linear-gradient(135deg,#540b0e,#9e2a2b); color:#fff; border-radius:18px; padding:14px; text-align:center; border:2px solid #ffd166;">
      <div style="font-size:1.1rem; font-weight:900;">🎡 VÒNG QUAY PHÉP THUẬT HẺM XÉO</div>
      <p style="margin:6px 0 10px; font-size:0.85rem; color:#ffe8a3;">
        Phần thưởng phép thuật: +450 Galleon 💰, +2 Sao Phép ⭐, 30 Phút Tim Bất Tử ♾️❤️, hoặc Bảo Bối!
      </p>
      <button type="button" class="btn-playrix btn-gold" id="btn-spin-wheel" autofocus>
        ${freeSpinReady ? '🎡 QUAY PHÉP MIỄN PHÍ HÔM NAY!' : '🎡 Quay Thêm (250 💰)'}
      </button>
      <div id="wheel-result-msg" style="margin-top:8px; font-weight:800; color:#ffd166;"></div>
    </div>

    <div style="font-weight:800;">🦉 Tiệm Phù Thủy Hẻm Xéo (Galleon hiện có: ${app.save.coins.toLocaleString()} 💰)</div>
    <div class="task-list">
      <div class="task-card">
        <div><strong>❤️ Hồi Đầy ${app.save.maxLives} Tim Ngay Lập Tức</strong><div style="font-size:0.8rem;">Tiếp tục chinh phục màn khó</div></div>
        <button type="button" class="btn-playrix" id="buy-hearts">450 💰</button>
      </div>
      ${boosters
      .map(
        (b) => `<div class="task-card">
          <div style="display:flex; align-items:center; gap:8px;">
            ${renderBadgeVisual(b, 28)}
            <div><strong>+3 ${b.name}</strong> (Có: ${app.save.boosters[b.key] || 0})</div>
          </div>
          <button type="button" class="btn-playrix" data-buy-ingame="${b.key}" data-price="${b.price}">${b.price} 💰</button>
        </div>`
      )
      .join('')}
    </div>
  `;

  body.querySelector('#btn-spin-wheel')?.addEventListener('click', () => {
    if (!freeSpinReady && app.save.coins < 250) {
      app.toast('Cần 250 💰 để quay thêm lượt!');
      return;
    }
    if (freeSpinReady) app.save.lastWheelDate = today;
    else app.save.coins -= 250;

    const prizes = [
      { label: '+450 Galleon Vàng 💰!', apply: () => (app.save.coins += 450) },
      { label: '+2 Sao Phép ⭐!', apply: () => (app.save.stars += 2) },
      {
        label: '♾️❤️ 30 Phút Tim Bất Tử!',
        apply: () => (app.save.infiniteLivesUntil = Math.max(Date.now(), app.save.infiniteLivesUntil) + 30 * 60 * 1000),
      },
      {
        label: `${boosters[0].icon} +2 ${boosters[0].name}!`,
        apply: () => (app.save.boosters[boosters[0].key] = (app.save.boosters[boosters[0].key] || 0) + 2),
      },
    ];
    const won = prizes[Math.floor(Math.random() * prizes.length)];
    won.apply();
    sound.sfxVictory();
    app.persistAndSyncHud();
    openShopAndWheelModal(app);
    const msg = document.getElementById('wheel-result-msg');
    if (msg) msg.textContent = `🎉 Chúc mừng! Bạn trúng: ${won.label}`;
  });

  body.querySelector('#buy-hearts')?.addEventListener('click', () => {
    const lifeStatus = refreshLives(app.save);
    if (lifeStatus.hasInfinite) {
      app.toast('Bạn đang có Tim Bất Tử ♾️ — chưa cần mua thêm Tim!');
      return;
    }
    if (lifeStatus.lives >= app.save.maxLives) {
      app.toast('Tim của bạn đang đầy!');
      return;
    }
    if (app.save.coins < 450) {
      app.toast('Không đủ 450 💰!');
      return;
    }
    app.save.coins -= 450;
    app.save.lives = app.save.maxLives;
    app.save.lastLifeTimestamp = Date.now();
    sound.sfxCoin();
    app.persistAndSyncHud();
    openShopAndWheelModal(app);
  });

  for (const btn of body.querySelectorAll('[data-buy-ingame]')) {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-buy-ingame');
      const price = Number(btn.getAttribute('data-price'));
      if (app.save.coins < price) {
        app.toast('Chưa đủ Galleon 💰!');
        return;
      }
      app.save.coins -= price;
      app.save.boosters[key] = (app.save.boosters[key] || 0) + 3;
      sound.sfxCoin();
      app.persistAndSyncHud();
      openShopAndWheelModal(app);
    });
  }

  openModal(dialog);
}

/**
 * Opens the playable "Pull the Pin" Mini-Game Modal!
 */
export function openPinModal(app, puzzleIdx = null) {
  const dialog = document.getElementById('dialog-pin');
  const puzzles = getGamePinPuzzles(app.gameId);
  const unlockedCount = getUnlockedPinCount(app.save.level);
  const defaultIdx = puzzles.findIndex((p, idx) => idx < unlockedCount && !app.save.completedPinIds.includes(p.id));
  const rawIdx = puzzleIdx !== null ? puzzleIdx : defaultIdx >= 0 ? defaultIdx : 0;
  const resolvedIdx = Math.max(0, Math.min(unlockedCount - 1, rawIdx));
  const puz = app.pinController.loadPuzzle(resolvedIdx, app.gameId);

  document.getElementById('pin-title').textContent = `🔑 (${resolvedIdx + 1}/${puzzles.length}) ${puz.title}`;
  document.getElementById('pin-hint').textContent = `💡 ${puz.hint}`;

  const hintEl = document.getElementById('pin-hint');
  let stripEl = document.getElementById('pin-vault-strip');
  if (!stripEl && hintEl?.parentElement) {
    stripEl = document.createElement('div');
    stripEl.id = 'pin-vault-strip';
    stripEl.style.cssText = 'display:flex; flex-wrap:wrap; gap:5px; justify-content:center; margin-bottom:4px;';
    hintEl.parentElement.insertBefore(stripEl, hintEl);
  }
  if (stripEl) {
    stripEl.innerHTML = puzzles
      .map((item, i) => {
        const locked = i >= unlockedCount;
        const done = app.save.completedPinIds.includes(item.id);
        const active = i === resolvedIdx;
        const unlockLv = (i - 1) * 5 + 1;
        return `<button type="button" class="btn-playrix ${active ? 'btn-gold' : done ? '' : 'btn-purple'}" data-pin-idx="${i}" ${locked ? 'disabled' : ''} title="${locked ? `Mở khóa ở Màn ${unlockLv}` : item.title}" style="padding:4px 8px; font-size:0.74rem; opacity:${locked ? 0.55 : 1};">${locked ? `🔒${i + 1}` : done ? `✓${i + 1}` : `#${i + 1}`}</button>`;
      })
      .join('');
    for (const btn of stripEl.querySelectorAll('[data-pin-idx]')) {
      btn.addEventListener('click', () => {
        sound.sfxClick();
        openPinModal(app, Number(btn.getAttribute('data-pin-idx')));
      });
    }
  }

  const statusEl = document.getElementById('pin-status');
  const solvedTag = app.save.completedPinIds.includes(puz.id) ? ' (✓ Đã nhận thưởng kho báu này)' : ` (+${puz.rewardCoins} 💰 lần đầu)`;
  statusEl.textContent = `Nhấp chốt vàng Gringotts theo vật lý dòng chảy${solvedTag}`;
  statusEl.style.color = '#2d1e12';

  document.getElementById('btn-pin-retry').onclick = () => {
    sound.sfxClick();
    openPinModal(app, resolvedIdx);
  };
  document.getElementById('btn-pin-next').onclick = () => {
    sound.sfxClick();
    openPinModal(app, (resolvedIdx + 1) % unlockedCount);
  };

  openModal(dialog);
}
