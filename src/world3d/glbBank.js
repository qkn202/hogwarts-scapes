/**
 * Blender 5.2 GLB Asset Bank, Deep-Clone Material Isolator & 3-Style / 4-House PBR Recolorer
 * Loads all 29 authored `.glb` assets from `/assets/models3d/` with zero external runtime deps.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MODEL_FILES = {
  char_prefect: '/assets/models3d/char_prefect.glb',
  pet_niffler: '/assets/models3d/pet_niffler.glb',
  pet_hedwig: '/assets/models3d/pet_hedwig.glb',

  g_prop_fountain: '/assets/models3d/g_prop_fountain.glb',
  g_prop_pensieve: '/assets/models3d/g_prop_pensieve.glb',
  g_prop_triwizard: '/assets/models3d/g_prop_triwizard.glb',
  g_prop_gazebo: '/assets/models3d/g_prop_gazebo.glb',
  g_prop_owlery: '/assets/models3d/g_prop_owlery.glb',
  g_prop_knight: '/assets/models3d/g_prop_knight.glb',
  g_prop_candles: '/assets/models3d/g_prop_candles.glb',
  g_prop_telescope: '/assets/models3d/g_prop_telescope.glb',
  g_prop_boat: '/assets/models3d/g_prop_boat.glb',
  g_prop_bench: '/assets/models3d/g_prop_bench.glb',
  g_prop_doghouse: '/assets/models3d/g_prop_doghouse.glb',

  h_prop_bed: '/assets/models3d/h_prop_bed.glb',
  h_prop_sofa: '/assets/models3d/h_prop_sofa.glb',
  h_prop_desk: '/assets/models3d/h_prop_desk.glb',
  h_prop_piano: '/assets/models3d/h_prop_piano.glb',
  h_prop_island: '/assets/models3d/h_prop_island.glb',
  h_prop_chandelier: '/assets/models3d/h_prop_chandelier.glb',
  h_prop_rug: '/assets/models3d/h_prop_rug.glb',
  h_prop_catbed: '/assets/models3d/h_prop_catbed.glb',
  h_prop_crate: '/assets/models3d/h_prop_crate.glb',
  h_prop_banner: '/assets/models3d/h_prop_banner.glb',

  m3_pedestal: '/assets/models3d/m3_pedestal.glb',
  m3_rainbow: '/assets/models3d/m3_rainbow.glb',
  m3_potion: '/assets/models3d/m3_potion.glb',
  m3_snitch: '/assets/models3d/m3_snitch.glb',
  m3_bomb: '/assets/models3d/m3_bomb.glb',

  // Full 3D Large Outdoor Landmarks & Modular Nature Kit
  env_burrow_house: '/assets/models3d/env_burrow_house.glb',
  env_clocktower: '/assets/models3d/env_clocktower.glb',
  env_hagrid_hut: '/assets/models3d/env_hagrid_hut.glb',
  env_boathouse: '/assets/models3d/env_boathouse.glb',
  env_greenhouse: '/assets/models3d/env_greenhouse.glb',
  env_covered_bridge: '/assets/models3d/env_covered_bridge.glb',
  env_hogsmeade: '/assets/models3d/env_hogsmeade.glb',
  kit_tree_oak: '/assets/models3d/kit_tree_oak.glb',
  kit_tree_pine: '/assets/models3d/kit_tree_pine.glb',
  kit_garden_foliage: '/assets/models3d/kit_garden_foliage.glb',
  kit_fence_gate: '/assets/models3d/kit_fence_gate.glb',

  // Full 3D Cutaway Castle Room Architectural Shells
  env_castle_tower_room: '/assets/models3d/env_castle_tower_room.glb',
  env_castle_greathall: '/assets/models3d/env_castle_greathall.glb',
  env_castle_dungeon: '/assets/models3d/env_castle_dungeon.glb',
  env_castle_study_tower: '/assets/models3d/env_castle_study_tower.glb',
};

const KEY_ALIASES = {
  g_prop_statue: 'g_prop_knight',
  g_prop_lamp: 'g_prop_candles',
  g_prop_willow: 'g_prop_candles',
  h_prop_urn: 'g_prop_triwizard',
  h_box: 'h_prop_crate',
};

export const HOUSE_3D_PALETTES = {
  gryffindor: { primary: '#a4161a', secondary: '#ffb703', emissive: '#ffd166' },
  slytherin: { primary: '#1b7a46', secondary: '#cbd5e1', emissive: '#52b788' },
  ravenclaw: { primary: '#1d4ed8', secondary: '#d97706', emissive: '#60a5fa' },
  hufflepuff: { primary: '#eab308', secondary: '#27272a', emissive: '#fef08a' },
};

const NATURAL_STONE_TINTS = ['#ffffff', '#dce6f5', '#f7e6c4'];
const NATURAL_WOOD_TINTS = ['#ffffff', '#d8c3b0', '#f0c4a0'];
const MAGIC_STYLE_HEX = ['#38bdf8', '#34d399', '#c084fc'];

let _sharedContactShadowTex = null;
let _sharedContactShadowGeo = null;

function getContactShadowResources() {
  if (!_sharedContactShadowTex && typeof document !== 'undefined') {
    const cv = document.createElement('canvas');
    cv.width = 64;
    cv.height = 64;
    const g = cv.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 3, 32, 32, 31);
    grad.addColorStop(0, 'rgba(18, 26, 14, 0.82)');
    grad.addColorStop(0.48, 'rgba(20, 30, 16, 0.42)');
    grad.addColorStop(0.82, 'rgba(20, 30, 16, 0.10)');
    grad.addColorStop(1, 'rgba(20, 30, 16, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    _sharedContactShadowTex = new THREE.CanvasTexture(cv);
    _sharedContactShadowTex.colorSpace = THREE.SRGBColorSpace;
  }
  if (!_sharedContactShadowGeo) {
    _sharedContactShadowGeo = new THREE.PlaneGeometry(1, 1);
    _sharedContactShadowGeo.rotateX(-Math.PI / 2);
  }
  return { tex: _sharedContactShadowTex, geo: _sharedContactShadowGeo };
}

export function createContactShadowDisc(opacity = 0.46) {
  const { tex, geo } = getContactShadowResources();
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -1;
  return mesh;
}

const loader = new GLTFLoader();
/** @type {Map<string, { template: THREE.Group, minY: number, centerX: number, centerZ: number, sizeX: number, sizeY: number, sizeZ: number, maxSpan: number }>} */
const MODEL_CACHE = new Map();
/** @type {Map<string, Promise<any>>} */
const INFLIGHT = new Map();

