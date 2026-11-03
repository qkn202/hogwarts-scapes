/**
 * Interactive Playrix Match-3 Canvas Controller
 * Handles pointer drag/tap swaps, diagonal slide animation, landing squash-and-stretch,
 * turn-end hazard progression, booster targeting, Idle Hints, and Victory Finale.
 */

import { haptics } from '../utils/haptics.js';
import { sprites } from '../utils/spriteLoader.js';
import { sound } from '../utils/sound.js';
import { syncMatch3Stage3D } from '../world3d/match3Stage3d.js';
import { Match3Board } from './boardCore.js';
import { maybeTransitionToStage2, runVictoryFinaleSequence } from './finaleAndStage.js';
import { Match3FxSystem } from './fxSystem.js';
import { findBestHint } from './matchDetector.js';
import {
    drawBuriedGnome, drawCellContent, drawCellUnderlay,
    drawContouredBoardFrame, drawGrassLayer, drawPartitionWalls, roundRect,
} from './pieceArt.js';

export class Match3Controller {
    constructor(canvas, callbacks) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.callbacks = callbacks;
        this.fx = new Match3FxSystem();

        this.board = null;
        this.sessionId = 0;
        this.areaIndex = 0;
        this.running = false;
        this.busy = false;
        this.finaleActive = false;
        this.selectedCell = null;
        this.dragStart = null;
        this.activeBooster = null;
        this.boosterFirstCell = null;
        this.idleTimer = 0;
        this.hintMove = null;
        this.lastTime = 0;
        this.rafId = null;
        this.tileSize = 56;
        this.originX = 20;
        this.originY = 20;
        this.stageScrollOffsetY = 0;
        this.swapAnim = null;
        this.queuedSwap = null;
        this.colorblind = false;
        this._bindEvents();
    }

    setColorblind(enabled) {
        this.colorblind = Boolean(enabled);
    }

    startLevel(levelDef, preBoosters = [], winStreak = 0, areaIndex = 0, colorblind = this.colorblind) {
        sprites.preloadMatch3(levelDef?.gameId || 'homescapes', 'high');
        this.sessionId += 1;
        this.board = new Match3Board(levelDef, preBoosters, winStreak);
        this.areaIndex = areaIndex;
        this.colorblind = Boolean(colorblind);
        this.busy = false;
        this.finaleActive = false;
        this.selectedCell = null;
        this.dragStart = null;
        this.swapAnim = null;
        this.queuedSwap = null;
        this.activeBooster = null;
        this.boosterFirstCell = null;
        this.idleTimer = 0;
        this.hintMove = null;
        this.stageScrollOffsetY = 0;
        this.fx.reset();

        this.resize();
        this.callbacks.onHudSync(this.board, null);

        if (!this.running) {
            this.running = true;
            this.lastTime = performance.now();
            const tick = (now) => {
                if (!this.running) return;
                const dt = Math.min(0.05, (now - this.lastTime) / 1000);
                this.lastTime = now;
                this._update(dt);
                this._render(now / 1000);
                this.rafId = requestAnimationFrame(tick);
            };
            this.rafId = requestAnimationFrame(tick);
        }
    }

    stop() {
        this.sessionId += 1;
        this.running = false;
        this.busy = false;
        this.finaleActive = false;
        this.dragStart = null;
        this.swapAnim = null;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    grantExtraMoves(count = 5) {
        if (!this.board) return;
        this.board.movesLeft += count;
        this.board.clockExploded = false;
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < this.board.cols; c++) {
                const p = this.board.grid[r][c]?.piece;
                if (p?.fuse !== undefined && p.fuse <= 1) p.fuse = 5;
            }
        }
        this.busy = false;
        this.idleTimer = 0;
        this.callbacks.onHudSync(this.board, this.activeBooster);
    }

    setBoosterMode(boosterKey) {
        if (this.busy || this.finaleActive) return;
        this.activeBooster = this.activeBooster === boosterKey ? null : boosterKey;
        this.boosterFirstCell = null;
        this.selectedCell = null;
        sound.sfxClick();
        if (this.board) this.callbacks.onHudSync(this.board, this.activeBooster);
    }

    resize() {
        if (!this.board) return;
        const rect = this.canvas.parentElement?.getBoundingClientRect() || { width: 540, height: 540 };
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(160, Math.floor(rect.width));
        const h = Math.max(160, Math.floor(rect.height));
        this.canvas.width = Math.floor(w * dpr);
        this.canvas.height = Math.floor(h * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.viewW = w;
        this.viewH = h;

        const pad = Math.min(22, Math.max(6, Math.floor(Math.min(w, h) * 0.03)));
        this.tileSize = Math.max(24, Math.floor(Math.min((w - pad * 2) / this.board.cols, (h - pad * 2) / this.board.rows, 70)));
        this.originX = Math.floor((w - this.tileSize * this.board.cols) / 2);
        this.originY = Math.floor((h - this.tileSize * this.board.rows) / 2);
    }

    _cellFromClient(clientX, clientY) {
        if (!this.board) return null;
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const c = Math.floor((x - this.originX) / this.tileSize);
        const r = Math.floor((y - this.originY) / this.tileSize);
        if (r < 0 || r >= this.board.rows || c < 0 || c >= this.board.cols) return null;
        if (!this.board.grid[r][c].active) return null;
        return { r, c, x, y };
    }

    _bindEvents() {
        window.addEventListener('resize', () => { if (this.running) this.resize(); });
        if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
            new ResizeObserver(() => { if (this.running) this.resize(); }).observe(this.canvas.parentElement);
        }

        this.canvas.addEventListener('pointerdown', (e) => {
            sound.unlock();
            if (!this.board || this.finaleActive) return;
            const hit = this._cellFromClient(e.clientX, e.clientY);
            if (!hit) return;
            try { this.canvas.setPointerCapture?.(e.pointerId); } catch { }
            this.idleTimer = 0;
            this.hintMove = null;
            if (this.busy) {
                this.dragStart = { ...hit, triggered: false, pointerType: e.pointerType || 'mouse', queuedOnly: true };
                return;
            }
            if (this.activeBooster) return this._handleBoosterTap(hit.r, hit.c);
            this.dragStart = { ...hit, triggered: false, pointerType: e.pointerType || 'mouse', queuedOnly: false };
        });

        this.canvas.addEventListener('pointermove', (e) => {
            if (!this.dragStart || this.dragStart.triggered || !this.board || this.finaleActive) return;
            const rect = this.canvas.getBoundingClientRect();
            const dx = e.clientX - rect.left - this.dragStart.x;
            const dy = e.clientY - rect.top - this.dragStart.y;
            const swipeRatio = this.dragStart.pointerType === 'touch' ? 0.27 : 0.34;
            if (Math.hypot(dx, dy) < this.tileSize * swipeRatio) return;

            this.dragStart.triggered = true;
            let tr = this.dragStart.r, tc = this.dragStart.c;
            if (Math.abs(dx) > Math.abs(dy)) tc += dx > 0 ? 1 : -1;
            else tr += dy > 0 ? 1 : -1;
            this.selectedCell = null;
            if (this.busy) {
                this.queuedSwap = { r1: this.dragStart.r, c1: this.dragStart.c, r2: tr, c2: tc, at: performance.now() };
                return;
            }
            this._attemptSwap(this.dragStart.r, this.dragStart.c, tr, tc, false);
        });

        const cancelDrag = () => { this.dragStart = null; };
        this.canvas.addEventListener('pointercancel', cancelDrag);
        this.canvas.addEventListener('lostpointercapture', () => {
            if (this.dragStart?.triggered) this.dragStart = null;
        });

        window.addEventListener('pointerup', () => {
            if (!this.dragStart || !this.board) return;
            const start = this.dragStart;
            this.dragStart = null;
            if (start.triggered || this.busy || this.finaleActive) return;

            if (this.selectedCell) {
                const dist = Math.abs(this.selectedCell.r - start.r) + Math.abs(this.selectedCell.c - start.c);
                if (dist === 1) {
                    const prev = this.selectedCell;
                    this.selectedCell = null;
                    this._attemptSwap(prev.r, prev.c, start.r, start.c, false);
                    return;
                }
                if (dist === 0) {
                    this.selectedCell = null;
                    if (this.board.activateCellTap(start.r, start.c)) this._triggerTapPowerup();
                    return;
                }
            }

            this.selectedCell = { r: start.r, c: start.c };
            if (this.board.grid[start.r][start.c].piece?.power) sound.sfxClick();
        });
    }

    async _triggerTapPowerup() {
        const sid = this.sessionId;
        this.busy = true;
        this._ingestFx();
        this.callbacks.onHudSync(this.board, this.activeBooster);
        await this._sleep(165);
        if (sid === this.sessionId && this.running) await this._runCascadeLoop([], true, sid);
    }

    async _handleBoosterTap(r, c) {
        if (!this.board || !this.activeBooster) return;
        const key = this.activeBooster;

        if (key === 'hand' || key === 'glove') {
            if (!this.board.canUseBoosterAt(key, r, c)) return sound.sfxInvalid();
            if (!this.boosterFirstCell) {
                this.boosterFirstCell = { r, c };
                return sound.sfxClick();
            }
            const dist = Math.abs(this.boosterFirstCell.r - r) + Math.abs(this.boosterFirstCell.c - c);
            if (dist === 0) {
                this.boosterFirstCell = null;
                return sound.sfxClick();
            }
            if (dist !== 1) {
                this.boosterFirstCell = { r, c };
                return sound.sfxClick();
            }
            const first = this.boosterFirstCell;
            if (!this.board.canUseBoosterAt(key, first.r, first.c, r, c)) return sound.sfxInvalid();
            this.boosterFirstCell = null;
            if (!this.callbacks.onConsumeBooster(key)) return;
            this.activeBooster = null;
            await this._attemptSwap(first.r, first.c, r, c, true);
            return;
        }

        if (!this.board.canUseBoosterAt(key, r, c)) return sound.sfxInvalid();
        if (!this.callbacks.onConsumeBooster(key)) return;
        const sid = this.sessionId;
        this.activeBooster = null;
        this.busy = true;
        this.board.useBooster(key, r, c);
        this._ingestFx();
        this.callbacks.onHudSync(this.board, null);
        await this._sleep(180);
        if (sid !== this.sessionId || !this.running) return;
        await this._runCascadeLoop([], false, sid);
    }

    async _attemptSwap(r1, c1, r2, c2, freeMove = false) {
        if (!this.board || r2 < 0 || r2 >= this.board.rows || c2 < 0 || c2 >= this.board.cols) return;
        if (!this.board.grid[r2][c2].active) return;

        const sid = this.sessionId;
        this.busy = true;
        haptics.swap();
        sound.sfxSwap();
        this.swapAnim = { r1, c1, r2, c2, progress: 0, reverse: false };
        await this._sleep(140);
        if (sid !== this.sessionId || !this.running) return;

        const res = this.board.performPlayerSwap(r1, c1, r2, c2, freeMove);
        this.swapAnim = null;

        if (!res) {
            haptics.warning();
            sound.sfxInvalid();
            this.swapAnim = { r1, c1, r2, c2, progress: 0, reverse: true };
            await this._sleep(160);
            if (sid !== this.sessionId || !this.running) return;
            this.swapAnim = null;
            this.busy = false;
            return;
        }

        this._ingestFx();
        this.callbacks.onHudSync(this.board, this.activeBooster);
        await this._runCascadeLoop(res.anchors || [], Boolean(res.playerMove), sid);
    }

    async _runCascadeLoop(initialAnchors = [], isPlayerTurn = false, sid = this.sessionId) {
        if (!this.board || sid !== this.sessionId || !this.running) return;
        this.busy = true;
        let cascade = 0;
        let anchors = initialAnchors;
        const aborted = () => sid !== this.sessionId || !this.running || !this.board;

        const settleCascades = async () => {
            while (!aborted()) {
                const hadMatches = this.board.resolveMatchStep(cascade, anchors);
                anchors = [];
                const hadPlanes = this._ingestFx();
                this.callbacks.onHudSync(this.board, this.activeBooster);

                if (hadPlanes) {
                    haptics.explosion(1);
                    await this._sleep(340);
                } else if (hadMatches) {
                    haptics.match(cascade);
                    await this._sleep(175);
                }
                if (aborted()) return;

                const moved = this.board.applyGravityAndRefill();
                if (moved) {
                    await this._sleep(210);
                    if (aborted()) return;
                }

                if (!hadMatches && !moved) break;
                if (++cascade > 25) break;
            }
        };

        await settleCascades();
        if (aborted()) return;

        if (isPlayerTurn && !this.board.allGoalsComplete()) {
            const turnChanged = this.board.endPlayerTurn();
            if (turnChanged) {
                this._ingestFx();
                this.callbacks.onHudSync(this.board, this.activeBooster);
                await this._sleep(190);
                if (aborted()) return;
                await settleCascades();
                if (aborted()) return;
            }
        }

        this.callbacks.onHudSync(this.board, this.activeBooster);

        if (await maybeTransitionToStage2(this, sid)) {
            if (!aborted()) this.busy = false;
            return;
        }
        if (aborted()) return;
        if (this.board.allGoalsComplete()) return runVictoryFinaleSequence(this, sid);
        if (this.board.clockExploded || this.board.movesLeft <= 0) {
            this.busy = false;
            haptics.warning();
            sound.sfxDefeat();
            this.callbacks.onOutOfMoves(Boolean(this.board.clockExploded));
            return;
        }
        if (!findBestHint(this.board.grid, this.board.gameId)) {
            this.board.shufflePieces();
            this._ingestFx();
            await this._sleep(260);
            if (aborted()) return;
        }
        this.busy = false;
        if (this.queuedSwap) {
            const q = this.queuedSwap;
            this.queuedSwap = null;
            if (performance.now() - q.at <= 650 && !this.finaleActive && this.board.movesLeft > 0) {
                this._attemptSwap(q.r1, q.c1, q.r2, q.c2, false);
            }
        }
    }

    _ingestFx() {
        return this.fx.ingest(this.board, this.originX, this.originY, this.tileSize);
    }

    _update(dt) {
        if (!this.board) return;
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < this.board.cols; c++) {
                const cell = this.board.grid[r][c];
                if (cell.fallOffset > 0) cell.fallOffset = Math.max(0, cell.fallOffset - dt * 15);
                else if (cell.fallOffset < 0) cell.fallOffset = Math.min(0, cell.fallOffset + dt * 12);
                if (cell.fallOffsetX) {
                    const step = dt * 10;
                    cell.fallOffsetX = Math.abs(cell.fallOffsetX) <= step ? 0 : cell.fallOffsetX - Math.sign(cell.fallOffsetX) * step;
                }
                if (cell.bounce > 0) cell.bounce = Math.max(0, cell.bounce - dt * 4.5);
            }
        }
        if (this.swapAnim) this.swapAnim.progress = Math.min(1, this.swapAnim.progress + dt * 7);
        if (!this.busy && !this.finaleActive) {
            this.idleTimer += dt;
            if (this.idleTimer > 4.0 && !this.hintMove) {
                this.hintMove = findBestHint(this.board.grid, this.board.gameId);
            }
        }
        this.fx.update(dt);
    }

    _render(timeSec) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.viewW, this.viewH);
        if (!this.board) return;
        syncMatch3Stage3D(this, timeSec);
        const ts = this.tileSize;
        const bw = this.board.cols * ts;
        const bh = this.board.rows * ts;
        const shake = this.fx.getShakeOffset();
        ctx.save();
        ctx.translate(shake.x, shake.y + (this.stageScrollOffsetY || 0));
        drawContouredBoardFrame(ctx, this.board, this.originX, this.originY, ts);

        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < this.board.cols; c++) {
                const cell = this.board.grid[r][c];
                if (cell.active) {
                    drawCellUnderlay(ctx, this.board.gameId, cell, this.originX + c * ts, this.originY + r * ts, ts, timeSec);
                }
            }
        }

        if (this.board.gameId === 'gardenscapes') {
            for (const gn of this.board.gnomes) {
                if (!gn.rescued) drawBuriedGnome(ctx, gn, this.originX, this.originY, ts);
            }
            for (let r = 0; r < this.board.rows; r++) {
                for (let c = 0; c < this.board.cols; c++) {
                    const cell = this.board.grid[r][c];
                    if (cell.active && cell.grass > 0) {
                        drawGrassLayer(ctx, cell, this.originX + c * ts, this.originY + r * ts, ts);
                    }
                }
            }
        }

        if (this.selectedCell || this.boosterFirstCell) {
            const sel = this.boosterFirstCell || this.selectedCell;
            ctx.strokeStyle = '#ffbe0b';
            ctx.lineWidth = 3.5;
            roundRect(ctx, this.originX + sel.c * ts + 3, this.originY + sel.r * ts + 3, ts - 6, ts - 6, 9);
            ctx.stroke();
        } else if (this.hintMove) {
            const alpha = 0.5 + 0.42 * Math.sin(timeSec * 6);
            ctx.strokeStyle = `rgba(255, 209, 102, ${alpha})`;
            ctx.lineWidth = 4;
            for (const [hr, hc] of [[this.hintMove.r1, this.hintMove.c1], [this.hintMove.r2, this.hintMove.c2]]) {
                roundRect(ctx, this.originX + hc * ts + 3, this.originY + hr * ts + 3, ts - 6, ts - 6, 9);
                ctx.stroke();
            }
        }

        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < this.board.cols; c++) {
                const cell = this.board.grid[r][c];
                if (!cell.active) continue;
                let cx = this.originX + (c + 0.5 - (cell.fallOffsetX || 0)) * ts;
                let cy = this.originY + (r + 0.5 - (cell.fallOffset || 0)) * ts;
                if (this.swapAnim) {
                    const { r1, c1, r2, c2, progress, reverse } = this.swapAnim;
                    const p = reverse ? Math.sin(progress * Math.PI) * 0.5 : progress;
                    if (r === r1 && c === c1) { cx += (c2 - c1) * ts * p; cy += (r2 - r1) * ts * p; }
                    else if (r === r2 && c === c2) { cx += (c1 - c2) * ts * p; cy += (r1 - r2) * ts * p; }
                }
                drawCellContent(ctx, this.board.gameId, cell, cx, cy, ts, timeSec, this.colorblind);
            }
        }

        drawPartitionWalls(ctx, this.board, this.originX, this.originY, ts);
        this.fx.render(ctx, this.originX, this.originY, ts, bw, bh);
        ctx.restore();
    }

    _sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
}
