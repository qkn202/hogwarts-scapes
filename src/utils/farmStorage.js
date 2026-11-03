/**
 * Grid-Based Persistent State & Simulation Engine for Wizarding Farmscapes (`farmStorage.js`)
 * Powers the 14x14 Isometric Tile-Grid Farmstead (`playrix_clone_farm_v2`), free building placement,
 * moving/rotating/demolishing, parcel land expansion, Greenhouse speed aura, and Match-3 drops!
 */

import {
  CREATURE_SPECS,
  FARM_CROPS,
  FARM_ITEM_META,
  FARM_RECIPES,
  OWL_CUSTOMERS,
  getFarmXpForNextLevel,
} from '../data/farmDefs.js';
import {
  FARM_PARCELS,
  GRID_COLS,
  GRID_ROWS,
  getBuildingDef,
  getParcelForCell,
} from '../data/farmGridDefs.js';

const FARM_STORAGE_KEY = 'playrix_clone_farm_v2';
const LEGACY_V1_KEY = 'playrix_clone_farm_v1';

function mkUid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createStarterEntities(now = Date.now()) {
  const list = [
    { uid: 'b_manor', type: 'burrow_manor', col: 2, row: 2, flip: false },
    { uid: 'b_owl', type: 'owl_post', col: 6, row: 2, flip: false },
    { uid: 'b_bakery', type: 'molly_bakery', col: 9, row: 2, flip: false, recipeId: null, startedAt: 0, readyAt: 0 },
    { uid: 'b_cauldron', type: 'apothecary_cauldron', col: 9, row: 5, flip: false, recipeId: null, startedAt: 0, readyAt: 0 },
    { uid: 'b_bee', type: 'beehive', col: 2, row: 6, flip: false, active: true, startedAt: now - 100000, readyAt: now - 1000 },
    { uid: 'b_cow', type: 'cow_barn', col: 2, row: 9, flip: false, active: false, startedAt: 0, readyAt: 0 },
    { uid: 't_apple1', type: 'apple_tree', col: 8, row: 2, flip: false, plantedAt: now - 200000, readyAt: now - 1000 },
    { uid: 'd_lamp1', type: 'lantern_flower', col: 5, row: 4, flip: false },
    { uid: 'd_lamp2', type: 'lantern_flower', col: 8, row: 4, flip: false },
  ];

  // Stone path connecting The Burrow porch, Owlery, Bakery & Fields
  const pathCoords = [
    [5, 3], [5, 4], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [4, 6], [4, 7],
  ];
  pathCoords.forEach(([c, r], idx) => {
    list.push({ uid: `p_init_${idx}`, type: 'cobble_path', col: c, row: r, flip: false });
  });

  // 8 Starter Soil Plots (4x2 neat field at cols 5..8, rows 6..7) with ripe Wheat & Pumpkin!
  const plotSeeds = [
    { c: 5, r: 6, cropId: 'wheat', readyOffset: -1000 },
    { c: 6, r: 6, cropId: 'wheat', readyOffset: -1000 },
    { c: 7, r: 6, cropId: 'pumpkin', readyOffset: -1000 },
    { c: 8, r: 6, cropId: 'berry', readyOffset: 45000 },
    { c: 5, r: 7, cropId: null, readyOffset: 0 },
    { c: 6, r: 7, cropId: null, readyOffset: 0 },
    { c: 7, r: 7, cropId: null, readyOffset: 0 },
    { c: 8, r: 7, cropId: null, readyOffset: 0 },
  ];
  plotSeeds.forEach((p, idx) => {
    list.push({
      uid: `plot_init_${idx}`,
      type: 'soil_plot',
      col: p.c,
      row: p.r,
      flip: false,
      cropId: p.cropId,
      plantedAt: p.cropId ? now - 60000 : 0,
      readyAt: p.cropId ? now + p.readyOffset : 0,
    });
  });

  return list;
}

export function createDefaultFarmState() {
  const now = Date.now();
  const state = {
    version: 2,
    farmLevel: 1,
    farmXp: 0,
    barnCapacity: 100,
    dewdrops: 4,
    feastTier: 1,
    feastProgress: 0,
    unlockedParcels: ['core'],
    wateredFriends: {},
    seeds: { seed_mandrake: 3, seed_moon: 2, seed_apple: 1 },
    barn: {
      wheat: 6,
      pumpkin: 3,
      berry: 2,
      mandrake: 1,
      moonshroom: 0,
      goldapple: 0,
      egg: 2,
      honey: 2,
      cream: 1,
      feather: 0,
      pure_snow: 0,
      pumpkin_pie: 1,
      egg_custard: 0,
      butterbeer: 0,
      berry_tart: 0,
    },
    entities: createStarterEntities(now),
    owlOrders: [],
  };
  while (state.owlOrders.length < 4) {
    state.owlOrders.push(generateOwlOrder(state.farmLevel, state.owlOrders.length));
  }
  return state;
}

