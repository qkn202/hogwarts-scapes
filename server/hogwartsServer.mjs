/**
 * Hogwarts Castle & Grounds Online Multiplayer Server
 * Powered by Node 22 built-in HTTP + SQLite (node:sqlite DatabaseSync with WAL).
 * Supports Unified Wizard Identity, 4 Hogwarts House Teams, Real-Time SSE Stream,
 * Life & Frog Card Trading, Claimable Team Chests, Visitor Kudos, and Live 2.5D Visiting.
 */

import { mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  broadcastHouseEvent,
  getClaimedChestTiers,
  handleSocialRoute,
  initSocialTables,
  syncWizardRecord,
} from './hogwartsSocialRoutes.mjs';
import { sendCompressedJson as sendJson, serveCompressedStatic } from './staticGzipServer.mjs';

const IS_VERCEL = Boolean(process.env.VERCEL);
const PORT = Number(process.env.HOGWARTS_PORT || 5180);
const ROOT_DIR = join(import.meta.dirname, '..');
const DATA_DIR = IS_VERCEL ? '/tmp/hogwarts-scapes-data' : join(import.meta.dirname, 'data');
const DIST_DIR = join(ROOT_DIR, 'dist');
mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(join(DATA_DIR, 'hogwarts_online.db'));
db.exec(`
  PRAGMA journal_mode = ${IS_VERCEL ? 'DELETE' : 'WAL'};
  PRAGMA busy_timeout = 3000;

  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    house TEXT NOT NULL DEFAULT 'gryffindor',
    level INTEGER NOT NULL DEFAULT 1,
    stars INTEGER NOT NULL DEFAULT 1,
    mastery_tier INTEGER NOT NULL DEFAULT 0,
    win_streak INTEGER NOT NULL DEFAULT 0,
    pet_name TEXT NOT NULL DEFAULT 'Niffler',
    weather TEXT NOT NULL DEFAULT 'day',
    completed_tasks_json TEXT NOT NULL DEFAULT '{}',
    castle_tasks_json TEXT NOT NULL DEFAULT '{}',
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS team_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    house TEXT NOT NULL,
    player_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'chat',
    text TEXT NOT NULL,
    helped_by_json TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS life_gifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    to_player_id TEXT NOT NULL,
    from_player_id TEXT NOT NULL,
    from_name TEXT NOT NULL,
    claimed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
`);

const existingPlayerCols = db.prepare('PRAGMA table_info(players)').all();
if (!existingPlayerCols.some((c) => c.name === 'castle_tasks_json')) {
  db.exec("ALTER TABLE players ADD COLUMN castle_tasks_json TEXT NOT NULL DEFAULT '{}'");
}
initSocialTables(db);

const VALID_HOUSES = new Set(['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff']);
const VALID_WEATHERS = new Set(['day', 'night', 'snow']);

export function cleanText(raw, maxLen = 140) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function cleanWizardId(raw) {
  const s = String(raw || '').trim().toUpperCase();
  return /^HW-[A-Z0-9]{4,12}$/.test(s) ? s : null;
}

function cleanCompletedTasks(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
  const out = {};
  const entries = Object.entries(obj).slice(0, 256);
  for (const [k, v] of entries) {
    if (/^[a-z0-9_]{2,28}$/i.test(k) && Number.isInteger(v) && v >= 0 && v <= 2) {
      out[k] = v;
    }
  }
  return out;
}

