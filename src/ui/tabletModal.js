/**
 * Authentic 3-Tab Playrix Austin Tablet Modal
 * Tabs:
 * 1. 📋 Nhiệm Vụ (Renovation To-Do List + Area Progress Chest)
 * 2. 📱 Bảng Tin (Homeblr in Homescapes / Gardengram in Gardenscapes — Social Feed & Likes!)
 * 3. 🗺️ Sơ Đồ Khu Vực (4 Mansion Rooms / 4 Estate Zones Illustrated Switcher)
 */

import {
  GARDENSCAPES_CHARACTERS,
  getGardenscapesAreasForTier,
} from '../data/gardenscapesStory.js';
import {
  HOMESCAPES_CHARACTERS,
  getHomescapesAreasForTier,
} from '../data/homescapesStory.js';
import { closeModal, openModal } from '../utils/dialogHelper.js';
import { sound } from '../utils/sound.js';
import { sprites } from '../utils/spriteLoader.js';
import { bindSortingHatSelector, renderSortingHatSelectorHtml } from './houseSwitcherUi.js';
import { bindInteractiveWorldAtlas, buildInteractiveWorldAtlasHtml } from './worldAtlasMap.js';

export function getGameAreas(gameId, masteryTier = 0, house = 'gryffindor') {
  return gameId === 'homescapes'
    ? getHomescapesAreasForTier(masteryTier, house)
    : getGardenscapesAreasForTier(masteryTier);
}

export function getGameCharacters(gameId) {
  return gameId === 'homescapes' ? HOMESCAPES_CHARACTERS : GARDENSCAPES_CHARACTERS;
}