export function generateOwlOrder(farmLv = 1, slotIdx = 0) {
  const cust = OWL_CUSTOMERS[(slotIdx + Math.floor(Math.random() * OWL_CUSTOMERS.length)) % OWL_CUSTOMERS.length];
  const pool = ['wheat', 'pumpkin', 'berry', 'egg', 'honey', 'cream', 'pumpkin_pie'];
  if (farmLv >= 2) pool.push('mandrake', 'moonshroom', 'egg_custard', 'butterbeer');
  if (farmLv >= 3) pool.push('goldapple', 'feather', 'berry_tart');

  const countTypes = slotIdx % 2 === 0 ? 2 : 1;
  const items = {};
  let baseCoins = 38;
  for (let i = 0; i < countTypes; i++) {
    const key = pool[Math.floor(Math.random() * pool.length)];
    const isArtisan = ['pumpkin_pie', 'egg_custard', 'butterbeer', 'berry_tart'].includes(key);
    const qty = isArtisan ? 1 : 2 + (slotIdx % 2);
    items[key] = (items[key] || 0) + qty;
    baseCoins += (FARM_ITEM_META[key]?.sellCoins || 15) * qty;
  }

  return {
    id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    customerId: cust.id,
    items,
    rewardCoins: Math.round(baseCoins * 1.45),
    rewardFarmXp: 18 + countTypes * 12,
    rewardSeasonXp: 35 + countTypes * 15,
    bonusDewdrop: Math.random() < 0.35 ? 1 : 0,
  };
}

