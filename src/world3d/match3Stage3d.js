/**
 * Playrix Hybrid 3D Match-3 Stage (`match3Stage3d.js`)
 * 1) Live 3D Companion Stage inside `.austin-m3-card`: `char_prefect.glb` + `pet_niffler.glb`/`pet_hedwig.glb`
 *    cheering atop `m3_pedestal.glb` (reacts to combos, power-ups & `movesLeft <= 5`!)
 * 2) Live 60fps 2x2 Dynamic 3D Piece/Power-Up Atlas (`m3_rainbow`, `m3_bomb`, `m3_snitch` flapping wings, `m3_potion`)
 *    rendered in 1 single WebGL pass per frame via `sharedWebgl.js`.
 */

import * as THREE from 'three';
import { loadSharedIdentity } from '../utils/storage.js';
import {
  applyActorHouse3D,
  cloneGlbInstance,
  hasGlbLoaded,
  preloadMatch33DModels,
} from './glbBank.js';
import {
  isGraphics3dEnabled,
  renderQuadrantsToAtlas,
  renderSceneToCanvas2D,
} from './sharedWebgl.js';

const ATLAS_CELL = 192;
const QUADRANT_COORDS = {
  rainbow: [0, 0],
  bomb: [ATLAS_CELL, 0],
  snitch: [0, ATLAS_CELL],
  potion: [ATLAS_CELL, ATLAS_CELL],
};

class Match3Hybrid3DEngine {
  constructor() {
    this.initialized = false;
    this.atlasCanvas = null;
    this.atlasReady = false;
    this.quadrants = [];
    this.models = {};
    this.snitchWings = { L: null, R: null };

    // Companion 3D stage state
    this.compScene = null;
    this.compCam = null;
    this.compPedestal = null;
    this.compPedTopY = 0.42;
    this.compPrefect = null;
    this.compPrefectParts = {};
    this.compPet = null;
    this.compPetKey = '';
    this.compHouse = '';
    this.cheerUntil = 0;
    this.lastBoardScore = 0;
    this.lastSessionId = -1;
  }

  _initOnce() {
    if (this.initialized || typeof document === 'undefined') return;
    this.initialized = true;
    preloadMatch33DModels();

    this.atlasCanvas = document.createElement('canvas');
    this.atlasCanvas.width = ATLAS_CELL * 2;
    this.atlasCanvas.height = ATLAS_CELL * 2;

    // Build 4 mini studio scenes for the 2x2 dynamic 3D Match-3 Atlas (Playrix candy-gloss rig)
    for (let i = 0; i < 4; i++) {
      const sc = new THREE.Scene();
      const hemi = new THREE.HemisphereLight(0xfffaf0, 0x3b1c38, 1.18);
      const dir = new THREE.DirectionalLight(0xfff1d0, 1.78);
      dir.position.set(-2.0, 3.8, 3.4);
      const fill = new THREE.DirectionalLight(0xffd6a5, 0.58);
      fill.position.set(2.4, -1.2, 2.6);
      const rim = new THREE.DirectionalLight(0x72efdd, 0.75);
      rim.position.set(2.5, 2.2, -2.2);
      sc.add(hemi, dir, fill, rim);

      const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
      cam.position.set(0, 0.62, 2.02);
      cam.lookAt(0, 0.12, 0);
      this.quadrants.push({ scene: sc, camera: cam });
    }

    // Build Open Transparent Playrix 2025 Companion 3D Stage (`m3_pedestal` + `char_prefect` + `pet`)
    this.compScene = new THREE.Scene();
    const cHemi = new THREE.HemisphereLight(0xfff7df, 0x243b2b, 1.55);
    const cKey = new THREE.DirectionalLight(0xffebb8, 2.35);
    cKey.position.set(-2.6, 4.4, 3.6);
    cKey.castShadow = true;
    const cFill = new THREE.DirectionalLight(0xffd8a8, 0.85);
    cFill.position.set(2.2, 1.2, 2.8);
    const cRim = new THREE.DirectionalLight(0x72efdd, 1.05);
    cRim.position.set(2.8, 2.5, -2.4);
    this.compScene.add(cHemi, cKey, cFill, cRim);
    this.compRim = cRim;

    this.compCam = new THREE.PerspectiveCamera(30, 1.05, 0.1, 30);
    this.compCam.position.set(0, 1.44, 4.38);
    this.compCam.lookAt(0, 0.78, 0);
  }

