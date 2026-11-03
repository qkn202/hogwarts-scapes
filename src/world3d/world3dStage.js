/**
 * 100% Full 3D Perspective World Stage (`world3dStage.js`)
 * - Playrix 2025/2026 `PerspectiveCamera(26°)` with true 3D depth parallax on pan, zoom & `🎥` orbit
 * - Full 3D Outdoor Hogwarts Estates & Cutaway Castle Rooms (`World3DEnvironmentComposer`)
 * - Real PCFSoft directional shadows onto 3D terrain, cobblestone plazas, ponds & cutaway floors
 * - Exact `projectWorld` / `raycastGround` synchronization for 2D pins, speech bubbles & Reparo spells!
 */

import * as THREE from 'three';
import { preloadWorld3DModels } from './glbBank.js';
import { isGraphics3dEnabled, renderWorldSceneTo2D } from './sharedWebgl.js';
import { World3DActorsController } from './world3dActors.js';
import { World3DEnvironmentComposer } from './world3dEnvironment.js';
import {
  World3DPropsManager,
  buildCastle3DSlotDescriptors,
  buildGarden3DSlotDescriptors,
} from './world3dProps.js';

const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const CASTLE_CENTER_Z = 78;

export const CAMERA_3D_ANGLES = [
  { id: 'classic', label: '🎥 Góc Chuẩn 3D (32°)', yaw: 0, elev: 32 },
  { id: 'tilt_right', label: '🎥 Nghiêng Phải 3D (+18°)', yaw: 0.31, elev: 26 },
  { id: 'tilt_left', label: '🎥 Nghiêng Trái 3D (-18°)', yaw: -0.31, elev: 26 },
  { id: 'high_overview', label: '🎥 Toàn Cảnh Trên Cao (42°)', yaw: 0, elev: 42 },
];

export function resolveWorld3DAnchor(isCastle, nx, ny, wy = 0, slot = null) {
  if (!isCastle) {
    return {
      x: (nx - 0.5) * 1560,
      y: wy,
      z: (ny - 0.58) * 1480,
    };
  }
  if (slot === 'curtain_ceiling') {
    return { x: 0, y: 222, z: 68 };
  }
  if (slot === 'banner') {
    return { x: -292, y: 148, z: -128 };
  }
  let wx = (nx - 0.5) * 1340;
  let wz = (ny - 0.60) * 1420 + CASTLE_CENTER_Z;
  wz = Math.max(CASTLE_CENTER_Z - 290, Math.min(CASTLE_CENTER_Z + 375, wz));
  const diamond = Math.abs(wx) / 515 + Math.abs(wz - CASTLE_CENTER_Z) / 380;
  if (diamond > 1) {
    wx /= diamond;
    wz = CASTLE_CENTER_Z + (wz - CASTLE_CENTER_Z) / diamond;
  }
  return { x: wx, y: wy, z: wz };
}

export class World3DStage {
  constructor(gameId = 'gardenscapes') {
    this.gameId = gameId;
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(26, 16 / 9, 35, 11500);
    this.angleIdx = 0;
    this.curYaw = CAMERA_3D_ANGLES[0].yaw;
    this.curElev = CAMERA_3D_ANGLES[0].elev;

    this._projVec = new THREE.Vector3();
    this._ndc = new THREE.Vector2();
    this._raycaster = new THREE.Raycaster();
    this._hitVec = new THREE.Vector3();

    // 1. Hemisphere + Key Sun/Moon Directional Light with PCFSoft 3D Shadows
    this.hemiLight = new THREE.HemisphereLight(0xfff4d6, 0x2d4a36, 1.18);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xffe6b3, 2.02);
    this.keyLight.position.set(-540, 1080, 520);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 80;
    this.keyLight.shadow.camera.far = 3600;
    this.keyLight.shadow.bias = -0.0005;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.rimLight = new THREE.DirectionalLight(0x72efdd, 0.58);
    this.rimLight.position.set(560, 520, -480);
    this.scene.add(this.rimLight);

