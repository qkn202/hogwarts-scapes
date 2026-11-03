/**
 * Non-Blocking Interactive Hogwarts App Tour (Persistent Manual Popover)
 * Follows persistent-app-tours guidance:
 * - popover="manual" so board/world taps do not accidentally dismiss the step
 * - role="dialog" + aria-labelledby
 * - Programmatic focus shift inside the popover immediately upon opening
 */

import { sound } from '../utils/sound.js';

const GARDEN_TOUR_STEPS = {
  1: {
    title: '🪄 Màn 1 Hardcore · Pháo Phép & Thần Hộ Mệnh',
    body: 'Chế độ Hardcore giới hạn lượt chặt hơn bản gốc! Hãy ưu tiên ghép 4 (ô vuông 2×2 hoặc hàng 4) tạo Pháo Sáng và ghép 5 tạo Vạc Nổ để nạp 100% Cầu Thần Hộ Mệnh!',
  },
  2: {
    title: '🧙‍♂️ Màn 2 · Giải Cứu Tượng Dưới Rêu Cổ Ngữ',
    body: 'Các Tượng Phù Thủy 1×2 và 2×2 nằm ẩn dưới lớp Rêu xanh! Ghép cổ vật trực tiếp trên ô Rêu hoặc dùng Vạc Nổ để dọn sạch từng lớp Rêu nhé!',
  },
  5: {
    title: '🌊 Cơ Chế Mới · Dòng Chảy Phép Thuật',
    body: 'Cuối mỗi lượt đi, suối phép màu xanh sẽ cuốn mọi cổ vật trôi đi 1 ô theo chiều mũi tên. Hãy tính trước vị trí trôi để tạo chuỗi nổ liên hoàn!',
  },
  6: {
    title: '🐚 Cơ Chế Mới · Vỏ Sò Phép Đóng/Mở',
    body: 'Vỏ Sò Phép đóng và mở luân phiên mỗi lượt! Chỉ khi vỏ sò mở hé viên ngọc trai sáng lấp lánh, phép ghép cạnh bên mới phá vỡ được nó!',
  },
  8: {
    title: '🌀 Cơ Chế Mới · Cổng Độn Thổ 2 Đảo (6 Màu)',
    body: 'Bàn chơi chia làm 2 đảo tách biệt nối bằng Cổng Độn Thổ sáng rực! Phá ô ở đảo dưới sẽ hút cổ vật & Cúp Bia Bơ từ đảo trên xuyên qua cổng!',
  },
  10: {
    title: '💀 Boss 2 Giai Đoạn · Cuộn Màn Rừng Cấm',
    body: 'Đây là màn Boss 2 Giai Đoạn! Hoàn thành mục tiêu Sân Trước thật tiết kiệm lượt — bàn chơi sẽ tự cuộn sang Giai Đoạn 2 dùng chung số lượt còn lại!',
  },
};

const HOME_TOUR_STEPS = {
  1: {
    title: '✉️ Màn 1 Hardcore · Thư Sấm 2×2 & Xoay Thời Gian',
    body: 'Ghép ô vuông 2×2 để gọi Thư Sấm Howler bay thẳng tới ô Thảm Gryffindor! Kích nổ Chổi Thần & Vạc Độc Dược sẽ nạp 100% Xoay Thời Gian!',
  },
  2: {
    title: '🐸 Màn 2 · Rương Hogwarts & Ếch Sô-cô-la',
    body: 'Ghép cạnh bên để phá Rương Gỗ, rồi phóng Chổi Thần hoặc Thư Sấm trúng Ếch Sô-cô-la nhé — ghép thường cạnh bên không thể bắt được Ếch!',
  },
  5: {
    title: '🌊 Cơ Chế Mới · Hành Lang Dịch Chuyển',
    body: 'Cuối mỗi lượt đi, dòng phép hành lang sẽ đẩy toàn bộ cổ vật trôi đi 1 ô theo mũi tên. Hãy tính trước vị trí trôi để trải Thảm Đỏ liên hoàn!',
  },
  6: {
    title: '🐚 Cơ Chế Mới · Bọt Đa Dịch & Vỏ Sò Phép',
    body: 'Bọt Đa Dịch sẽ sinh sôi nếu bạn không dọn ít nhất 1 ô Bọt trong lượt, còn Vỏ Sò Phép chỉ vỡ khi đang mở hé viên ngọc sáng lấp lánh!',
  },
  8: {
    title: '🌀 Cơ Chế Mới · Lò Sưởi Floo 2 Tháp (6 Màu)',
    body: 'Hai tháp tách biệt nối liền bằng Cổng Lửa Floo! Phá ô ở tháp dưới sẽ kéo Chìa Khóa Phép và cổ vật từ tháp trên rơi xuyên qua cổng!',
  },
  10: {
    title: '💀 Boss 2 Giai Đoạn · Sâu Trong Mật Thất',
    body: 'Đây là màn Boss 2 Giai Đoạn! Hóa giải Xích & Bọt Đa Dịch thật tiết kiệm lượt — bàn chơi sẽ tự cuộn xuống Mật Thất Giai Đoạn 2 dùng chung lượt còn lại!',
  },
};

