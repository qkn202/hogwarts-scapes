/**
 * Playrix Match & Shape Grammar Detector (with Partition Wall Physics!)
 * Supports BOTH:
 * - Homescapes: 5-line -> Rainbow Ball, L/T -> Bomb, 4-line -> Rocket, 2x2 -> Paper Plane
 * - Gardenscapes: 7+ -> TNT, 6 -> Dynamite, 5 -> Bomb, 4 (line or 2x2) -> Firecracker
 */

/**
 * Checks whether a Playrix Partition Wall separates two orthogonally adjacent cells.
 */
export function hasWallBetween(grid, r1, c1, r2, c2) {
  if (r1 === r2 && Math.abs(c1 - c2) === 1) {
    const leftC = Math.min(c1, c2);
    return Boolean(grid[r1]?.[leftC]?.wallRight);
  }
  if (c1 === c2 && Math.abs(r1 - r2) === 1) {
    const topR = Math.min(r1, r2);
    return Boolean(grid[topR]?.[c1]?.wallBottom);
  }
  return false;
}

/**
 * Checks whether a cell holds a matchable colored piece.
 * Chained or Foamed pieces CAN be matched in place (just cannot be dragged).
 */
export function getMatchableColor(cell) {
  if (!cell || !cell.active || cell.blocker || cell.dropItem || !cell.piece) return -1;
  if (cell.piece.power) return -1;
  return cell.piece.color;
}

/**
 * Checks whether a cell can be dragged/swapped by the player.
 */
export function isCellSwappable(cell) {
  if (!cell || !cell.active || cell.blocker || cell.chain > 0 || cell.foam) return false;
  return Boolean(cell.piece || cell.dropItem);
}

/**
 * Scans the entire grid for 3+ lines AND 2x2 squares (respecting Partition Walls),
 * merges connected same-color components, and determines spawned Playrix power-ups.
 */
export function detectMatches(grid, gameId, preferredAnchors = []) {
  const rows = grid.length;
  const cols = grid[0].length;

  const hRun = Array.from({ length: rows }, () => Array(cols).fill(0));
  const vRun = Array.from({ length: rows }, () => Array(cols).fill(0));
  const sq2x2 = Array.from({ length: rows }, () => Array(cols).fill(false));
  const matchedMask = Array.from({ length: rows }, () => Array(cols).fill(false));

  // 1. Horizontal runs >= 3 (broken by wallRight)
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      const colVal = getMatchableColor(grid[r][c]);
      if (colVal < 0) {
        c++;
        continue;
      }
      let end = c + 1;
      while (
        end < cols &&
        !hasWallBetween(grid, r, end - 1, r, end) &&
        getMatchableColor(grid[r][end]) === colVal
      ) {
        end++;
      }
      const len = end - c;
      if (len >= 3) {
        for (let k = c; k < end; k++) {
          hRun[r][k] = len;
          matchedMask[r][k] = true;
        }
      }
      c = end;
    }
  }

  // 2. Vertical runs >= 3 (broken by wallBottom)
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      const colVal = getMatchableColor(grid[r][c]);
      if (colVal < 0) {
        r++;
        continue;
      }
      let end = r + 1;
      while (
        end < rows &&
        !hasWallBetween(grid, end - 1, c, end, c) &&
        getMatchableColor(grid[end][c]) === colVal
      ) {
        end++;
      }
      const len = end - r;
      if (len >= 3) {
        for (let k = r; k < end; k++) {
          vRun[k][c] = len;
          matchedMask[k][c] = true;
        }
      }
      r = end;
    }
  }

  // 3. Signature Playrix 2x2 Squares (only when no internal partition wall splits the 2x2)
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const colVal = getMatchableColor(grid[r][c]);
      if (colVal < 0) continue;
      const wallInside =
        hasWallBetween(grid, r, c, r, c + 1) ||
        hasWallBetween(grid, r + 1, c, r + 1, c + 1) ||
        hasWallBetween(grid, r, c, r + 1, c) ||
        hasWallBetween(grid, r, c + 1, r + 1, c + 1);
      if (wallInside) continue;

      if (
        getMatchableColor(grid[r][c + 1]) === colVal &&
        getMatchableColor(grid[r + 1][c]) === colVal &&
        getMatchableColor(grid[r + 1][c + 1]) === colVal
      ) {
        sq2x2[r][c] = true;
        sq2x2[r][c + 1] = true;
        sq2x2[r + 1][c] = true;
        sq2x2[r + 1][c + 1] = true;
        matchedMask[r][c] = true;
        matchedMask[r][c + 1] = true;
        matchedMask[r + 1][c] = true;
        matchedMask[r + 1][c + 1] = true;
      }
    }
  }

  // 4. Connected components of same-color matched cells
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const groups = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!matchedMask[r][c] || visited[r][c]) continue;
      const color = getMatchableColor(grid[r][c]);
      const queue = [{ r, c }];
      visited[r][c] = true;
      const cells = [];

      while (queue.length > 0) {
        const cur = queue.shift();
        cells.push(cur);
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nr = cur.r + dr;
          const nc = cur.c + dc;
          if (
            nr >= 0 &&
            nr < rows &&
            nc >= 0 &&
            nc < cols &&
            !visited[nr][nc] &&
            matchedMask[nr][nc] &&
            !hasWallBetween(grid, cur.r, cur.c, nr, nc) &&
            getMatchableColor(grid[nr][nc]) === color
          ) {
            visited[nr][nc] = true;
            queue.push({ r: nr, c: nc });
          }
        }
      }

      let maxH = 0;
      let maxV = 0;
      let hasSquare = false;
      for (const cellPos of cells) {
        if (hRun[cellPos.r][cellPos.c] > maxH) maxH = hRun[cellPos.r][cellPos.c];
        if (vRun[cellPos.r][cellPos.c] > maxV) maxV = vRun[cellPos.r][cellPos.c];
        if (sq2x2[cellPos.r][cellPos.c]) hasSquare = true;
      }

      const spawnPower = classifyPowerup(gameId, cells.length, maxH, maxV, hasSquare);

      let anchor = cells[Math.floor(cells.length / 2)];
      for (const pref of preferredAnchors) {
        const hit = cells.find((pt) => pt.r === pref.r && pt.c === pref.c);
        if (hit) {
          anchor = hit;
          break;
        }
      }

      groups.push({ color, cells, spawnPower, anchor });
    }
  }

  return groups;
}