export function resolveCanonicalGlbKey(rawKey) {
  return KEY_ALIASES[rawKey] || rawKey;
}

export function hasGlbLoaded(rawKey) {
  const key = resolveCanonicalGlbKey(rawKey);
  return MODEL_CACHE.has(key);
}

export function ensureGlbModel(rawKey) {
  const key = resolveCanonicalGlbKey(rawKey);
  if (MODEL_CACHE.has(key)) return Promise.resolve(MODEL_CACHE.get(key));
  if (INFLIGHT.has(key)) return INFLIGHT.get(key);
  const url = MODEL_FILES[key];
  if (!url) return Promise.resolve(null);

  const prom = new Promise((resolve) => {
    loader.load(
      url,
      (gltf) => {
        const root = gltf.scene;
        // Enable crisp sRGB hand-painted atlas + baked raytraced vertex-color AO (`COLOR_0`)
        const hasVertexColorAttr = new WeakSet();
        root.traverse((n) => {
          if (!n.isMesh || !n.material) return;
          const hasVC = Boolean(n.geometry?.attributes?.color);
          const mats = Array.isArray(n.material) ? n.material : [n.material];
          for (const m of mats) {
            if (!m) continue;
            if (m.map) {
              m.map.colorSpace = THREE.SRGBColorSpace;
              m.map.anisotropy = 4;
            }
            if (hasVC) {
              m.vertexColors = true;
              hasVertexColorAttr.add(m);
            }
            if (!m.color) continue;
            const nm = m.name || '';
            const luma = m.color.r * 0.299 + m.color.g * 0.587 + m.color.b * 0.114;
            if (luma < 0.035 && !nm.includes('Pupil') && !nm.includes('Eye')) {
              m.color.offsetHSL(0, 0, 0.085);
              if (typeof m.roughness === 'number') m.roughness = Math.min(0.68, Math.max(0.42, m.roughness));
            }
            if (typeof m.metalness === 'number' && m.metalness > 0.72) {
              m.metalness = 0.72;
              m.roughness = Math.max(0.22, m.roughness);
            }
            m.needsUpdate = true;
          }
        });
        root.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const entry = {
          template: root,
          minY: Number.isFinite(box.min.y) ? box.min.y : 0,
          centerX: Number.isFinite(center.x) ? center.x : 0,
          centerY: Number.isFinite(center.y) ? center.y : 0,
          centerZ: Number.isFinite(center.z) ? center.z : 0,
          sizeX: Math.max(0.05, size.x),
          sizeY: Math.max(0.05, size.y),
          sizeZ: Math.max(0.05, size.z),
          maxSpan: Math.max(0.1, size.x, size.y, size.z),
        };
        MODEL_CACHE.set(key, entry);
        INFLIGHT.delete(key);
        resolve(entry);
      },
      undefined,
      () => {
        INFLIGHT.delete(key);
        resolve(null);
      }
    );
  });
  INFLIGHT.set(key, prom);
  return prom;
}

