/**
 * Main Playrix Dual-Game Orchestrator (Homescapes & Gardenscapes: Wizarding World 77,777)
 * Coordinates 8-Area 2.5D Worlds, Match-3 Campaign, 24 Physics Pin Vaults, Live-Ops & Tournaments,
 * Unified Online House Hub (SSE), Dual-World Friend Visiting + Kudos, and Polyphonic Weather Audio.
 */

import { getGardenscapesLevel } from '../data/gardenscapesLevels.js';
import { getHomescapesLevel } from '../data/homescapesLevels.js';
import { getHouseCommonSceneKey } from '../data/houseCommonRooms.js';
import { Match3Controller } from '../match3/match3Controller.js';
import { initDialogs, showToastBanner } from '../utils/dialogHelper.js';
import { haptics } from '../utils/haptics.js';
import { sound } from '../utils/sound.js';
import { sprites } from '../utils/spriteLoader.js';
import { loadGameSave, loadPrefs, refreshLives, saveGameState } from '../utils/storage.js';
import { GardenscapesWorldRenderer } from '../world/gardenscapesRenderer.js';
import { HomescapesWorldRenderer } from '../world/homescapesRenderer.js';
import { PinMinigameController } from '../world/pinMinigame.js';
import { openEventsModal } from './eventsModal.js';
import {
  handleMatch3OutOfMoves,
  handleMatch3Victory,
  syncMatch3SessionHud,
} from './match3SessionUi.js';
import {
  getGameAreas,
  openLevelBriefingModal,
  openPinModal,
  openShopAndWheelModal,
  openTabletModal,
} from './modals.js';
import { openOnlineHubModal, syncOnlineProfile } from './onlineHubModal.js';
import {
  applyGameShellChrome,
  openMatch3PauseModal,
  openSettingsModal,
  renderGameHudTitle,
  renderStylePickerBar,
  syncPlayrixWorldBadges,
} from './settingsAndStyle.js';
import { stopTeamChatPolling } from './teamChatFeed.js';
import { dismissLevelTour, maybeShowLevelTour } from './tutorialTour.js';
import {
  bindVisitorControls,
  cycleWeatherMode,
  syncVisitorBanner,
  syncWeatherButton,
} from './visitorWeather.js';
import { initPlayrix2025Hud } from '../world3d/world3dPrefsUi.js';

export class ScapesApp {
  constructor(forcedGameId = null) {
    this.forcedGameId = forcedGameId;
    this.gameId = forcedGameId || 'homescapes';
    this.screen = forcedGameId ? 'world' : 'launcher';
    this.save = loadGameSave(this.gameId);
    this.prefs = loadPrefs();
    sound.setPrefs(this.prefs);
    haptics.setPrefs(this.prefs);

    this.selectedPreBoosters = new Set();
    this.activePlayingLevel = 1;
    this.pendingDesign = null;
    this.visitingGarden = null;
    this.visitorWorld = null;
    this.visitorAreaIndex = 0;
    this.unclaimedOnlineLives = 0;

    this.launcherEl = document.getElementById('launcher-view');
    this.shellEl = document.getElementById('game-shell');
    this.worldStageEl = document.getElementById('world-stage');
    this.match3StageEl = document.getElementById('match3-stage');
    this.styleBarEl = document.getElementById('style-picker-bar');

    const worldCanvas = document.getElementById('world-canvas');
    this.homeRenderer = new HomescapesWorldRenderer(worldCanvas, (task, done) =>
      this.beginTaskRenovation(task, done)
    );
    this.gardenRenderer = new GardenscapesWorldRenderer(worldCanvas, (task, done) =>
      this.beginTaskRenovation(task, done)
    );

    const m3Canvas = document.getElementById('match3-canvas');
    this.m3Controller = new Match3Controller(m3Canvas, {
      onHudSync: (board, armedBooster) => syncMatch3SessionHud(this, board, armedBooster),
      onConsumeBooster: (key) => this._consumeIngameBooster(key),
      onVictory: (summary) => handleMatch3Victory(this, summary),
      onOutOfMoves: (clockExploded) => handleMatch3OutOfMoves(this, clockExploded),
    });

    const pinCanvas = document.getElementById('pin-canvas');
    this.pinController = new PinMinigameController(pinCanvas, (res) => this._handlePinResult(res));

    this._bindShellControls();
    initDialogs((dialog) => {
      if (dialog.id === 'dialog-pin') this.pinController.stop();
      if (dialog.id === 'dialog-online') stopTeamChatPolling();
    });

    setInterval(() => {
      if (this.screen !== 'launcher') {
        refreshLives(this.save);
        this._renderTopHud();
      }
    }, 5000);

    setInterval(() => {
      if (this.screen !== 'launcher' && document.visibilityState !== 'hidden') {
        syncOnlineProfile(this);
      }
    }, 60000);

    if (forcedGameId) this.launchGame(forcedGameId);
    else {
      const q = new URLSearchParams(window.location.search).get('game');
      if (q === 'homescapes' || q === 'gardenscapes') this.launchGame(q);
      else this.showLauncher();
    }
  }