  _populateAtlasModels() {
    const specs = [
      ['rainbow', 'm3_rainbow', 0, 1.06],
      ['bomb', 'm3_bomb', 1, 1.06],
      ['snitch', 'm3_snitch', 2, 1.12],
      ['potion', 'm3_potion', 3, 1.08],
    ];
    let readyCount = 0;
    for (const [slot, glbKey, qIdx, targetSpan] of specs) {
      if (!this.models[slot] && hasGlbLoaded(glbKey)) {
        const inst = cloneGlbInstance(glbKey, {
          castShadow: false,
          receiveShadow: false,
          centerXZ: true,
          centerY: true,
        });
        if (inst) {
          const entry = inst.userData.glbEntry;
          const sc = targetSpan / Math.max(0.25, entry.maxSpan);
          inst.scale.setScalar(sc);
          inst.position.set(0, 0.12, 0);
          if (slot === 'rainbow') {
            const tmpCol = new THREE.Color();
            inst.traverse((n) => {
              if (!n.isMesh || !n.geometry) return;
              const mName = n.material?.name || '';
              if (mName.includes('Gold') || mName.includes('Secondary')) return;
              const geo = n.geometry.index ? n.geometry.toNonIndexed() : n.geometry.clone();
              geo.computeVertexNormals();
              const pos = geo.attributes.position;
              const nrm = geo.attributes.normal;
              const colors = new Float32Array(pos.count * 3);
              for (let f = 0; f < pos.count; f += 3) {
                const cx = (pos.getX(f) + pos.getX(f + 1) + pos.getX(f + 2)) / 3;
                const cy = (pos.getY(f) + pos.getY(f + 1) + pos.getY(f + 2)) / 3;
                const cz = (pos.getZ(f) + pos.getZ(f + 1) + pos.getZ(f + 2)) / 3;
                const nx = nrm.getX(f);
                const ny = nrm.getY(f);
                const nz = nrm.getZ(f);
                const theta = Math.atan2(cz, cx);
                const phi = Math.atan2(cy, Math.hypot(cx, cz));
                const hue = (((theta / (Math.PI * 2)) + 0.5 + phi * 0.45) % 1 + 1) % 1;
                const ndotl = Math.max(-0.45, nx * -0.44 + ny * 0.72 + nz * 0.54);
                const glint = ndotl > 0.87 ? 0.16 : 0;
                const sat = ndotl > 0.91 ? 0.88 : 0.98;
                const lit = Math.min(0.78, 0.38 + (ndotl + 0.45) * 0.22 + glint);
                tmpCol.setHSL(hue, sat, lit);
                for (let k = 0; k < 3; k++) {
                  const base = (f + k) * 3;
                  colors[base] = tmpCol.r;
                  colors[base + 1] = tmpCol.g;
                  colors[base + 2] = tmpCol.b;
                }
              }
              geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
              n.geometry = geo;
              n.material = new THREE.MeshBasicMaterial({ vertexColors: true });
            });
          } else if (slot === 'potion') {
            inst.traverse((n) => {
              if (!n.isMesh || !n.material) return;
              const m = n.material;
              if (m.transparent) {
                m.opacity = 0.34;
                m.roughness = 0.08;
              } else if ((n.name || '').toLowerCase().includes('liquid') || (m.color && m.color.r > m.color.g * 1.4)) {
                m.color.setHex(0xd90429);
                if (m.emissive) {
                  m.emissive.setHex(0x6a040f);
                  m.emissiveIntensity = 0.35;
                }
              }
            });
          } else if (slot === 'snitch') {
            inst.traverse((n) => {
              if (n.name === 'WingL') this.snitchWings.L = n;
              if (n.name === 'WingR') this.snitchWings.R = n;
            });
          }
          this.quadrants[qIdx].scene.add(inst);
          this.models[slot] = inst;
        }
      }
      if (this.models[slot]) readyCount += 1;
    }
    return readyCount === 4;
  }

