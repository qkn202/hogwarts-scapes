/**
 * Hogwarts Live-Ops & Endgame Tournament Definitions:
 * 1. Vé Mùa Giải Phượng Hoàng + Két Vàng Phượng Hoàng Vô Cực (Infinite Bonus Vault every +600 XP past 6,200)
 * 2. Bộ Sưu Tập 12 Thẻ Ếch Sô-cô-la (Chocolate Frog Famous Wizards Collection + House Trading)
 * 3. Đua Chổi Quidditch (10-Level Sprint vs 4 Hogwarts Rivals) & Chiếc Cốc Lửa (7-Streak 10,000 💰 Jackpot)
 */

export const HOGWARTS_HOUSES = [
  { id: 'gryffindor', name: 'Gryffindor', crest: '🦁', color: '#9e2a2b', accent: '#ffd166', motto: 'Quả cảm & Danh dự' },
  { id: 'slytherin', name: 'Slytherin', crest: '🐍', color: '#1b5e3a', accent: '#c9e4ca', motto: 'Tham vọng & Tinh anh' },
  { id: 'ravenclaw', name: 'Ravenclaw', crest: '🦅', color: '#1d3557', accent: '#90e0ef', motto: 'Thông thái & Sáng tạo' },
  { id: 'hufflepuff', name: 'Hufflepuff', crest: '🦡', color: '#b07d12', accent: '#fff3b0', motto: 'Trung thành & Kiên định' },
];

export const SEASON_PASS_TIERS = [
  { tier: 1, xp: 100, icon: '💰', label: '+250 Galleon Vàng', reward: { coins: 250 } },
  { tier: 2, xp: 240, icon: '🪄', label: '+2 Đũa Cơm Nguội', reward: { shovel: 2 } },
  { tier: 3, xp: 420, icon: '❤️‍🔥', label: 'Nâng Giới Hạn Tim Tối Đa: 6 ❤️!', reward: { maxLives: 6, refillLives: true } },
  { tier: 4, xp: 640, icon: '💣', label: '+2 Vạc Nổ + Lửa Phép', reward: { pre_bomb_dynamite: 2 } },
  { tier: 5, xp: 900, icon: '🐸', label: 'Gói 2 Thẻ Ếch Sô-cô-la Hiếm', reward: { cardPack: 2 } },
  { tier: 6, xp: 1200, icon: '🧤', label: '+2 Găng Da Rồng & +350 💰', reward: { glove: 2, coins: 350 } },
  { tier: 7, xp: 1550, icon: '♾️', label: '30 Phút Tim Bất Tử', reward: { infiniteMins: 30 } },
  { tier: 8, xp: 1950, icon: '❤️‍🔥', label: 'Nâng Giới Hạn Tim Tối Đa: 7 ❤️!', reward: { maxLives: 7, refillLives: true } },
  { tier: 9, xp: 2400, icon: '🦌', label: '+2 Cầu Thần Hộ Mệnh Đầu Màn', reward: { pre_rainbow: 2 } },
  { tier: 10, xp: 2900, icon: '🧹', label: '+2 Chổi Firebolt & +500 💰', reward: { rake: 2, coins: 500 } },
  { tier: 11, xp: 3450, icon: '🐸', label: 'Gói 3 Thẻ Ếch Sô-cô-la Hoàng Kim', reward: { cardPack: 3 } },
  { tier: 12, xp: 4050, icon: '⭐', label: '+3 Ngôi Sao Phép Cải Tạo', reward: { stars: 3 } },
  { tier: 13, xp: 4700, icon: '❤️‍🔥', label: 'Vé Phượng Hoàng: Tối Đa 8 ❤️!', reward: { maxLives: 8, refillLives: true } },
  { tier: 14, xp: 5400, icon: '♾️', label: '60 Phút Tim Bất Tử & +800 💰', reward: { infiniteMins: 60, coins: 800 } },
  { tier: 15, xp: 6200, icon: '👑', label: 'Rương Đại Pháp Sư (+5 ⭐, +1,500 💰, +3 Cầu Patronus)', reward: { stars: 5, coins: 1500, pre_rainbow: 3 } },
];

