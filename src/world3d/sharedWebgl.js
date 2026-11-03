/**
 * Singleton WebGLRenderer Manager for Hogwarts Hybrid 3D (World + Match-3 Stage)
 * Uses a single shared Three.js WebGL context across both games and Match-3 to
 * guarantee zero browser WebGL context-limit exhaustion on desktop & mobile Safari/Chrome.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadPrefs } from '../utils/storage.js';

let sharedRenderer = null;
let sharedEnvMap = null;
let webglUnavailable = false;
let graphics3dPref = loadPrefs().graphics3d !== false;
let currentBufW = 0;
let currentBufH = 0;

export function isGraphics3dEnabled() {
  return graphics3dPref && !webglUnavailable;
}

export function setGraphics3dEnabled(enabled) {
  graphics3dPref = Boolean(enabled);
}

export function isWebglSupported() {
  if (webglUnavailable) return false;
  return Boolean(getSharedWebglRenderer());
}

export function getSharedWebglRenderer() {
  if (webglUnavailable) return null;
  if (sharedRenderer) return sharedRenderer;
  if (typeof document === 'undefined') return null;

  try {
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      webglUnavailable = true;
    });
    renderer.domElement.addEventListener('webglcontextrestored', () => {
      webglUnavailable = false;
      sharedEnvMap = null;
    });

    sharedRenderer = renderer;
    return sharedRenderer;
  } catch {
    webglUnavailable = true;
    return null;
  }
}

function attachStudioEnv(renderer, scene) {
  if (!scene || scene.environment) return;
  if (!sharedEnvMap) {
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envScene = new RoomEnvironment();
      sharedEnvMap = pmrem.fromScene(envScene, 0.04).texture;
      envScene.dispose?.();
      pmrem.dispose();
    } catch {
      return;
    }
  }
  scene.environment = sharedEnvMap;
  scene.environmentIntensity = 0.44;
}

function ensureBufferSize(renderer, pixelW, pixelH) {
  const pw = Math.max(64, Math.min(3840, Math.floor(pixelW)));
  const ph = Math.max(64, Math.min(2400, Math.floor(pixelH)));
  if (pw !== currentBufW || ph !== currentBufH) {
    renderer.setPixelRatio(1);
    renderer.setSize(pw, ph, false);
    currentBufW = pw;
    currentBufH = ph;
  }
  return { pw, ph };
}

/**
 * Renders a 3D scene at exact retina resolution and composites it 1:1 onto `#world-canvas`.
 */
export function renderWorldSceneTo2D(ctx2d, scene, camera, viewW, viewH) {
  if (!isGraphics3dEnabled() || !ctx2d?.canvas) return false;
  const renderer = getSharedWebglRenderer();
  if (!renderer) return false;

  const targetW = ctx2d.canvas.width || Math.floor(viewW);
  const targetH = ctx2d.canvas.height || Math.floor(viewH);
  const { pw, ph } = ensureBufferSize(renderer, targetW, targetH);

  attachStudioEnv(renderer, scene);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, pw, ph);
  renderer.clear();
  renderer.render(scene, camera);

  ctx2d.save();
  ctx2d.setTransform(1, 0, 0, 1, 0, 0);
  ctx2d.clearRect(0, 0, targetW, targetH);
  ctx2d.drawImage(renderer.domElement, 0, 0, pw, ph, 0, 0, targetW, targetH);
  ctx2d.restore();
  return true;
}

/**
 * Renders a 3D sub-scene (e.g. Match-3 3D Companion Stage) onto a dedicated 2D canvas.
 */
export function renderSceneToCanvas2D(canvas2d, scene, camera, cssW, cssH) {
  if (!isGraphics3dEnabled() || !canvas2d) return false;
  const renderer = getSharedWebglRenderer();
  if (!renderer) return false;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pw = Math.max(64, Math.floor(cssW * dpr));
  const ph = Math.max(64, Math.floor(cssH * dpr));
  if (canvas2d.width !== pw || canvas2d.height !== ph) {
    canvas2d.width = pw;
    canvas2d.height = ph;
  }

  ensureBufferSize(renderer, Math.max(currentBufW, pw), Math.max(currentBufH, ph));
  attachStudioEnv(renderer, scene);
  renderer.setScissorTest(true);
  renderer.setViewport(0, currentBufH - ph, pw, ph);
  renderer.setScissor(0, currentBufH - ph, pw, ph);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.setScissorTest(false);

  const cctx = canvas2d.getContext('2d');
  if (!cctx) return false;
  cctx.clearRect(0, 0, pw, ph);
  cctx.drawImage(renderer.domElement, 0, 0, pw, ph, 0, 0, pw, ph);
  return true;
}

/**
 * Renders 4 animated 3D Match-3 models into a 2x2 offscreen 2D atlas in a single WebGL frame.
 */
export function renderQuadrantsToAtlas(atlasCanvas, quadrants, cellPx = 128) {
  if (!isGraphics3dEnabled() || !atlasCanvas) return false;
  const renderer = getSharedWebglRenderer();
  if (!renderer) return false;

  const totalPx = cellPx * 2;
  if (atlasCanvas.width !== totalPx || atlasCanvas.height !== totalPx) {
    atlasCanvas.width = totalPx;
    atlasCanvas.height = totalPx;
  }

  ensureBufferSize(renderer, Math.max(currentBufW, totalPx), Math.max(currentBufH, totalPx));
  renderer.setScissorTest(true);

  for (let i = 0; i < quadrants.length; i++) {
    const q = quadrants[i];
    if (!q?.scene || !q?.camera) continue;
    attachStudioEnv(renderer, q.scene);
    const col = i % 2;
    const row = Math.floor(i / 2);
    const vx = col * cellPx;
    const vy = currentBufH - (row + 1) * cellPx;
    renderer.setViewport(vx, vy, cellPx, cellPx);
    renderer.setScissor(vx, vy, cellPx, cellPx);
    renderer.clear();
    renderer.render(q.scene, q.camera);
  }
  renderer.setScissorTest(false);

  const actx = atlasCanvas.getContext('2d');
  if (!actx) return false;
  actx.clearRect(0, 0, totalPx, totalPx);
  actx.drawImage(renderer.domElement, 0, 0, totalPx, totalPx, 0, 0, totalPx, totalPx);
  return true;
}