  _ensureCompanionModels(gameId, house) {
    if (!this.compPedestal && hasGlbLoaded('m3_pedestal')) {
      const ped = cloneGlbInstance('m3_pedestal', { castShadow: false, receiveShadow: true, centerXZ: true });
      if (ped) {
        ped.scale.set(0.88, 0.82, 0.88);
        ped.position.set(0, -0.18, 0);
        ped.rotation.y = 0.36;
        this.compPedTopY = -0.18 + ped.userData.glbEntry.sizeY * ped.scale.y - 0.025;
        this.compScene.add(ped);
        this.compPedestal = ped;
      }
    }

    if (!this.compPrefect && hasGlbLoaded('char_prefect')) {
      const pref = cloneGlbInstance('char_prefect', { castShadow: true, receiveShadow: true, centerXZ: true });
      if (pref) {
        const parts = {};
        pref.traverse((n) => {
          if (['Head', 'ArmR_Wand', 'ArmL'].includes(n.name)) {
            parts[n.name] = n;
            n.userData.restRot = n.rotation.clone();
          }
        });
        this.compPrefectParts = parts;
        pref.scale.setScalar(1.02);
        pref.position.set(-0.22, this.compPedTopY, 0.05);
        this.compScene.add(pref);
        this.compPrefect = pref;
      }
    }

    const wantPet = gameId === 'homescapes' ? 'pet_hedwig' : 'pet_niffler';
    if (this.compPet && this.compPetKey !== wantPet) {
      this.compScene.remove(this.compPet);
      this.compPet = null;
      this.compPetKey = '';
      this.compHouse = '';
    }
    if (!this.compPet && hasGlbLoaded(wantPet)) {
      const pet = cloneGlbInstance(wantPet, { castShadow: true, receiveShadow: true, centerXZ: true });
      if (pet) {
        pet.scale.setScalar(wantPet === 'pet_niffler' ? 0.82 : 0.76);
        pet.position.set(0.34, this.compPedTopY, 0.14);
        this.compScene.add(pet);
        this.compPet = pet;
        this.compPetKey = wantPet;
      }
    }

    if (this.compHouse !== house && this.compPrefect) {
      applyActorHouse3D(this.compPrefect, house);
      if (this.compPet && this.compPetKey === 'pet_hedwig') applyActorHouse3D(this.compPet, house);
      this.compHouse = house;
    }

    return Boolean(this.compPedestal && this.compPrefect);
  }

  _ensureCompanionDom(enabled) {
    const card = document.querySelector('.austin-m3-card');
    if (!card) return null;
    const avatarImg = card.querySelector('img');
    let box = card.querySelector('.m3-companion-3d-box');

    if (!enabled) {
      if (box) box.classList.add('hidden');
      if (avatarImg) avatarImg.classList.remove('hidden');
      card.classList.remove('has-3d-companion');
      return null;
    }

    if (!box) {
      box = document.createElement('div');
      box.className = 'm3-companion-3d-box';
      const cv = document.createElement('canvas');
      cv.className = 'm3-companion-3d-canvas';
      cv.setAttribute('aria-hidden', 'true');
      box.appendChild(cv);
      card.prepend(box);
    }
    box.classList.remove('hidden');
    if (avatarImg) avatarImg.classList.add('hidden');
    card.classList.add('has-3d-companion');
    return box.querySelector('canvas');
  }

