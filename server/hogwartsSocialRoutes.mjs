/**
 * Hogwarts Online Extended Social, SSE Real-Time Push, Frog Card Trading,
 * Claimable House Team Chest & Visitor Kudos Routes (Extracted < 300 lines).
 */

const VALID_CARD_IDS = new Set([
  'c_dumbledore', 'c_mcgonagall', 'c_snape', 'c_hagrid',
  'c_harry', 'c_hermione', 'c_ron', 'c_luna',
  'c_godric', 'c_salazar', 'c_rowena', 'c_helga',
]);

/** @type {Map<string, Set<import('node:http').ServerResponse>>} */
const sseHouseStreams = new Map();

if (!process.env.VERCEL) {
  setInterval(() => {
    for (const set of sseHouseStreams.values()) {
      for (const res of set) {
        try {
          res.write(': keepalive\n\n');
        } catch {
          set.delete(res);
        }
      }
    }
  }, 25000).unref?.();
}

export function broadcastHouseEvent(house, kind = 'update') {
  const set = sseHouseStreams.get(house);
  if (!set || set.size === 0) return;
  const payload = `event: house_update\ndata: ${JSON.stringify({ house, kind, ts: Date.now() })}\n\n`;
  for (const res of set) {
    try {
      res.write(payload);
    } catch {
      set.delete(res);
    }
  }
}

