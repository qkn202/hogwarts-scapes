/**
 * Shared Persistent State & Simulation Engine for Wizarding Farmscapes (`farmStorage.js`)
 * Persists across both Gardenscapes & Homescapes (`playrix_clone_farm_v1`),
 * computes real-time offline progress via timestamps, applies Weather bonuses,
 * generates Owl Post orders, and bridges into Match-3 Boosters/Hearts & Castle Grand Feast!
 */

import {
  FARM_CREATURES,
  FARM_CROPS,
  FARM_ITEM_META,
  FARM_PLOTS_LAYOUT,
  FARM_RECIPES,
  OWL_CUSTOMERS,
  getFarmXpForNextLevel,
} from '../data/farmDefs.js';

const FARM_STORAGE_KEY = 'playrix_clone_farm_v1';

export function createDefaultFarmState() {
  const now = Date.now();
  const state = {
    farmLevel: 1,
    farmXp: 0,
    barnCapacity: 90,
    dewdrops: 4,
    feastTier: 1,
    feastProgress: 0,
    wateredFriends: {},
    seeds: {
      seed_mandrake: 3,
      seed_moon: 2,
      seed_apple: 1,
    },
    barn: {
      wheat: 6,
      pumpkin: 3,
      berry: 2,
      mandrake: 1,
      moonshroom: 0,
      goldapple: 0,
      honey: 2,
      cream: 1,
      pure_snow: 0,
      pumpkin_pie: 1,
      butterbeer: 0,
      berry_tart: 0,
    },
    // Pre-seed 3 ripe crops & 2 growing crops so new players experience Swipe-to-Harvest immediately!
    plots: FARM_PLOTS_LAYOUT.map((p, idx) => {
      if (idx === 0 || idx === 1) {
        return { cropId: 'wheat', plantedAt: now - 60000, readyAt: now - 1000 };
      }
      if (idx === 4) {
        return { cropId: 'pumpkin', plantedAt: now - 120000, readyAt: now - 1000 };
      }
      if (idx === 2) {
        return { cropId: 'berry', plantedAt: now - 40000, readyAt: now + 50000 };
      }
      return { cropId: null, plantedAt: 0, readyAt: 0 };
    }),
    creatures: {
      honeybee: { active: true, startedAt: now - 100000, readyAt: now - 1000 },
      dairy_cow: { active: false, startedAt: 0, readyAt: 0 },
    },
    stations: {
      kitchen: { recipeId: null, startedAt: 0, readyAt: 0 },
      cauldron: { recipeId: null, startedAt: 0, readyAt: 0 },
    },
    owlOrders: [],
  };
  while (state.owlOrders.length < 4) {
    state.owlOrders.push(generateOwlOrder(state.farmLevel, state.owlOrders.length));
  }
  return state;
}