export function preloadWorld3DModels(gameId = 'gardenscapes') {
  const common = ['char_prefect', 'pet_niffler', 'pet_hedwig'];
  const gardenKeys = [
    'g_prop_fountain', 'g_prop_pensieve', 'g_prop_triwizard', 'g_prop_gazebo',
    'g_prop_owlery', 'g_prop_knight', 'g_prop_candles', 'g_prop_telescope',
    'g_prop_boat', 'g_prop_bench', 'g_prop_doghouse',
  ];
  const homeKeys = [
    'h_prop_bed', 'h_prop_sofa', 'h_prop_desk', 'h_prop_piano', 'h_prop_island',
    'h_prop_chandelier', 'h_prop_rug', 'h_prop_catbed', 'h_prop_crate', 'h_prop_banner',
    'g_prop_telescope', 'g_prop_knight', 'g_prop_triwizard', 'g_prop_pensieve',
    'g_prop_fountain', 'g_prop_candles', 'g_prop_owlery',
  ];
  const list = gameId === 'homescapes' ? [...common, ...homeKeys] : [...common, ...gardenKeys];
  for (const k of list) ensureGlbModel(k);
}

export function preloadMatch33DModels() {
  for (const k of [
    'char_prefect', 'pet_niffler', 'pet_hedwig',
    'm3_pedestal', 'm3_rainbow', 'm3_potion', 'm3_snitch', 'm3_bomb',
  ]) {
    ensureGlbModel(k);
  }
}

export function cloneGlbInstance(
  rawKey,
  { castShadow = true, receiveShadow = true, centerXZ = false, centerY = false, preserveOrigin = false } = {}
) {
  const key = resolveCanonicalGlbKey(rawKey);
  const entry = MODEL_CACHE.get(key);
  if (!entry) {
    ensureGlbModel(key);
    return null;
  }

  const wrapper = new THREE.Group();
  wrapper.name = `Instance_${rawKey}`;
  const inner = entry.template.clone(true);
  if (!preserveOrigin) {
    inner.position.set(
      centerXZ ? -entry.centerX : 0,
      centerY ? -entry.centerY : -entry.minY,
      centerXZ ? -entry.centerZ : 0
    );
  }

  inner.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = castShadow;
    node.receiveShadow = receiveShadow;
    if (Array.isArray(node.material)) {
      node.material = node.material.map((m) => (m ? m.clone() : m));
    } else if (node.material) {
      node.material = node.material.clone();
    }
  });

  wrapper.add(inner);
  wrapper.userData.glbEntry = entry;
  wrapper.userData.rawKey = rawKey;
  wrapper.userData.innerRoot = inner;
  return wrapper;
}

function setMatColor(mat, hex, emissiveHex = null, emissiveIntensity = null) {
  if (!mat || !hex) return;
  if (mat.color) mat.color.set(hex);
  if (emissiveHex && mat.emissive) {
    mat.emissive.set(emissiveHex);
    if (emissiveIntensity !== null) mat.emissiveIntensity = emissiveIntensity;
  }
}

/**
 * Dynamically recolors a cloned 3D prop across Style 0, Style 1, Style 2 & House palettes
 * while preserving natural hand-painted stone, marble, wood, brass, steel & water textures!
 */