  getActiveWorldRenderer() {
    const worldId = this.visitingGarden ? this.visitorWorld || this.gameId : this.gameId;
    return worldId === 'homescapes' ? this.homeRenderer : this.gardenRenderer;
  }

  getMaxUnlockedArea() {
    const areas = getGameAreas(this.gameId, this.save.masteryTier, this.save.house);
    let idx = 0;
    while (idx < areas.length - 1 && this.save.claimedAreaChests.includes(areas[idx].id)) idx++;
    return idx;
  }

  getLevelDef(levelNum) {
    const nm = Boolean(this.prefs.nightmare);
    return this.gameId === 'homescapes' ? getHomescapesLevel(levelNum, nm) : getGardenscapesLevel(levelNum, nm);
  }

  showLauncher() {
    this.screen = 'launcher';
    dismissLevelTour();
    document.body.removeAttribute('data-active-game');
    this.homeRenderer.stop();
    this.gardenRenderer.stop();
    this.m3Controller.stop();

    this.shellEl.classList.add('hidden');
    this.launcherEl.classList.remove('hidden');

    const hSave = loadGameSave('homescapes');
    const gSave = loadGameSave('gardenscapes');
    const homeCard = document.querySelector('.game-launch-card.home-card');
    const commonBg = sprites.url(getHouseCommonSceneKey(hSave.house));
    if (homeCard && commonBg) homeCard.style.setProperty('--home-card-bg', `url('${commonBg}')`);
    const hSum = document.getElementById('launcher-home-summary');
    const gSum = document.getElementById('launcher-garden-summary');
    if (hSum) hSum.innerHTML = `<span>Màn ${hSave.level}/77,777</span><span>⭐ ${hSave.stars}</span><span>💰 ${hSave.coins.toLocaleString()}</span>`;
    if (gSum) gSum.innerHTML = `<span>Màn ${gSave.level}/77,777</span><span>⭐ ${gSave.stars}</span><span>💰 ${gSave.coins.toLocaleString()}</span>`;
    sound.setWeather('day');
    sound.playBgm('launcher');
  }

  launchGame(gameId) {
    this.gameId = gameId;
    this.save = loadGameSave(gameId);
    this.visitingGarden = null;
    this.visitorWorld = null;
    this.selectedPreBoosters.clear();
    this.pendingDesign = null;
    this.styleBarEl.classList.add('hidden');

    applyGameShellChrome(this.shellEl, gameId);
    this.launcherEl.classList.add('hidden');
    this.shellEl.classList.remove('hidden');
    this.enterWorldView();
    syncOnlineProfile(this);
  }