export function initSocialTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS card_gifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      to_player_id TEXT NOT NULL,
      from_player_id TEXT NOT NULL,
      from_name TEXT NOT NULL,
      card_id TEXT NOT NULL,
      target_game TEXT NOT NULL DEFAULT '',
      claimed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kudos_gifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      to_player_id TEXT NOT NULL,
      from_player_id TEXT NOT NULL,
      from_name TEXT NOT NULL,
      target_world TEXT NOT NULL DEFAULT '',
      claimed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS team_chest_claims (
      player_id TEXT NOT NULL,
      house TEXT NOT NULL,
      tier INTEGER NOT NULL,
      claimed_at INTEGER NOT NULL,
      PRIMARY KEY (player_id, house, tier)
    );
  `);

  const pCols = new Set(db.prepare('PRAGMA table_info(players)').all().map((c) => c.name));
  if (!pCols.has('home_level')) db.exec('ALTER TABLE players ADD COLUMN home_level INTEGER NOT NULL DEFAULT 1');
  if (!pCols.has('garden_level')) db.exec('ALTER TABLE players ADD COLUMN garden_level INTEGER NOT NULL DEFAULT 1');
  if (!pCols.has('kudos_count')) db.exec('ALTER TABLE players ADD COLUMN kudos_count INTEGER NOT NULL DEFAULT 0');
  if (!pCols.has('home_pet_name')) db.exec("ALTER TABLE players ADD COLUMN home_pet_name TEXT NOT NULL DEFAULT 'Hedwig'");
  if (!pCols.has('garden_pet_name')) db.exec("ALTER TABLE players ADD COLUMN garden_pet_name TEXT NOT NULL DEFAULT 'Niffler'");
  if (!pCols.has('home_mastery_tier')) db.exec('ALTER TABLE players ADD COLUMN home_mastery_tier INTEGER NOT NULL DEFAULT 0');
  if (!pCols.has('garden_mastery_tier')) db.exec('ALTER TABLE players ADD COLUMN garden_mastery_tier INTEGER NOT NULL DEFAULT 0');

  const mCols = new Set(db.prepare('PRAGMA table_info(team_messages)').all().map((c) => c.name));
  if (!mCols.has('card_id')) db.exec("ALTER TABLE team_messages ADD COLUMN card_id TEXT NOT NULL DEFAULT ''");
  if (!mCols.has('target_game')) db.exec("ALTER TABLE team_messages ADD COLUMN target_game TEXT NOT NULL DEFAULT ''");

  const cgCols = new Set(db.prepare('PRAGMA table_info(card_gifts)').all().map((c) => c.name));
  if (!cgCols.has('target_game')) db.exec("ALTER TABLE card_gifts ADD COLUMN target_game TEXT NOT NULL DEFAULT ''");

  const kgCols = new Set(db.prepare('PRAGMA table_info(kudos_gifts)').all().map((c) => c.name));
  if (!kgCols.has('target_world')) db.exec("ALTER TABLE kudos_gifts ADD COLUMN target_world TEXT NOT NULL DEFAULT ''");
}

function cleanGameScope(raw) {
  return raw === 'homescapes' || raw === 'gardenscapes' ? raw : '';
}

export function getClaimedChestTiers(db, playerId, house) {
  if (!playerId || !house) return [];
  return db
    .prepare('SELECT tier FROM team_chest_claims WHERE player_id = ? AND house = ? ORDER BY tier ASC')
    .all(playerId, house)
    .map((r) => r.tier);
}

export function syncWizardRecord(db, opts) {
  const { id, isHome, gameScope, name, house, level, stars, masteryTier, winStreak, petName, weather, tasksJson } = opts;
  const existing = db
    .prepare('SELECT home_level, garden_level, home_pet_name, garden_pet_name, home_mastery_tier, garden_mastery_tier FROM players WHERE id = ?')
    .get(id);
  const homeLv = isHome ? level : existing?.home_level || 1;
  const gardenLv = isHome ? existing?.garden_level || 1 : level;
  const homePet = isHome ? petName : existing?.home_pet_name || 'Hedwig';
  const gardenPet = isHome ? existing?.garden_pet_name || 'Niffler' : petName;
  const homeMt = isHome ? masteryTier : existing?.home_mastery_tier || 0;
  const gardenMt = isHome ? existing?.garden_mastery_tier || 0 : masteryTier;
  const maxLv = Math.max(homeLv, gardenLv);
  const maxMt = Math.max(homeMt, gardenMt);

  if (isHome) {
    db.prepare(`
      INSERT INTO players (id, name, house, level, home_level, garden_level, stars, mastery_tier, home_mastery_tier, garden_mastery_tier, win_streak, pet_name, home_pet_name, garden_pet_name, weather, castle_tasks_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, house = excluded.house, level = excluded.level, home_level = excluded.home_level,
        stars = excluded.stars, mastery_tier = excluded.mastery_tier, home_mastery_tier = excluded.home_mastery_tier,
        win_streak = excluded.win_streak, pet_name = excluded.pet_name, home_pet_name = excluded.home_pet_name,
        weather = excluded.weather, castle_tasks_json = excluded.castle_tasks_json, updated_at = excluded.updated_at
    `).run(id, name, house, maxLv, homeLv, gardenLv, stars, maxMt, homeMt, gardenMt, winStreak, petName, homePet, gardenPet, weather, tasksJson, Date.now());
  } else {
    db.prepare(`
      INSERT INTO players (id, name, house, level, home_level, garden_level, stars, mastery_tier, home_mastery_tier, garden_mastery_tier, win_streak, pet_name, home_pet_name, garden_pet_name, weather, completed_tasks_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, house = excluded.house, level = excluded.level, garden_level = excluded.garden_level,
        stars = excluded.stars, mastery_tier = excluded.mastery_tier, garden_mastery_tier = excluded.garden_mastery_tier,
        win_streak = excluded.win_streak, pet_name = excluded.pet_name, garden_pet_name = excluded.garden_pet_name,
        weather = excluded.weather, completed_tasks_json = excluded.completed_tasks_json, updated_at = excluded.updated_at
    `).run(id, name, house, maxLv, homeLv, gardenLv, stars, maxMt, homeMt, gardenMt, winStreak, petName, homePet, gardenPet, weather, tasksJson, Date.now());
  }

  const unclaimedGifts = db.prepare('SELECT COUNT(*) AS c FROM life_gifts WHERE to_player_id = ? AND claimed = 0').get(id).c;
  const unclaimedCards = gameScope
    ? db.prepare("SELECT COUNT(*) AS c FROM card_gifts WHERE to_player_id = ? AND claimed = 0 AND (target_game = ? OR target_game = '')").get(id, gameScope).c
    : db.prepare('SELECT COUNT(*) AS c FROM card_gifts WHERE to_player_id = ? AND claimed = 0').get(id).c;
  const unclaimedKudos = gameScope
    ? db.prepare("SELECT COUNT(*) AS c FROM kudos_gifts WHERE to_player_id = ? AND claimed = 0 AND (target_world = ? OR target_world = '')").get(id, gameScope).c
    : db.prepare('SELECT COUNT(*) AS c FROM kudos_gifts WHERE to_player_id = ? AND claimed = 0').get(id).c;

  return { unclaimedGifts, unclaimedCards, unclaimedKudos };
}

export async function handleSocialRoute(ctx) {
  const { req, res, path, url, db, cleanWizardId, cleanText, readJsonBody, sendJson, getHouseState, validHouses } = ctx;

  // 1. Server-Sent Events (SSE) Real-Time Stream
  if (req.method === 'GET' && path === '/api/stream') {
    const house = (url.searchParams.get('house') || 'gryffindor').toLowerCase();
    if (!validHouses.has(house)) return sendJson(res, 400, { ok: false, error: 'Nhà không hợp lệ.' });
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: process.env.VERCEL ? 'close' : 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(`retry: 15000\nevent: connected\ndata: ${JSON.stringify({ house, ts: Date.now() })}\n\n`);
    if (process.env.VERCEL) {
      res.end();
      return true;
    }
    if (!sseHouseStreams.has(house)) sseHouseStreams.set(house, new Set());
    sseHouseStreams.get(house).add(res);
    req.on('close', () => sseHouseStreams.get(house)?.delete(res));
    return true;
  }

  // 2. Request a Missing Chocolate Frog Card in House Chat
  if (req.method === 'POST' && path === '/api/request-card') {
    const b = await readJsonBody(req);
    const id = cleanWizardId(b.playerId);
    const cardId = String(b.cardId || '').trim();
    const cardName = cleanText(b.cardName, 36) || cardId;
    const targetGame = cleanGameScope(b.gameId);
    if (!id || !VALID_CARD_IDS.has(cardId)) {
      return sendJson(res, 400, { ok: false, error: 'Thẻ Ếch không hợp lệ.' });
    }
    const p = db.prepare('SELECT name, house FROM players WHERE id = ?').get(id);
    if (!p) return sendJson(res, 404, { ok: false, error: 'Chưa đồng bộ hồ sơ.' });

    const lastReq = db
      .prepare("SELECT created_at FROM team_messages WHERE player_id = ? AND kind = 'card_request' ORDER BY id DESC LIMIT 1")
      .get(id);
    if (lastReq && Date.now() - lastReq.created_at < 45_000) {
      const waitSec = Math.ceil((45_000 - (Date.now() - lastReq.created_at)) / 1000);
      return sendJson(res, 429, { ok: false, error: `Chờ ${waitSec}s nữa để xin Thẻ Ếch tiếp nhé!` });
    }

    db.prepare(`
      INSERT INTO team_messages (house, player_id, player_name, kind, text, card_id, target_game, helped_by_json, created_at)
      VALUES (?, ?, ?, 'card_request', ?, ?, ?, '[]', ?)
    `).run(p.house, id, p.name, `Đang tìm Thẻ Ếch "${cardName}" 🐸 — ai dư bản sao cho mình xin nhé!`, cardId, targetGame, Date.now());
    broadcastHouseEvent(p.house, 'card_request');
    return sendJson(res, 200, { ok: true, ...getHouseState(p.house, id) });
  }

  // 3. Gift a Duplicate Chocolate Frog Card to a House Teammate (+80 Galleons)
  if (req.method === 'POST' && path === '/api/gift-card') {
    const b = await readJsonBody(req);
    const helperId = cleanWizardId(b.helperId);
    const msgId = Math.floor(Number(b.messageId) || 0);
    if (!helperId || msgId <= 0) return sendJson(res, 400, { ok: false, error: 'Dữ liệu không hợp lệ.' });

    const helper = db.prepare('SELECT id, name, house FROM players WHERE id = ?').get(helperId);
    const msg = db.prepare('SELECT * FROM team_messages WHERE id = ?').get(msgId);
    if (!helper || !msg || msg.kind !== 'card_request' || !VALID_CARD_IDS.has(msg.card_id)) {
      return sendJson(res, 404, { ok: false, error: 'Không tìm thấy yêu cầu thẻ.' });
    }
    if (msg.player_id === helperId) {
      return sendJson(res, 400, { ok: false, error: 'Không thể tự tặng thẻ cho chính mình!' });
    }
    if (helper.house !== msg.house) {
      return sendJson(res, 400, { ok: false, error: 'Chỉ có thể tặng Thẻ Ếch cho đồng đội cùng Nhà!' });
    }
    const helpedBy = JSON.parse(msg.helped_by_json || '[]');
    if (helpedBy.length >= 1) {
      return sendJson(res, 400, { ok: false, error: 'Yêu cầu thẻ này đã được đồng đội tặng rồi!' });
    }
    helpedBy.push(helperId);
    db.prepare('UPDATE team_messages SET helped_by_json = ? WHERE id = ?').run(JSON.stringify(helpedBy), msgId);
    db.prepare(`
      INSERT INTO card_gifts (to_player_id, from_player_id, from_name, card_id, target_game, claimed, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(msg.player_id, helperId, helper.name, msg.card_id, msg.target_game || '', Date.now());
    broadcastHouseEvent(msg.house, 'card_gift');

    return sendJson(res, 200, {
      ok: true,
      cardId: msg.card_id,
      rewardCoins: 80,
      ...getHouseState(msg.house, helperId),
    });
  }

  // 4. Claim Gifted Frog Cards (scoped to target game so dual-world inventories don't steal each other's gifts)
  if (req.method === 'POST' && path === '/api/claim-cards') {
    const b = await readJsonBody(req);
    const id = cleanWizardId(b.playerId);
    const gameScope = cleanGameScope(b.gameId);
    if (!id) return sendJson(res, 400, { ok: false, error: 'Thiếu Mã Phù Thủy.' });
    const rows = gameScope
      ? db.prepare("SELECT id, from_name AS fromName, card_id AS cardId FROM card_gifts WHERE to_player_id = ? AND claimed = 0 AND (target_game = ? OR target_game = '') ORDER BY id ASC LIMIT 10").all(id, gameScope)
      : db.prepare('SELECT id, from_name AS fromName, card_id AS cardId FROM card_gifts WHERE to_player_id = ? AND claimed = 0 ORDER BY id ASC LIMIT 10').all(id);
    const mark = db.prepare('UPDATE card_gifts SET claimed = 1 WHERE id = ?');
    for (const r of rows) mark.run(r.id);
    return sendJson(res, 200, { ok: true, cards: rows });
  }

  // 5. Send Visitor Firework Kudos when visiting a friend's Castle / Grounds
  if (req.method === 'POST' && path === '/api/kudos') {
    const b = await readJsonBody(req);
    const fromId = cleanWizardId(b.fromId);
    const toId = cleanWizardId(b.toId);
    const fromName = cleanText(b.fromName, 22) || 'Bạn Phù Thủy';
    const targetWorld = cleanGameScope(b.targetWorld);
    if (!fromId || !toId || fromId === toId) {
      return sendJson(res, 400, { ok: false, error: 'Không thể tự thả pháo hoa cho chính mình!' });
    }
    const target = db.prepare('SELECT id, house, kudos_count FROM players WHERE id = ?').get(toId);
    if (!target) return sendJson(res, 404, { ok: false, error: 'Không tìm thấy chủ nhà.' });

    const recent = db
      .prepare('SELECT created_at FROM kudos_gifts WHERE from_player_id = ? AND to_player_id = ? ORDER BY id DESC LIMIT 1')
      .get(fromId, toId);
    if (recent && Date.now() - recent.created_at < 12 * 3600 * 1000) {
      return sendJson(res, 429, { ok: false, error: 'Bạn đã thả pháo hoa khen ngợi phù thủy này hôm nay rồi!' });
    }

    db.prepare('UPDATE players SET kudos_count = kudos_count + 1 WHERE id = ?').run(toId);
    db.prepare(`
      INSERT INTO kudos_gifts (to_player_id, from_player_id, from_name, target_world, claimed, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(toId, fromId, fromName, targetWorld, Date.now());
    broadcastHouseEvent(target.house, 'kudos');
    return sendJson(res, 200, { ok: true, rewardCoins: 20, kudosCount: (target.kudos_count || 0) + 1 });
  }

  // 6. Claim Pending Host Kudos Rewards (+25 Galleons each, scoped to visited world when present)
  if (req.method === 'POST' && path === '/api/claim-kudos') {
    const b = await readJsonBody(req);
    const id = cleanWizardId(b.playerId);
    const gameScope = cleanGameScope(b.gameId);
    if (!id) return sendJson(res, 400, { ok: false, error: 'Thiếu Mã Phù Thủy.' });
    const rows = gameScope
      ? db.prepare("SELECT id, from_name AS fromName FROM kudos_gifts WHERE to_player_id = ? AND claimed = 0 AND (target_world = ? OR target_world = '') ORDER BY id ASC LIMIT 20").all(id, gameScope)
      : db.prepare('SELECT id, from_name AS fromName FROM kudos_gifts WHERE to_player_id = ? AND claimed = 0 ORDER BY id ASC LIMIT 20').all(id);
    const mark = db.prepare('UPDATE kudos_gifts SET claimed = 1 WHERE id = ?');
    for (const r of rows) mark.run(r.id);
    return sendJson(res, 200, { ok: true, count: rows.length, visitors: rows.map((r) => r.fromName), rewardCoins: rows.length * 25 });
  }

  // 7. Claim House Team Chest Milestone (every 150 combined House levels, persisted per player+house+tier)
  if (req.method === 'POST' && path === '/api/claim-team-chest') {
    const b = await readJsonBody(req);
    const id = cleanWizardId(b.playerId);
    const tier = Math.floor(Number(b.tier) || 0);
    if (!id || tier < 1) return sendJson(res, 400, { ok: false, error: 'Bậc Rương không hợp lệ.' });
    const p = db.prepare('SELECT house FROM players WHERE id = ?').get(id);
    if (!p) return sendJson(res, 404, { ok: false, error: 'Chưa đồng bộ hồ sơ.' });
    const state = getHouseState(p.house, id);
    if (state.totalLevels < tier * 150) {
      return sendJson(res, 400, { ok: false, error: `Cần đạt ${tier * 150} màn chung của Nhà để mở Rương Bậc ${tier}!` });
    }
    const already = db
      .prepare('SELECT 1 FROM team_chest_claims WHERE player_id = ? AND house = ? AND tier = ?')
      .get(id, p.house, tier);
    if (already) {
      return sendJson(res, 400, { ok: false, error: `Bạn đã mở Rương Chung Nhà Bậc ${tier} rồi!` });
    }
    db.prepare('INSERT INTO team_chest_claims (player_id, house, tier, claimed_at) VALUES (?, ?, ?, ?)').run(
      id,
      p.house,
      tier,
      Date.now()
    );
    return sendJson(res, 200, { ok: true, tier, rewardCoins: 400 });
  }

  return false;
}

