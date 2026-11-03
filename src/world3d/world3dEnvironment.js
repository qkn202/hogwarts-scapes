/**
 * 100% Full 3D World Environment Composer (`world3dEnvironment.js`)
 * Builds & animates full 3D outdoor Hogwarts estates and cutaway Castle rooms:
 * - Sky dome + atmospheric weather + 3D snowfall / starry night / fireflies
 * - Sculpted 3D rolling hills, grass lawn, cobblestone walkways & GLSL water ponds
 * - Lazy-loaded Blender 5.2 Hero Landmarks, Cutaway Castle Shells & Wind-Swaying Foliage
 * - Real-time spinning WaterWheel, Clock Hands, Whomping Willow, Orrery Rings & Chimney Smoke!
 */

import * as THREE from 'three';
import {
  applyCastleShellHouseTheme,
  cloneGlbInstance,
  createContactShadowDisc,
  ensureGlbModel,
  hasGlbLoaded,
} from './glbBank.js';
import { CASTLE_3D_ENV_CONFIGS, OUTDOOR_3D_ENV_CONFIGS } from './world3dEnvConfigs.js';
import {
  buildOutdoorTerrainGroup,
  createAnimatedWaterMesh,
  createGroundMedallionMesh,
  createQuidditchStadiumBackdrop,
  createSkyDome,
  createVegetablePatchGroup,
  createWindowSunbeamMesh,
  updateGroundMedallionCanvas,
} from './world3dTerrainWater.js';

const SKY_PALETTES = {
  day: { top: '#4a8fe7', mid: '#f59f5b', bot: '#fde6a6', sun: '#fff4c2', fog: '#f6d69c' },
  night: { top: '#091026', mid: '#1a2a5e', bot: '#2b4178', sun: '#dbeafe', fog: '#142146' },
  snow: { top: '#74a8dc', mid: '#cbe4f9', bot: '#f1f7fe', sun: '#ffffff', fog: '#dbeafe' },
  castle_gryffindor: { top: '#2b161c', mid: '#562932', bot: '#1e1014', sun: '#ffd166', fog: '#241217' },
  castle_slytherin: { top: '#0c2924', mid: '#184e42', bot: '#091f1b', sun: '#52b788', fog: '#0d2924' },
  castle_ravenclaw: { top: '#122248', mid: '#233f7a', bot: '#0e1936', sun: '#60a5fa', fog: '#14244c' },
  castle_hufflepuff: { top: '#332514', mid: '#5c4322', bot: '#21180d', sun: '#fde047', fog: '#2b1f11' },
};

export class World3DEnvironmentComposer {
  constructor(parentGroup, scene) {
    this.root = new THREE.Group();
    this.root.name = 'Full3DEnvironmentRoot';
    parentGroup.add(this.root);
    this.scene = scene;

    this.skyDome = createSkyDome();
    this.skyDome.renderOrder = -100;
    this.skyDome.frustumCulled = false;
    this.root.add(this.skyDome);

    this.envContent = new THREE.Group();
    this.glbLayer = new THREE.Group();
    this.smokeGroup = new THREE.Group();
    this.weatherGroup = new THREE.Group();
    this.root.add(this.envContent, this.glbLayer, this.smokeGroup, this.weatherGroup);

    this.medallionMesh = createGroundMedallionMesh();
    this.root.add(this.medallionMesh);

    // 48 reusable 3D weather particles (snowflakes / starry motes / fireflies)
    this.weatherOrbs = [];
    const wGeo = new THREE.SphereGeometry(4.2, 6, 6);
    for (let i = 0; i < 48; i++) {
      const wMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
      const m = new THREE.Mesh(wGeo, wMat);
      this.weatherGroup.add(m);
      this.weatherOrbs.push(m);
    }

    // 24 reusable 3D chimney/train smoke puffs
    this.smokePuffs = [];
    const sGeo = new THREE.DodecahedronGeometry(14, 1);
    const sMat = new THREE.MeshStandardMaterial({
      color: 0xf4f5f7,
      roughness: 0.92,
      transparent: true,
      opacity: 0.68,
    });
    for (let i = 0; i < 24; i++) {
      const p = new THREE.Mesh(sGeo, sMat.clone());
      p.visible = false;
      this.smokeGroup.add(p);
      this.smokePuffs.push(p);
    }

    this.activeSig = '';
    this.pendingGlbSig = '';
    this.waterMats = [];
    this.swayNodes = [];
    this.animRefs = {};
    this.smokeAnchors = [];
    this.sunbeamMesh = null;
    this.castleShell = null;
    this.castleShellMeta = null;
  }