  enterWorldView(austinLine = null) {
    this.screen = 'world';
    dismissLevelTour();
    this.shellEl.setAttribute('data-screen', 'world');
    this.pendingDesign = null;
    this.styleBarEl.classList.add('hidden');
    this.m3Controller.stop();
    this.match3StageEl.classList.add('hidden');
    this.worldStageEl.classList.remove('hidden');

    this.homeRenderer.stop();
    this.gardenRenderer.stop();

    const activeWorld = this.visitingGarden ? this.visitorWorld || this.gameId : this.gameId;
    const isHome = activeWorld === 'homescapes';
    const renderer = this.getActiveWorldRenderer();

    if (this.visitingGarden) {
      const vg = this.visitingGarden;
      const vTasks = isHome ? vg.castleTasks || {} : vg.completedTasks || {};
      const wLv = isHome ? vg.homeLevel || vg.level : vg.gardenLevel || vg.level;
      const wth = vg.weather || 'day';
      const vPet = isHome
        ? vg.homePetName || 'Hedwig'
        : vg.gardenPetName || vg.petName || 'Niffler';
      renderer.setState({
        areaIndex: this.visitorAreaIndex,
        house: vg.house,
        completedTasks: vTasks,
        petName: vPet,
        weather: wth,
        readOnlyVisitor: true,
        previewOverride: null,
        austinLine: `Chào mừng tham quan ${isHome ? 'Lâu Đài' : 'Khuôn Viên'} của ${vg.name} (Màn ${wLv})!`,
      });
      sound.setWeather(wth);
    } else {
      this.visitorWorld = null;
      this.save.currentArea = Math.min(this.save.currentArea, this.getMaxUnlockedArea());
      const wth = this.save.weather || 'day';
      renderer.setState({
        areaIndex: this.save.currentArea,
        house: this.save.house,
        completedTasks: this.save.completedTasks,
        petName: this.save.petName,
        weather: wth,
        readOnlyVisitor: false,
        previewOverride: null,
        austinLine: austinLine ?? '',
      });
      sound.setWeather(wth);
    }
    renderer.start();
    syncVisitorBanner(this);
    this.persistAndSyncHud();
    sound.playBgm(isHome ? 'homescapes_world' : 'gardenscapes_world');
  }

  enterVisitorGarden(garden) {
    this.visitingGarden = garden;
    this.visitorWorld = this.gameId;
    this.visitorAreaIndex = 0;
    this.enterWorldView();
    const place = this.gameId === 'homescapes' ? 'Lâu Đài' : 'Khuôn Viên';
    this.toast(`⚡ Đã Độn Thổ tới ${place} của ${garden.name}!`);
  }

  exitVisitorGarden() {
    this.visitingGarden = null;
    this.visitorWorld = null;
    sound.sfxClick();
    const place = this.gameId === 'homescapes' ? 'Lâu Đài' : 'Khuôn Viên';
    this.enterWorldView(`Mừng bạn quay trở lại ${place} Hogwarts của riêng mình!`);
  }

  cycleWeatherMode() {
    cycleWeatherMode(this);
  }

  beginTaskRenovation(rawTask, isRestyle = false) {
    if (!rawTask || this.visitingGarden) return;
    const task =
      getGameAreas(this.gameId, this.save.masteryTier, this.save.house)
        .flatMap((a) => a.tasks)
        .find((t) => t.id === rawTask.id) || rawTask;
    if (!isRestyle && this.save.stars < task.cost) {
      this.toast(`Cần ${task.cost} ⭐ để làm "${task.title}" — Vượt thêm màn để nhận Sao!`);
      openLevelBriefingModal(this, this.save.level);
      return;
    }
    this.pendingDesign = {
      task,
      isRestyle,
      styleIndex: this.save.completedTasks[task.id] ?? 0,
    };
    renderStylePickerBar(this);
  }

  claimAreaChest(area) {
    if (this.save.claimedAreaChests.includes(area.id)) return;
    this.save.claimedAreaChests.push(area.id);
    for (const [k, v] of Object.entries(area.chestReward || {})) {
      if (k === 'coins') this.save.coins += v;
      else this.save.boosters[k] = (this.save.boosters[k] || 0) + v;
    }
    sound.sfxVictory();
    const areas = getGameAreas(this.gameId, this.save.masteryTier, this.save.house);
    if (this.save.currentArea < areas.length - 1) {
      this.save.currentArea += 1;
      this.toast(`🎁 Đã nhận Rương Thưởng & Mở khóa "${areas[this.save.currentArea].name}"!`);
    } else {
      const book = this.gameId === 'homescapes' ? 'Bản Đồ Đạo Tặc' : 'Sổ Cổ Vật';
      const place = this.gameId === 'homescapes' ? 'Lâu Đài' : 'Khuôn Viên';
      this.toast(`🎁 Đã hoàn tất ${areas.length}/${areas.length} khu! Mở ${book} để Thăng Cấp Tinh Luyện ${place}!`);
    }
    this.enterWorldView();
  }