export function generateOwlOrder(farmLv = 1, slotIdx = 0) {
  const cust = OWL_CUSTOMERS[(slotIdx + Math.floor(Math.random() * OWL_CUSTOMERS.length)) % OWL_CUSTOMERS.length];
  const pool = ['wheat', 'pumpkin', 'berry', 'honey', 'cream', 'pumpkin_pie'];
  if (farmLv >= 2) pool.push('mandrake', 'moonshroom', 'butterbeer');
  if (farmLv >= 3) pool.push('goldapple', 'berry_tart');

  const countTypes = slotIdx % 2 === 0 ? 2 : 1;
  const items = {};
  let baseCoins = 35;
  for (let i = 0; i < countTypes; i++) {
    const key = pool[Math.floor(Math.random() * pool.length)];
    const isArtisan = key === 'pumpkin_pie' || key === 'butterbeer' || key === 'berry_tart';
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
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;
    const plots = FARM_PLOTS_LAYOUT.map((_, idx) => {
      const p = parsed.plots?.[idx];
      if (!p || !p.cropId) return { cropId: null, plantedAt: 0, readyAt: 0 };
      return {
        cropId: String(p.cropId),
        plantedAt: Number(p.plantedAt) || 0,
        readyAt: Number(p.readyAt) || 0,
      };
    });
    const owlOrders = Array.isArray(parsed.owlOrders) && parsed.owlOrders.length === 4
      ? parsed.owlOrders
      : fallback.owlOrders;
    return {
      ...fallback,
      ...parsed,
      seeds: { ...fallback.seeds, ...(parsed.seeds || {}) },
      barn: { ...fallback.barn, ...(parsed.barn || {}) },
      plots,
      creatures: {
        honeybee: { ...fallback.creatures.honeybee, ...(parsed.creatures?.honeybee || {}) },
        dairy_cow: { ...fallback.creatures.dairy_cow, ...(parsed.creatures?.dairy_cow || {}) },
      },
      stations: {
        kitchen: { ...fallback.stations.kitchen, ...(parsed.stations?.kitchen || {}) },
        cauldron: { ...fallback.stations.cauldron, ...(parsed.stations?.cauldron || {}) },
      },
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

export function countFarmReadyActions(farm, now = Date.now()) {
  if (!farm) return 0;
  let ready = 0;
  for (let i = 0; i < FARM_PLOTS_LAYOUT.length; i++) {
    const def = FARM_PLOTS_LAYOUT[i];
    if (farm.farmLevel < def.minFarmLv) continue;
    const p = farm.plots[i];
    if (p?.cropId && now >= p.readyAt) ready += 1;
  }
  for (const cr of FARM_CREATURES) {
    const st = farm.creatures[cr.id];
    if (st?.active && now >= st.readyAt) ready += 1;
  }
  for (const stKey of ['kitchen', 'cauldron']) {
    const st = farm.stations[stKey];
    if (st?.recipeId && now >= st.readyAt) ready += 1;
  }
  for (const ord of farm.owlOrders) {
    if (canFulfillOrder(farm, ord)) ready += 1;
  }
  return ready;
}

export function canFulfillOrder(farm, order) {
  if (!order?.items) return false;
  return Object.entries(order.items).every(([k, qty]) => (farm.barn[k] || 0) >= qty);
}

export function canCraftRecipe(farm, recipe) {
  if (!recipe?.inputs) return false;
  return Object.entries(recipe.inputs).every(([k, qty]) => (farm.barn[k] || 0) >= qty);
}

export function plantCropOnPlot(farm, appSave, plotIdx, cropId, weather = 'day', now = Date.now()) {
  const layout = FARM_PLOTS_LAYOUT[plotIdx];
  if (!layout || farm.farmLevel < layout.minFarmLv) {
    return { ok: false, reason: `Mở khóa ô đất này ở Cấp Nông Trại ${layout?.minFarmLv || 2}!` };
  }
  const slot = farm.plots[plotIdx];
  if (!slot || slot.cropId) return { ok: false, reason: 'Ô đất này đang có cây trồng!' };

  const crop = FARM_CROPS.find((c) => c.id === cropId);
  if (!crop) return { ok: false, reason: 'Giống cây không tồn tại.' };
  if (farm.farmLevel < crop.unlockFarmLv) {
    return { ok: false, reason: `Cần Cấp Nông Trại ${crop.unlockFarmLv} để trồng ${crop.name}!` };
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

  const speedMul = crop.weatherBonus === 'day' && weather === 'day' ? 0.75 : 1.0;
  const durMs = Math.round(crop.growSec * 1000 * speedMul);
  slot.cropId = crop.id;
  slot.plantedAt = now;
  slot.readyAt = now + durMs;
  saveFarmState(farm);
  return { ok: true, crop, usedSeed };
}

export function harvestPlot(farm, plotIdx, weather = 'day', now = Date.now()) {
  const slot = farm.plots[plotIdx];
  if (!slot?.cropId || now < slot.readyAt) return { ok: false };
  const crop = FARM_CROPS.find((c) => c.id === slot.cropId);
  if (!crop) {
    slot.cropId = null;
    return { ok: false };
  }

  let qty = crop.baseYield;
  if (crop.weatherBonus === 'night' && weather === 'night') qty *= 2;

  const totalBarn = getBarnTotalCount(farm);
  if (totalBarn >= farm.barnCapacity + 24) {
    return { ok: false, reason: 'Kho Lẫm đã quá đầy! Hãy giao Đơn Hàng Cú hoặc nâng cấp Kho nhé!' };
  }

  farm.barn[crop.id] = (farm.barn[crop.id] || 0) + qty;
  let bonusSnow = 0;
  if (weather === 'snow') {
    farm.barn.pure_snow = (farm.barn.pure_snow || 0) + 1;
    bonusSnow = 1;
  }
  slot.cropId = null;
  slot.plantedAt = 0;
  slot.readyAt = 0;
  const leveledUp = addFarmXp(farm, crop.xp);
  saveFarmState(farm);
  return { ok: true, crop, qty, bonusSnow, leveledUp };
}

export function speedUpPlotWithDew(farm, plotIdx, now = Date.now()) {
  const slot = farm.plots[plotIdx];
  if (!slot?.cropId || now >= slot.readyAt) return { ok: false, reason: 'Cây đã chín hoặc ô đất đang trống!' };
  if ((farm.dewdrops || 0) <= 0) {
    return { ok: false, reason: 'Hết 💧 Sương Phép! Hãy thắng Match-3 hoặc tưới cây giúp bạn bè nhé!' };
  }
  farm.dewdrops -= 1;
  slot.readyAt = now - 1;
  saveFarmState(farm);
  return { ok: true };
}

/**
 * Awards Magical Seeds & Dewdrops after winning a Match-3 level in either world!
 */
export function awardMatch3FarmDrops(farm, levelDef, winStreak = 0) {
  const isHard = levelDef?.difficulty === 'hard' || levelDef?.difficulty === 'super_hard';
  const dew = 1 + (isHard ? 1 : 0) + (winStreak >= 3 ? 1 : 0);
  const mandrake = 1 + (levelDef?.level % 2 === 0 ? 1 : 0);
  const moon = isHard || winStreak >= 2 ? 1 : 0;
  const apple = levelDef?.difficulty === 'super_hard' || (levelDef?.level % 5 === 0) ? 1 : 0;

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
