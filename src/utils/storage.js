/**
 * Independent Persistence Layer for Homescapes & Gardenscapes + Shared Wizard Identity
 * Unifies Wizard Passport (playerId, playerName, house) across both games while keeping
 * separate progression, 8-chapter renovations, Live-Ops Vault, Quidditch Race & Goblet of Fire.
 */

const STORAGE_KEYS = {
  homescapes: 'playrix_clone_homescapes_v1',
  gardenscapes: 'playrix_clone_gardenscapes_v1',
  identity: 'playrix_clone_identity_v1',
  prefs: 'playrix_clone_prefs_v1',
};

const LIFE_REGEN_MS = 20 * 60 * 1000; // 20 minutes per heart
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const VALID_HOUSES = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'];

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizePlainText(raw, fallback = '', maxLen = 22) {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
  return cleaned || fallback;
}

export function getLocalCalendarDateISO() {
  const plain = globalThis.Temporal?.Now?.plainDateISO?.()?.toString();
  if (plain) return plain;
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function cleanNonNegativeIntMap(rawObj, baseObj = {}) {
  const out = { ...baseObj };
  if (!rawObj || typeof rawObj !== 'object' || Array.isArray(rawObj)) return out;
  for (const [k, v] of Object.entries(rawObj)) {
    if (!/^[a-z0-9_]{1,32}$/i.test(k)) continue;
    const n = Number(v);
    out[k] = Number.isFinite(n) ? Math.max(0, Math.min(99999, Math.floor(n))) : (baseObj[k] || 0);
  }
  return out;
}

export function generateWizardId() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  }
  return `HW-${code}`;
}

export function loadSharedIdentity() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.identity);
    if (raw) {
      const p = JSON.parse(raw);
      if (p?.playerId && /^HW-[A-Z0-9]{4,12}$/.test(p.playerId)) {
        return {
          playerId: p.playerId,
          playerName: sanitizePlainText(p.playerName, 'Phù Thủy Mới', 22),
          house: VALID_HOUSES.includes(p.house) ? p.house : 'gryffindor',
        };
      }
    }
    // Bootstrap from whichever game save already exists so existing players keep their ID
    for (const key of [STORAGE_KEYS.homescapes, STORAGE_KEYS.gardenscapes]) {
      const sRaw = localStorage.getItem(key);
      if (!sRaw) continue;
      const sp = JSON.parse(sRaw);
      if (sp?.playerId && /^HW-[A-Z0-9]{4,12}$/.test(sp.playerId)) {
        const adopted = {
          playerId: sp.playerId,
          playerName: sanitizePlainText(sp.playerName, 'Phù Thủy Mới', 22),
          house: VALID_HOUSES.includes(sp.house) ? sp.house : 'gryffindor',
        };
        saveSharedIdentity(adopted);
        return adopted;
      }
    }
  } catch {
    // Ignore storage read errors
  }
  const fresh = { playerId: generateWizardId(), playerName: 'Phù Thủy Mới', house: 'gryffindor' };
  saveSharedIdentity(fresh);
  return fresh;
}