    // 2. Full 3D Scene Graph Layers
    this.envGroup = new THREE.Group();
    this.propsGroup = new THREE.Group();
    this.actorsGroup = new THREE.Group();
    this.vfxGroup = new THREE.Group();
    this.scene.add(this.envGroup, this.propsGroup, this.actorsGroup, this.vfxGroup);

    this.envComposer = new World3DEnvironmentComposer(this.envGroup, this.scene);

    // 3. 3D Preview Halo Ring + 3D Reparo Spell Helix Orbs
    const ringGeo = new THREE.RingGeometry(30, 37, 40);
    ringGeo.rotateX(-Math.PI / 2);
    this.previewRingMat = new THREE.MeshBasicMaterial({
      color: 0xffea9c,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    });
    this.previewRing = new THREE.Mesh(ringGeo, this.previewRingMat);
    this.previewRing.visible = false;
    this.vfxGroup.add(this.previewRing);

    this.reparoOrbs = [];
    const orbGeo = new THREE.OctahedronGeometry(6.2, 0);
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

  cycleCameraAngle() {
    this.angleIdx = (this.angleIdx + 1) % CAMERA_3D_ANGLES.length;
    return CAMERA_3D_ANGLES[this.angleIdx];
  }

  _applyWeatherLighting(weather = 'day', isCastle = false) {
    const sig = `${weather}:${isCastle ? 1 : 0}`;
    if (this._weatherSig === sig) return;
    this._weatherSig = sig;

    if (weather === 'night') {
      this.hemiLight.color.setHex(0x9ec5fe);
      this.hemiLight.groundColor.setHex(0x141e38);
      this.hemiLight.intensity = 1.02;
      this.keyLight.color.setHex(0xc7d2fe);
      this.keyLight.intensity = 1.52;
      this.rimLight.color.setHex(0x38bdf8);
      this.rimLight.intensity = 0.88;
    } else if (weather === 'snow') {
      this.hemiLight.color.setHex(0xe0f2fe);
      this.hemiLight.groundColor.setHex(0x475569);
      this.hemiLight.intensity = 1.28;
      this.keyLight.color.setHex(0xfffbeb);
      this.keyLight.intensity = 1.82;
      this.rimLight.color.setHex(0xbae6fd);
      this.rimLight.intensity = 0.74;
    } else {
      this.hemiLight.color.setHex(isCastle ? 0xffe8c2 : 0xfff6d6);
      this.hemiLight.groundColor.setHex(isCastle ? 0x432818 : 0x2d5432);
      this.hemiLight.intensity = 1.26;
      this.keyLight.color.setHex(isCastle ? 0xffd89b : 0xffeab6);
      this.keyLight.intensity = 2.04;
      this.rimLight.color.setHex(isCastle ? 0xfbbf24 : 0x72efdd);
      this.rimLight.intensity = 0.62;
    }
  }

