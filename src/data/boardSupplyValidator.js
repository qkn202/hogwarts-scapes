/**
 * Board Refill-Supply Validator for generated & preset Hogwarts boards.
 *
 * Playrix gravity only refills a cell from directly above (through inactive gaps on
 * normal boards) or diagonally when the cell above is blocked. Dense crates/clams/
 * flowerbeds/walls can seal "pockets" that stay permanently EMPTY once their pieces
 * are matched — the audit bot found such holes on Level 11. This validator walks
 * the board top-down, finds the first unreachable cell and removes the blocker or
 * wall sealing it, repeating until every playable cell has a supply path.
 */

const ROWS = 8;
const COLS = 8;

function key(r, c) {
  return `${r},${c}`;
}

/**
 * Mutates the stage definition so every non-static active cell can be refilled.
 * @param {object} st Stage definition (mask, crates, clams, flowerbeds, walls, portals, goals).
 * @returns {number} Number of blockers/walls removed.
 */
export function ensureRefillSupply(st) {
  if (!st?.mask) return 0;
  st.boxes = st.boxes || [];
  st.jellies = st.jellies || [];
  st.crates = st.crates || [];
  st.clams = st.clams || [];
  st.portraits = st.portraits || [];
  st.fireflies = st.fireflies || [];
  st.flowerbeds = st.flowerbeds || [];
  st.chains = st.chains || [];
  st.vines = st.vines || [];
  st.foams = st.foams || [];
  st.walls = st.walls || [];
  const portals = st.portals || [];
  const hasPortals = portals.length > 0;
  const portalCols = new Set(portals.map((p) => p.from[1]));
  const portalTo = new Map(portals.map((p) => [key(p.to[0], p.to[1]), p.from]));
  let removed = 0;

  for (let iter = 0; iter < 55; iter++) {
    const staticSet = new Set(
      [
        ...st.boxes,
        ...st.jellies,
        ...st.crates,
        ...st.clams,
        ...st.portraits,
        ...st.fireflies,
        ...st.flowerbeds,
        ...st.chains,
        ...st.vines,
        ...st.foams,
      ].map(([r, c]) => key(r, c))
    );
    const wallBottom = new Set(
      st.walls.filter((w) => w[2] === 'bottom' || w[2] === 'b').map(([r, c]) => key(r, c))
    );
    const isOpen = (r, c) => Boolean(st.mask[r]?.[c]) && !staticSet.has(key(r, c));
    const fed = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    let unfed = null;

    for (let r = 0; r < ROWS && !unfed; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!isOpen(r, c)) continue;
        let ok = false;

        const portalFrom = portalTo.get(key(r, c));
        if (portalFrom && fed[portalFrom[0]][portalFrom[1]]) ok = true;

        if (!ok && !(r > 0 && wallBottom.has(key(r - 1, c)))) {
          let rr = r - 1;
          let crossedGap = false;
          while (rr >= 0 && !st.mask[rr][c]) {
            crossedGap = true;
            rr--;
          }
          const gapBlocks = crossedGap && hasPortals && portalCols.has(c);
          if (!gapBlocks) {
            if (rr < 0) ok = true; // fresh refills spawn into this segment
            else if (crossedGap && hasPortals) ok = true; // non-portal column gets direct refills
            else if (isOpen(rr, c) && fed[rr][c]) ok = true;
          }
        }

        if (!ok && r > 0) {
          for (const dc of [-1, 1]) {
            const nc = c + dc;
            if (nc >= 0 && nc < COLS && isOpen(r - 1, nc) && fed[r - 1][nc]) {
              ok = true;
              break;
            }
          }
        }

        fed[r][c] = ok;
        if (!ok) {
          unfed = [r, c];
          break;
        }
      }
    }

    if (!unfed) return removed;

    // Unseal: drop the nearest static blocker above (same column), else the wall, else a diagonal blocker.
    const [ur, uc] = unfed;
    const dropAt = (r, c) => {
      const k = key(r, c);
      for (const list of ['chains', 'vines', 'foams', 'boxes', 'jellies', 'crates', 'clams', 'portraits', 'fireflies', 'flowerbeds']) {
        const idx = st[list].findIndex(([br, bc]) => key(br, bc) === k);
        if (idx >= 0) {
          st[list].splice(idx, 1);
          return true;
        }
      }
      return false;
    };
    let fixed = false;
    if (ur > 0 && wallBottom.has(key(ur - 1, uc))) {
      st.walls = st.walls.filter((w) => !(w[0] === ur - 1 && w[1] === uc));
      fixed = true;
    }
    for (let r = ur - 1; r >= 0 && !fixed; r--) {
      if (dropAt(r, uc)) fixed = true;
      else if (st.mask[r][uc]) break;
    }
    for (const dc of [-1, 1]) {
      if (!fixed && ur > 0) fixed = dropAt(ur - 1, uc + dc);
    }
    if (!fixed) return removed; // nothing left to remove (should not happen)
    removed++;
  }

  // Keep blocker-count goals achievable after removals
  for (const g of st.goals || []) {
    if (g.type === 'crate') g.target = Math.min(g.target, st.crates.length);
    if (g.type === 'clam') g.target = Math.min(g.target, st.clams.length);
  }
  return removed;
}

/**
 * Applies validation and re-syncs crate/clam goal targets with the remaining blockers.
 * @param {object} st Stage definition.
 */
export function validateStageSupply(st) {
  if (!st) return;
  ensureRefillSupply(st);
  const chainTotal = st.chains.length + st.vines.length;
  for (const g of st.goals || []) {
    if (g.type === 'box') g.target = Math.max(1, Math.min(g.target, st.boxes.length));
    if (g.type === 'cherry') g.target = Math.max(1, Math.min(g.target, st.jellies.length));
    if (g.type === 'crate') g.target = Math.max(1, Math.min(g.target, st.crates.length));
    if (g.type === 'clam') g.target = Math.max(1, Math.min(g.target, st.clams.length));
    if (g.type === 'portrait') g.target = Math.max(1, Math.min(g.target, st.portraits.length));
    if (g.type === 'firefly') g.target = Math.max(3, Math.min(g.target, st.fireflies.length * 3));
    if (g.type === 'chain') g.target = Math.max(1, Math.min(g.target, chainTotal));
    if (g.type === 'foam') g.target = Math.max(1, Math.min(g.target, st.foams.length));
    if (g.type === 'bloom' && st.flowerbeds.length === 0) {
      g.type = 'color';
      g.color = 0;
      g.target = 20;
    }
  }
  st.goals = (st.goals || []).filter(
    (g) =>
      !(g.type === 'box' && st.boxes.length === 0) &&
      !(g.type === 'cherry' && st.jellies.length === 0) &&
      !(g.type === 'crate' && st.crates.length === 0) &&
      !(g.type === 'clam' && st.clams.length === 0) &&
      !(g.type === 'portrait' && st.portraits.length === 0) &&
      !(g.type === 'firefly' && st.fireflies.length === 0) &&
      !(g.type === 'chain' && chainTotal === 0) &&
      !(g.type === 'foam' && st.foams.length === 0)
  );
  if (st.goals.length === 0) st.goals.push({ type: 'color', color: 1, target: 22 });
}
