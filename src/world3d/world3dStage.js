/**
 * Locked Isometric Three.js World Stage (`world3dStage.js`)
 * - 100% locked Playrix 32° Isometric `OrthographicCamera` synchronized to `scene.pt(nx, ny)`
 * - Real PCFSoft directional shadows onto a `ShadowMaterial` ground plane
 * - Weather-reactive 3D PBR lighting (Golden-Hour Day, Indigo Moonlight, Great Hall Snow)
 * - Volumetric 3D Swirling *Reparo* Helix Beam + Preview Halo Ring
 */

import * as THREE from 'three';
import { preloadWorld3DModels } from './glbBank.js';
import { isGraphics3dEnabled, renderWorldSceneTo2D } from './sharedWebgl.js';
import { World3DActorsController } from './world3dActors.js';
import {
  World3DPropsManager,
  buildCastle3DSlotDescriptors,
  buildGarden3DSlotDescriptors,
} from './world3dProps.js';

const ISO_ELEV_RAD = (32 * Math.PI) / 180;
const SIN_ELEV = Math.sin(ISO_ELEV_RAD);
const COS_ELEV = Math.cos(ISO_ELEV_RAD);
const CAM_DIST = 1800;

export class World3DStage {
  constructor(gameId = 'gardenscapes') {
    this.gameId = gameId;
    this.scene = new THREE.Scene();

    this.camera = new THREE.OrthographicCamera(-400, 400, 260, -260, 10, 5000);
    this.camera.position.set(0, CAM_DIST * SIN_ELEV, CAM_DIST * COS_ELEV);
    this.camera.lookAt(0, 0, 0);

    // 1. Hemisphere + Key Directional Light with soft Playrix ground shadows
    this.hemiLight = new THREE.HemisphereLight(0xfff4d6, 0x2d4a36, 1.15);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xffe6b3, 1.95);
    this.keyLight.position.set(-480, 920, 440);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 50;
    this.keyLight.shadow.camera.far = 3200;
    this.keyLight.shadow.bias = -0.0005;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x72efdd, 0.55);
    this.rimLight.position.set(520, 480, -420);
    this.scene.add(this.rimLight);

    // 2. Shadow-receiving ground plane at Y = 0
    const groundGeo = new THREE.PlaneGeometry(6000, 6000);
    groundGeo.rotateX(-Math.PI / 2);
    this.shadowMat = new THREE.ShadowMaterial({ opacity: 0.32 });
    this.groundMesh = new THREE.Mesh(groundGeo, this.shadowMat);
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // 3. Content groups
    this.propsGroup = new THREE.Group();
    this.actorsGroup = new THREE.Group();
    this.vfxGroup = new THREE.Group();
    this.scene.add(this.propsGroup, this.actorsGroup, this.vfxGroup);

    // 4. 3D Preview Halo Ring + 3D Reparo Spell Helix Orbs
    const ringGeo = new THREE.RingGeometry(28, 34, 40);
    ringGeo.rotateX(-Math.PI / 2);
    this.previewRingMat = new THREE.MeshBasicMaterial({
      color: 0xffea9c,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    this.previewRing = new THREE.Mesh(ringGeo, this.previewRingMat);
    this.previewRing.visible = false;
    this.vfxGroup.add(this.previewRing);

    this.reparoOrbs = [];
    const orbGeo = new THREE.OctahedronGeometry(5.5, 0);
    for (let i = 0; i < 14; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xffea9c : 0x72efdd,
        transparent: true,
        opacity: 0.92,
      });
      const orb = new THREE.Mesh(orbGeo, mat);
      orb.visible = false;
      this.vfxGroup.add(orb);
      this.reparoOrbs.push(orb);
    }

    this.propsManager = new World3DPropsManager(this.propsGroup);
    this.actorsController = new World3DActorsController(this.actorsGroup);
    this._weatherSig = '';

    preloadWorld3DModels(gameId);
  }

  _applyWeatherLighting(weather = 'day', isCastle = false) {
    const sig = `${weather}:${isCastle ? 1 : 0}`;
    if (this._weatherSig === sig) return;
    this._weatherSig = sig;

    if (weather === 'night') {
      this.hemiLight.color.setHex(0x9ec5fe);
      this.hemiLight.groundColor.setHex(0x141e38);
      this.hemiLight.intensity = 0.95;
      this.keyLight.color.setHex(0xc7d2fe);
      this.keyLight.intensity = 1.45;
      this.rimLight.color.setHex(0x38bdf8);
      this.rimLight.intensity = 0.85;
      this.shadowMat.opacity = 0.26;
    } else if (weather === 'snow') {
      this.hemiLight.color.setHex(0xe0f2fe);
      this.hemiLight.groundColor.setHex(0x475569);
      this.hemiLight.intensity = 1.25;
      this.keyLight.color.setHex(0xfffbeb);
      this.keyLight.intensity = 1.75;
      this.rimLight.color.setHex(0xbae6fd);
      this.rimLight.intensity = 0.72;
      this.shadowMat.opacity = 0.24;
    } else {
      this.hemiLight.color.setHex(isCastle ? 0xffe8c2 : 0xfff6d6);
      this.hemiLight.groundColor.setHex(isCastle ? 0x432818 : 0x24422c);
      this.hemiLight.intensity = 1.22;
      this.keyLight.color.setHex(isCastle ? 0xffd89b : 0xffeab6);
      this.keyLight.intensity = 1.98;
      this.rimLight.color.setHex(isCastle ? 0xfbbf24 : 0x72efdd);
      this.rimLight.intensity = 0.58;
      this.shadowMat.opacity = 0.33;
    }
  }

  _updateReparoHelix(spellCast, wandWorldPos, screenToWorldXZ, sc, timeSec) {
    if (!spellCast || !wandWorldPos) {
      for (const orb of this.reparoOrbs) orb.visible = false;
      return;
    }
    const p = Math.min(1, spellCast.t / Math.max(0.2, spellCast.duration));
    const fade = Math.sin(p * Math.PI);
    const tgt = screenToWorldXZ(spellCast.tx, spellCast.ty);
    const endVec = new THREE.Vector3(tgt.x, 18 * sc, tgt.z);

    for (let i = 0; i < this.reparoOrbs.length; i++) {
      const orb = this.reparoOrbs[i];
      const u = ((i / this.reparoOrbs.length) + timeSec * 1.9) % 1;
      if (u > Math.min(1, p * 1.35)) {
        orb.visible = false;
        continue;
      }
      orb.visible = true;
      orb.position.lerpVectors(wandWorldPos, endVec, u);
      const arc = Math.sin(u * Math.PI) * 52 * sc;
      const helixR = Math.sin(u * Math.PI) * 14 * sc;
      const ang = u * Math.PI * 6 - timeSec * 14;
      orb.position.y += arc + Math.sin(ang) * helixR;
      orb.position.x += Math.cos(ang) * helixR;
      orb.rotation.set(timeSec * 5 + i, timeSec * 4, 0);
      orb.scale.setScalar((0.7 + Math.sin(u * Math.PI) * 0.8) * sc);
      orb.material.opacity = Math.max(0.1, fade * 0.95);
    }
  }

  /**
   * Executes the locked Isometric Three.js pass and blits directly onto `renderer.ctx`.
   */
  renderPass(renderer, area, scene, sc, timeSec, { austinPt, petPt }) {
    if (!isGraphics3dEnabled()) {
      return { active: false, renderedTaskIds: new Set(), prefectReady: false, petReady: false };
    }

    const w = renderer.viewW || 800;
    const h = renderer.viewH || 520;
    const isCastle = Boolean(renderer.isCastle);

    // Sync locked Orthographic frustum 1:1 with CSS pixels
    this.camera.left = -w * 0.5;
    this.camera.right = w * 0.5;
    this.camera.top = h * 0.5;
    this.camera.bottom = -h * 0.5;
    this.camera.updateProjectionMatrix();

    const shSpan = Math.max(w, h) * 1.15;
    this.keyLight.shadow.camera.left = -shSpan;
    this.keyLight.shadow.camera.right = shSpan;
    this.keyLight.shadow.camera.top = shSpan;
    this.keyLight.shadow.camera.bottom = -shSpan;
    this.keyLight.shadow.camera.updateProjectionMatrix();

    this._applyWeatherLighting(renderer.weather || 'day', isCastle);

    const screenToWorldXZ = (sx, sy) => ({
      x: sx - w * 0.5,
      z: (sy - h * 0.5) / SIN_ELEV,
    });

    const descriptors = isCastle
      ? buildCastle3DSlotDescriptors(renderer, area, scene, sc)
      : buildGarden3DSlotDescriptors(renderer, area, scene, sc);

    const areaKey = `${isCastle ? 'home' : 'garden'}:${area.id}:${renderer.readOnlyVisitor ? 'v' : 'p'}`;
    const renderedTaskIds = this.propsManager.sync(descriptors, areaKey, timeSec, screenToWorldXZ);

    // Highlight active 3-style preview slot with a pulsing 3D golden ground halo!
    const previewDesc = descriptors.find((d) => d.preview);
    if (previewDesc) {
      const pXZ = screenToWorldXZ(previewDesc.x, previewDesc.y + (previewDesc.flatFloor ? 0 : previewDesc.sizePx * 0.2));
      this.previewRing.visible = true;
      this.previewRing.position.set(pXZ.x, 1.2, pXZ.z);
      const pulse = (previewDesc.sizePx / 95) * (1 + Math.sin(timeSec * 5.5) * 0.06);
      this.previewRing.scale.setScalar(pulse);
      this.previewRingMat.opacity = 0.65 + Math.sin(timeSec * 5.5) * 0.25;
    } else {
      this.previewRing.visible = false;
    }

    const { prefectReady, petReady, wandWorldPos } = this.actorsController.sync({
      isGarden: !isCastle,
      house: renderer.house || 'gryffindor',
      austinScreen: austinPt,
      petScreen: petPt,
      petHop: renderer.petHop || 0,
      spellCast: renderer.spellCast || null,
      sc,
      timeSec,
      screenToWorldXZ,
    });

    this._updateReparoHelix(renderer.spellCast, wandWorldPos, screenToWorldXZ, sc, timeSec);

    const ok = renderWorldSceneTo2D(renderer.ctx, this.scene, this.camera, w, h);
    if (!ok) {
      return { active: false, renderedTaskIds: new Set(), prefectReady: false, petReady: false };
    }
    return { active: true, renderedTaskIds, prefectReady, petReady };
  }
}

const STAGE_INSTANCES = new Map();

export function getWorld3DStage(gameId = 'gardenscapes') {
  if (!STAGE_INSTANCES.has(gameId)) {
    STAGE_INSTANCES.set(gameId, new World3DStage(gameId));
  }
  return STAGE_INSTANCES.get(gameId);
}
