/**
 * 3D Renovation Relic & Castle Furniture Synchronizer (`world3dProps.js`)
 * Places all 12 Gardenscapes Zones & 12 Homescapes Chapters (+ 4 House Common Rooms)
 * directly in canonical 3D world space `(wx, wy, wz)` under `PerspectiveCamera(26°)`!
 */

import { GARDEN_ANCHORS, ZONE_RELIC_PROPS } from '../world/gardenscapesSlots.js';
import { ROOM_ANCHORS } from '../world/homescapesSlotsExtra.js';
import {
  applyPropStyle3D,
  cloneGlbInstance,
  createContactShadowDisc,
  hasGlbLoaded,
} from './glbBank.js';

const WORLD_UNIT_MUL = 1.22;

const ALCOVE_SPEC = [
  { key: 'g_prop_telescope', size: 128 },
  { key: 'g_prop_knight', size: 138 },
  { key: 'g_prop_triwizard', size: 128 },
  { key: 'g_prop_pensieve', size: 142 },
  { key: 'g_prop_fountain', size: 144 },
  { key: 'g_prop_telescope', size: 134 },
];

const HEARTH_SPEC = [
  { key: 'g_prop_candles', size: 132 },
  { key: 'g_prop_candles', size: 140 },
  { key: 'g_prop_owlery', size: 134 },
  { key: 'h_prop_catbed', size: 124 },
  { key: 'g_prop_candles', size: 136 },
  { key: 'g_prop_lamp', size: 132 },
];

function evalSpringPop(elapsed) {
  if (elapsed >= 0.85) return { scaleMul: 1, spinY: 0 };
  const t = Math.max(0, elapsed / 0.85);
  const scaleMul = t < 0.45
    ? (t / 0.45) * 1.18
    : 1 + Math.cos(((t - 0.45) / 0.55) * Math.PI * 1.5) * 0.18 * (1 - t);
  const spinY = (1 - Math.pow(1 - t, 3)) * Math.PI * 2;
  return { scaleMul: Math.max(0.05, scaleMul), spinY };
}

export function buildGarden3DSlotDescriptors(renderer, area, scene) {
  const zoneMod = (area.sceneIndex ?? renderer.areaIndex) % GARDEN_ANCHORS.length;
  const anchors = GARDEN_ANCHORS[zoneMod] || GARDEN_ANCHORS[0];
  const relicMap = ZONE_RELIC_PROPS[zoneMod] || ZONE_RELIC_PROPS[0];
  const list = [];

  for (const slot of ['flora', 'seating', 'lighting', 'centerpiece', 'special', 'fountain_wing', 'guardian', 'pavilion']) {
    const task = area.tasks.find((t) => t.slot === slot);
    const spec = relicMap[slot];
    if (!task || !spec?.key) continue;
    const st = renderer._getTaskStyle(task);
    const [nx, ny] = anchors[slot] || [0.5, 0.6];
    const wPos = scene.normToWorld(nx, ny, 0, slot);

    if (!st.done) {
      if (spec.vfx !== 'boat' && (slot === 'centerpiece' || slot === 'seating' || slot === 'special')) {
        list.push({
          slotId: `${area.id}:${task.id}:crate`,
          taskId: task.id,
          propKey: 'h_prop_crate',
          wx: wPos.x,
          wy: 0,
          wz: wPos.z,
          worldSize: 86 * WORLD_UNIT_MUL,
          styleIdx: 0,
          style: null,
          preview: false,
          yaw: nx < 0.5 ? 0.54 : -0.52,
          vfx: '',
          flatFloor: false,
          hanging: false,
          isCrate: true,
        });
      }
      continue;
    }

    const propKey = spec.vfx === 'willow_shrine' && st.styleIdx > 0 ? 'g_prop_willow' : spec.key;
    const yaw = spec.flipX ? -0.58 : nx < 0.45 ? 0.54 : nx > 0.62 ? -0.52 : 0.36;
    list.push({
      slotId: `${area.id}:${task.id}`,
      taskId: task.id,
      propKey,
      wx: wPos.x,
      wy: spec.vfx === 'boat' ? 2.2 : 0,
      wz: wPos.z,
      worldSize: spec.size * WORLD_UNIT_MUL,
      styleIdx: st.styleIdx,
      style: st.style,
      preview: st.preview,
      yaw,
      vfx: spec.vfx || '',
      flatFloor: false,
      hanging: false,
      isCrate: false,
    });
  }
  return list;
}