function seedHogwartsPrefects() {
  const now = Date.now();
  const prefects = [
    ['HW-HERMIO', 'Hermione Granger', 'gryffindor', 48, 12, 1, 9, 'Crookshanks', 'night', 5,
      { gf_path: 0, gf_fountain: 2, gf_flowers: 1, gf_bench: 1, gf_lamps: 1, gf_doghouse: 2, gf_wing_fnt: 0, gf_guardian: 2, gf_pavilion: 1, gt_lawn: 1, gt_tree: 2, gt_treehouse: 0, gt_wing_fnt: 1 },
      { hb_floor: 0, hb_bed: 0, hb_rug: 1, hb_curtain: 0, hb_desk: 1, hb_catbed: 0, hb_banner: 0, hb_alcove: 1, hb_hearth: 0, hh_wall: 0, hh_stairs: 1, hh_chandelier: 1, hh_runner: 0, hh_banner: 0, hl_parquet: 1, hl_sofa: 0, hl_piano: 1 }],
    ['HW-HARRYP', 'Harry Potter', 'gryffindor', 37, 8, 0, 11, 'Hedwig', 'snow', 4,
      { gf_path: 0, gf_fountain: 0, gf_flowers: 2, gf_bench: 2, gf_lamps: 1, gf_doghouse: 0, gf_wing_fnt: 2, gf_guardian: 0, gf_pavilion: 0 },
      { hb_floor: 0, hb_bed: 0, hb_rug: 0, hb_curtain: 0, hb_desk: 0, hb_catbed: 1, hb_banner: 0, hb_alcove: 0, hb_hearth: 2, hh_wall: 0, hh_chandelier: 0 }],
    ['HW-DRACOM', 'Draco Malfoy', 'slytherin', 44, 15, 1, 6, 'Bạc Kiêu Hãnh', 'night', 3,
      { gf_path: 1, gf_fountain: 1, gf_flowers: 1, gf_bench: 0, gf_lamps: 0, gf_doghouse: 1, gf_wing_fnt: 1, gf_guardian: 1, gt_lawn: 1, gt_tree: 1 },
      { hb_floor: 0, hb_bed: 0, hb_rug: 0, hb_curtain: 0, hb_desk: 0, hb_catbed: 0, hb_banner: 0, hb_alcove: 0, hb_hearth: 0, hh_wall: 2, hh_stairs: 2, hh_chandelier: 2, hh_console: 2, hk_tiles: 2, hk_island: 2, hk_stove: 2 }],
    ['HW-PANSYP', 'Pansy Parkinson', 'slytherin', 29, 6, 0, 4, 'Niffler Ngọc', 'day', 2,
      { gf_path: 1, gf_fountain: 1, gf_lamps: 0 },
      { hb_floor: 0, hb_bed: 0, hb_rug: 0, hb_curtain: 0, hb_banner: 0, hk_tiles: 2, hk_island: 2 }],
    ['HW-LUNALV', 'Luna Lovegood', 'ravenclaw', 52, 19, 1, 12, 'Bướm Trăng', 'snow', 6,
      { gf_path: 2, gf_fountain: 0, gf_flowers: 2, gf_bench: 1, gf_lamps: 2, gf_doghouse: 1, gt_lawn: 2, gt_tree: 0, gt_treehouse: 2, gt_swing: 1 },
      { hb_floor: 0, hb_bed: 0, hb_rug: 0, hb_curtain: 0, hb_desk: 0, hb_catbed: 0, hb_banner: 0, hb_alcove: 0, hb_hearth: 0, hh_wall: 1, hh_stairs: 1, hh_chandelier: 1, hh_runner: 1, hl_parquet: 1, hl_sofa: 1, hl_piano: 1, hl_bookcase: 1 }],
    ['HW-CHOCNG', 'Cho Chang', 'ravenclaw', 31, 7, 0, 5, 'Thiên Nga Lam', 'day', 3,
      { gf_path: 2, gf_fountain: 0, gf_lamps: 2 },
      { hb_floor: 0, hb_bed: 0, hb_rug: 0, hb_desk: 0, hb_banner: 0, hh_chandelier: 1 }],
    ['HW-CEDRIC', 'Cedric Diggory', 'hufflepuff', 41, 11, 0, 8, 'Lửng Vàng', 'day', 5,
      { gf_path: 0, gf_fountain: 2, gf_flowers: 2, gf_bench: 2, gf_lamps: 1, gf_doghouse: 2 },
      { hb_floor: 0, hb_bed: 0, hb_rug: 0, hb_curtain: 0, hb_desk: 0, hb_catbed: 0, hb_banner: 0, hb_alcove: 0, hb_hearth: 0, hh_wall: 0, hh_stairs: 0, hh_chandelier: 2 }],
    ['HW-NEVILL', 'Neville Longbottom', 'hufflepuff', 35, 9, 0, 7, 'Trevor', 'day', 4,
      { gf_path: 1, gf_fountain: 0, gf_flowers: 2, gf_bench: 1 },
      { hb_floor: 0, hb_bed: 0, hb_rug: 0, hb_desk: 0, hb_banner: 0, hk_tiles: 0, hk_island: 1, hk_stove: 0 }],
  ];
  const upsertP = db.prepare(`
    INSERT INTO players (id, name, house, level, home_level, garden_level, stars, mastery_tier, home_mastery_tier, garden_mastery_tier, win_streak, pet_name, home_pet_name, garden_pet_name, weather, kudos_count, completed_tasks_json, castle_tasks_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      home_level = excluded.home_level,
      garden_level = excluded.garden_level,
      home_mastery_tier = excluded.home_mastery_tier,
      garden_mastery_tier = excluded.garden_mastery_tier,
      home_pet_name = excluded.home_pet_name,
      garden_pet_name = excluded.garden_pet_name,
      completed_tasks_json = excluded.completed_tasks_json,
      castle_tasks_json = excluded.castle_tasks_json
  `);
  for (const [id, name, house, lv, st, mt, ws, pet, wth, kudos, gTasks, cTasks] of prefects) {
    upsertP.run(id, name, house, lv, lv, lv, st, mt, mt, mt, ws, pet, pet, pet, wth, kudos, JSON.stringify(gTasks), JSON.stringify(cTasks), now);
  }

  const msgCount = db.prepare('SELECT COUNT(*) AS c FROM team_messages').get().c;
  if (msgCount > 0) return;
  const insM = db.prepare(`
    INSERT INTO team_messages (house, player_id, player_name, kind, text, card_id, helped_by_json, created_at)
    VALUES (?, ?, ?, ?, ?, '', '[]', ?)
  `);
  insM.run('gryffindor', 'HW-HERMIO', 'Hermione Granger', 'chat', 'Chào mừng tới Phòng Sinh Hoạt Gryffindor! Nhớ ghép 5 lấy Vạc Nổ nhé!', now - 120000);
  insM.run('gryffindor', 'HW-HARRYP', 'Harry Potter', 'life_request', 'Đang công phá Màn Khó Rừng Cấm — cho mình xin 1 Tim ❤️ nhé!', now - 60000);
  insM.run('slytherin', 'HW-DRACOM', 'Draco Malfoy', 'life_request', 'Slytherin quyết giữ Cúp Nhà tuần này! Tiếp viện Tim ❤️ nào!', now - 60000);
  insM.run('ravenclaw', 'HW-LUNALV', 'Luna Lovegood', 'life_request', 'Mời các bạn ghé thăm Khuôn Viên Tuyết của mình qua mã HW-LUNALV nhé!', now - 60000);
  insM.run('hufflepuff', 'HW-CEDRIC', 'Cedric Diggory', 'life_request', 'Hufflepuff đoàn kết! Ai rảnh tặng mình 1 Tim ❤️ nha!', now - 60000);
}
seedHogwartsPrefects();

