/**
 * UI Toggle Helper for Blender Hybrid 3D WebGL Mode (`world3dPrefsUi.js`)
 * Keeps `settingsAndStyle.js` strictly under 500 lines while providing instant 3D <-> 2.5D switching!
 */

import { sound } from '../utils/sound.js';
import { savePrefs } from '../utils/storage.js';
import { isGraphics3dEnabled, isWebglSupported, setGraphics3dEnabled } from './sharedWebgl.js';

export function renderGraphics3DToggleHtml(app, idPrefix = '') {
  const on = app.prefs.graphics3d !== false && isWebglSupported();
  return `
    <div class="task-card">
      <div>
        <strong>🧊 Đồ Hoạ 3D Blender (WebGL PBR)</strong>
        <div style="font-size:0.75rem; color:#5c4738;">Mô hình 3D <code>.glb</code> thật, đổ bóng thời gian thực &amp; Huynh trưởng 3D cổ vũ</div>
      </div>
      <button type="button" class="btn-playrix ${on ? 'btn-gold' : 'btn-purple'}" id="${idPrefix}tog-graphics3d">
        ${on ? '🧊 3D Bật' : '🖼️ 2.5D'}
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
        ? '🧊 Đã bật Đồ Hoạ Hybrid 3D Blender (Mô hình .glb + Bóng đổ PBR thời gian thực)!'
        : '🖼️ Đã chuyển sang chế độ Tiết Kiệm Pin 2.5D Cổ Điển!'
    );
    if (onRefresh) onRefresh();
  });
}
