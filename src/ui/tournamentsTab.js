/**
 * Hogwarts Playrix Mini-Tournaments UI:
 * - Tab 3: 🧹 Đua Chổi Quidditch (10-Level Sprint vs 4 Hogwarts Rivals)
 * - Tab 4: 🔥 Chiếc Cốc Lửa (7-Streak Survival splitting 10,000 💰 Galleon Jackpot)
 */

import {
  applyRewardBundle,
  ensureBroomRace,
  ensureGobletState,
} from '../data/liveOpsDefs.js';
import { haptics } from '../utils/haptics.js';
import { sound } from '../utils/sound.js';
import { escapeHtml, sanitizePlainText } from '../utils/storage.js';

export function renderQuidditchRaceHtml(app) {
  const race = ensureBroomRace(app.save);
  const safePlayerName = sanitizePlainText(app.save.playerName, 'Phù Thủy Mới', 22);
  const rows = [
    { name: `⚡ ${safePlayerName} (Bạn)`, wins: race.playerWins, isPlayer: true },
    ...race.rivals.map((r) => ({
      name: `${sanitizePlainText(r.crest, '🧹', 4)} ${sanitizePlainText(r.name, 'Tầm Thủ', 24)}`,
      wins: r.wins,
      isPlayer: false,
    })),
  ].sort((a, b) => b.wins - a.wins || (a.isPlayer ? -1 : 1));

  const prizeLabel =
    race.rank === 1
      ? '🥇 Hạng 1: +1,200 💰 & +1 Bảo Bối Cầu Vồng!'
      : race.rank === 2
        ? '🥈 Hạng 2: +600 💰 Galleon!'
        : race.rank === 3
          ? '🥉 Hạng 3: +300 💰 Galleon!'
          : '🎖️ Khuyến khích: +120 💰 Galleon!';

  return `
    <div class="modal-parchment-box" style="background:linear-gradient(135deg,#1d3557,#0b192c); color:#fff8e6; border-color:#ffd166;">
      <div style="font-weight:900; font-size:1rem; color:#ffd166;">🧹 ĐUA CHỔI QUIDDITCH · Chặng #${race.heat}</div>
      <div style="font-size:0.8rem; margin-top:4px;">
        Ai cán mốc <strong>${race.target} màn thắng Match-3</strong> trước sẽ giành Cúp Chổi Tia Chớp! (Hạng 1: 1,200 💰 · Hạng 2: 600 💰 · Hạng 3: 300 💰)
      </div>
    </div>

    <div class="task-list">
      ${rows
        .map((r, idx) => {
          const pct = Math.min(100, Math.round((r.wins / race.target) * 100));
          return `
            <div class="task-card" style="${r.isPlayer ? 'border-color:#d4af37; background:#fffdf2;' : ''}">
              <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; font-weight:800; font-size:0.86rem;">
                  <span class="race-row-name">${escapeHtml(`#${idx + 1} ${r.name}`)}</span>
                  <span>🧹 ${r.wins}/${race.target}</span>
                </div>
                <div class="rainbow-bar-track" style="margin-top:6px; background:rgba(0,0,0,0.1);">
                  <div class="rainbow-bar-fill" style="width:${pct}%;"></div>
                </div>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>

    ${race.finished
      ? `<div class="modal-parchment-box" style="text-align:center;">
          <div style="font-weight:900; margin-bottom:8px;">🏁 Chặng #${race.heat} Kết Thúc — ${prizeLabel}</div>
          ${!race.claimed
            ? `<button type="button" class="btn-playrix btn-gold" id="btn-claim-race">🎁 Nhận Thưởng &amp; Đua Chặng Kế</button>`
            : `<button type="button" class="btn-playrix" id="btn-next-race">🧹 Bắt Đầu Chặng Mới</button>`
          }
        </div>`
      : `<div style="text-align:center; font-size:0.8rem; color:#5c4738; font-weight:700;">💡 Thắng mỗi màn Match-3 để bay vọt lên trước các tầm thủ đối phương!</div>`
    }
  `;
}

export function renderGobletOfFireHtml(app) {
  const gob = ensureGobletState(app.save);
  const pct = Math.min(100, Math.round((gob.step / gob.target) * 100));

  return `
    <div class="modal-parchment-box" style="background:linear-gradient(135deg,#4a1016,#1b0b2e); color:#fff8e6; border-color:#4cc9f0;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
        <div>
          <div style="font-weight:900; font-size:1rem; color:#90e0ef;">🔥 CHIẾC CỐC LỬA · Mùa Đấu #${gob.trial}</div>
          <div style="font-size:0.8rem; margin-top:3px;">100 Phù Thủy cùng xuất phát — vượt <strong>7 màn liên tiếp không thua</strong> để chia Quỹ <strong>10,000 💰</strong>!</div>
        </div>
        <span class="hud-pill" style="font-size:0.8rem;">🧙‍♂️ Còn trụ lại: ${gob.survivors}/100</span>
      </div>
      <div class="rainbow-bar-track" style="margin:10px 0 6px;">
        <div class="rainbow-bar-fill" style="width:${pct}%;"></div>
      </div>
      <div style="font-size:0.82rem; font-weight:800; color:#ffd166;">
        Tiến độ Quán Quân: Bậc ${gob.step}/${gob.target} · Phần thưởng dự kiến: +${gob.prize.toLocaleString()} 💰
      </div>
    </div>

    <div class="modal-parchment-box" style="display:flex; justify-content:space-between; gap:6px; flex-wrap:wrap; text-align:center;">
      ${Array.from({ length: gob.target }, (_, idx) => {
        const stepNum = idx + 1;
        const done = gob.step >= stepNum;
        return `<div style="flex:1; min-width:54px; padding:8px 4px; border-radius:12px; border:2px solid ${done ? '#2ec4b6' : '#dee2e6'}; background:${done ? '#e6fcf5' : '#f8f9fa'}; font-weight:800; font-size:0.78rem;">
          <div>${stepNum === gob.target ? '🏆' : done ? '🔥' : '🕯️'}</div>
          <div>Ải ${stepNum}</div>
        </div>`;
      }).join('')}
    </div>

    ${gob.completed
      ? `<div class="modal-parchment-box" style="text-align:center;">
          <div style="font-weight:900; margin-bottom:8px;">🏆 Bạn là 1 trong ${gob.survivors} Quán Quân Tam Pháp Thuật! Chia thưởng: +${gob.prize.toLocaleString()} 💰!</div>
          ${!gob.claimed
            ? `<button type="button" class="btn-playrix btn-gold" id="btn-claim-goblet">🏆 Nhận +${gob.prize.toLocaleString()} 💰 &amp; Mở Mùa Mới</button>`
            : `<button type="button" class="btn-playrix" id="btn-restart-goblet">🔥 Ghi Danh Mùa Đấu Mới</button>`
          }
        </div>`
      : gob.eliminated
        ? `<div class="modal-parchment-box" style="text-align:center;">
            <div style="font-weight:800; color:#9e2a2b; margin-bottom:8px;">💥 Ngọn lửa xanh đã tắt ở Ải ${gob.step + 1} do thua màn!</div>
            <button type="button" class="btn-playrix btn-gold" id="btn-restart-goblet">🔥 Thả Tên Vào Cốc Lửa Lần Nữa (Miễn Phí)</button>
          </div>`
        : `<div style="text-align:center; font-size:0.8rem; color:#5c4738; font-weight:700;">⚡ Lưu ý: Rút lui hoặc thua màn sẽ bị loại khỏi lượt Cốc Lửa hiện tại!</div>`
    }
  `;
}

export function bindTournamentActions(app, body, reopenTab) {
  body.querySelector('#btn-claim-race')?.addEventListener('click', () => {
    const race = ensureBroomRace(app.save);
    if (!race.finished || race.claimed) return;
    race.claimed = true;
    const reward =
      race.rank === 1
        ? { coins: 1200, pre_rainbow: 1 }
        : race.rank === 2
          ? { coins: 600 }
          : race.rank === 3
            ? { coins: 300 }
            : { coins: 120 };
    applyRewardBundle(app.save, reward, app.gameId);
    ensureBroomRace(app.save, true);
    haptics.victory();
    sound.sfxVictory();
    app.persistAndSyncHud();
    app.toast(`🧹 Đã nhận thưởng Hạng ${race.rank} Đua Chổi Quidditch (+${reward.coins.toLocaleString()} 💰)!`);
    reopenTab('race');
  });

  body.querySelector('#btn-next-race')?.addEventListener('click', () => {
    ensureBroomRace(app.save, true);
    sound.sfxClick();
    app.persistAndSyncHud();
    reopenTab('race');
  });

  body.querySelector('#btn-claim-goblet')?.addEventListener('click', () => {
    const gob = ensureGobletState(app.save);
    if (!gob.completed || gob.claimed) return;
    const wonCoins = gob.prize || 2000;
    gob.claimed = true;
    app.save.coins += wonCoins;
    ensureGobletState(app.save, true);
    haptics.victory();
    sound.sfxVictory();
    app.persistAndSyncHud();
    app.toast(`🏆 Chiếc Cốc Lửa trao thưởng Quán Quân: +${wonCoins.toLocaleString()} 💰 Galleon!`);
    reopenTab('goblet');
  });

  body.querySelector('#btn-restart-goblet')?.addEventListener('click', () => {
    ensureGobletState(app.save, true);
    sound.sfxClick();
    app.persistAndSyncHud();
    app.toast('🔥 Tên của bạn đã bay vào Chiếc Cốc Lửa — chuỗi 7 ải bắt đầu!');
    reopenTab('goblet');
  });
}