export function openTabletModal(app, activeTab = 'tasks') {
  const dialog = document.getElementById('dialog-tablet');
  const body = document.getElementById('tablet-body');
  const titleEl = document.getElementById('tablet-title');
  const areas = getGameAreas(app.gameId, app.save.masteryTier, app.save.house);
  const chars = getGameCharacters(app.gameId);
  const area = areas[app.save.currentArea] || areas[0];
  const feedName = app.gameId === 'homescapes' ? 'Nhật Báo Tiên Tri' : 'Cú Đưa Thư';

  titleEl.textContent = app.gameId === 'homescapes' ? '🗺️ Bản Đồ Đạo Tặc Hogwarts' : '📜 Sổ Cổ Vật & Khuôn Viên Hogwarts';

  let panelHtml = '';
  if (activeTab === 'tasks') {
    panelHtml = buildTasksTabHtml(app, area, areas, chars);
  } else if (activeTab === 'feed') {
    panelHtml = buildSocialFeedHtml(app, areas, chars, feedName);
  } else {
    panelHtml = buildInteractiveWorldAtlasHtml(app, areas);
  }

  const tabsMeta = [
    { id: 'tasks', label: '📜 Phép Cải Tạo' },
    { id: 'feed', label: `🦉 ${feedName}` },
    { id: 'areas', label: '🗺️ Bản Đồ' },
  ];

  body.innerHTML = `
    <div class="tablet-tabs" role="tablist" aria-label="Danh mục Sổ Cổ Vật">
      ${tabsMeta
      .map(
        (t) => `<button type="button" role="tab" id="tablet-tab-${t.id}"
            aria-selected="${activeTab === t.id}" aria-controls="tablet-tabpanel"
            tabindex="${activeTab === t.id ? '0' : '-1'}"
            class="tablet-tab-btn ${activeTab === t.id ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`
      )
      .join('')}
    </div>
    <div id="tablet-tabpanel" role="tabpanel" aria-labelledby="tablet-tab-${activeTab}" style="display:flex; flex-direction:column; gap:14px;">
      ${panelHtml}
    </div>
  `;

  const tabOrder = tabsMeta.map((t) => t.id);
  const tabListEl = body.querySelector('[role="tablist"]');
  tabListEl?.addEventListener('keydown', (e) => {
    const cur = tabOrder.indexOf(activeTab);
    let next = -1;
    if (e.key === 'ArrowRight') next = (cur + 1) % tabOrder.length;
    else if (e.key === 'ArrowLeft') next = (cur - 1 + tabOrder.length) % tabOrder.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabOrder.length - 1;
    if (next >= 0) {
      e.preventDefault();
      sound.sfxClick();
      const targetTab = tabOrder[next];
      openTabletModal(app, targetTab);
      document.getElementById(`tablet-tab-${targetTab}`)?.focus();
    }
  });

  for (const tabBtn of body.querySelectorAll('[data-tab]')) {
    tabBtn.addEventListener('click', () => {
      sound.sfxClick();
      openTabletModal(app, tabBtn.getAttribute('data-tab'));
    });
  }

  body.querySelector('#btn-claim-area-chest')?.addEventListener('click', () => {
    app.claimAreaChest(area);
    openTabletModal(app, 'tasks');
  });

  body.querySelector('#btn-ascend-mastery')?.addEventListener('click', () => {
    app.ascendMasteryTier();
    closeModal(dialog);
  });

  for (const btn of body.querySelectorAll('[data-do-task]')) {
    btn.addEventListener('click', () => {
      const task = area.tasks.find((t) => t.id === btn.getAttribute('data-do-task'));
      closeModal(dialog).then(() => app.beginTaskRenovation(task, false));
    });
  }

  for (const btn of body.querySelectorAll('[data-restyle-task]')) {
    btn.addEventListener('click', () => {
      const task = area.tasks.find((t) => t.id === btn.getAttribute('data-restyle-task'));
      closeModal(dialog).then(() => app.beginTaskRenovation(task, true));
    });
  }

  for (const likeBtn of body.querySelectorAll('[data-like-post]')) {
    likeBtn.addEventListener('click', () => {
      sound.sfxClick();
      const postId = likeBtn.getAttribute('data-like-post');
      app.save.likedPosts = app.save.likedPosts || [];
      if (!app.save.likedPosts.includes(postId)) {
        app.save.likedPosts.push(postId);
        app.save.coins += 15;
        app.persistAndSyncHud();
        app.toast('❤️ Đã thả tim bài viết (+15 💰)!');
      }
      openTabletModal(app, 'feed');
    });
  }

  for (const jumpBtn of body.querySelectorAll('[data-jump-area]')) {
    jumpBtn.addEventListener('click', () => {
      const idx = Number(jumpBtn.getAttribute('data-jump-area'));
      if (idx > (app.getMaxUnlockedArea?.() ?? idx)) {
        sound.sfxInvalid();
        app.toast('🔒 Khu vực này chưa mở — hãy mở Rương của khu trước!');
        return;
      }
      app.save.currentArea = idx;
      sound.sfxClick();
      closeModal(dialog).then(() => app.enterWorldView());
    });
  }

  if (activeTab === 'areas') {
    bindInteractiveWorldAtlas(body, app.save.currentArea);
  }
  bindSortingHatSelector(body, app, () => openTabletModal(app, activeTab));

  openModal(dialog);
}

function buildTasksTabHtml(app, area, areas, chars) {
  const doneCount = area.tasks.filter((t) => app.save.completedTasks[t.id] !== undefined).length;
  const pct = Math.round((doneCount / area.tasks.length) * 100);
  const chestClaimed = app.save.claimedAreaChests.includes(area.id);
  const allZonesMaxed = areas.every(
    (a) =>
      a.tasks.every((t) => app.save.completedTasks[t.id] !== undefined) &&
      app.save.claimedAreaChests.includes(a.id)
  );
  const ascendBg =
    app.gameId === 'homescapes'
      ? 'linear-gradient(135deg,#6b141c,#33080d)'
      : 'linear-gradient(135deg,#133e28,#0b2417)';

  const totalTasksCount = areas.reduce((sum, a) => sum + a.tasks.length, 0);
  const showSortingHat = app.gameId === 'homescapes' && app.save.currentArea === 0;
  let out = `
    ${showSortingHat ? renderSortingHatSelectorHtml(app.save.house, 'Đổi Nhà để biến hóa kiến trúc 2.5D, nội thất mặc định & Giáo sư Chủ nhiệm Chương 1 (giữ nguyên 100% tiến trình)!') : ''}
    ${allZonesMaxed
      ? `<div class="modal-parchment-box" style="background:${ascendBg}; color:#ffea9c; border-color:#ffd166; text-align:center;">
            <div style="font-weight:900; margin-bottom:6px;">👑 ĐÃ HOÀN TẤT ${totalTasksCount}/${totalTasksCount} HẠNG MỤC BẬC ${(app.save.masteryTier || 0) + 1}!</div>
            <p style="margin:0 0 8px; font-size:0.8rem; color:#f9e5d8;">Thăng cấp Tinh Luyện để mở chu kỳ nâng cấp Sao cấp số cộng kế tiếp (+1,000 💰)!</p>
            <button type="button" class="btn-playrix btn-gold" id="btn-ascend-mastery">✨ Thăng Cấp Tinh Luyện Bậc ${(app.save.masteryTier || 0) + 2}</button>
          </div>`
      : ''
    }
    <div class="modal-parchment-box">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; font-weight:800; gap:8px; flex-wrap:wrap;">
        <span>${area.dayLabel}: ${area.name} (${doneCount}/${area.tasks.length} — ${pct}%)</span>
        ${doneCount === area.tasks.length && !chestClaimed
      ? `<button type="button" class="btn-playrix btn-gold" id="btn-claim-area-chest">🎁 Mở Rương Khu Vực!</button>`
      : chestClaimed
        ? `<span style="color:#166541;">🎁 Đã nhận Rương</span>`
        : `<span style="font-size:0.8rem; color:#593d20;">🎁 Đạt 100% mở Rương</span>`
    }
      </div>
      <div class="rainbow-bar-track" style="background:rgba(92,71,56,0.16);">
        <div class="rainbow-bar-fill" style="width:${pct}%;"></div>
      </div>
      <p style="margin:8px 0 0; font-size:0.86rem; color:#5c4738;">${area.subtitle}</p>
    </div>
    <div class="task-list">
  `;

  for (const task of area.tasks) {
    const isDone = app.save.completedTasks[task.id] !== undefined;
    const canAfford = app.save.stars >= task.cost;
    out += `
      <div class="task-card ${isDone ? 'completed' : ''}">
        <div>
          <div style="font-weight:800; font-size:0.96rem;">${task.icon} ${task.title}</div>
          <div style="font-size:0.81rem; color:#5c4738; margin-top:2px;">${task.desc}</div>
        </div>
        <div>
          ${isDone
        ? `<button type="button" class="btn-playrix btn-purple" data-restyle-task="${task.id}">🎨 Đổi Kiểu</button>`
        : `<button type="button" class="btn-playrix ${canAfford ? '' : 'btn-gold'}" data-do-task="${task.id}">
                  ${canAfford ? `Làm (${task.cost} ⭐)` : `Cần ${task.cost} ⭐`}
                </button>`
      }
        </div>
      </div>
    `;
  }
  out += `</div>`;

  out += `<div class="dialogue-scroll-box">
    <strong>💬 Hội thoại Pháp Sư Hogwarts:</strong>
    ${(area.introDialogue || [])
      .map((d) => {
        const ch = chars[d.speaker] || { avatar: '💬', name: d.speaker };
        return `<div style="margin-top:5px;">${ch.avatar} <strong>${ch.name}:</strong> "${d.text}"</div>`;
      })
      .join('')}
  </div>`;
  return out;
}

function buildSocialFeedHtml(app, areas, chars, feedName) {
  const liked = new Set(app.save.likedPosts || []);
  const scenePrefix = app.gameId === 'homescapes' ? 'home_room_' : 'garden_zone_';

  const posts = areas.map((area, idx) => {
    const done = area.tasks.filter((t) => app.save.completedTasks[t.id] !== undefined).length;
    const postId = `${app.gameId}_post_${idx}`;
    const isLiked = liked.has(postId);
    const sIdx = area.sceneIndex ?? idx % 4;
    const imgUrl = sprites.url(area.sceneKey || `${scenePrefix}${sIdx}`) || sprites.url(`${scenePrefix}${idx % 4}`);
    const speakerKeys = Object.keys(chars);
    const author = chars[speakerKeys[idx % speakerKeys.length]] || { avatar: '🤵', name: 'Austin' };
    return `
      <article class="social-post-card">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <span style="font-size:1.4rem;">${author.avatar}</span>
          <div>
            <div style="font-weight:800;">${author.name} <span style="color:#6c757d; font-weight:600;">· ${feedName}</span></div>
            <div style="font-size:0.75rem; color:#6c757d;">${area.dayLabel} — Đã cải tạo ${done}/${area.tasks.length} hạng mục</div>
          </div>
        </div>
        <img src="${imgUrl}" alt="${area.name}" width="480" height="145" loading="lazy" decoding="async" style="width:100%; height:145px; object-fit:cover; border-radius:12px; border:2px solid #e9c46a;" />
        <p style="margin:8px 0; font-size:0.86rem; color:#2d1e12;">
          "${done > 0 ? area.tasks[Math.min(done - 1, area.tasks.length - 1)].afterDialogue : area.subtitle}"
        </p>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <button type="button" class="btn-playrix ${isLiked ? 'btn-purple' : 'btn-red'}" data-like-post="${postId}" style="padding:5px 12px; font-size:0.82rem;">
            ${isLiked ? '❤️ Đã Thích' : '🤍 Thả Tim (+15 💰)'}
          </button>
          <span style="font-size:0.8rem; font-weight:700; color:#5c4738;">❤️ ${128 + idx * 43 + (isLiked ? 1 : 0)} lượt thích</span>
        </div>
      </article>
    `;
  });

  return `<div class="task-list">${posts.join('')}</div>`;
}

