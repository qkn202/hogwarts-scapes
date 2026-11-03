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

const WOOD_STYLE_HEX = ['#7f4f24', '#3d2618', '#9c4221'];
const STONE_STYLE_HEX = ['#b8afa1', '#94a3b8', '#d6c7a9'];
const MAGIC_STYLE_HEX = ['#38bdf8', '#34d399', '#c084fc'];

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
        // Calibrate ultra-dark robes/fur/metals so Playrix clay silhouettes gleam in daylight & candlelight
        root.traverse((n) => {
          if (!n.isMesh || !n.material) return;
          const mats = Array.isArray(n.material) ? n.material : [n.material];
          for (const m of mats) {
            if (!m?.color) continue;
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
  { castShadow = true, receiveShadow = true, centerXZ = false, centerY = false } = {}
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
  inner.position.set(
    centerXZ ? -entry.centerX : 0,
    centerY ? -entry.centerY : -entry.minY,
    centerXZ ? -entry.centerZ : 0
  );

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
 * Dynamically recolors a cloned 3D prop across Style 0, Style 1, Style 2 & House palettes!
 */
export function applyPropStyle3D(wrapper, rawKey, styleIdx = 0, style = null) {
  if (!wrapper) return;
  const sIdx = Math.max(0, Math.min(2, Number(styleIdx) || 0));
  const pri = style?.primary || null;
  const sec = style?.secondary || null;
  const acc = style?.accent || MAGIC_STYLE_HEX[sIdx];
  const isStatue = rawKey === 'g_prop_statue';

  wrapper.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    for (const mat of mats) {
      if (!mat) continue;
      const nm = mat.name || '';
      if (nm.startsWith('Mat_Primary')) {
        if (pri) setMatColor(mat, pri);
      } else if (nm.startsWith('Mat_Secondary')) {
        if (sec) setMatColor(mat, sec);
      } else if (nm.startsWith('Mat_Accent')) {
        setMatColor(mat, acc);
      } else if (
        nm.startsWith('Mat_WaterCyan') ||
        nm.startsWith('Mat_PotionGreen') ||
        nm.startsWith('Mat_PotionPurple') ||
        nm.startsWith('Mat_Emissive')
      ) {
        if (sIdx > 0 || style) {
          const glowCol = sIdx === 0 ? (pri || MAGIC_STYLE_HEX[0]) : (acc || pri || MAGIC_STYLE_HEX[sIdx]);
          setMatColor(mat, glowCol, glowCol, nm.startsWith('Mat_Emissive') ? 1.8 : 0.75);
        }
      } else if (nm.startsWith('Mat_Wood') || nm.startsWith('Mat_Walnut')) {
        if (sIdx > 0) setMatColor(mat, WOOD_STYLE_HEX[sIdx]);
      } else if (nm.startsWith('Mat_Stone') || nm.startsWith('Mat_Marble')) {
        if (isStatue) {
          setMatColor(mat, sIdx === 1 ? '#cbd5e1' : sIdx === 2 ? '#fde68a' : '#e7e5e4');
        } else if (sIdx > 0) {
          setMatColor(mat, STONE_STYLE_HEX[sIdx]);
        }
      } else if (isStatue && (nm.startsWith('Mat_Iron') || nm.startsWith('Mat_Steel'))) {
        // Distinguish guardian statues from dark iron knights with bright alabaster/bronze finish!
        setMatColor(mat, sIdx === 1 ? '#94a3b8' : sIdx === 2 ? '#eab308' : '#d6d3d1');
        mat.roughness = 0.36;
        mat.metalness = sIdx === 2 ? 0.72 : 0.25;
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