export function applyPropStyle3D(wrapper, rawKey, styleIdx = 0, style = null) {
  if (!wrapper) return;
  const sIdx = Math.max(0, Math.min(2, Number(styleIdx) || 0));
  const pri = style?.primary || null;
  const sec = style?.secondary || null;
  const acc = style?.accent || MAGIC_STYLE_HEX[sIdx];
  const isStatue = rawKey === 'g_prop_statue';
  const isGazebo = rawKey === 'g_prop_gazebo';

  wrapper.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    for (const mat of mats) {
      if (!mat) continue;
      const nm = mat.name || '';
      if (nm.startsWith('Mat_Primary')) {
        // Keep Gazebo's painted royal-blue star dome untouched on default Style 0
        if (isGazebo && sIdx === 0) setMatColor(mat, '#ffffff');
        else if (pri) setMatColor(mat, pri);
      } else if (nm.startsWith('Mat_Secondary')) {
        if (sec && (sIdx > 0 || rawKey.startsWith('h_'))) setMatColor(mat, sec);
      } else if (nm.startsWith('Mat_Accent')) {
        if (sIdx > 0) setMatColor(mat, acc);
      } else if (
        nm.startsWith('Mat_Emissive') &&
        !nm.startsWith('Mat_EmissiveGreen') &&
        !nm.startsWith('Mat_EmissiveViolet') &&
        !nm.startsWith('Mat_EmissiveCyan')
      ) {
        if (sIdx > 0 && acc) {
          setMatColor(mat, acc, acc, 1.9);
        }
      } else if (nm.startsWith('Mat_Wood') || nm.startsWith('Mat_Walnut')) {
        setMatColor(mat, NATURAL_WOOD_TINTS[sIdx]);
      } else if (nm.startsWith('Mat_Stone') || nm.startsWith('Mat_Marble')) {
        if (isStatue) {
          setMatColor(mat, sIdx === 1 ? '#dce6f5' : sIdx === 2 ? '#fef08a' : '#f5f5f4');
        } else {
          setMatColor(mat, NATURAL_STONE_TINTS[sIdx]);
        }
      } else if (isStatue && (nm.startsWith('Mat_Iron') || nm.startsWith('Mat_Steel'))) {
        setMatColor(mat, sIdx === 1 ? '#cbd5e1' : sIdx === 2 ? '#fde047' : '#e7e5e4');
        mat.roughness = 0.34;
        mat.metalness = sIdx === 2 ? 0.68 : 0.28;
      }
    }
  });
}

/**
 * Recolors `char_prefect.glb` & `pet_hedwig.glb` to match the active Hogwarts House!
 */
export function applyActorHouse3D(wrapper, house = 'gryffindor') {
  if (!wrapper) return;
  const pal = HOUSE_3D_PALETTES[house] || HOUSE_3D_PALETTES.gryffindor;
  wrapper.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    for (const mat of mats) {
      if (!mat) continue;
      const nm = mat.name || '';
      if (nm.startsWith('Mat_Primary')) setMatColor(mat, pal.primary);
      else if (nm.startsWith('Mat_Secondary')) setMatColor(mat, pal.secondary);
      else if (nm.startsWith('Mat_Emissive')) setMatColor(mat, pal.emissive, pal.emissive, 2.2);
    }
  });
}

const CASTLE_HOUSE_ARCH_THEMES = {
  gryffindor: { wall: '#ffffff', trim: '#ffffff', floor: '#ffffff', crest: '#a4161a', win: '#ffd166', winEmit: '#ff9e00', hearth: '#ff6b00' },
  slytherin: { wall: '#94b8a8', trim: '#7f9c90', floor: '#a3b8b0', crest: '#1b7a46', win: '#2ec4b6', winEmit: '#10b981', hearth: '#2dc653' },
  ravenclaw: { wall: '#d8e4f8', trim: '#b8926a', floor: '#e2d4c0', crest: '#1d4ed8', win: '#60a5fa', winEmit: '#3b82f6', hearth: '#60a5fa' },
  hufflepuff: { wall: '#fdecc8', trim: '#d4a373', floor: '#f6d5a8', crest: '#eab308', win: '#fef08a', winEmit: '#f59e0b', hearth: '#ffb703' },
};

export function applyCastleShellHouseTheme(wrapper, house = 'gryffindor', weather = 'day', isCommonRoom = false) {
  if (!wrapper) return;
  const th = isCommonRoom ? (CASTLE_HOUSE_ARCH_THEMES[house] || CASTLE_HOUSE_ARCH_THEMES.gryffindor) : CASTLE_HOUSE_ARCH_THEMES.gryffindor;
  const isNight = weather === 'night';
  wrapper.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    for (const mat of mats) {
      if (!mat) continue;
      const nm = mat.name || '';
      if (nm.startsWith('Mat_HouseWall')) setMatColor(mat, th.wall);
      else if (nm.startsWith('Mat_HouseTrim')) setMatColor(mat, th.trim);
      else if (nm.startsWith('Mat_FloorWood')) setMatColor(mat, th.floor);
      else if (nm.startsWith('Mat_HousePrimary')) setMatColor(mat, th.crest);
      else if (nm.startsWith('Mat_WindowPortal')) {
        const wCol = isNight && !isCommonRoom ? '#60a5fa' : th.win;
        const wEm = isNight && !isCommonRoom ? '#2563eb' : th.winEmit;
        setMatColor(mat, wCol, wEm, isNight ? 2.1 : 1.45);
      } else if (nm.startsWith('Mat_HearthGlow')) {
        setMatColor(mat, th.hearth, th.hearth, 2.3);
      }
    }
  });
}