  ascendMasteryTier() {
    this.save.masteryTier = (this.save.masteryTier || 0) + 1;
    this.save.completedTasks = {};
    this.save.claimedAreaChests = [];
    this.save.currentArea = 0;
    this.save.coins += 1000;
    haptics.victory();
    sound.sfxVictory();
    this.persistAndSyncHud();
    syncOnlineProfile(this);
    this.enterWorldView(`👑 Chúc mừng thăng cấp Tinh Luyện Bậc ${this.save.masteryTier + 1} (+1,000 💰)!`);
  }

  enterMatch3Level(levelNum) {
    if (this.visitingGarden) {
      this.visitingGarden = null;
      this.visitorWorld = null;
    }
    const lifeStatus = refreshLives(this.save);
    if (!lifeStatus.hasInfinite && lifeStatus.lives <= 0) {
      if (this.screen === 'match3') this.enterWorldView();
      this.toast('Bạn đã hết Tim ❤️! Hãy xin Tim ở Hội Nhà Hogwarts hoặc mở Tiệm Hẻm Xéo!');
      openShopAndWheelModal(this);
      return;
    }

    this.activePlayingLevel = levelNum;
    const chosenPre = [];
    for (const key of this.selectedPreBoosters) {
      if ((this.save.boosters[key] || 0) > 0) {
        this.save.boosters[key] -= 1;
        chosenPre.push(key);
      }
    }
    this.selectedPreBoosters.clear();

    this.screen = 'match3';
    this.shellEl.setAttribute('data-screen', 'match3');
    this.pendingDesign = null;
    this.styleBarEl.classList.add('hidden');
    this.homeRenderer.stop();
    this.gardenRenderer.stop();

    this.worldStageEl.classList.add('hidden');
    this.match3StageEl.classList.remove('hidden');

    const bgPrefix = this.gameId === 'homescapes' ? '/assets/home-room-' : '/assets/garden-zone-';
    const curAreaObj = getGameAreas(this.gameId, this.save.masteryTier, this.save.house)[this.save.currentArea];
    const sceneIdx = curAreaObj?.sceneIndex ?? this.save.currentArea % 4;
    const m3Bg = (curAreaObj?.sceneKey && sprites.url(curAreaObj.sceneKey)) || `${bgPrefix}${sceneIdx}.webp`;
    this.match3StageEl.style.setProperty('--m3-bg-url', `url("${m3Bg}")`);
    document.getElementById('garden-rainbow-meter')?.classList.remove('hidden');

    this.m3Controller.startLevel(
      this.getLevelDef(levelNum),
      chosenPre,
      this.save.winStreak,
      this.save.currentArea,
      Boolean(this.prefs.colorblind)
    );
    this.persistAndSyncHud();
    sound.playBgm(this.gameId === 'homescapes' ? 'homescapes_match3' : 'gardenscapes_match3');
    maybeShowLevelTour(this, levelNum);
  }

  _consumeIngameBooster(key) {
    if ((this.save.boosters[key] || 0) <= 0) return false;
    this.save.boosters[key] -= 1;
    this.persistAndSyncHud();
    return true;
  }

  _handlePinResult({ puzzle, status, reason }) {
    const statusEl = document.getElementById('pin-status');
    if (status === 'win') {
      const firstTime = !this.save.completedPinIds.includes(puzzle.id);
      const reward = firstTime ? puzzle.rewardCoins : 50;
      if (firstTime) this.save.completedPinIds.push(puzzle.id);
      this.save.coins += reward;
      this.persistAndSyncHud();
      statusEl.style.color = '#2b8a3e';
      statusEl.textContent = `🎉 ${reason} (+${reward} 💰)`;
    } else {
      statusEl.style.color = '#d62828';
      statusEl.textContent = `💥 ${reason} — Bấm "Thử Lại" nhé!`;
    }
  }

  persistAndSyncHud() {
    saveGameState(this.gameId, this.save);
    this._renderTopHud();
  }