  /**
   * Synchronizes `PerspectiveCamera` with `renderer.camera` pan/zoom/orbit and returns a Full-3D `scene`
   * descriptor whose `pt(nx, ny)` projects true 3D coordinates onto CSS pixels (`null` if 2.5D fallback).
   */
  prepareSceneFrame(renderer, w, h, isCastle = false) {
    if (!isGraphics3dEnabled()) return null;

    const cam = renderer.camera;
    const minZ = cam?.minZoom || 0.76;
    const maxZ = cam?.maxZoom || 2.15;
    const zoom = cam ? Math.max(minZ, Math.min(maxZ, cam.zoom || 1)) : 1;

    const fitScale = Math.max(w / 1280, h / 720) * Math.max(1.005, 1.32 * zoom);
    const dw = 1280 * fitScale;
    const dh = 720 * fitScale;
    const maxPanX = Math.max(0, (dw - w) * 0.5);
    const maxPanY = Math.max(0, (dh - h) * 0.5);
    if (cam) cam.syncBounds(maxPanX, maxPanY, dw, dh, w, h);

    const dx = (w - dw) * 0.5 + (cam ? cam.panX : 0);
    const dy = (h - dh) * 0.5 + (cam ? cam.panY : 0);
    const unitScale = Math.min(dw / 1280, dh / 720);

    const preset = CAMERA_3D_ANGLES[this.angleIdx] || CAMERA_3D_ANGLES[0];
    this.curYaw += (preset.yaw - this.curYaw) * 0.16;
    this.curElev += (preset.elev - this.curElev) * 0.16;

    const elevRad = (this.curElev * Math.PI) / 180;
    const sinE = Math.sin(elevRad);
    const cosE = Math.cos(elevRad);
    const sinY = Math.sin(this.curYaw);
    const cosY = Math.cos(this.curYaw);

    const pxPerUnit = dw / 1690;
    const halfFovTan = Math.tan((26 * 0.5 * Math.PI) / 180);
    const dist = h / (2 * halfFovTan * Math.max(0.15, pxPerUnit));

    const panRight = -(cam ? cam.panX : 0) / Math.max(0.15, pxPerUnit);
    const panDepth = -(cam ? cam.panY : 0) / Math.max(0.15, pxPerUnit * Math.max(0.38, sinE));

    const baseTargetY = isCastle ? 88 : 32;
    const baseTargetZ = isCastle ? 74 : -18;
    const targetX = panRight * cosY + panDepth * sinY;
    const targetZ = baseTargetZ - panRight * sinY + panDepth * cosY;

    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.camera.position.set(
      targetX + dist * cosE * sinY,
      baseTargetY + dist * sinE,
      targetZ + dist * cosE * cosY
    );
    this.camera.lookAt(targetX, baseTargetY, targetZ);
    this.camera.updateMatrixWorld(true);

    // Keep shadow frustum tightly centered on the visible estate/room
    this.keyLight.position.set(targetX - 540, 1080, targetZ + 520);
    this.keyLight.target.position.set(targetX, 0, targetZ);
    this.keyLight.target.updateMatrixWorld();
    const shSpan = isCastle ? 860 : 1080;
    this.keyLight.shadow.camera.left = -shSpan;
    this.keyLight.shadow.camera.right = shSpan;
    this.keyLight.shadow.camera.top = shSpan;
    this.keyLight.shadow.camera.bottom = -shSpan;
    this.keyLight.shadow.camera.updateProjectionMatrix();

    const projectWorld = (wx, wy = 0, wz = 0) => {
      const v = this._projVec.set(wx, wy, wz).project(this.camera);
      return {
        x: (v.x * 0.5 + 0.5) * w,
        y: (-v.y * 0.5 + 0.5) * h,
      };
    };

    const normToWorld = (nx, ny, wy = 0, slot = null) =>
      resolveWorld3DAnchor(isCastle, nx, ny, wy, slot);

    const screenToWorldXZ = (sx, sy) => {
      this._ndc.set((sx / Math.max(1, w)) * 2 - 1, -(sy / Math.max(1, h)) * 2 + 1);
      this._raycaster.setFromCamera(this._ndc, this.camera);
      const hit = this._raycaster.ray.intersectPlane(GROUND_PLANE, this._hitVec);
      return hit ? { x: hit.x, z: hit.z } : { x: 0, z: 0 };
    };

    return {
      loaded: true,
      isFull3D: true,
      scale: unitScale,
      dx,
      dy,
      dw,
      dh,
      maxPanX,
      maxPanY,
      normToWorld,
      projectWorld,
      screenToWorldXZ,
      pt: (nx, ny, wy = 0, slot = null) => {
        const p = normToWorld(nx, ny, wy, slot);
        return projectWorld(p.x, p.y, p.z);
      },
    };
  }