function classifyPowerup(gameId, count, maxH, maxV, hasSquare) {
  if (gameId === 'homescapes') {
    if (maxH >= 5 || maxV >= 5) return 'rainbow_ball';
    if (maxH >= 3 && maxV >= 3) return 'h_bomb';
    if (maxH === 4) return 'rocket_v';
    if (maxV === 4) return 'rocket_h';
    if (hasSquare) return 'paper_plane';
    return null;
  }

  if (count >= 7) return 'g_tnt';
  if (count === 6) return 'g_dynamite';
  if (count === 5) return 'g_bomb';
  if (count === 4 || hasSquare) return 'g_firecracker';
  return null;
}

export function isValidMove(grid, r1, c1, r2, c2, gameId) {
  const rows = grid.length;
  const cols = grid[0].length;
  if (r2 < 0 || r2 >= rows || c2 < 0 || c2 >= cols) return false;
  if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return false;
  if (hasWallBetween(grid, r1, c1, r2, c2)) return false;

  const a = grid[r1][c1];
  const b = grid[r2][c2];
  if (!isCellSwappable(a) || !isCellSwappable(b)) return false;

  if (a.piece?.power || b.piece?.power) return true;

  const tmpPiece = a.piece;
  const tmpDrop = a.dropItem;
  a.piece = b.piece;
  a.dropItem = b.dropItem;
  b.piece = tmpPiece;
  b.dropItem = tmpDrop;

  const matches = detectMatches(grid, gameId);

  b.dropItem = a.dropItem;
  b.piece = a.piece;
  a.dropItem = tmpDrop;
  a.piece = tmpPiece;

  return matches.length > 0;
}

export function findBestHint(grid, gameId) {
  const rows = grid.length;
  const cols = grid[0].length;
  let best = null;
  let bestScore = -1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (!isCellSwappable(cell)) continue;

      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= rows || nc >= cols || !isCellSwappable(grid[nr][nc])) continue;
        if (hasWallBetween(grid, r, c, nr, nc)) continue;

        const a = grid[r][c];
        const b = grid[nr][nc];
        if (a.piece?.power && b.piece?.power) {
          return { r1: r, c1: c, r2: nr, c2: nc, type: 'combo' };
        }
        if (isValidMove(grid, r, c, nr, nc, gameId)) {
          let score = a.piece?.power || b.piece?.power ? 9 : 3;
          if (a.carpet !== b.carpet) score += 4;
          if (a.grass > 0 || b.grass > 0) score += 3;
          if (a.piece?.butterfly || b.piece?.butterfly) score += 5;
          if (a.piece?.fuse || b.piece?.fuse) score += 6;
          if (score > bestScore) {
            bestScore = score;
            best = { r1: r, c1: c, r2: nr, c2: nc, type: 'swap' };
          }
        }
      }

      if (!best && cell.piece?.power) {
        best = { r1: r, c1: c, r2: r, c2: c, type: 'tap' };
      }
    }
  }
  return best;
}
