/**
 * Grid Pointer Gestures, Brush Painting & Entity Interactions (`farmGridInteractions.js`)
 * Extracted from `farmHomesteadRenderer.js` to keep modules clean and strictly < 500 lines:
 * - Play Mode: Continuous `Swipe-to-Harvest`, `Swipe-to-Plant`, `Swipe-Dew`, Creature Pens & Workshops
 * - Build Mode: Free Multi-Tile Placement, Continuous `1×1` Road/Fence/Plot Drag-Brush, Move/Rotate/Demolish & Parcel Expansion
 */

import { CREATURE_SPECS, FARM_RECIPES } from '../data/farmDefs.js';
import { GRID_COLS, GRID_ROWS, getBuildingDef } from '../data/farmGridDefs.js';
import {
  addFarmXp,
  findEntityAtCell,
  getEntityFootprint,
  harvestPlotEntity,
  harvestTreeEntity,
  isGridRectFree,
  moveExistingEntity,
  placeNewBuilding,
  plantCropOnEntity,
  removeExistingEntity,
  saveFarmState,
  speedUpEntityWithDew,
  unlockFarmParcel,
} from '../utils/farmStorage.js';
import { haptics } from '../utils/haptics.js';
import { sound } from '../utils/sound.js';
import { getParcelAtCell } from './farmTerrainRenderer.js';

export function bindFarmGridGestures(renderer) {
  const { canvas } = renderer;
  window.addEventListener('resize', () => {
    if (renderer.running) renderer.resize();
  });
  if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
    renderer._ro = new ResizeObserver(() => {
      if (renderer.running) renderer.resize();
    });
    renderer._ro.observe(canvas.parentElement);
  }

  canvas.addEventListener(
    'pointerdown',
    (e) => {
      if (!renderer.running || !renderer.farm || !renderer.proj) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const { x, y } = renderer._clientToLocal(e.clientX, e.clientY);
      const cell = renderer.proj.screenToCell(x, y);
      if (cell.col < 0 || cell.row < 0 || cell.col >= GRID_COLS || cell.row >= GRID_ROWS) return;

      if (renderer.buildMode) {
        if (renderer.buildAction === 'erase') {
          const ent = findEntityAtCell(renderer.farm, cell.col, cell.row);
          if (ent && ['cobble_path', 'wood_fence', 'lantern_flower', 'soil_plot'].includes(ent.type)) {
            e.stopImmediatePropagation();
            renderer.swipeSession = { pointerId: e.pointerId, mode: 'erase', visited: new Set() };
            applyBuildBrushCell(renderer, cell.col, cell.row);
          }
          return;
        }
        if (renderer.buildAction.startsWith('place:')) {
          const bType = renderer.buildAction.slice(6);
          const def = getBuildingDef(bType);
          if (def?.brushPaint && isGridRectFree(renderer.farm, cell.col, cell.row, 1, 1)) {
            e.stopImmediatePropagation();
            renderer.swipeSession = {
              pointerId: e.pointerId,
              mode: 'paint_build',
              bType,
              visited: new Set(),
            };
            try {
              canvas.setPointerCapture?.(e.pointerId);
            } catch {
              // Ignore synthetic pointer capture error
            }
            applyBuildBrushCell(renderer, cell.col, cell.row);
          }
        }
        return;
      }

      const ent = findEntityAtCell(renderer.farm, cell.col, cell.row);
      if (!ent || ent.type !== 'soil_plot') return;
      const now = Date.now();
      const isRipe = Boolean(ent.cropId && now >= ent.readyAt);
      const canPlant = !ent.cropId && renderer.selectedTool?.startsWith('crop:');
      const canDew = Boolean(ent.cropId && now < ent.readyAt && renderer.selectedTool === 'dew');

      if (isRipe || canPlant || canDew) {
        e.stopImmediatePropagation();
        renderer.swipeSession = {
          pointerId: e.pointerId,
          mode: isRipe ? 'harvest' : canDew ? 'dew' : 'plant',
          cropId: canPlant ? renderer.selectedTool.slice(5) : null,
          visited: new Set(),
        };
        try {
          canvas.setPointerCapture?.(e.pointerId);
        } catch {
          // Ignore synthetic pointer capture error
        }
        applyPlayPlotSwipe(renderer, ent);
      }
    },
    { capture: true }
  );

  canvas.addEventListener(
    'pointermove',
    (e) => {
      if (!renderer.swipeSession || e.pointerId !== renderer.swipeSession.pointerId || !renderer.proj) {
        return;
      }
      e.stopImmediatePropagation();
      const { x, y } = renderer._clientToLocal(e.clientX, e.clientY);
      const cell = renderer.proj.screenToCell(x, y);
      renderer.hoverCell = cell;
      if (renderer.swipeSession.mode === 'paint_build' || renderer.swipeSession.mode === 'erase') {
        applyBuildBrushCell(renderer, cell.col, cell.row);
      } else {
        const ent = findEntityAtCell(renderer.farm, cell.col, cell.row);
        if (ent && ent.type === 'soil_plot') applyPlayPlotSwipe(renderer, ent);
      }
    },
    { capture: true }
  );

  const endSwipe = (e) => {
    if (renderer.swipeSession && e.pointerId === renderer.swipeSession.pointerId) {
      renderer.swipeSession = null;
    }
  };
  canvas.addEventListener('pointerup', endSwipe, { capture: true });
  canvas.addEventListener('pointercancel', endSwipe, { capture: true });
}