export const MAX_SEASON_PASS_XP = 6200;
export const BONUS_VAULT_STEP_XP = 600;

export const CHOCOLATE_FROG_SETS = [
  {
    id: 'set_masters',
    title: 'Bộ I · Bậc Thầy Hogwarts',
    rewardLabel: '+1,200 💰 & +2 Cầu Thần Hộ Mệnh',
    reward: { coins: 1200, pre_rainbow: 2 },
    cards: [
      { id: 'c_dumbledore', name: 'Albus Dumbledore', rarity: 'Huyền Thoại', icon: '🧙‍♂️', title: 'Hiệu Trưởng Hogwarts · Đũa Cơm Nguội' },
      { id: 'c_mcgonagall', name: 'Minerva McGonagall', rarity: 'Sử Thi', icon: '🐱', title: 'Giáo Sư Biến Hình · Chủ Nhiệm Gryffindor' },
      { id: 'c_snape', name: 'Severus Snape', rarity: 'Sử Thi', icon: '🧪', title: 'Bậc Thầy Độc Dược · Hoàng Tử Lai' },
      { id: 'c_hagrid', name: 'Rubeus Hagrid', rarity: 'Hiếm', icon: '🐗', title: 'Người Giữ Khóa & Rừng Cấm Hogwarts' },
    ],
  },
  {
    id: 'set_heroes',
    title: 'Bộ II · Anh Hùng Hội Phượng Hoàng',
    rewardLabel: '+1,500 💰 & +2 Đũa Cơm Nguội + 2 Chổi Firebolt',
    reward: { coins: 1500, shovel: 2, rake: 2 },
    cards: [
      { id: 'c_harry', name: 'Harry Potter', rarity: 'Huyền Thoại', icon: '⚡', title: 'Cậu Bé Sống Sót · Thần Hộ Mệnh Hươu Bạc' },
      { id: 'c_hermione', name: 'Hermione Granger', rarity: 'Sử Thi', icon: '📚', title: 'Phù Thủy Xuất Sắc Nhất Thế Hệ' },
      { id: 'c_ron', name: 'Ron Weasley', rarity: 'Hiếm', icon: '♟️', title: 'Kỵ Sĩ Cờ Phù Thủy & Thủ Quân Quidditch' },
      { id: 'c_luna', name: 'Luna Lovegood', rarity: 'Hiếm', icon: '🦋', title: 'Nhà Sinh Vật Huyền Bí Ravenclaw' },
    ],
  },
  {
    id: 'set_founders',
    title: 'Bộ III · Tứ Đại Sáng Lập Niên Kỷ',
    rewardLabel: '+2,500 💰, +3 ⭐ & 60 Phút Tim Bất Tử ♾️',
    reward: { coins: 2500, stars: 3, infiniteMins: 60 },
    cards: [
      { id: 'c_godric', name: 'Godric Gryffindor', rarity: 'Thần Thoại', icon: '🦁', title: 'Thanh Kiếm Hồng Ngọc & Mũ Phân Loại' },
      { id: 'c_salazar', name: 'Salazar Slytherin', rarity: 'Thần Thoại', icon: '🐍', title: 'Mề Đay Ngọc Lục Bảo & Xà Ngữ' },
      { id: 'c_rowena', name: 'Rowena Ravenclaw', rarity: 'Thần Thoại', icon: '🦅', title: 'Vương Miện Trí Tuệ Siêu Phàm' },
      { id: 'c_helga', name: 'Helga Hufflepuff', rarity: 'Thần Thoại', icon: '🦡', title: 'Chiếc Cúp Vàng Hào Hiệp' },
    ],
  },
];

export const ALL_FROG_CARDS = CHOCOLATE_FROG_SETS.flatMap((s) => s.cards);