export function saveSharedIdentity(identity) {
  if (!identity?.playerId) return;
  try {
    localStorage.setItem(
      STORAGE_KEYS.identity,
      JSON.stringify({
        playerId: identity.playerId,
        playerName: sanitizePlainText(identity.playerName, 'Phù Thủy Mới', 22),
        house: VALID_HOUSES.includes(identity.house) ? identity.house : 'gryffindor',
      })
    );
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Creates a fresh Playrix save state for the specified game.
 * @param {'homescapes' | 'gardenscapes'} gameId
 */
export function createDefaultSave(gameId) {
  const isHome = gameId === 'homescapes';
  const id = loadSharedIdentity();
  return {
    gameId,
    level: 1,
    stars: isHome ? 2 : 1,
    coins: isHome ? 1500 : 900,
    lives: 5,
    maxLives: 5,
    infiniteLivesUntil: 0,
    lastLifeTimestamp: Date.now(),
    currentArea: 0,
    masteryTier: 0,
    completedTasks: {},
    claimedAreaChests: [],
    completedPinIds: [],
    lastWheelDate: '',
    petName: isHome ? 'Hedwig' : 'Niffler',
    winStreak: 0,
    levelBestScores: {},
    playerId: id.playerId,
    playerName: id.playerName,
    house: id.house,
    weather: 'day',
    seasonXp: 0,
    claimedSeasonTiers: [],
    vaultClaims: 0,
    cards: {},
    claimedCardSets: [],
    claimedTeamChests: [],
    kudosSent: {},
    raceState: null,
    gobletState: null,
    likedPosts: [],
    tutorialSeen: {},
    lastLifeRequestAt: 0,
    boosters: isHome
      ? {
          hammer: 3,
          hand: 2,
          kettlebell: 2,
          pre_rocket_bomb: 2,
          pre_rainbow: 2,
          pre_planes: 2,
        }
      : {
          shovel: 2,
          glove: 1,
          rake: 1,
          pre_bomb_dynamite: 1,
          pre_rainbow: 1,
          pre_double_bomb: 1,
        },
  };
}

/**
 * Loads and normalizes save state for a game, syncing unified Wizard Passport & heart regen.
 * @param {'homescapes' | 'gardenscapes'} gameId
 */
export function loadGameSave(gameId) {
  const shared = loadSharedIdentity();
  const fallback = createDefaultSave(gameId);
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[gameId]);
    if (!raw) {
      saveGameState(gameId, fallback);
      return fallback;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fallback;
    }
    const cleanCompleted = {};
    if (parsed.completedTasks && typeof parsed.completedTasks === 'object' && !Array.isArray(parsed.completedTasks)) {
      for (const [k, v] of Object.entries(parsed.completedTasks).slice(0, 256)) {
        if (/^[a-z0-9_]{2,28}$/i.test(k)) {
          const st = Math.floor(Number(v));
          if (Number.isFinite(st) && st >= 0 && st <= 2) cleanCompleted[k] = st;
        }
      }
    }
    const merged = {
      ...fallback,
      ...parsed,
      playerId: shared.playerId,
      playerName: shared.playerName,
      house: shared.house,
      completedTasks: cleanCompleted,
      boosters: cleanNonNegativeIntMap(parsed.boosters, fallback.boosters),
      levelBestScores: cleanNonNegativeIntMap(parsed.levelBestScores, {}),
      cards: cleanNonNegativeIntMap(parsed.cards, {}),
      kudosSent: cleanNonNegativeIntMap(parsed.kudosSent, {}),
      tutorialSeen: parsed.tutorialSeen && typeof parsed.tutorialSeen === 'object' ? { ...parsed.tutorialSeen } : {},
      claimedAreaChests: Array.isArray(parsed.claimedAreaChests) ? parsed.claimedAreaChests : [],
      completedPinIds: Array.isArray(parsed.completedPinIds) ? parsed.completedPinIds : [],
      claimedSeasonTiers: Array.isArray(parsed.claimedSeasonTiers) ? parsed.claimedSeasonTiers : [],
      claimedCardSets: Array.isArray(parsed.claimedCardSets) ? parsed.claimedCardSets : [],
      claimedTeamChests: Array.isArray(parsed.claimedTeamChests) ? parsed.claimedTeamChests : [],
      likedPosts: Array.isArray(parsed.likedPosts) ? parsed.likedPosts : [],
      vaultClaims: Math.max(0, Math.floor(Number(parsed.vaultClaims) || 0)),
    };
    if (!['day', 'night', 'snow'].includes(merged.weather)) merged.weather = 'day';
    if (merged.petName === 'Mèo Cam') merged.petName = 'Hedwig';
    if (merged.petName === 'Cún Vàng') merged.petName = 'Niffler';
    merged.petName = sanitizePlainText(merged.petName, fallback.petName, 16);
    merged.level = Math.max(1, Math.min(77777, Math.floor(Number(merged.level) || 1)));
    merged.coins = Math.max(0, Math.min(999999999, Math.floor(Number(merged.coins) || 0)));
    merged.stars = Math.max(0, Math.min(999999, Math.floor(Number(merged.stars) || 0)));
    merged.winStreak = Math.max(0, Math.min(9999, Math.floor(Number(merged.winStreak) || 0)));
    merged.seasonXp = Math.max(0, Math.min(999999999, Math.floor(Number(merged.seasonXp) || 0)));
    merged.currentArea = Math.max(0, Math.min(11, Math.floor(Number(merged.currentArea) || 0)));
    merged.masteryTier = Math.max(0, Math.min(999, Math.floor(Number(merged.masteryTier) || 0)));
    merged.maxLives = Math.max(5, Math.min(8, Math.floor(Number(merged.maxLives) || 5)));
    const rawLives = Number(merged.lives);
    merged.lives = Number.isFinite(rawLives)
      ? Math.max(0, Math.min(merged.maxLives, Math.floor(rawLives)))
      : fallback.lives;
    merged.infiniteLivesUntil = Math.max(0, Math.floor(Number(merged.infiniteLivesUntil) || 0));
    const rawLifeTs = Number(merged.lastLifeTimestamp);
    merged.lastLifeTimestamp = Number.isFinite(rawLifeTs) && rawLifeTs > 0 ? Math.floor(rawLifeTs) : Date.now();
    refreshLives(merged);
    return merged;
  } catch {
    return fallback;
  }
}