  _clearGroup(grp) {
    while (grp.children.length > 0) {
      grp.remove(grp.children[0]);
    }
  }

  _updateSkyAndFog(isCastle, house, weather) {
    const palKey = isCastle
      ? (`castle_${house}` in SKY_PALETTES ? `castle_${house}` : 'castle_gryffindor')
      : (SKY_PALETTES[weather] ? weather : 'day');
    const pal = SKY_PALETTES[palKey];
    const u = this.skyDome.material.uniforms;
    u.uTopCol.value.set(pal.top);
    u.uMidCol.value.set(pal.mid);
    u.uBotCol.value.set(pal.bot);
    u.uSunCol.value.set(pal.sun);

    if (!isCastle) {
      if (!this.scene.fog) this.scene.fog = new THREE.FogExp2(pal.fog, 0.00022);
      else {
        this.scene.fog.color.set(pal.fog);
        this.scene.fog.density = weather === 'snow' ? 0.00026 : 0.00019;
      }
    } else {
      this.scene.fog = null;
    }
  }

  _rebuildStaticEnvironment(isCastle, idx, areaId, snow) {
    this._clearGroup(this.envContent);
    this._clearGroup(this.glbLayer);
    this.waterMats = [];
    this.swayNodes = [];
    this.animRefs = {};
    this.smokeAnchors = [];
    this.sunbeamMesh = null;
    this.castleShell = null;
    this.castleShellMeta = null;
    this.pendingGlbSig = '';

    if (isCastle) {
      const cfg = CASTLE_3D_ENV_CONFIGS[idx % CASTLE_3D_ENV_CONFIGS.length];
      ensureGlbModel(cfg.shellKey);
      if (cfg.sunbeam) {
        this.sunbeamMesh = createWindowSunbeamMesh('#ffea9c', 0.16);
        this.envContent.add(this.sunbeamMesh);
      }
      return;
    }

    const cfg = OUTDOOR_3D_ENV_CONFIGS[idx % OUTDOOR_3D_ENV_CONFIGS.length];
    const terrain = buildOutdoorTerrainGroup({
      snow: snow || idx === 5,
      hillColor: cfg.hillColor,
      farHillColor: cfg.farHillColor,
      paths: cfg.paths,
    });
    this.envContent.add(terrain);

    if (cfg.water) {
      const wGrp = createAnimatedWaterMesh(cfg.water.rx, cfg.water.rz, cfg.water.deep, cfg.water.shallow);
      wGrp.position.set(cfg.water.x, 0.4, cfg.water.z);
      this.envContent.add(wGrp);
      if (wGrp.userData.waterMat) this.waterMats.push(wGrp.userData.waterMat);
    }
    if (cfg.millStream) {
      const mGrp = createAnimatedWaterMesh(cfg.millStream.rx, cfg.millStream.rz, cfg.millStream.deep, cfg.millStream.shallow);
      mGrp.position.set(cfg.millStream.x, 0.4, cfg.millStream.z);
      this.envContent.add(mGrp);
      if (mGrp.userData.waterMat) this.waterMats.push(mGrp.userData.waterMat);
    }

    for (const [vx, vz, vrot] of cfg.vegPatches) {
      this.envContent.add(createVegetablePatchGroup(vx, vz, vrot));
    }

    if (areaId === 'gq_4') {
      this.envContent.add(createQuidditchStadiumBackdrop());
    }

    this.smokeAnchors = cfg.smokePoints || [];

    // Trigger async load of Hero Landmark + Nature Kit
    ensureGlbModel(cfg.hero.key);
    for (const [tKey] of cfg.trees) ensureGlbModel(tKey);
    if (cfg.bushes.length) ensureGlbModel('kit_garden_foliage');
    if (cfg.fences.length) ensureGlbModel('kit_fence_gate');
  }