function applyBuildBrushCell(renderer, col, row) {
  if (col < 0 || row < 0 || col >= GRID_COLS || row >= GRID_ROWS) return;
  const key = `${col},${row}`;
  if (!renderer.swipeSession || renderer.swipeSession.visited.has(key)) return;
  renderer.swipeSession.visited.add(key);

  if (renderer.swipeSession.mode === 'paint_build') {
    const res = placeNewBuilding(renderer.farm, renderer.appSave, renderer.swipeSession.bType, col, row, false);
    if (res.ok) {
      sound.sfxClick();
      const ctr = renderer.proj.cellCenter(col, row);
      renderer.floatTexts.push({
        x: ctr.x,
        y: ctr.y - 12,
        text: `✓ ${res.def.icon}`,
        color: '#b7e4c7',
        life: 0.8,
        maxLife: 0.8,
      });
      renderer.callbacks.onStateChanged?.();
      renderer.callbacks.onBuildStateChange?.();
    } else if (renderer.swipeSession.visited.size === 1 && res.reason) {
      renderer.callbacks.onToast?.(res.reason);
    }
    return;
  }

  if (renderer.swipeSession.mode === 'erase') {
    const ent = findEntityAtCell(renderer.farm, col, row);
    if (ent) {
      const res = removeExistingEntity(renderer.farm, renderer.appSave, ent.uid);
      if (res.ok) {
        sound.sfxCoin();
        const ctr = renderer.proj.cellCenter(col, row);
        renderer.floatTexts.push({
          x: ctr.x,
          y: ctr.y - 12,
          text: `+${res.refund}💰`,
          color: '#ffd166',
          life: 0.85,
          maxLife: 0.85,
        });
        renderer.callbacks.onStateChanged?.();
        renderer.callbacks.onBuildStateChange?.();
      }
    }
  }
}