export function computeSeasonXpForLevel(levelDef, nightmare = false) {
  const base = levelDef.difficulty === 'super_hard' ? 240 : levelDef.difficulty === 'hard' ? 160 : 100;
  return nightmare ? base * 2 : base;
}

export function getBonusVaultStatus(save) {
  const xp = save?.seasonXp || 0;
  const extra = Math.max(0, xp - MAX_SEASON_PASS_XP);
  const totalEarned = Math.floor(extra / BONUS_VAULT_STEP_XP);
  const claimed = Math.max(0, save?.vaultClaims || 0);
  return {
    unlocked: xp >= MAX_SEASON_PASS_XP,
    claimable: Math.max(0, totalEarned - claimed),
    claimed,
    progressInStep: extra % BONUS_VAULT_STEP_XP,
    step: BONUS_VAULT_STEP_XP,
  };
}

export function drawRandomFrogCards(save, count = 1) {
  const drawn = [];
  for (let i = 0; i < count; i++) {
    const unowned = ALL_FROG_CARDS.filter((c) => !(save.cards[c.id] > 0));
    const pool = unowned.length > 0 && Math.random() < 0.62 ? unowned : ALL_FROG_CARDS;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    const isNew = !(save.cards[picked.id] > 0);
    save.cards[picked.id] = (save.cards[picked.id] || 0) + 1;
    if (!isNew) save.coins += 60;
    drawn.push({ ...picked, isNew });
  }
  return drawn;
}

export function rollLevelVictoryCardDrop(levelDef, save, nightmare = false) {
  const chance =
    levelDef.difficulty === 'super_hard' ? 1.0 : levelDef.difficulty === 'hard' ? (nightmare ? 0.85 : 0.6) : nightmare ? 0.42 : 0.22;
  if (Math.random() > chance) return [];
  return drawRandomFrogCards(save, levelDef.difficulty === 'super_hard' && nightmare ? 2 : 1);
}

const HOME_BOOSTER_REWARD_MAP = {
  shovel: 'hammer',
  glove: 'hand',
  rake: 'kettlebell',
  pre_bomb_dynamite: 'pre_rocket_bomb',
  pre_rainbow: 'pre_rainbow',
  pre_double_bomb: 'pre_planes',
};

export function getSeasonTierLabel(tierDef, gameId = 'gardenscapes') {
  if (gameId !== 'homescapes') return tierDef.label;
  return tierDef.label
    .replace('Vạc Nổ + Lửa Phép', 'Chổi Thần + Vạc Nổ')
    .replace('Găng Da Rồng', 'Bùa Leviosa')
    .replace('Cầu Thần Hộ Mệnh', 'Xoay Thời Gian')
    .replace('Cầu Patronus', 'Xoay Thời Gian')
    .replace('Chổi Firebolt', 'Chổi Tia Chớp');
}

export function getCardSetRewardLabel(setDef, gameId = 'gardenscapes') {
  if (gameId !== 'homescapes') return setDef.rewardLabel;
  return setDef.rewardLabel
    .replace('Cầu Thần Hộ Mệnh', 'Xoay Thời Gian')
    .replace('Chổi Firebolt', 'Chổi Tia Chớp');
}

export function applyRewardBundle(save, reward = {}, gameId = save?.gameId || 'gardenscapes') {
  if (reward.coins) save.coins += reward.coins;
  if (reward.stars) save.stars += reward.stars;
  if (reward.maxLives && reward.maxLives > save.maxLives) save.maxLives = reward.maxLives;
  if (reward.refillLives) {
    save.lives = save.maxLives;
    save.lastLifeTimestamp = Date.now();
  }
  if (reward.infiniteMins) {
    save.infiniteLivesUntil = Math.max(Date.now(), save.infiniteLivesUntil || 0) + reward.infiniteMins * 60 * 1000;
  }
  const drawnCards = reward.cardPack ? drawRandomFrogCards(save, reward.cardPack) : [];
  for (const k of ['shovel', 'glove', 'rake', 'pre_bomb_dynamite', 'pre_rainbow', 'pre_double_bomb']) {
    if (reward[k]) {
      const targetKey = gameId === 'homescapes' ? HOME_BOOSTER_REWARD_MAP[k] : k;
      save.boosters[targetKey] = (save.boosters[targetKey] || 0) + reward[k];
    }
  }
  return drawnCards;
}