  _tryPopulateGlbModels(isCastle, idx, house, weather) {
    if (isCastle) {
      const cfg = CASTLE_3D_ENV_CONFIGS[idx % CASTLE_3D_ENV_CONFIGS.length];
      if (!this.castleShell && hasGlbLoaded(cfg.shellKey)) {
        const shell = cloneGlbInstance(cfg.shellKey, {
          castShadow: true,
          receiveShadow: true,
          preserveOrigin: true,
        });
        if (shell) {
          shell.scale.set(cfg.scale[0], cfg.scale[1], cfg.scale[2]);
          shell.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
          shell.traverse((n) => {
            if (n.name === 'OrreryRings') this.animRefs.orrery = n;
          });
          this.glbLayer.add(shell);
          this.castleShell = shell;
          this.castleShellMeta = { isCommonRoom: cfg.isCommonRoom, themeSig: '' };
        }
      }
      if (this.castleShell && this.castleShellMeta) {
        const tSig = `${house}:${weather}`;
        if (this.castleShellMeta.themeSig !== tSig) {
          applyCastleShellHouseTheme(this.castleShell, house, weather, this.castleShellMeta.isCommonRoom);
          this.castleShellMeta.themeSig = tSig;
          if (this.sunbeamMesh) {
            const beamCol = cfg.isCommonRoom && house === 'slytherin'
              ? '#2ec4b6'
              : weather === 'night'
                ? '#93c5fd'
                : '#ffea9c';
            this.sunbeamMesh.material.color.set(beamCol);
            this.sunbeamMesh.material.opacity = weather === 'night' ? 0.13 : 0.17;
          }
        }
      }
      return;
    }

    const cfg = OUTDOOR_3D_ENV_CONFIGS[idx % OUTDOOR_3D_ENV_CONFIGS.length];
    const needed = [
      cfg.hero.key,
      ...new Set(cfg.trees.map((t) => t[0])),
      ...(cfg.bushes.length ? ['kit_garden_foliage'] : []),
      ...(cfg.fences.length ? ['kit_fence_gate'] : []),
    ];
    const readyMask = needed.map((k) => (hasGlbLoaded(k) ? '1' : '0')).join('');
    if (this.pendingGlbSig === readyMask) return;
    this.pendingGlbSig = readyMask;

    this._clearGroup(this.glbLayer);
    this.swayNodes = [];
    this.animRefs = {};

    // 1. Hero Landmark Building
    if (hasGlbLoaded(cfg.hero.key)) {
      const hero = cloneGlbInstance(cfg.hero.key, { castShadow: true, receiveShadow: true, centerXZ: true });
      if (hero) {
        const e = hero.userData.glbEntry;
        const sc = cfg.hero.targetHeight / Math.max(0.5, e.sizeY);
        hero.scale.setScalar(sc);
        hero.position.set(cfg.hero.x, cfg.hero.y, cfg.hero.z);
        hero.rotation.y = cfg.hero.rotY || 0;

        const cDisc = createContactShadowDisc(0.48);
        cDisc.scale.set(e.sizeX * sc * 1.08, 1, e.sizeZ * sc * 1.08);
        cDisc.position.set(cfg.hero.x, 0.7, cfg.hero.z);
        this.glbLayer.add(cDisc, hero);

        hero.traverse((n) => {
          if (n.name === 'WaterWheel') this.animRefs.waterWheel = n;
          if (n.name === 'ClockHandHour') this.animRefs.clockHour = n;
          if (n.name === 'ClockHandMin') this.animRefs.clockMin = n;
          if (n.name === 'WillowCrown') this.animRefs.willowCrown = n;
          if (n.name === 'HogwartsTrain') this.animRefs.train = n;
        });
      }
    }

    // 2. Orchard / Highland Trees with Wind Sway
    for (let i = 0; i < cfg.trees.length; i++) {
      const [tKey, tx, tz, tHeight, rotY] = cfg.trees[i];
      if (!hasGlbLoaded(tKey)) continue;
      const tr = cloneGlbInstance(tKey, { castShadow: true, receiveShadow: true, centerXZ: true });
      if (!tr) continue;
      const e = tr.userData.glbEntry;
      const sc = tHeight / Math.max(0.5, e.sizeY);
      tr.scale.setScalar(sc);
      tr.position.set(tx, 0, tz);
      tr.rotation.y = rotY;
      const disc = createContactShadowDisc(0.42);
      disc.scale.set(e.sizeX * sc * 0.92, 1, e.sizeZ * sc * 0.92);
      disc.position.set(tx, 0.6, tz);
      this.glbLayer.add(disc, tr);
      this.swayNodes.push({ node: tr, baseRotY: rotY, phase: i * 1.37, amp: 0.028 });
    }

    // 3. Flowering Bushes & Mossy Boulders
    if (hasGlbLoaded('kit_garden_foliage')) {
      for (let i = 0; i < cfg.bushes.length; i++) {
        const [bx, bz, span, rotY] = cfg.bushes[i];
        const b = cloneGlbInstance('kit_garden_foliage', { castShadow: true, receiveShadow: true, centerXZ: true });
        if (!b) continue;
        const sc = span / Math.max(0.4, b.userData.glbEntry.maxSpan);
        b.scale.setScalar(sc);
        b.position.set(bx, 0, bz);
        b.rotation.y = rotY;
        this.glbLayer.add(b);
        this.swayNodes.push({ node: b, baseRotY: rotY, phase: i * 2.1, amp: 0.018 });
      }
    }

    // 4. Split-Rail Wooden Fences
    if (hasGlbLoaded('kit_fence_gate')) {
      for (const [fx, fz, span, rotY] of cfg.fences) {
        const fn = cloneGlbInstance('kit_fence_gate', { castShadow: true, receiveShadow: true, centerXZ: true });
        if (!fn) continue;
        const sc = span / Math.max(0.4, fn.userData.glbEntry.sizeX);
        fn.scale.setScalar(sc);
        fn.position.set(fx, 0, fz);
        fn.rotation.y = rotY;
        this.glbLayer.add(fn);
      }
    }
  }