function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
    try {
      const str = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body);
      return Promise.resolve(str ? JSON.parse(str) : {});
    } catch {
      return Promise.reject(new Error('JSON không hợp lệ'));
    }
  }
  return new Promise((resolveBody, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 65536) {
        reject(new Error('Payload quá lớn'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolveBody({});
      try {
        resolveBody(JSON.parse(raw));
      } catch {
        reject(new Error('JSON không hợp lệ'));
      }
    });
    req.on('error', reject);
  });
}

function getHouseState(house, viewerId = null) {
  const members = db
    .prepare(
      `SELECT id, name, house, level, home_level AS homeLevel, garden_level AS gardenLevel, stars,
              mastery_tier AS masteryTier, win_streak AS winStreak, pet_name AS petName, weather, kudos_count AS kudosCount
       FROM players WHERE house = ? ORDER BY (home_level + garden_level) DESC, updated_at DESC LIMIT 30`
    )
    .all(house);
  const totalLevels = members.reduce((acc, m) => acc + Math.max(1, (m.homeLevel || 1) + (m.gardenLevel || 1) - 1), 0);
  const chestStep = 150;
  const unlockedChestTier = Math.floor(totalLevels / chestStep);
  const chestTarget = (unlockedChestTier + 1) * chestStep;

  const msgs = db
    .prepare(
      `SELECT id, house, player_id AS playerId, player_name AS playerName, kind, text, card_id AS cardId,
              target_game AS targetGame, helped_by_json, created_at AS createdAt
       FROM team_messages WHERE house = ? ORDER BY id DESC LIMIT 35`
    )
    .all(house)
    .reverse()
    .map((m) => ({
      id: m.id,
      house: m.house,
      playerId: m.playerId,
      playerName: m.playerName,
      kind: m.kind,
      text: m.text,
      cardId: m.cardId || '',
      targetGame: m.targetGame || '',
      helpedBy: JSON.parse(m.helped_by_json || '[]'),
      createdAt: m.createdAt,
    }));

  const unclaimedGifts = viewerId
    ? db.prepare('SELECT COUNT(*) AS c FROM life_gifts WHERE to_player_id = ? AND claimed = 0').get(viewerId).c
    : 0;
  const unclaimedCards = viewerId
    ? db.prepare('SELECT COUNT(*) AS c FROM card_gifts WHERE to_player_id = ? AND claimed = 0').get(viewerId).c
    : 0;
  const unclaimedKudos = viewerId
    ? db.prepare('SELECT COUNT(*) AS c FROM kudos_gifts WHERE to_player_id = ? AND claimed = 0').get(viewerId).c
    : 0;
  const claimedChestTiers = viewerId ? getClaimedChestTiers(db, viewerId, house) : [];

  return {
    house,
    members,
    totalLevels,
    chestStep,
    unlockedChestTier,
    chestTarget,
    claimedChestTiers,
    messages: msgs,
    unclaimedGifts,
    unclaimedCards,
    unclaimedKudos,
  };
}