const RACE_RIVALS = [
  { id: 'cedric', name: 'Cedric Diggory', crest: '🦡', pace: 0.72 },
  { id: 'cho', name: 'Cho Chang', crest: '🦅', pace: 0.65 },
  { id: 'oliver', name: 'Oliver Wood', crest: '🦁', pace: 0.58 },
  { id: 'krum', name: 'Viktor Krum', crest: '🐍', pace: 0.5 },
];
const GOBLET_SURVIVORS = [100, 64, 42, 28, 19, 12, 8, 5];

export function ensureBroomRace(save, forceNew = false) {
  if (!save.raceState || forceNew) {
    const heat = (save.raceState?.heat || 0) + 1;
    save.raceState = {
      heat,
      target: 10,
      playerWins: 0,
      rivals: RACE_RIVALS.map((r, idx) => ({ ...r, wins: idx === 0 ? 1 : 0 })),
      finished: false,
      rank: null,
      claimed: false,
    };
  }
  return save.raceState;
}

export function ensureGobletState(save, forceNew = false) {
  if (!save.gobletState || forceNew) {
    const trial = (save.gobletState?.trial || 0) + 1;
    save.gobletState = {
      trial,
      target: 7,
      step: 0,
      survivors: 100,
      eliminated: false,
      completed: false,
      prize: 2000,
      claimed: false,
    };
  }
  return save.gobletState;
}

export function onTournamentLevelWin(save) {
  const race = ensureBroomRace(save);
  if (!race.finished) {
    race.playerWins = Math.min(race.target, race.playerWins + 1);
    for (const rv of race.rivals) {
      if (rv.wins < race.target && ((race.playerWins + rv.name.length) % 3 !== 0) && rv.pace >= 0.55) {
        rv.wins = Math.min(race.target - (race.playerWins >= race.target ? 1 : 0), rv.wins + 1);
      }
    }
    if (race.playerWins >= race.target) {
      const ahead = race.rivals.filter((r) => r.wins >= race.target).length;
      race.rank = ahead + 1;
      race.finished = true;
    }
  }

  const gob = ensureGobletState(save);
  if (!gob.eliminated && !gob.completed) {
    gob.step = Math.min(gob.target, gob.step + 1);
    gob.survivors = GOBLET_SURVIVORS[gob.step] || 5;
    if (gob.step >= gob.target) {
      gob.completed = true;
      gob.prize = Math.round(10000 / gob.survivors);
    }
  }
}

export function onTournamentLevelFail(save) {
  const race = ensureBroomRace(save);
  if (!race.finished) {
    const lead = race.rivals[0];
    if (lead && lead.wins < race.target) lead.wins += 1;
    const finishers = race.rivals.filter((r) => r.wins >= race.target).length;
    if (finishers >= 3) {
      race.rank = 4;
      race.finished = true;
    }
  }
  const gob = ensureGobletState(save);
  if (!gob.completed && gob.step > 0) {
    gob.eliminated = true;
  }
}

export function countUnclaimedLiveOps(save) {
  let count = 0;
  for (const t of SEASON_PASS_TIERS) {
    if ((save.seasonXp || 0) >= t.xp && !save.claimedSeasonTiers.includes(t.tier)) count++;
  }
  for (const s of CHOCOLATE_FROG_SETS) {
    const complete = s.cards.every((c) => (save.cards?.[c.id] || 0) > 0);
    if (complete && !save.claimedCardSets.includes(s.id)) count++;
  }
  count += getBonusVaultStatus(save).claimable;
  if (save.raceState?.finished && !save.raceState?.claimed) count++;
  if (save.gobletState?.completed && !save.gobletState?.claimed) count++;
  return count;
}