  sync({ isCastle, envIdx, areaId, house, weather, medallionSpec, cameraPos, timeSec }) {
    if (cameraPos) this.skyDome.position.copy(cameraPos);
    const snow = weather === 'snow';
    const rebuildSig = `${isCastle ? 'home' : 'garden'}:${envIdx}:${areaId}:${snow ? 1 : 0}`;
    if (this.activeSig !== rebuildSig) {
      this.activeSig = rebuildSig;
      this._rebuildStaticEnvironment(isCastle, envIdx, areaId, snow);
    }

    this._updateSkyAndFog(isCastle, house, weather);
    this._tryPopulateGlbModels(isCastle, envIdx, house, weather);

    // Sync 3D Ground Rune Plaza / Castle Floor Medallion
    if (medallionSpec) {
      this.medallionMesh.visible = true;
      this.medallionMesh.scale.setScalar(medallionSpec.isCastle ? 0.64 : 1.0);
      this.medallionMesh.position.set(
        medallionSpec.worldX,
        1.4,
        medallionSpec.worldZ + (medallionSpec.isCastle ? 46 : 0)
      );
      updateGroundMedallionCanvas(this.medallionMesh, medallionSpec);
    } else {
      this.medallionMesh.visible = false;
    }

    // Animate GLSL water ponds & streams
    const sunHex = weather === 'night' ? '#93c5fd' : '#ffea9c';
    for (const wm of this.waterMats) {
      wm.uniforms.uTime.value = timeSec;
      wm.uniforms.uSunGlow.value.set(sunHex);
    }

    // Animate wind sway on trees & bushes
    for (const s of this.swayNodes) {
      s.node.rotation.z = Math.sin(timeSec * 1.65 + s.phase) * s.amp;
      s.node.rotation.x = Math.cos(timeSec * 1.25 + s.phase) * (s.amp * 0.65);
    }

    // Animate Hero Landmark articulated mechanisms!
    if (this.animRefs.waterWheel) {
      this.animRefs.waterWheel.rotation.x = -timeSec * 1.35;
    }
    if (this.animRefs.clockHour) {
      this.animRefs.clockHour.rotation.z = -timeSec * 0.12 - 0.8;
    }
    if (this.animRefs.clockMin) {
      this.animRefs.clockMin.rotation.z = -timeSec * 0.95;
    }
    if (this.animRefs.willowCrown) {
      this.animRefs.willowCrown.rotation.z = Math.sin(timeSec * 1.9) * 0.12;
      this.animRefs.willowCrown.rotation.x = Math.cos(timeSec * 1.5) * 0.09;
    }
    if (this.animRefs.train) {
      this.animRefs.train.position.y = 1.84 + Math.abs(Math.sin(timeSec * 14)) * 0.018;
    }
    if (this.animRefs.orrery) {
      this.animRefs.orrery.rotation.y = timeSec * 0.55;
      this.animRefs.orrery.rotation.z = Math.sin(timeSec * 0.8) * 0.18;
    }

    // Animate 3D Chimney / Train Smoke Puffs
    const nAnchors = this.smokeAnchors.length;
    for (let i = 0; i < this.smokePuffs.length; i++) {
      const puff = this.smokePuffs[i];
      if (nAnchors === 0) {
        puff.visible = false;
        continue;
      }
      const a = this.smokeAnchors[i % nAnchors];
      const ph = ((timeSec * 0.42 + (i / this.smokePuffs.length)) % 1);
      puff.visible = true;
      puff.position.set(
        a[0] + ph * 55 + Math.sin(timeSec * 2 + i) * 9,
        a[1] + ph * 135,
        a[2] - ph * 25
      );
      puff.scale.setScalar(0.55 + ph * 1.45);
      puff.material.opacity = Math.sin(ph * Math.PI) * 0.52;
    }

    // Animate 3D Weather Particles (Snowflakes / Fireflies / Magic Dust)
    for (let i = 0; i < this.weatherOrbs.length; i++) {
      const orb = this.weatherOrbs[i];
      const seed = i * 37.7;
      if (weather === 'snow') {
        const fall = ((timeSec * 68 + seed * 19) % 560);
        orb.position.set(
          ((i * 193) % 1560) - 780 + Math.sin(timeSec * 1.4 + i) * 28,
          480 - fall,
          ((i * 127) % 1120) - 420
        );
        orb.scale.setScalar(0.85);
        orb.material.color.setHex(0xffffff);
        orb.material.opacity = 0.82;
      } else {
        const bob = Math.sin(timeSec * 1.8 + seed) * 24;
        orb.position.set(
          ((i * 179) % 1360) - 680 + Math.cos(timeSec * 0.7 + i) * 22,
          55 + ((i * 29) % 240) + bob,
          ((i * 113) % 980) - 340
        );
        orb.scale.setScalar(0.62);
        orb.material.color.setHex(weather === 'night' ? 0x72efdd : 0xffe699);
        orb.material.opacity = 0.35 + Math.sin(timeSec * 3.1 + i) * 0.25;
      }
    }
  }
}