  _renderTopHud() {
    const life = refreshLives(this.save);
    const activeWorld = this.visitingGarden ? this.visitorWorld || this.gameId : this.gameId;
    const vg = this.visitingGarden;
    const activeMastery = vg
      ? (activeWorld === 'homescapes' ? vg.homeMasteryTier ?? vg.masteryTier : vg.gardenMasteryTier ?? vg.masteryTier) || 0
      : this.save.masteryTier;
    const activeHouse = vg ? vg.house : this.save.house;
    const areas = getGameAreas(activeWorld, activeMastery, activeHouse);
    const areaIdx = this.visitingGarden ? this.visitorAreaIndex : this.save.currentArea;
    const area = areas[areaIdx] || areas[0];
    const diff = this.getLevelDef(this.save.level).difficulty;

    renderGameHudTitle(document.getElementById('hud-game-title'), this.gameId);
    document.getElementById('hud-stars').textContent = String(this.save.stars);
    document.getElementById('hud-coins').textContent = this.save.coins.toLocaleString();
    document.getElementById('hud-lives').textContent = life.hasInfinite ? '♾️' : `${life.lives}/${this.save.maxLives}`;
    document.getElementById('btn-play-level-num').textContent = `MÀN ${this.save.level.toLocaleString()}`;
    const streakTxt = this.save.winStreak > 0 ? ` · 🔥${this.save.winStreak}` : '';
    const modePrefix = this.prefs.nightmare ? '🔥 Ác Mộng' : '🪄 Hardcore';
    document.getElementById('btn-play-level-sub').textContent =
      (diff === 'super_hard' ? '💀 Boss (2⭐)' : diff === 'hard' ? '💜 Màn Khó' : modePrefix) + streakTxt;

    syncWeatherButton(this);
    syncPlayrixWorldBadges(this, area, diff);
  }

  _bindShellControls() {
    document.getElementById('launch-homescapes')?.addEventListener('click', () => {
      sound.sfxClick();
      this.launchGame('homescapes');
    });
    document.getElementById('launch-gardenscapes')?.addEventListener('click', () => {
      sound.sfxClick();
      this.launchGame('gardenscapes');
    });
    document.getElementById('btn-back-hub')?.addEventListener('click', () => {
      sound.sfxClick();
      if (this.screen === 'match3') {
        if (!this.m3Controller.finaleActive) openMatch3PauseModal(this);
      } else if (this.visitingGarden) this.exitVisitorGarden();
      else if (this.forcedGameId) window.location.href = './index.html';
      else this.showLauncher();
    });
    document.getElementById('btn-quick-switch')?.addEventListener('click', () => {
      sound.sfxClick();
      if (this.screen === 'match3') {
        if (!this.m3Controller.finaleActive) openMatch3PauseModal(this);
        return;
      }
      const other = this.gameId === 'homescapes' ? 'gardenscapes' : 'homescapes';
      if (this.forcedGameId) window.location.href = `./${other}.html`;
      else this.launchGame(other);
    });
    document.getElementById('btn-open-shop')?.addEventListener('click', () => {
      sound.sfxClick();
      openShopAndWheelModal(this);
    });
    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
      sound.sfxClick();
      if (this.screen === 'match3') {
        if (!this.m3Controller.finaleActive) openMatch3PauseModal(this);
        return;
      }
      openSettingsModal(this);
    });
    document.getElementById('btn-open-tablet')?.addEventListener('click', () => {
      sound.sfxClick();
      openTabletModal(this);
    });
    document.getElementById('btn-open-pin')?.addEventListener('click', () => {
      sound.sfxClick();
      openPinModal(this);
    });
    document.getElementById('btn-open-online')?.addEventListener('click', () => {
      sound.sfxClick();
      openOnlineHubModal(this, 'team');
    });
    document.getElementById('btn-open-events')?.addEventListener('click', () => {
      sound.sfxClick();
      openEventsModal(this, 'pass');
    });
    document.getElementById('btn-open-briefing')?.addEventListener('click', () => {
      sound.sfxClick();
      openLevelBriefingModal(this, this.save.level);
    });
    bindVisitorControls(this);
    initPlayrix2025Hud(this);
  }

  toast(message) {
    showToastBanner(message);
  }
}