function applyPlayPlotSwipe(renderer, ent) {
  if (!renderer.swipeSession || renderer.swipeSession.visited.has(ent.uid)) return;
  renderer.swipeSession.visited.add(ent.uid);
  const ctr = renderer.proj.cellCenter(ent.col, ent.row);
  const now = Date.now();

  if (renderer.swipeSession.mode === 'harvest') {
    const res = harvestPlotEntity(renderer.farm, ent, renderer.weather, now);
    if (res.ok) {
      sound.sfxCoin();
      haptics.tap?.();
      renderer._spawnHarvestFly(
        ctr.x,
        ctr.y,
        res.crop.icon,
        `+${res.qty} ${res.crop.icon}${res.bonusSnow ? ' +1❄️' : ''}`
      );
      if (res.leveledUp) {
        sound.sfxVictory();
        renderer.callbacks.onToast?.(
          `🎉 Trang Trại Hang Sóc thăng lên Cấp ${renderer.farm.farmLevel} (+2 💧 Sương Phép)!`
        );
      }
      renderer.callbacks.onStateChanged?.();
    } else if (res.reason) renderer.callbacks.onToast?.(res.reason);
    return;
  }

  if (renderer.swipeSession.mode === 'dew') {
    const res = speedUpEntityWithDew(renderer.farm, ent, now);
    if (res.ok) {
      sound.sfxRainbow();
      renderer._spawnHarvestFly(ctr.x, ctr.y, '💧', 'Chín Tức Thì!', '#72efdd');
      renderer.callbacks.onStateChanged?.();
    } else if (res.reason) renderer.callbacks.onToast?.(res.reason);
    return;
  }

  if (renderer.swipeSession.mode === 'plant' && renderer.swipeSession.cropId) {
    const res = plantCropOnEntity(
      renderer.farm,
      renderer.appSave,
      ent,
      renderer.swipeSession.cropId,
      renderer.weather,
      now
    );
    if (res.ok) {
      sound.sfxClick();
      const tag = res.usedSeed ? '1 Hạt' : res.crop.seedCostCoins > 0 ? `-${res.crop.seedCostCoins}💰` : 'Miễn Phí';
      renderer.floatTexts.push({
        x: ctr.x,
        y: ctr.y - 14,
        text: `🌱 ${res.crop.icon} (${tag})`,
        color: '#b7e4c7',
        life: 0.95,
        maxLife: 0.95,
      });
      renderer.callbacks.onStateChanged?.();
    } else if (res.reason) renderer.callbacks.onToast?.(res.reason);
  }
}

function tryUnlockParcelOnGrid(renderer, parcelId) {
  const res = unlockFarmParcel(renderer.farm, renderer.appSave, parcelId);
  if (res.ok) {
    sound.sfxVictory();
    haptics.victory?.();
    renderer.callbacks.onToast?.(
      `🎉 Đã mở rộng "${res.parcel.name}" — Tự do xây thêm ruộng, chuồng trại & đường đá trên lưới mới nhé!`
    );
    renderer.callbacks.onStateChanged?.();
    renderer.callbacks.onBuildStateChange?.();
  } else if (res.reason) {
    sound.sfxInvalid();
    renderer.callbacks.onToast?.(res.reason);
  }
}