export function buildCastle3DSlotDescriptors(renderer, area, scene) {
  const rawScene = area.sceneIndex ?? renderer.areaIndex;
  const roomIdx = ((rawScene % ROOM_ANCHORS.length) + ROOM_ANCHORS.length) % ROOM_ANCHORS.length;
  const anchors = ROOM_ANCHORS[roomIdx] || ROOM_ANCHORS[0];
  const list = [];

  const pushSlot = (slot, propKey, sizeBase, opts = {}) => {
    const task = area.tasks.find((t) => t.slot === slot);
    if (!task) return;
    const st = renderer._getTaskStyle(task);
    const [nx, ny] = anchors[slot] || [0.5, 0.6];
    const wPos = opts.overrideWorld || scene.normToWorld(nx, ny, 0, slot);

    if (!st.done) {
      if (opts.crateWhenUndone) {
        list.push({
          slotId: `${area.id}:${task.id}:crate`,
          taskId: task.id,
          propKey: 'h_prop_crate',
          wx: wPos.x,
          wy: 0,
          wz: wPos.z,
          worldSize: 82 * WORLD_UNIT_MUL * (opts.crateScale || 1),
          styleIdx: 0,
          style: null,
          preview: false,
          yaw: nx < 0.5 ? 0.58 : -0.55,
          vfx: '',
          flatFloor: false,
          hanging: false,
          isCrate: true,
        });
      }
      return;
    }

    list.push({
      slotId: `${area.id}:${task.id}`,
      taskId: task.id,
      propKey,
      wx: wPos.x,
      wy: opts.wy ?? wPos.y ?? 0,
      wz: wPos.z,
      worldSize: sizeBase * WORLD_UNIT_MUL,
      styleIdx: st.styleIdx,
      style: st.style,
      preview: st.preview,
      yaw: opts.yaw ?? (nx < 0.46 ? 0.62 : nx > 0.56 ? -0.62 : 0.18),
      vfx: opts.vfx || '',
      flatFloor: Boolean(opts.flatFloor),
      hanging: Boolean(opts.hanging),
      isCrate: false,
    });
  };

  // 2. Rug or Potions Island
  if (roomIdx === 2) pushSlot('rug', 'h_prop_island', 184, { yaw: 0.48, vfx: 'cauldron' });
  else pushSlot('rug', 'h_prop_rug', 236, { flatFloor: true, wy: 1.9, yaw: 0.68 });

  // 3. Ceiling Chandelier (suspended cleanly inside 3D Castle room!)
  const ceilWorld = scene.normToWorld(0.5, 0.21, 0, 'curtain_ceiling');
  pushSlot('curtain', 'h_prop_chandelier', roomIdx === 3 ? 128 : 142, {
    hanging: true,
    yaw: 0.35,
    overrideWorld: { x: ceilWorld.x, y: 168, z: ceilWorld.z },
    wy: 168,
    vfx: 'candles',
  });

  // 4. Bed / Sofa / Potions Desk
  const bedKey = roomIdx === 0 ? 'h_prop_bed' : roomIdx === 2 ? 'h_prop_desk' : 'h_prop_sofa';
  const bedSz = roomIdx === 0 ? 208 : roomIdx === 1 ? 182 : roomIdx === 2 ? 156 : 198;
  pushSlot('bed', bedKey, bedSz, {
    yaw: roomIdx === 3 ? -0.56 : 0.62,
    crateWhenUndone: true,
  });

  // 5. Study Desk / Potions Cauldron Island / Grand Piano
  if (roomIdx === 3) pushSlot('desk', 'h_prop_piano', 190, { yaw: -0.58, crateWhenUndone: true, crateScale: 0.85 });
  else if (roomIdx === 2) pushSlot('desk', 'h_prop_island', 150, { yaw: 0.52, crateWhenUndone: true, crateScale: 0.85 });
  else pushSlot('desk', 'h_prop_desk', 168, { yaw: roomIdx === 0 ? -0.62 : -0.54, crateWhenUndone: true, crateScale: 0.85 });

  // 6. Decor (Catbed / Trophy Goblet)
  pushSlot('decor', roomIdx === 0 ? 'h_prop_catbed' : 'h_prop_urn', roomIdx === 0 ? 114 : 124, { yaw: 0.45 });

  // 7. Wall Banner (mounted cleanly on interior Left-Back 3D Castle wall!)
  const banWorld = scene.normToWorld(0.31, 0.36, 0, 'banner');
  pushSlot('banner', 'h_prop_banner', 122, {
    hanging: true,
    overrideWorld: { x: banWorld.x, y: 122, z: banWorld.z },
    wy: 122,
    yaw: 0.63,
    vfx: 'banner',
  });

  // 8. Alcove
  const alc = ALCOVE_SPEC[roomIdx % ALCOVE_SPEC.length];
  pushSlot('alcove', alc.key, alc.size, { crateWhenUndone: true, crateScale: 0.78 });

  // 9. Hearth
  const hth = HEARTH_SPEC[roomIdx % HEARTH_SPEC.length];
  pushSlot('hearth', hth.key, hth.size);

  return list;
}