  updateFrame(controller, timeSec) {
    const enabled = isGraphics3dEnabled();
    const compCanvas = this._ensureCompanionDom(enabled);
    if (!enabled || !controller?.board) {
      this.atlasReady = false;
      return;
    }

    this._initOnce();
    const board = controller.board;

    // Detect score surge / cascade / finale for 3D Companion cheering!
    if (controller.sessionId !== this.lastSessionId) {
      this.lastSessionId = controller.sessionId;
      this.lastBoardScore = board.score || 0;
      this.cheerUntil = timeSec + 0.9;
    } else if ((board.score || 0) - this.lastBoardScore >= 160 || controller.finaleActive) {
      this.cheerUntil = Math.max(this.cheerUntil, timeSec + 1.15);
      this.lastBoardScore = board.score || 0;
    } else {
      this.lastBoardScore = board.score || 0;
    }

    // 1. Animate & render 2x2 Match-3 3D Piece/Power-Up Atlas
    const allAtlasLoaded = this._populateAtlasModels();
    if (allAtlasLoaded) {
      if (this.models.rainbow) {
        this.models.rainbow.rotation.set(timeSec * 1.35, timeSec * 2.1, Math.sin(timeSec * 2) * 0.25);
      }
      if (this.models.bomb) {
        this.models.bomb.rotation.set(Math.sin(timeSec * 4.5) * 0.14, 0.45 + Math.cos(timeSec * 2.2) * 0.28, Math.sin(timeSec * 6) * 0.1);
      }
      if (this.models.snitch) {
        this.models.snitch.rotation.set(Math.sin(timeSec * 3.5) * 0.1, Math.sin(timeSec * 2.1) * 0.35, 0);
        const flap = Math.sin(timeSec * 26) * 0.55;
        if (this.snitchWings.L) this.snitchWings.L.rotation.z = flap;
        if (this.snitchWings.R) this.snitchWings.R.rotation.z = -flap;
      }
      if (this.models.potion) {
        this.models.potion.rotation.set(Math.sin(timeSec * 2.8) * 0.12, Math.sin(timeSec * 1.9) * 0.35, Math.cos(timeSec * 3.1) * 0.14);
      }
      this.atlasReady = renderQuadrantsToAtlas(this.atlasCanvas, this.quadrants, ATLAS_CELL);
    } else {
      this.atlasReady = false;
    }

    // 2. Animate & render Live 3D Companion on Mossy Rune Pedestal
    if (compCanvas) {
      const house = loadSharedIdentity().house || 'gryffindor';
      if (this._ensureCompanionModels(board.gameId, house)) {
        const isCheering = timeSec < this.cheerUntil;
        const isLowMoves = board.movesLeft <= 5 && !controller.finaleActive;

        const jumpY = isCheering ? Math.abs(Math.sin(timeSec * 11)) * 0.18 : 0;
        this.compPrefect.position.y = this.compPedTopY + jumpY;
        this.compPrefect.rotation.y = 0.24 + (isCheering ? Math.sin(timeSec * 9) * 0.25 : Math.sin(timeSec * 1.6) * 0.14);

        const { Head: head, ArmR_Wand: armR, ArmL: armL } = this.compPrefectParts;
        if (head?.userData.restRot) {
          head.rotation.copy(head.userData.restRot);
          head.rotation.y += isLowMoves ? Math.sin(timeSec * 8) * 0.18 : Math.sin(timeSec * 2.1) * 0.2;
          head.rotation.x += isCheering ? -0.16 : isLowMoves ? 0.12 : 0;
        }
        if (armR?.userData.restRot) {
          armR.rotation.copy(armR.userData.restRot);
          armR.rotation.x -= isCheering ? 1.15 + Math.sin(timeSec * 16) * 0.25 : isLowMoves ? 0.55 : 0.18 + Math.sin(timeSec * 3) * 0.08;
        }
        if (armL?.userData.restRot) {
          armL.rotation.copy(armL.userData.restRot);
          armL.rotation.x -= isCheering ? 0.85 : 0;
        }

        if (this.compPet) {
          const petHop = isCheering ? Math.abs(Math.cos(timeSec * 12)) * 0.24 : Math.abs(Math.sin(timeSec * 3.8)) * 0.05;
          this.compPet.position.y = this.compPedTopY + petHop;
          this.compPet.rotation.y = -0.32 + (isCheering ? timeSec * 5.2 : Math.sin(timeSec * 2.2) * 0.18);
        }

        this.compRim.color.setHex(isLowMoves ? 0xff4d6d : isCheering ? 0xffd166 : 0x72efdd);
        const rect = compCanvas.getBoundingClientRect();
        const cw = Math.max(120, Math.floor(rect.width || 220));
        const ch = Math.max(120, Math.floor(rect.height || 210));
        this.compCam.aspect = cw / ch;
        this.compCam.updateProjectionMatrix();
        renderSceneToCanvas2D(compCanvas, this.compScene, this.compCam, cw, ch);
      }
    }
  }

  drawFromAtlas(ctx, kind, size) {
    if (!this.atlasReady || !this.atlasCanvas) return false;
    const coords = QUADRANT_COORDS[kind];
    if (!coords) return false;
    const d = size * 1.02;
    ctx.save();
    // Playrix tactile dark-amber sticker drop-contour so 3D pieces match 2D gem weight & contrast
    ctx.shadowColor = 'rgba(26, 12, 4, 0.65)';
    ctx.shadowBlur = Math.max(2.5, size * 0.06);
    ctx.shadowOffsetY = Math.max(1.5, size * 0.035);
    ctx.drawImage(this.atlasCanvas, coords[0], coords[1], ATLAS_CELL, ATLAS_CELL, -d * 0.5, -d * 0.5, d, d);
    ctx.restore();
    return true;
  }
}

const engine = new Match3Hybrid3DEngine();

export function syncMatch3Stage3D(controller, timeSec) {
  engine.updateFrame(controller, timeSec);
}

export function tryDrawMatch3Model3D(ctx, kind, size) {
  return engine.drawFromAtlas(ctx, kind, size);
}