export function loadFarmState() {
  const fallback = createDefaultFarmState();
  try {
    const raw = localStorage.getItem(FARM_STORAGE_KEY);
    if (!raw) {
      // Seamless migration of resources if user had v1 state
      const rawV1 = localStorage.getItem(LEGACY_V1_KEY);
      if (rawV1) {
        const v1 = JSON.parse(rawV1);
        if (v1 && typeof v1 === 'object') {
          fallback.farmLevel = Math.max(1, Number(v1.farmLevel) || 1);
          fallback.farmXp = Math.max(0, Number(v1.farmXp) || 0);
          fallback.dewdrops = Math.max(0, Number(v1.dewdrops) ?? 4);
          fallback.feastTier = Math.max(1, Number(v1.feastTier) || 1);
          fallback.feastProgress = Math.max(0, Number(v1.feastProgress) || 0);
          fallback.seeds = { ...fallback.seeds, ...(v1.seeds || {}) };
          fallback.barn = { ...fallback.barn, ...(v1.barn || {}) };
        }
      }
      saveFarmState(fallback);
      return fallback;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;
    const entities = Array.isArray(parsed.entities) && parsed.entities.length > 0
      ? parsed.entities.filter((e) => e && getBuildingDef(e.type))
      : fallback.entities;
    const unlockedParcels = Array.isArray(parsed.unlockedParcels) && parsed.unlockedParcels.includes('core')
      ? parsed.unlockedParcels
      : ['core', ...(parsed.unlockedParcels || [])];
    const owlOrders = Array.isArray(parsed.owlOrders) && parsed.owlOrders.length === 4
      ? parsed.owlOrders
      : fallback.owlOrders;
    return {
      ...fallback,
      ...parsed,
      unlockedParcels,
      seeds: { ...fallback.seeds, ...(parsed.seeds || {}) },
      barn: { ...fallback.barn, ...(parsed.barn || {}) },
      entities,
      wateredFriends: parsed.wateredFriends && typeof parsed.wateredFriends === 'object' ? parsed.wateredFriends : {},
      owlOrders,
    };
  } catch {
    return fallback;
  }
}

export function saveFarmState(farm) {
  try {
    localStorage.setItem(FARM_STORAGE_KEY, JSON.stringify(farm));
  } catch {
    // Ignore storage quota errors
  }
}

export function getEntityFootprint(entOrType, flip = false) {
  const type = typeof entOrType === 'string' ? entOrType : entOrType?.type;
  const isFlip = typeof entOrType === 'string' ? flip : Boolean(entOrType?.flip);
  const def = getBuildingDef(type);
  if (!def) return { w: 1, h: 1 };
  return isFlip ? { w: def.h, h: def.w } : { w: def.w, h: def.h };
}

export function isTileUnlocked(farm, col, row) {
  if (col < 0 || row < 0 || col >= GRID_COLS || row >= GRID_ROWS) return false;
  const p = getParcelForCell(col, row);
  return Boolean(p && farm.unlockedParcels?.includes(p.id));
}

export function findEntityAtCell(farm, col, row, ignoreUid = null) {
  if (!farm?.entities) return null;
  for (const ent of farm.entities) {
    if (ignoreUid && ent.uid === ignoreUid) continue;
    const { w, h } = getEntityFootprint(ent);
    if (col >= ent.col && col < ent.col + w && row >= ent.row && row < ent.row + h) {
      return ent;
    }
  }
  return null;
}

export function isGridRectFree(farm, col, row, w, h, ignoreUid = null) {
  if (col < 0 || row < 0 || col + w > GRID_COLS || row + h > GRID_ROWS) return false;
  for (let c = col; c < col + w; c++) {
    for (let r = row; r < row + h; r++) {
      if (!isTileUnlocked(farm, c, r)) return false;
      if (findEntityAtCell(farm, c, r, ignoreUid)) return false;
    }
  }
  return true;
}

export function countBuildingType(farm, type) {
  return (farm.entities || []).filter((e) => e.type === type).length;
}

export function hasGreenhouseAura(farm, col, row) {
  for (const ent of farm.entities || []) {
    if (ent.type !== 'greenhouse') continue;
    const distC = Math.max(ent.col - col, 0, col - (ent.col + 1));
    const distR = Math.max(ent.row - row, 0, row - (ent.row + 1));
    if (Math.max(distC, distR) <= 2) return true;
  }
  return false;
}

export function placeNewBuilding(farm, appSave, type, col, row, flip = false, now = Date.now()) {
  const def = getBuildingDef(type);
  if (!def) return { ok: false, reason: 'Công trình không hợp lệ.' };
  if (farm.farmLevel < def.unlockFarmLv) {
    return { ok: false, reason: `Cần Cấp Nông Trại ${def.unlockFarmLv} để xây ${def.name}!` };
  }
  const built = countBuildingType(farm, type);
  const cap = def.maxCount(farm.farmLevel);
  if (built >= cap) {
    return { ok: false, reason: `Đã đạt giới hạn ${built}/${cap} "${def.name}" ở Cấp ${farm.farmLevel} (tăng Cấp để xây thêm)!` };
  }
  const { w, h } = getEntityFootprint(type, flip);
  if (!isGridRectFree(farm, col, row, w, h)) {
    return { ok: false, reason: 'Ô lưới này đang vướng công trình khác hoặc thuộc khu đất chưa mở rộng!' };
  }
  if ((appSave.coins || 0) < def.costCoins) {
    return { ok: false, reason: `Cần ${def.costCoins} 💰 Galleon để xây ${def.name}!` };
  }

  appSave.coins -= def.costCoins;
  const ent = { uid: mkUid(type), type, col, row, flip: Boolean(flip) };
  if (def.kind === 'plot') {
    ent.cropId = null;
    ent.plantedAt = 0;
    ent.readyAt = 0;
  } else if (def.kind === 'tree') {
    const speed = hasGreenhouseAura(farm, col, row) ? 0.75 : 1;
    ent.plantedAt = now;
    ent.readyAt = now + Math.round(def.cycleSec * 1000 * speed);
  } else if (def.kind === 'creature') {
    ent.active = false;
    ent.startedAt = 0;
    ent.readyAt = 0;
  } else if (def.kind === 'station') {
    ent.recipeId = null;
    ent.startedAt = 0;
    ent.readyAt = 0;
  }
  farm.entities.push(ent);
  const xpGain = def.costCoins >= 150 ? 15 : def.costCoins >= 25 ? 5 : 1;
  const leveledUp = addFarmXp(farm, xpGain);
  saveFarmState(farm);
  return { ok: true, entity: ent, def, leveledUp };
}

export function moveExistingEntity(farm, uid, col, row, flip = null) {
  const ent = farm.entities.find((e) => e.uid === uid);
  if (!ent) return { ok: false };
  const nextFlip = flip !== null ? Boolean(flip) : Boolean(ent.flip);
  const { w, h } = getEntityFootprint(ent.type, nextFlip);
  if (!isGridRectFree(farm, col, row, w, h, uid)) {
    return { ok: false, reason: 'Vị trí mới bị vướng công trình hoặc ngoài vùng đất đã mở!' };
  }
  ent.col = col;
  ent.row = row;
  ent.flip = nextFlip;
  saveFarmState(farm);
  return { ok: true, entity: ent };
}

export function removeExistingEntity(farm, appSave, uid) {
  const idx = farm.entities.findIndex((e) => e.uid === uid);
  if (idx < 0) return { ok: false };
  const ent = farm.entities[idx];
  const def = getBuildingDef(ent.type);
  if (!def?.removable) {
    return { ok: false, reason: `"${def?.name || ''}" là công trình cốt lõi — bạn hãy dùng nút Di Chuyển để đổi vị trí nhé!` };
  }
  const refund = Math.floor((def.costCoins || 0) * 0.5);
  appSave.coins = (appSave.coins || 0) + refund;
  farm.entities.splice(idx, 1);
  saveFarmState(farm);
  return { ok: true, def, refund };
}

export function unlockFarmParcel(farm, appSave, parcelId) {
  const p = FARM_PARCELS.find((x) => x.id === parcelId);
  if (!p || farm.unlockedParcels.includes(p.id)) return { ok: false };
  if (farm.farmLevel < p.minFarmLv) {
    return { ok: false, reason: `Cần đạt Cấp Nông Trại ${p.minFarmLv} để khai phá "${p.name}"!` };
  }
  if ((appSave.coins || 0) < p.costCoins) {
    return { ok: false, reason: `Cần ${p.costCoins} 💰 Galleon để mở rộng "${p.name}"!` };
  }
  appSave.coins -= p.costCoins;
  farm.unlockedParcels.push(p.id);
  const leveledUp = addFarmXp(farm, 25);
  saveFarmState(farm);
  return { ok: true, parcel: p, leveledUp };
}

export function getBarnTotalCount(farm) {
  return Object.values(farm.barn || {}).reduce((sum, v) => sum + Math.max(0, Number(v) || 0), 0);
}

export function addFarmXp(farm, amount) {
  farm.farmXp = (farm.farmXp || 0) + Math.max(0, amount);
  let leveledUp = false;
  while (farm.farmXp >= getFarmXpForNextLevel(farm.farmLevel)) {
    farm.farmXp -= getFarmXpForNextLevel(farm.farmLevel);
    farm.farmLevel += 1;
    farm.dewdrops = (farm.dewdrops || 0) + 2;
    leveledUp = true;
  }
  return leveledUp;
}

export function canFulfillOrder(farm, order) {
  if (!order?.items) return false;
  return Object.entries(order.items).every(([k, qty]) => (farm.barn[k] || 0) >= qty);
}

export function canCraftRecipe(farm, recipe) {
  if (!recipe?.inputs) return false;
  return Object.entries(recipe.inputs).every(([k, qty]) => (farm.barn[k] || 0) >= qty);
}

export function countFarmReadyActions(farm, now = Date.now()) {
  if (!farm?.entities) return 0;
  let ready = 0;
  for (const ent of farm.entities) {
    if (ent.type === 'soil_plot' && ent.cropId && now >= ent.readyAt) ready += 1;
    else if (ent.type === 'apple_tree' && now >= ent.readyAt) ready += 1;
    else if (CREATURE_SPECS[ent.type] && ent.active && now >= ent.readyAt) ready += 1;
    else if (ent.recipeId && now >= ent.readyAt) ready += 1;
  }
  for (const ord of farm.owlOrders || []) {
    if (canFulfillOrder(farm, ord)) ready += 1;
  }
  return ready;
}

export function plantCropOnEntity(farm, appSave, ent, cropId, weather = 'day', now = Date.now()) {
  if (!ent || ent.type !== 'soil_plot' || ent.cropId) return { ok: false };
  const crop = FARM_CROPS.find((c) => c.id === cropId);
  if (!crop) return { ok: false };
  if (farm.farmLevel < crop.unlockFarmLv) {
    return { ok: false, reason: `Cần Cấp Nông Trại ${crop.unlockFarmLv} để gieo ${crop.name}!` };
  }
  let usedSeed = false;
  if (crop.seedKey && (farm.seeds[crop.seedKey] || 0) > 0) {
    farm.seeds[crop.seedKey] -= 1;
    usedSeed = true;
  } else if ((appSave.coins || 0) >= crop.seedCostCoins) {
    appSave.coins -= crop.seedCostCoins;
  } else {
    return { ok: false, reason: `Cần ${crop.seedCostCoins} 💰 hoặc hạt giống từ Match-3!` };
  }
  let mul = crop.weatherBonus === 'day' && weather === 'day' ? 0.75 : 1.0;
  if (hasGreenhouseAura(farm, ent.col, ent.row)) mul *= 0.75;
  ent.cropId = crop.id;
  ent.plantedAt = now;
  ent.readyAt = now + Math.max(5000, Math.round(crop.growSec * 1000 * mul));
  saveFarmState(farm);
  return { ok: true, crop, usedSeed };
}

export function harvestPlotEntity(farm, ent, weather = 'day', now = Date.now()) {
  if (!ent || ent.type !== 'soil_plot' || !ent.cropId || now < ent.readyAt) return { ok: false };
  const crop = FARM_CROPS.find((c) => c.id === ent.cropId);
  if (!crop) {
    ent.cropId = null;
    return { ok: false };
  }
  if (getBarnTotalCount(farm) >= farm.barnCapacity + 24) {
    return { ok: false, reason: 'Kho Lẫm đã đầy! Hãy giao Đơn Hàng Cú hoặc mở rộng Kho nhé!' };
  }
  let qty = crop.baseYield;
  if (crop.weatherBonus === 'night' && weather === 'night') qty *= 2;
  farm.barn[crop.id] = (farm.barn[crop.id] || 0) + qty;
  let bonusSnow = 0;
  if (weather === 'snow') {
    farm.barn.pure_snow = (farm.barn.pure_snow || 0) + 1;
    bonusSnow = 1;
  }
  ent.cropId = null;
  ent.plantedAt = 0;
  ent.readyAt = 0;
  const leveledUp = addFarmXp(farm, crop.xp);
  saveFarmState(farm);
  return { ok: true, crop, qty, bonusSnow, leveledUp };
}

export function harvestTreeEntity(farm, ent, now = Date.now()) {
  const def = getBuildingDef(ent?.type);
  if (!def || def.kind !== 'tree' || now < ent.readyAt) return { ok: false };
  farm.barn[def.yieldKey] = (farm.barn[def.yieldKey] || 0) + def.yieldQty;
  const mul = hasGreenhouseAura(farm, ent.col, ent.row) ? 0.75 : 1.0;
  ent.plantedAt = now;
  ent.readyAt = now + Math.round(def.cycleSec * 1000 * mul);
  const leveledUp = addFarmXp(farm, def.xp);
  saveFarmState(farm);
  return { ok: true, def, qty: def.yieldQty, leveledUp };
}

export function speedUpEntityWithDew(farm, ent, now = Date.now()) {
  if (!ent) return { ok: false };
  const isWaiting =
    (ent.type === 'soil_plot' && ent.cropId && now < ent.readyAt) ||
    (ent.type === 'apple_tree' && now < ent.readyAt) ||
    (CREATURE_SPECS[ent.type] && ent.active && now < ent.readyAt) ||
    (ent.recipeId && now < ent.readyAt);
  if (!isWaiting) return { ok: false, reason: 'Ô này đã chín hoặc đang nghỉ!' };
  if ((farm.dewdrops || 0) <= 0) {
    return { ok: false, reason: 'Hết 💧 Sương Phép! Thắng Match-3 hoặc tưới cây bạn bè để nhận thêm nhé!' };
  }
  farm.dewdrops -= 1;
  ent.readyAt = now - 1;
  saveFarmState(farm);
  return { ok: true };
}

export function awardMatch3FarmDrops(farm, levelDef, winStreak = 0) {
  const isHard = levelDef?.difficulty === 'hard' || levelDef?.difficulty === 'super_hard';
  const dew = 1 + (isHard ? 1 : 0) + (winStreak >= 3 ? 1 : 0);
  const mandrake = 1 + (levelDef?.level % 2 === 0 ? 1 : 0);
  const moon = isHard || winStreak >= 2 ? 1 : 0;
  const apple = levelDef?.difficulty === 'super_hard' || levelDef?.level % 5 === 0 ? 1 : 0;

  farm.dewdrops = (farm.dewdrops || 0) + dew;
  farm.seeds.seed_mandrake = (farm.seeds.seed_mandrake || 0) + mandrake;
  if (moon > 0) farm.seeds.seed_moon = (farm.seeds.seed_moon || 0) + moon;
  if (apple > 0) farm.seeds.seed_apple = (farm.seeds.seed_apple || 0) + apple;
  saveFarmState(farm);

  const badges = [`💧 +${dew} Sương Phép`, `🌱 +${mandrake} Hạt Mandrake`];
  if (moon > 0) badges.push(`🍄 +${moon} Bào Tử Nấm`);
  if (apple > 0) badges.push(`🍎 +${apple} Hạt Táo Vàng`);
  return badges;
}