export function handleFarmGridTap(renderer, clientX, clientY) {
  if (!renderer.farm || !renderer.proj) return;
  const { x, y } = renderer._clientToLocal(clientX, clientY);

  const signParcelId = renderer._findParcelSignAt(x, y);
  if (signParcelId) {
    tryUnlockParcelOnGrid(renderer, signParcelId);
    return;
  }

  const cell = renderer.proj.screenToCell(x, y);
  if (cell.col < 0 || cell.row < 0 || cell.col >= GRID_COLS || cell.row >= GRID_ROWS) return;

  const lockedParcel = getParcelAtCell(renderer.farm, cell.col, cell.row);
  if (lockedParcel) {
    tryUnlockParcelOnGrid(renderer, lockedParcel.id);
    return;
  }

  if (renderer.buildMode) {
    if (renderer.buildAction === 'erase') {
      const ent = findEntityAtCell(renderer.farm, cell.col, cell.row);
      if (ent) {
        renderer.movingUid = ent.uid;
        renderer.demolishSelectedEntity();
      }
      return;
    }

    if (renderer.buildAction.startsWith('place:')) {
      const bType = renderer.buildAction.slice(6);
      const res = placeNewBuilding(renderer.farm, renderer.appSave, bType, cell.col, cell.row, renderer.placeFlip);
      if (res.ok) {
        sound.sfxCoin();
        const { w, h } = getEntityFootprint(res.entity);
        const ctr = renderer.proj.cellCenter(cell.col, cell.row, w, h);
        renderer._spawnHarvestFly(ctr.x, ctr.y, res.def.icon, `🏗️ Đã xây ${res.def.name}!`);
        if (res.leveledUp) {
          sound.sfxVictory();
          renderer.callbacks.onToast?.(`🎉 Trang Trại Hang Sóc lên Cấp ${renderer.farm.farmLevel}!`);
        }
        renderer.callbacks.onStateChanged?.();
        renderer.callbacks.onBuildStateChange?.();
      } else if (res.reason) {
        sound.sfxInvalid();
        renderer.callbacks.onToast?.(res.reason);
      }
      return;
    }

    if (renderer.movingUid) {
      const res = moveExistingEntity(renderer.farm, renderer.movingUid, cell.col, cell.row, renderer.movingFlip);
      if (res.ok) {
        sound.sfxClick();
        const { w, h } = getEntityFootprint(res.entity);
        const ctr = renderer.proj.cellCenter(cell.col, cell.row, w, h);
        renderer.floatTexts.push({
          x: ctr.x,
          y: ctr.y - 20,
          text: '✓ Đã đặt vị trí mới!',
          color: '#b7e4c7',
          life: 1.0,
          maxLife: 1.0,
        });
        renderer.movingUid = null;
        renderer.callbacks.onStateChanged?.();
        renderer.callbacks.onBuildStateChange?.();
        return;
      }
      const altPicked = findEntityAtCell(renderer.farm, cell.col, cell.row);
      if (!altPicked && res.reason) {
        sound.sfxInvalid();
        renderer.callbacks.onToast?.(res.reason);
        return;
      }
    }

    const picked = findEntityAtCell(renderer.farm, cell.col, cell.row);
    sound.sfxClick();
    renderer.movingUid = picked ? picked.uid : null;
    renderer.movingFlip = Boolean(picked?.flip);
    renderer.callbacks.onBuildStateChange?.();
    return;
  }

  // Play Mode Entity Tap
  const ent = findEntityAtCell(renderer.farm, cell.col, cell.row);
  if (!ent) return;
  const { w, h } = getEntityFootprint(ent);
  const ctr = renderer.proj.cellCenter(ent.col, ent.row, w, h);
  const now = Date.now();

  if (renderer.selectedTool === 'dew') {
    const dewRes = speedUpEntityWithDew(renderer.farm, ent, now);
    if (dewRes.ok) {
      sound.sfxRainbow();
      renderer._spawnHarvestFly(ctr.x, ctr.y, '💧', 'Chín Tức Thì!', '#72efdd');
      renderer.callbacks.onStateChanged?.();
      return;
    }
  }

  if (ent.type === 'soil_plot') {
    if (!ent.cropId) {
      const cropId = renderer.selectedTool?.startsWith('crop:') ? renderer.selectedTool.slice(5) : 'wheat';
      const res = plantCropOnEntity(renderer.farm, renderer.appSave, ent, cropId, renderer.weather, now);
      if (res.ok) {
        sound.sfxClick();
        renderer.floatTexts.push({
          x: ctr.x,
          y: ctr.y - 14,
          text: `🌱 Đã gieo ${res.crop.name}`,
          color: '#b7e4c7',
          life: 0.95,
          maxLife: 0.95,
        });
        renderer.callbacks.onStateChanged?.();
      } else if (res.reason) renderer.callbacks.onToast?.(res.reason);
    } else if (now >= ent.readyAt) {
      const res = harvestPlotEntity(renderer.farm, ent, renderer.weather, now);
      if (res.ok) {
        sound.sfxCoin();
        renderer._spawnHarvestFly(ctr.x, ctr.y, res.crop.icon, `+${res.qty} ${res.crop.icon}`);
        renderer.callbacks.onStateChanged?.();
      }
    } else {
      renderer.callbacks.onToast?.('⏳ Cây đang lớn! Chọn "💧 Sương Phép" ở thanh dưới nếu muốn chín ngay nhé!');
    }
    return;
  }

  if (ent.type === 'apple_tree') {
    if (now >= ent.readyAt) {
      const res = harvestTreeEntity(renderer.farm, ent, now);
      if (res.ok) {
        sound.sfxCoin();
        renderer._spawnHarvestFly(ctr.x, ctr.y, '🍎', `+${res.qty} 🍎 Táo Vàng`);
        renderer.callbacks.onStateChanged?.();
      }
    } else {
      renderer.callbacks.onToast?.('🍎 Cây Táo Vàng đang kết trái — thu hoạch nhiều vụ không cần gieo lại!');
    }
    return;
  }

  if (CREATURE_SPECS[ent.type]) {
    const spec = CREATURE_SPECS[ent.type];
    if (ent.active && now >= ent.readyAt) {
      renderer.farm.barn[spec.productKey] = (renderer.farm.barn[spec.productKey] || 0) + spec.yieldQty;
      if (spec.bonusCoins) renderer.appSave.coins = (renderer.appSave.coins || 0) + spec.bonusCoins;
      ent.active = false;
      addFarmXp(renderer.farm, spec.xp);
      saveFarmState(renderer.farm);
      sound.sfxCoin();
      renderer._spawnHarvestFly(
        ctr.x,
        ctr.y,
        spec.productIcon,
        `+${spec.yieldQty} ${spec.productIcon}${spec.bonusCoins ? ` +${spec.bonusCoins}💰` : ''}`
      );
      renderer.callbacks.onStateChanged?.();
    } else if (!ent.active) {
      if ((renderer.farm.barn[spec.feedKey] || 0) < spec.feedQty) {
        sound.sfxInvalid();
        const fIcon = spec.feedKey === 'pumpkin' ? '🎃 Bí Ngô' : '🌾 Lúa Mạch';
        renderer.callbacks.onToast?.(`Cần ${spec.feedQty} ${fIcon} trong Kho để cho ${spec.name} ăn!`);
        return;
      }
      renderer.farm.barn[spec.feedKey] -= spec.feedQty;
      ent.active = true;
      ent.startedAt = now;
      ent.readyAt = now + spec.cycleSec * 1000;
      saveFarmState(renderer.farm);
      sound.sfxClick();
      renderer.floatTexts.push({ x: ctr.x, y: ctr.y - 20, text: '✓ Đã cho ăn!', color: '#ffea9c', life: 1.0, maxLife: 1.0 });
      renderer.callbacks.onStateChanged?.();
    } else {
      renderer.callbacks.onToast?.(`⏳ ${spec.name} đang tạo ${spec.productName}!`);
    }
    return;
  }

  if (ent.type === 'burrow_manor') {
    sound.sfxClick();
    renderer.callbacks.onOpenFarmModal?.('feast');
    return;
  }
  if (ent.type === 'owl_post') {
    sound.sfxClick();
    renderer.callbacks.onOpenFarmModal?.('orders');
    return;
  }
  if (['molly_bakery', 'butterbeer_mill', 'apothecary_cauldron'].includes(ent.type)) {
    if (ent.recipeId && now >= ent.readyAt) {
      const rec = FARM_RECIPES.find((r) => r.id === ent.recipeId);
      ent.recipeId = null;
      if (rec) renderer.callbacks.onCollectStationRecipe?.(rec, ctr.x, ctr.y);
      addFarmXp(renderer.farm, rec?.xp || 20);
      saveFarmState(renderer.farm);
      renderer.callbacks.onStateChanged?.();
      return;
    }
    sound.sfxClick();
    renderer.callbacks.onOpenFarmModal?.('workshops', ent.uid);
    return;
  }
  if (ent.type === 'weasley_car') {
    sound.sfxRainbow();
    renderer.floatTexts.push({
      x: ctr.x,
      y: ctr.y - 24,
      text: '🚗 Bíp bíp! Xe Bay Nhà Weasley!',
      color: '#90e0ef',
      life: 1.1,
      maxLife: 1.1,
    });
  }
}

export function handleFarmGridHover(renderer, clientX, clientY) {
  if (!renderer.proj || !renderer.farm) return;
  const { x, y } = renderer._clientToLocal(clientX, clientY);
  renderer.hoveredParcelId = renderer._findParcelSignAt(x, y);
  const cell = renderer.proj.screenToCell(x, y);
  renderer.hoverCell = cell;
  const ent = findEntityAtCell(renderer.farm, cell.col, cell.row);
  renderer.hoveredEntityUid = ent?.uid || null;
  if (renderer.canvas) {
    renderer.canvas.style.cursor = renderer.buildMode || ent || renderer.hoveredParcelId ? 'pointer' : 'grab';
  }
}
