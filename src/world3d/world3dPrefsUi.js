/**
 * UI Toggle Helper for Blender Hybrid 3D WebGL Mode (`world3dPrefsUi.js`)
 * Keeps `settingsAndStyle.js` strictly under 500 lines while providing instant 3D <-> 2.5D switching!
 */

import { sound } from '../utils/sound.js';
import { savePrefs } from '../utils/storage.js';
import { isGraphics3dEnabled, isWebglSupported, setGraphics3dEnabled } from './sharedWebgl.js';
import { cycleWorld3DCameraAngle } from './world3dStage.js';

export function renderGraphics3DToggleHtml(app, idPrefix = '') {
  const on = app.prefs.graphics3d !== false && isWebglSupported();
  return `
    <div class="task-card">
      <div>
        <strong>🧊 Cảnh Lớn Full 3D Blender (WebGL PBR)</strong>
        <div style="font-size:0.75rem; color:#5c4738;">100% Đồi cỏ, mặt nước GLSL, Hang Sóc &amp; Lâu Đài cắt lớp 3D <code>.glb</code> + Camera Phối Cảnh 3D</div>
      </div>
      <button type="button" class="btn-playrix ${on ? 'btn-gold' : 'btn-purple'}" id="${idPrefix}tog-graphics3d">
        ${on ? '🧊 Full 3D Bật' : '🖼️ 2.5D'}
      </button>
    </div>
  `;
}

export function bindGraphics3DToggle(rootEl, app, idPrefix = '', onRefresh = null) {
  const btn = rootEl.querySelector(`#${idPrefix}tog-graphics3d`);
  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = !(app.prefs.graphics3d !== false && isGraphics3dEnabled());
    app.prefs.graphics3d = next;
    setGraphics3dEnabled(next);
    savePrefs(app.prefs);
    sound.sfxClick();
    app.toast?.(
      next
        ? '🧊 Đã bật 100% Cảnh Lớn Full 3D (Địa hình, mặt nước GLSL, kiến trúc .glb & Camera 3D)!'
        : '🖼️ Đã chuyển sang chế độ Tiết Kiệm Pin 2.5D Cổ Điển!'
    );
    if (onRefresh) onRefresh();
  });
}

/**
 * Wires Playrix 2025/2026 World HUD controls:
 * 1) Clean Garden `🎨` Design Mode toggle (`#btn-design-mode`)
 * 2) Collapsible Top-Right `🧭` Magic Menu drawer (`#btn-magic-menu` / `#magic-menu-drawer`)
 * 3) Coin pill `+` shortcut to Diagon Alley Shop (`#hud-coin-pill`)
 */
export function initPlayrix2025Hud(app) {
  const menuBtn = document.getElementById('btn-magic-menu');
  const drawer = document.getElementById('magic-menu-drawer');
  const designBtn = document.getElementById('btn-design-mode');
  const camBtn = document.getElementById('btn-cam-angle');
  const coinPill = document.getElementById('hud-coin-pill');
  const menuBadge = document.getElementById('magic-menu-badge');

  if (camBtn) {
    camBtn.addEventListener('click', () => {
      sound.sfxClick();
      if (!isGraphics3dEnabled()) {
        app.toast?.('🖼️ Hãy bật chế độ Full 3D trong Cài Đặt (⚙️) để xoay góc nhìn 3D!');
        return;
      }
      const worldId = app.visitingGarden ? (app.visitorWorld || app.gameId) : app.gameId;
      const gameId = worldId === 'homescapes' ? 'homescapes' : 'gardenscapes';
      const preset = cycleWorld3DCameraAngle(gameId);
      camBtn.classList.toggle('is-active', preset.id !== 'classic');
      app.toast?.(`${preset.label} — Kéo hoặc cuộn chuột để cảm nhận chiều sâu 3D thật!`);
    });
  }

  const closeDrawer = () => {
    if (!drawer || drawer.classList.contains('hidden')) return;
    drawer.classList.add('hidden');
    menuBtn?.classList.remove('is-active');
    menuBtn?.setAttribute('aria-expanded', 'false');
  };

  if (menuBtn && drawer) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sound.sfxClick();
      const willOpen = drawer.classList.contains('hidden');
      drawer.classList.toggle('hidden', !willOpen);
      menuBtn.classList.toggle('is-active', willOpen);
      menuBtn.setAttribute('aria-expanded', String(willOpen));
    });

    drawer.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (!btn.classList.contains('world-zoom-btn') && btn.id !== 'btn-weather-cycle') {
        closeDrawer();
      }
    });

    document.addEventListener('pointerdown', (e) => {
      if (drawer.classList.contains('hidden')) return;
      if (!drawer.contains(e.target) && !menuBtn.contains(e.target)) closeDrawer();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  if (designBtn) {
    designBtn.addEventListener('click', () => {
      sound.sfxClick();
      const next = !Boolean(app.gardenRenderer?.designMode);
      if (app.gardenRenderer) app.gardenRenderer.designMode = next;
      if (app.homeRenderer) app.homeRenderer.designMode = next;
      designBtn.classList.toggle('is-active', next);
      designBtn.setAttribute('aria-pressed', String(next));
      app.toast?.(
        next
          ? '🎨 Chế độ Đổi Kiểu BẬT: Chạm vào bất kỳ cổ vật/nội thất nào đã xây để đổi 3 phong cách!'
          : '🌿 Chế độ Ngắm Cảnh Sạch: Nhấn giữ 0.4s vào cổ vật bất kỳ khi muốn đổi kiểu!'
      );
    });
  }

  if (coinPill) {
    coinPill.addEventListener('click', () => {
      document.getElementById('btn-open-shop')?.click();
    });
  }

  const syncMenuBadge = () => {
    if (!menuBadge) return;
    const n1 = Number(document.getElementById('online-badge')?.textContent || 0) || 0;
    const n2 = Number(document.getElementById('events-badge')?.textContent || 0) || 0;
    const hide1 = document.getElementById('online-badge')?.classList.contains('hidden') ?? true;
    const hide2 = document.getElementById('events-badge')?.classList.contains('hidden') ?? true;
    const total = (hide1 ? 0 : n1) + (hide2 ? 0 : n2);
    menuBadge.textContent = String(total);
    menuBadge.classList.toggle('hidden', total <= 0);
  };

  const obs = new MutationObserver(syncMenuBadge);
  for (const id of ['online-badge', 'events-badge']) {
    const el = document.getElementById(id);
    if (el) obs.observe(el, { attributes: true, childList: true, characterData: true });
  }
  syncMenuBadge();
}
