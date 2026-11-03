/**
 * Sorting Hat 4-House Switcher Helper (`🎩 Nón Phân Loại Hogwarts`)
 * Lets players pick or change their Hogwarts House (`gryffindor`, `slytherin`, `ravenclaw`, `hufflepuff`)
 * in 1 click from Tablet Chapter 1, Settings, or Online Hub — instantly transforming Chapter 1's
 * 2.5D Common Room backdrop, furniture signature palette, Head-of-House story, and World Atlas!
 */

import { HOUSE_COMMON_ROOM_META, normalizeHogwartsHouse } from '../data/houseCommonRooms.js';
import { HOGWARTS_HOUSES } from '../data/liveOpsDefs.js';
import { haptics } from '../utils/haptics.js';
import { sound } from '../utils/sound.js';
import { spawnCelebrationFireworks } from '../world/gardenscapesExtras.js';
import { syncOnlineProfile } from './onlineHubModal.js';

export function applyPlayerHouseChange(app, rawHouse) {
  const house = normalizeHogwartsHouse(rawHouse);
  const prev = normalizeHogwartsHouse(app.save.house);
  app.save.house = house;

  const hMeta = HOGWARTS_HOUSES.find((h) => h.id === house) || HOGWARTS_HOUSES[0];
  const roomMeta = HOUSE_COMMON_ROOM_META[house];

  if (!app.visitingGarden && app.gameId === 'homescapes') {
    app.homeRenderer.setState({
      house,
      austinLine: `${hMeta.crest} Chào mừng về ${roomMeta.name}! Mọi huy hiệu & nội thất mặc định đã đổi theo Nhà ${hMeta.name}!`,
    });
    if (prev !== house && app.screen === 'world') {
      spawnCelebrationFireworks(app.homeRenderer);
    }
  }

  app.persistAndSyncHud();
  syncOnlineProfile(app);
  haptics.tap();
  sound.sfxRainbow();

  if (prev !== house) {
    app.toast(`🎩 Nón Phân Loại hô vang: "${hMeta.name.toUpperCase()}!" — Chương 1: ${roomMeta.name}!`);
  }
  return house;
}

export function renderSortingHatSelectorHtml(currentHouse, subtitle = '') {
  const active = normalizeHogwartsHouse(currentHouse);
  return `
    <fieldset class="modal-parchment-box" style="border:2px solid #c69f47; margin:0; padding:10px 12px;">
      <legend style="font-weight:900; font-size:0.84rem; padding:0 6px; color:#540b0e;">
        🎩 Nón Phân Loại Hogwarts — Đổi Phòng Sinh Hoạt Chương 1
      </legend>
      ${subtitle ? `<p style="margin:0 0 8px; font-size:0.78rem; color:#5c4738;">${subtitle}</p>` : ''}
      <div class="house-radio-grid" data-sorting-hat-group="1">
        ${HOGWARTS_HOUSES.map((h) => {
          const checked = active === h.id;
          return `
            <label class="house-radio-pill ${checked ? 'checked' : ''}" style="--house-accent:${h.color};">
              <input type="radio" name="sorting-hat-house" value="${h.id}" ${checked ? 'checked' : ''} />
              <span>${h.crest} ${h.name}</span>
            </label>`;
        }).join('')}
      </div>
    </fieldset>
  `;
}

export function bindSortingHatSelector(rootEl, app, onChanged = null) {
  const group = rootEl.querySelector('[data-sorting-hat-group]');
  if (!group) return;
  for (const input of group.querySelectorAll('input[name="sorting-hat-house"]')) {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      applyPlayerHouseChange(app, input.value);
      if (onChanged) onChanged(input.value);
    });
  }
}