export function saveGameState(gameId, state) {
  try {
    if (state?.playerId && /^HW-[A-Z0-9]{4,12}$/.test(state.playerId)) {
      saveSharedIdentity({
        playerId: state.playerId,
        playerName: state.playerName,
        house: state.house,
      });
    }
    localStorage.setItem(STORAGE_KEYS[gameId], JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function resetGameSave(gameId) {
  const shared = loadSharedIdentity();
  const fresh = createDefaultSave(gameId);
  fresh.playerId = shared.playerId;
  fresh.playerName = shared.playerName;
  fresh.house = shared.house;
  saveGameState(gameId, fresh);
  return fresh;
}

export function exportSaveJson(gameId) {
  const save = loadGameSave(gameId);
  return JSON.stringify({ version: 3, gameId, exportedAt: Date.now(), save }, null, 2);
}

export function importSaveJson(gameId, jsonText) {
  const parsed = JSON.parse(jsonText);
  const candidate = parsed?.save && typeof parsed.save === 'object' ? parsed.save : parsed;
  const parsedLv = Number(candidate?.level);
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) || !Number.isFinite(parsedLv)) {
    throw new Error('Dữ liệu sao lưu không hợp lệ.');
  }
  if (candidate.playerId && /^HW-[A-Z0-9]{4,12}$/.test(candidate.playerId)) {
    saveSharedIdentity({
      playerId: candidate.playerId,
      playerName: sanitizePlainText(candidate.playerName, 'Phù Thủy Mới', 22),
      house: VALID_HOUSES.includes(candidate.house) ? candidate.house : 'gryffindor',
    });
  }
  saveGameState(gameId, { ...createDefaultSave(gameId), ...candidate, level: parsedLv, gameId });
  return loadGameSave(gameId);
}

export function refreshLives(state) {
  const now = Date.now();
  const hasInfinite = state.infiniteLivesUntil > now;
  if (state.lives >= state.maxLives) {
    state.lives = state.maxLives;
    state.lastLifeTimestamp = now;
    return { lives: state.lives, nextLifeSeconds: 0, hasInfinite };
  }
  const elapsed = Math.max(0, now - (state.lastLifeTimestamp || now));
  const gained = Math.floor(elapsed / LIFE_REGEN_MS);
  if (gained > 0) {
    state.lives = Math.min(state.maxLives, state.lives + gained);
    state.lastLifeTimestamp =
      state.lives >= state.maxLives ? now : state.lastLifeTimestamp + gained * LIFE_REGEN_MS;
  }
  const remMs =
    state.lives >= state.maxLives ? 0 : LIFE_REGEN_MS - ((now - state.lastLifeTimestamp) % LIFE_REGEN_MS);
  return {
    lives: state.lives,
    nextLifeSeconds: Math.ceil(remMs / 1000),
    hasInfinite,
  };
}

export function loadPrefs() {
  const defaults = { bgm: true, sfx: true, haptics: true, nightmare: false, volume: 80, colorblind: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.prefs);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    const vol = Number.isFinite(Number(parsed.volume)) ? Math.max(0, Math.min(100, Math.round(Number(parsed.volume)))) : 80;
    return {
      bgm: parsed.bgm !== false,
      sfx: parsed.sfx !== false,
      haptics: parsed.haptics !== false,
      nightmare: Boolean(parsed.nightmare),
      volume: vol,
      colorblind: Boolean(parsed.colorblind),
    };
  } catch {
    return defaults;
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}