export class World3DPropsManager {
  constructor(parentGroup) {
    this.parentGroup = parentGroup;
    this.instances = new Map();
    this._knownAreaKey = '';
  }

  sync(descriptors, areaKey, timeSec) {
    const isAreaSwitch = this._knownAreaKey !== areaKey;
    this._knownAreaKey = areaKey;

    const activeIds = new Set();
    const renderedTaskIds = new Set();

    for (const d of descriptors) {
      if (!hasGlbLoaded(d.propKey)) continue;

      activeIds.add(d.slotId);
      renderedTaskIds.add(d.taskId);

      const styleSig = `${d.propKey}|${d.styleIdx}|${d.style?.primary || ''}|${d.style?.secondary || ''}`;
      let rec = this.instances.get(d.slotId);

      if (rec && rec.propKey !== d.propKey) {
        this.parentGroup.remove(rec.mesh);
        if (rec.shadowDisc) this.parentGroup.remove(rec.shadowDisc);
        this.instances.delete(d.slotId);
        rec = null;
      }

      if (!rec) {
        const mesh = cloneGlbInstance(d.propKey, {
          castShadow: !d.flatFloor && !d.hanging,
          receiveShadow: !d.hanging,
          centerXZ: true,
        });
        if (!mesh) continue;
        applyPropStyle3D(mesh, d.propKey, d.styleIdx, d.style);
        this.parentGroup.add(mesh);
        let shadowDisc = null;
        if (!d.flatFloor && !d.hanging && d.propKey !== 'g_prop_boat') {
          shadowDisc = createContactShadowDisc(0.45);
          this.parentGroup.add(shadowDisc);
        }
        rec = {
          mesh,
          shadowDisc,
          propKey: d.propKey,
          styleSig,
          bornAt: timeSec,
          popFromAction: !isAreaSwitch && !d.isCrate,
        };
        this.instances.set(d.slotId, rec);
      } else if (rec.styleSig !== styleSig) {
        applyPropStyle3D(rec.mesh, d.propKey, d.styleIdx, d.style);
        rec.styleSig = styleSig;
        rec.bornAt = timeSec;
        rec.popFromAction = true;
      }

      const entry = rec.mesh.userData.glbEntry;
      const fillFactor = d.flatFloor ? 0.92 : d.hanging ? 0.82 : 0.78;
      let baseScale = (d.worldSize * fillFactor) / Math.max(0.25, entry.maxSpan);

      let spinY = 0;
      if (rec.popFromAction) {
        const pop = evalSpringPop(timeSec - rec.bornAt);
        baseScale *= pop.scaleMul;
        spinY = pop.spinY;
        if (timeSec - rec.bornAt >= 0.85) rec.popFromAction = false;
      }
      if (d.preview) {
        baseScale *= 1 + Math.sin(timeSec * 5.4) * 0.045;
      }

      let wx = d.wx;
      let liftY = d.wy || 0;
      let pitchX = 0;
      let rollZ = 0;
      if (d.vfx === 'boat' || d.propKey === 'g_prop_boat') {
        wx += Math.sin(timeSec * 0.65) * 18;
        liftY += Math.sin(timeSec * 2.4) * 3.8;
        pitchX = Math.sin(timeSec * 2.1) * 0.055;
        rollZ = Math.cos(timeSec * 1.8) * 0.045;
      } else if (d.vfx === 'candles' || d.propKey === 'g_prop_candles') {
        liftY += Math.sin(timeSec * 2.6 + d.wx * 0.02) * 3.5;
      } else if (d.vfx === 'banner' || d.propKey === 'h_prop_banner') {
        rollZ = Math.sin(timeSec * 2.3 + d.wx * 0.01) * 0.05;
      }

      rec.mesh.position.set(wx, liftY, d.wz);
      rec.mesh.scale.setScalar(baseScale);
      rec.mesh.rotation.set(pitchX, d.yaw + spinY, rollZ);

      if (rec.shadowDisc) {
        rec.shadowDisc.position.set(wx, 1.1, d.wz);
        const sx = Math.max(28, entry.sizeX * baseScale * 1.16);
        const sz = Math.max(28, entry.sizeZ * baseScale * 1.16);
        rec.shadowDisc.scale.set(sx, 1, sz);
        rec.shadowDisc.rotation.y = d.yaw;
      }
    }

    for (const [id, rec] of this.instances.entries()) {
      if (!activeIds.has(id)) {
        this.parentGroup.remove(rec.mesh);
        if (rec.shadowDisc) this.parentGroup.remove(rec.shadowDisc);
        this.instances.delete(id);
      }
    }

    return renderedTaskIds;
  }
}