  _updateReparoHelix(spellCast, wandWorldPos, screenToWorldXZ, timeSec) {
    if (!spellCast || !wandWorldPos) {
      for (const orb of this.reparoOrbs) orb.visible = false;
      return;
    }
    const p = Math.min(1, spellCast.t / Math.max(0.2, spellCast.duration));
    const fade = Math.sin(p * Math.PI);
    const tgt = spellCast.worldTarget || screenToWorldXZ(spellCast.tx, spellCast.ty);
    const endVec = new THREE.Vector3(tgt.x, (tgt.y || 0) + 22, tgt.z);

    for (let i = 0; i < this.reparoOrbs.length; i++) {
      const orb = this.reparoOrbs[i];
      const u = ((i / this.reparoOrbs.length) + timeSec * 1.9) % 1;
      if (u > Math.min(1, p * 1.35)) {
        orb.visible = false;
        continue;
      }
      orb.visible = true;
      orb.position.lerpVectors(wandWorldPos, endVec, u);
      const arc = Math.sin(u * Math.PI) * 58;
      const helixR = Math.sin(u * Math.PI) * 15;
      const ang = u * Math.PI * 6 - timeSec * 14;
      orb.position.y += arc + Math.sin(ang) * helixR;
      orb.position.x += Math.cos(ang) * helixR;
      orb.rotation.set(timeSec * 5 + i, timeSec * 4, 0);
      orb.scale.setScalar(0.75 + Math.sin(u * Math.PI) * 0.85);
      orb.material.opacity = Math.max(0.1, fade * 0.95);
    }
  }

  /**
   * Renders the complete 100% 3D world environment + props + animated actors onto `renderer.ctx`.
   */
  renderPass(renderer, area, scene, timeSec, { envIdx = 0, austinWorld, petWorld, medallionSpec = null }) {
    if (!isGraphics3dEnabled() || !scene?.isFull3D) {
      return { active: false, renderedTaskIds: new Set(), prefectReady: false, petReady: false };
    }

    const w = renderer.viewW || 800;
    const h = renderer.viewH || 520;
    const isCastle = Boolean(renderer.isCastle);

    this._applyWeatherLighting(renderer.weather || 'day', isCastle);

    this.envComposer.sync({
      isCastle,
      envIdx,
      areaId: area.id,
      house: renderer.house || 'gryffindor',
      weather: renderer.weather || 'day',
      medallionSpec,
      cameraPos: this.camera.position,
      timeSec,
    });

    const descriptors = isCastle
      ? buildCastle3DSlotDescriptors(renderer, area, scene)
      : buildGarden3DSlotDescriptors(renderer, area, scene);

    const areaKey = `${isCastle ? 'home' : 'garden'}:${area.id}:${renderer.readOnlyVisitor ? 'v' : 'p'}`;
    const renderedTaskIds = this.propsManager.sync(descriptors, areaKey, timeSec);

    const previewDesc = descriptors.find((d) => d.preview);
    if (previewDesc) {
      this.previewRing.visible = true;
      this.previewRing.position.set(previewDesc.wx, Math.max(1.6, previewDesc.wy + 1.5), previewDesc.wz);
      const pulse = (previewDesc.worldSize / 92) * (1 + Math.sin(timeSec * 5.5) * 0.06);
      this.previewRing.scale.setScalar(pulse);
      this.previewRingMat.opacity = 0.68 + Math.sin(timeSec * 5.5) * 0.24;
    } else {
      this.previewRing.visible = false;
    }

    const { prefectReady, petReady, wandWorldPos } = this.actorsController.sync({
      isGarden: !isCastle,
      house: renderer.house || 'gryffindor',
      austinWorld,
      petWorld,
      petHop: renderer.petHop || 0,
      spellCast: renderer.spellCast || null,
      timeSec,
      screenToWorldXZ: scene.screenToWorldXZ,
    });

    this._updateReparoHelix(renderer.spellCast, wandWorldPos, scene.screenToWorldXZ, timeSec);

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

export function cycleWorld3DCameraAngle(gameId = 'gardenscapes') {
  return getWorld3DStage(gameId).cycleCameraAngle();
}