export async function handleHogwartsRequest(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;

  try {
    if (req.method === 'GET' && path === '/api/health') {
      const players = db.prepare('SELECT COUNT(*) AS c FROM players').get().c;
      const messages = db.prepare('SELECT COUNT(*) AS c FROM team_messages').get().c;
      return sendJson(res, 200, { ok: true, players, messages, port: PORT });
    }

    if (
      await handleSocialRoute({
        req, res, path, url, db, cleanWizardId, cleanText, readJsonBody, sendJson, getHouseState, validHouses: VALID_HOUSES,
      })
    ) {
      return;
    }

    if (req.method === 'POST' && path === '/api/sync') {
      const b = await readJsonBody(req);
      const id = cleanWizardId(b.id);
      if (!id) return sendJson(res, 400, { ok: false, error: 'Mã Phù Thủy không hợp lệ.' });
      const isHome = b.gameId === 'homescapes';
      const gameScope = b.gameId === 'homescapes' || b.gameId === 'gardenscapes' ? b.gameId : '';
      const house = VALID_HOUSES.has(b.house) ? b.house : 'gryffindor';
      const counts = syncWizardRecord(db, {
        id,
        isHome,
        gameScope,
        name: cleanText(b.name, 22) || 'Phù Thủy Hogwarts',
        house,
        level: Math.max(1, Math.min(77777, Math.floor(Number(b.level) || 1))),
        stars: Math.max(0, Math.min(999999, Math.floor(Number(b.stars) || 0))),
        masteryTier: Math.max(0, Math.min(999, Math.floor(Number(b.masteryTier) || 0))),
        winStreak: Math.max(0, Math.min(9999, Math.floor(Number(b.winStreak) || 0))),
        petName: cleanText(b.petName, 18) || (isHome ? 'Hedwig' : 'Niffler'),
        weather: VALID_WEATHERS.has(b.weather) ? b.weather : 'day',
        tasksJson: JSON.stringify(cleanCompletedTasks(b.completedTasks)),
      });
      return sendJson(res, 200, { ok: true, id, house, ...counts });
    }

    if (req.method === 'GET' && path.startsWith('/api/house/')) {
      const house = path.slice('/api/house/'.length).toLowerCase();
      if (!VALID_HOUSES.has(house)) return sendJson(res, 400, { ok: false, error: 'Nhà không tồn tại.' });
      const viewerId = cleanWizardId(url.searchParams.get('playerId'));
      return sendJson(res, 200, { ok: true, ...getHouseState(house, viewerId) });
    }

    if (req.method === 'POST' && path === '/api/chat') {
      const b = await readJsonBody(req);
      const id = cleanWizardId(b.playerId);
      const text = cleanText(b.text, 160);
      if (!id || !text) return sendJson(res, 400, { ok: false, error: 'Tin nhắn trống.' });
      const p = db.prepare('SELECT name, house FROM players WHERE id = ?').get(id);
      if (!p) return sendJson(res, 404, { ok: false, error: 'Chưa đồng bộ hồ sơ.' });

      db.prepare(`
        INSERT INTO team_messages (house, player_id, player_name, kind, text, card_id, helped_by_json, created_at)
        VALUES (?, ?, ?, 'chat', ?, '', '[]', ?)
      `).run(p.house, id, p.name, text, Date.now());
      broadcastHouseEvent(p.house, 'chat');
      return sendJson(res, 200, { ok: true, ...getHouseState(p.house, id) });
    }

    if (req.method === 'POST' && path === '/api/request-life') {
      const b = await readJsonBody(req);
      const id = cleanWizardId(b.playerId);
      if (!id) return sendJson(res, 400, { ok: false, error: 'Thiếu Mã Phù Thủy.' });
      const p = db.prepare('SELECT name, house FROM players WHERE id = ?').get(id);
      if (!p) return sendJson(res, 404, { ok: false, error: 'Chưa đồng bộ hồ sơ.' });

      const lastReq = db
        .prepare("SELECT created_at FROM team_messages WHERE player_id = ? AND kind = 'life_request' ORDER BY id DESC LIMIT 1")
        .get(id);
      if (lastReq && Date.now() - lastReq.created_at < 60_000) {
        const waitSec = Math.ceil((60_000 - (Date.now() - lastReq.created_at)) / 1000);
        return sendJson(res, 429, { ok: false, error: `Chờ ${waitSec}s nữa để xin Tim tiếp nhé!` });
      }

      db.prepare(`
        INSERT INTO team_messages (house, player_id, player_name, kind, text, card_id, helped_by_json, created_at)
        VALUES (?, ?, ?, 'life_request', 'Đang cần tiếp viện Tim ❤️ để vượt Màn Khó!', '', '[]', ?)
      `).run(p.house, id, p.name, Date.now());
      broadcastHouseEvent(p.house, 'life_request');
      return sendJson(res, 200, { ok: true, ...getHouseState(p.house, id) });
    }

    if (req.method === 'POST' && path === '/api/help-life') {
      const b = await readJsonBody(req);
      const helperId = cleanWizardId(b.helperId);
      const msgId = Math.floor(Number(b.messageId) || 0);
      if (!helperId || msgId <= 0) return sendJson(res, 400, { ok: false, error: 'Dữ liệu không hợp lệ.' });

      const helper = db.prepare('SELECT id, name, house FROM players WHERE id = ?').get(helperId);
      const msg = db.prepare('SELECT * FROM team_messages WHERE id = ?').get(msgId);
      if (!helper || !msg || msg.kind !== 'life_request') {
        return sendJson(res, 404, { ok: false, error: 'Không tìm thấy yêu cầu.' });
      }
      if (msg.player_id === helperId) {
        return sendJson(res, 400, { ok: false, error: 'Không thể tự tặng Tim cho chính mình!' });
      }
      if (helper.house !== msg.house) {
        return sendJson(res, 400, { ok: false, error: 'Chỉ có thể tặng Tim cho đồng đội cùng Nhà!' });
      }
      const helpedBy = JSON.parse(msg.helped_by_json || '[]');
      if (helpedBy.includes(helperId)) {
        return sendJson(res, 400, { ok: false, error: 'Bạn đã tặng Tim cho yêu cầu này rồi!' });
      }
      if (helpedBy.length >= 5) {
        return sendJson(res, 400, { ok: false, error: 'Yêu cầu này đã nhận đủ 5/5 Tim!' });
      }
      helpedBy.push(helperId);
      db.prepare('UPDATE team_messages SET helped_by_json = ? WHERE id = ?').run(JSON.stringify(helpedBy), msgId);
      db.prepare(`
        INSERT INTO life_gifts (to_player_id, from_player_id, from_name, claimed, created_at)
        VALUES (?, ?, ?, 0, ?)
      `).run(msg.player_id, helperId, helper.name, Date.now());
      broadcastHouseEvent(msg.house, 'help_life');

      return sendJson(res, 200, { ok: true, rewardCoins: 50, ...getHouseState(msg.house, helperId) });
    }

    if (req.method === 'POST' && path === '/api/claim-lives') {
      const b = await readJsonBody(req);
      const id = cleanWizardId(b.playerId);
      const maxClaim = Math.max(1, Math.min(8, Math.floor(Number(b.maxClaim) || 5)));
      if (!id) return sendJson(res, 400, { ok: false, error: 'Thiếu Mã Phù Thủy.' });

      const rows = db
        .prepare('SELECT id, from_name FROM life_gifts WHERE to_player_id = ? AND claimed = 0 ORDER BY id ASC LIMIT ?')
        .all(id, maxClaim);
      const mark = db.prepare('UPDATE life_gifts SET claimed = 1 WHERE id = ?');
      for (const r of rows) mark.run(r.id);

      return sendJson(res, 200, { ok: true, claimedCount: rows.length, donors: rows.map((r) => r.from_name) });
    }

    if (req.method === 'GET' && path === '/api/leaderboard') {
      const houses = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff']
        .map((h) => {
          const row = db
            .prepare(
              'SELECT COUNT(*) AS members, COALESCE(SUM((home_level + garden_level - 1) * 10 + mastery_tier * 250 + kudos_count * 5), 0) AS cupPoints FROM players WHERE house = ?'
            )
            .get(h);
          return { house: h, members: row.members, cupPoints: row.cupPoints };
        })
        .sort((a, b) => b.cupPoints - a.cupPoints);

      const topWizards = db
        .prepare(
          `SELECT id, name, house, level, home_level AS homeLevel, garden_level AS gardenLevel,
                  (home_level + garden_level) AS combinedLevels, stars,
                  mastery_tier AS masteryTier, win_streak AS winStreak, pet_name AS petName, kudos_count AS kudosCount
           FROM players ORDER BY (home_level + garden_level) DESC, mastery_tier DESC, stars DESC LIMIT 25`
        )
        .all();

      return sendJson(res, 200, { ok: true, houses, topWizards });
    }

    if (req.method === 'GET' && path.startsWith('/api/visit/')) {
      const rawId = decodeURIComponent(path.slice('/api/visit/'.length));
      const id = cleanWizardId(rawId);
      if (!id) return sendJson(res, 400, { ok: false, error: 'Mã Phù Thủy cần có dạng HW-XXXXXX.' });
      const p = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
      if (!p) return sendJson(res, 404, { ok: false, error: `Không tìm thấy Phù Thủy mã ${id}.` });

      return sendJson(res, 200, {
        ok: true,
        garden: {
          id: p.id,
          name: p.name,
          house: p.house,
          level: p.level,
          homeLevel: p.home_level || p.level,
          gardenLevel: p.garden_level || p.level,
          stars: p.stars,
          masteryTier: p.mastery_tier,
          homeMasteryTier: p.home_mastery_tier ?? p.mastery_tier ?? 0,
          gardenMasteryTier: p.garden_mastery_tier ?? p.mastery_tier ?? 0,
          petName: p.pet_name,
          homePetName: p.home_pet_name || p.pet_name || 'Hedwig',
          gardenPetName: p.garden_pet_name || p.pet_name || 'Niffler',
          weather: p.weather,
          kudosCount: p.kudos_count || 0,
          completedTasks: JSON.parse(p.completed_tasks_json || '{}'),
          castleTasks: JSON.parse(p.castle_tasks_json || '{}'),
        },
      });
    }

    if (serveCompressedStatic(req, res, DIST_DIR, path)) {
      return;
    }

    return sendJson(res, 404, { ok: false, error: 'Endpoint không tồn tại.' });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: cleanText(err?.message || 'Lỗi máy chủ', 100) });
  }
}

if (!IS_VERCEL) {
  const server = createServer(handleHogwartsRequest);
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[HogwartsOnline] Server listening on http://127.0.0.1:${PORT}`);
  });
}