let activePlaceTourFn = null;
let tourResizeBound = false;

export function maybeShowLevelTour(app, levelNum) {
  const stepMap = app.gameId === 'homescapes' ? HOME_TOUR_STEPS : GARDEN_TOUR_STEPS;
  const step = stepMap[levelNum];
  if (!step) return;
  const key = `lv_${levelNum}`;
  if (app.save.tutorialSeen?.[key]) return;

  const pop = document.getElementById('hogwarts-tour');
  if (!pop) return;

  app.save.tutorialSeen = app.save.tutorialSeen || {};
  app.save.tutorialSeen[key] = true;
  app.persistAndSyncHud();

  const heading = document.getElementById('tour-step-title');
  const desc = document.getElementById('tour-step-body');
  const closeBtn = document.getElementById('tour-step-ok');
  if (heading) heading.textContent = step.title;
  if (desc) desc.textContent = step.body;

  // Portrait match-3: dock the tour into a free gap so it never covers the board (taps!) or boosters
  pop.style.top = '';
  pop.style.bottom = '';
  pop.style.maxHeight = '';
  const placeInFreeGap = () => {
    const panel = document.querySelector('.m3-left-panel');
    const boosters = document.querySelector('.m3-boosters-col');
    const ctrl = app.m3Controller;
    if (app.screen !== 'match3' || !panel || !ctrl?.board || window.innerHeight <= window.innerWidth) {
      pop.style.top = '';
      pop.style.bottom = '';
      return;
    }
    const cRect = ctrl.canvas.getBoundingClientRect();
    const boardTop = cRect.top + ctrl.originY - 10;
    const boardBottom = cRect.top + ctrl.originY + ctrl.tileSize * ctrl.board.rows + 10;
    const gapTop = { from: panel.getBoundingClientRect().bottom + 4, to: boardTop };
    const gapBottom = { from: boardBottom, to: (boosters?.getBoundingClientRect().top ?? window.innerHeight) - 4 };
    const h = pop.offsetHeight;
    const best = [gapTop, gapBottom].sort((a, b) => b.to - b.from - (a.to - a.from))[0];
    const room = best.to - best.from;
    pop.style.top = `${Math.round(best.from + Math.max(0, (room - h) / 2))}px`;
    pop.style.bottom = 'auto';
  };
  activePlaceTourFn = placeInFreeGap;
  if (!tourResizeBound) {
    tourResizeBound = true;
    window.addEventListener('resize', () => {
      const p = document.getElementById('hogwarts-tour');
      if (p && (p.matches?.(':popover-open') || p.classList.contains(':popover-open'))) {
        activePlaceTourFn?.();
      }
    });
  }

  const supportsPopover = 'popover' in HTMLElement.prototype && typeof pop.showPopover === 'function';
  if (supportsPopover) {
    if (!pop.matches(':popover-open')) pop.showPopover();
  } else {
    pop.classList.add(':popover-open');
  }
  placeInFreeGap();

  // Shift programmatic focus inside the manual popover immediately after opening
  requestAnimationFrame(() => {
    closeBtn?.focus({ preventScroll: true });
  });

  if (closeBtn) {
    closeBtn.onclick = () => {
      sound.sfxClick();
      dismissLevelTour();
    };
  }
}

export function dismissLevelTour() {
  activePlaceTourFn = null;
  const pop = document.getElementById('hogwarts-tour');
  if (!pop) return;
  try {
    if (typeof pop.hidePopover === 'function' && pop.matches(':popover-open')) {
      pop.hidePopover();
    }
  } catch {
    // Fallback
  }
  pop.classList.remove(':popover-open');
}

