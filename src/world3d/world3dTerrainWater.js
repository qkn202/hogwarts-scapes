/**
 * Full 3D Procedural Terrain, GLSL Sky Dome, Animated Reflective Water, Cobblestone Paths,
 * Vegetable Patches, Quidditch Towers, Volumetric Sunbeams & 3D Ground Decals (`world3dTerrainWater.js`)
 */

import * as THREE from 'three';

const TEX_CACHE = new Map();

function getProceduralRepeatTex(key, size, repeatX, repeatY, drawFn) {
  const fullKey = `${key}:${repeatX}:${repeatY}`;
  if (TEX_CACHE.has(fullKey)) return TEX_CACHE.get(fullKey);
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const g = cv.getContext('2d');
  drawFn(g, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  TEX_CACHE.set(fullKey, tex);
  return tex;
}

export function getLushGrassTexture(repeatX = 14, repeatY = 11, snowMode = false) {
  return getProceduralRepeatTex(snowMode ? 'snow_grass_v3' : 'meadow_grass_v3', 256, repeatX, repeatY, (g, s) => {
    g.fillStyle = snowMode ? '#dfecf8' : '#559b35';
    g.fillRect(0, 0, s, s);
    // Truly seamless wrapped meadow blades & clover tufts (zero tile seams!)
    for (let i = 0; i < 520; i++) {
      const x = (i * 89 + (i % 7) * 19) % s;
      const y = (i * 149 + (i % 11) * 23) % s;
      const dx = Math.cos(-1.25 + ((i * 19) % 10) * 0.06) * (5 + (i % 7));
      const dy = Math.sin(-1.25 + ((i * 19) % 10) * 0.06) * (5 + (i % 7));
      g.strokeStyle = snowMode
        ? (i % 2 === 0 ? 'rgba(255,255,255,0.42)' : 'rgba(182,210,238,0.34)')
        : (i % 3 === 0 ? 'rgba(116,184,56,0.32)' : i % 3 === 1 ? 'rgba(58,122,34,0.26)' : 'rgba(144,204,72,0.24)');
      g.lineWidth = 2.2;
      for (const ox of [-s, 0, s]) {
        for (const oy of [-s, 0, s]) {
          if (x + ox < -16 || x + ox > s + 16 || y + oy < -16 || y + oy > s + 16) continue;
          g.beginPath();
          g.moveTo(x + ox, y + oy);
          g.lineTo(x + ox + dx, y + oy + dy);
          g.stroke();
        }
      }
    }
    if (!snowMode) {
      for (let k = 0; k < 18; k++) {
        g.fillStyle = k % 2 === 0 ? 'rgba(255,245,176,0.82)' : 'rgba(255,255,255,0.78)';
        g.fillRect((k * 97 + 29) % (s - 8) + 4, (k * 53 + 41) % (s - 8) + 4, 2.4, 2.4);
      }
    }
  });
}

export function getCobblePathTexture(repeatX = 6, repeatY = 2) {
  return getProceduralRepeatTex('cobble_path', 256, repeatX, repeatY, (g, s) => {
    g.fillStyle = '#8d7f6c';
    g.fillRect(0, 0, s, s);
    const cols = 6;
    const rows = 6;
    const cw = s / cols;
    const ch = s / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ox = (r % 2) * (cw * 0.45);
        const cx = ((c * cw + ox) % s);
        const cy = r * ch + ch * 0.5;
        const shade = 185 + ((r * 17 + c * 31) % 38);
        g.fillStyle = `rgb(${shade}, ${shade - 12}, ${shade - 28})`;
        g.strokeStyle = 'rgba(72, 60, 46, 0.72)';
        g.lineWidth = 3;
        g.beginPath();
        g.roundRect(cx - cw * 0.42, cy - ch * 0.4, cw * 0.84, ch * 0.8, 8);
        g.fill();
        g.stroke();
      }
    }
  });
}

export function createSkyDome() {
  const geo = new THREE.SphereGeometry(5200, 32, 20);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTopCol: { value: new THREE.Color('#5a8fd8') },
      uMidCol: { value: new THREE.Color('#f7b267') },
      uBotCol: { value: new THREE.Color('#fde4a8') },
      uSunDir: { value: new THREE.Vector3(-0.45, 0.24, -0.86).normalize() },
      uSunCol: { value: new THREE.Color('#fff3c4') },
    },
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uTopCol;
      uniform vec3 uMidCol;
      uniform vec3 uBotCol;
      uniform vec3 uSunDir;
      uniform vec3 uSunCol;
      varying vec3 vWorldDir;
      void main() {
        float h = clamp(vWorldDir.y * 1.65 + 0.12, 0.0, 1.0);
        vec3 col = mix(uBotCol, uMidCol, smoothstep(0.0, 0.36, h));
        col = mix(col, uTopCol, smoothstep(0.32, 0.92, h));
        float sunDot = max(0.0, dot(normalize(vWorldDir), uSunDir));
        col += uSunCol * pow(sunDot, 18.0) * 0.55;
        col += uSunCol * pow(sunDot, 140.0) * 0.65;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -20;
  return mesh;
}

export function createAnimatedWaterMesh(rx = 340, rz = 230, deepHex = '#1d6fa5', shallowHex = '#56cfe1') {
  const geo = new THREE.CircleGeometry(1, 44);
  geo.rotateX(-Math.PI / 2);
  geo.scale(rx, 1, rz);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(deepHex) },
      uShallow: { value: new THREE.Color(shallowHex) },
      uSunGlow: { value: new THREE.Color('#ffea9c') },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vLocal;
      void main() {
        vUv = uv;
        vLocal = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSunGlow;
      varying vec2 vUv;
      varying vec3 vLocal;
      void main() {
        vec2 c = (vUv - 0.5) * 2.0;
        float dist = length(c);
        float w1 = sin(vLocal.x * 0.042 + uTime * 2.1 + sin(vLocal.z * 0.035)) * 0.5 + 0.5;
        float w2 = cos(vLocal.z * 0.055 - uTime * 1.7 + cos(vLocal.x * 0.03)) * 0.5 + 0.5;
        float ripple = (w1 * 0.55 + w2 * 0.45);
        vec3 col = mix(uDeep, uShallow, smoothstep(0.18, 0.92, dist) * 0.72 + ripple * 0.25);
        // Sun shimmer ribbon across pond
        float specBand = exp(-pow((c.x + 0.15 + sin(c.y * 5.0 + uTime * 2.0) * 0.08) * 3.4, 2.0));
        col += uSunGlow * specBand * (0.28 + 0.36 * pow(ripple, 3.0));
        // Soft shoreline foam
        float foam = smoothstep(0.86, 0.98, dist) * (0.55 + 0.45 * sin(dist * 28.0 - uTime * 3.0));
        col = mix(col, vec3(0.95, 0.98, 1.0), foam * 0.48);
        float alpha = 1.0 - smoothstep(0.94, 1.0, dist);
        gl_FragColor = vec4(col, alpha * 0.95);
      }
    `,
  });

  const group = new THREE.Group();
  const water = new THREE.Mesh(geo, mat);
  water.position.y = 1.2;
  group.add(water);
  group.userData.waterMat = mat;

  // Stone shoreline rim + floating 3D lilypads
  const rimGeo = new THREE.RingGeometry(0.94, 1.07, 40);
  rimGeo.rotateX(-Math.PI / 2);
  rimGeo.scale(rx, 1, rz);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x8d8273, roughness: 0.85 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.y = 0.8;
  rim.receiveShadow = true;
  group.add(rim);

  const padGeo = new THREE.CylinderGeometry(18, 18, 1.8, 12);
  const padMat = new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.65 });
  const lotusMat = new THREE.MeshStandardMaterial({ color: 0xffb3c6, roughness: 0.45 });
  const lotusGeo = new THREE.SphereGeometry(6.5, 8, 6);
  for (const [px, pz, hasFlower] of [[-0.38, -0.22, true], [0.28, 0.32, true], [-0.15, 0.44, false], [0.45, -0.18, false]]) {
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(px * rx, 2.1, pz * rz);
    group.add(pad);
    if (hasFlower) {
      const fl = new THREE.Mesh(lotusGeo, lotusMat);
      fl.position.set(px * rx, 5.2, pz * rz);
      group.add(fl);
    }
  }
  return group;
}

export function buildOutdoorTerrainGroup({ snow = false, hillColor = '#4a8c32', farHillColor = '#387236', paths = [] }) {
  const group = new THREE.Group();

  // 1. Main Sculpted 3D Lawn Mesh with gentle background elevation & flat Y=0 playable plaza
  const groundGeo = new THREE.PlaneGeometry(5400, 4200, 56, 44);
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x * 0.85, z - 80);
    const plazaFlat = Math.max(0, Math.min(1, (r - 620) / 520));
    const backSlope = z < -420 ? Math.pow((-420 - z) / 950, 1.35) * 145 : 0;
    const wave = (Math.sin(x * 0.0028) * Math.cos(z * 0.0032) + 0.5) * 26 * plazaFlat;
    pos.setY(i, backSlope + wave);
  }
  groundGeo.computeVertexNormals();
  const groundMat = new THREE.MeshStandardMaterial({
    map: getLushGrassTexture(22, 17, snow),
    roughness: 0.86,
    metalness: 0.0,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  group.add(ground);

  // 2. Multi-Layer 3D Rolling Background Hills for Rich Perspective Parallax!
  const hillSpecs = [
    [-1150, -1180, 1180, 250, 620, hillColor],
    [1080, -1140, 1240, 270, 640, hillColor],
    [-120, -1420, 1560, 320, 720, farHillColor],
    [-1680, -1580, 1320, 360, 680, farHillColor],
    [1680, -1560, 1360, 380, 680, farHillColor],
  ];
  const hillBaseGeo = new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.52);
  for (const [hx, hz, sx, sy, sz, hCol] of hillSpecs) {
    const hMat = new THREE.MeshStandardMaterial({
      color: snow ? '#dbeafe' : hCol,
      roughness: 0.88,
    });
    const hill = new THREE.Mesh(hillBaseGeo, hMat);
    hill.position.set(hx, -22, hz);
    hill.scale.set(sx, sy, sz);
    hill.receiveShadow = true;
    group.add(hill);
  }

  // 3. Central 3D Raised Cobblestone Plaza + Radiating 3D Stone Walkways
  const cobTex = getCobblePathTexture(5, 5);
  const plazaMat = new THREE.MeshStandardMaterial({ map: cobTex, roughness: 0.78 });
  const plazaGeo = new THREE.CylinderGeometry(285, 298, 5.5, 36);
  const plaza = new THREE.Mesh(plazaGeo, plazaMat);
  plaza.position.set(0, -1.2, 165);
  plaza.receiveShadow = true;
  group.add(plaza);

  for (const [x1, z1, x2, z2, width] of paths) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const pMat = new THREE.MeshStandardMaterial({
      map: getCobblePathTexture(Math.max(1, Math.round(width / 55)), Math.max(2, Math.round(len / 75))),
      roughness: 0.78,
    });
    const pGeo = new THREE.BoxGeometry(width, 5.5, len);
    const pMesh = new THREE.Mesh(pGeo, pMat);
    pMesh.position.set((x1 + x2) * 0.5, -1.0, (z1 + z2) * 0.5);
    pMesh.rotation.y = Math.atan2(dx, dz);
    pMesh.receiveShadow = true;
    group.add(pMesh);
  }

  return group;
}

export function createVegetablePatchGroup(x, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  const bedMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.92 });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x7c4d2b, roughness: 0.78 });
  const bed = new THREE.Mesh(new THREE.BoxGeometry(270, 10, 185), bedMat);
  bed.position.y = 5;
  bed.receiveShadow = true;
  g.add(bed);

  const rimL = new THREE.Mesh(new THREE.BoxGeometry(282, 16, 10), timberMat);
  rimL.position.set(0, 8, -94);
  const rimR = rimL.clone();
  rimR.position.set(0, 8, 94);
  g.add(rimL, rimR);

  const pumpMat = new THREE.MeshStandardMaterial({ color: 0xf77f00, roughness: 0.46 });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x386641, roughness: 0.7 });
  const cabMat = new THREE.MeshStandardMaterial({ color: 0x52b788, roughness: 0.62 });
  const pumpGeo = new THREE.SphereGeometry(19, 12, 9);
  pumpGeo.scale(1.18, 0.82, 1.18);
  const cabGeo = new THREE.DodecahedronGeometry(16, 1);

  for (let c = -2; c <= 2; c++) {
    const px = c * 48;
    const p = new THREE.Mesh(pumpGeo, pumpMat);
    p.position.set(px, 21, -42);
    p.castShadow = true;
    p.receiveShadow = true;
    const st = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.5, 9, 6), stemMat);
    st.position.set(px, 36, -42);
    g.add(p, st);

    const cb = new THREE.Mesh(cabGeo, cabMat);
    cb.position.set(px + 8, 19, 40);
    cb.castShadow = true;
    cb.receiveShadow = true;
    g.add(cb);
  }
  return g;
}

export function createQuidditchStadiumBackdrop() {
  const g = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.28, metalness: 0.72 });
  const towerCols = [0xa4161a, 0x1b7a46, 0x1d4ed8, 0xeab308];

  for (const [gx, gz, h] of [[-260, -560, 240], [0, -590, 290], [260, -560, 240]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(5, 7, h, 10), poleMat);
    pole.position.set(gx, h * 0.5, gz);
    pole.castShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(36, 5, 10, 24), poleMat);
    ring.position.set(gx, h + 34, gz);
    ring.castShadow = true;
    g.add(pole, ring);
  }
  for (let i = 0; i < 4; i++) {
    const tx = -640 + i * 425;
    const tMat = new THREE.MeshStandardMaterial({ color: towerCols[i], roughness: 0.65 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.52 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(42, 48, 260, 10), tMat);
    base.position.set(tx, 130, -680);
    base.castShadow = true;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(52, 110, 10), roofMat);
    cone.position.set(tx, 315, -680);
    g.add(base, cone);
  }
  return g;
}

export function createWindowSunbeamMesh(colorHex = '#ffea9c', opacity = 0.20) {
  const geo = new THREE.ConeGeometry(240, 620, 16, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(95, 165, -80);
  mesh.rotation.set(0.55, 0.25, 0.42);
  return mesh;
}

export function createGroundMedallionMesh() {
  const cv = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (cv) {
    cv.width = 256;
    cv.height = 256;
  }
  const tex = cv ? new THREE.CanvasTexture(cv) : null;
  if (tex) tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(310, 310);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 1.6;
  mesh.userData = { canvas: cv, tex, sig: '' };
  return mesh;
}

export function updateGroundMedallionCanvas(mesh, { isCastle, done, styleIdx, style, house }) {
  const { canvas: cv, tex } = mesh.userData;
  if (!cv || !tex) return;
  const pri = style?.primary || (house === 'slytherin' ? '#2ec4b6' : '#ffd166');
  const sec = style?.secondary || (isCastle ? '#9b2226' : '#f59e0b');
  const sig = `${isCastle ? 1 : 0}:${done ? 1 : 0}:${styleIdx}:${pri}:${sec}`;
  if (mesh.userData.sig === sig) return;
  mesh.userData.sig = sig;

  const g = cv.getContext('2d');
  g.clearRect(0, 0, 256, 256);
  g.save();
  g.translate(128, 128);

  if (!done) {
    g.strokeStyle = 'rgba(255, 224, 150, 0.42)';
    g.lineWidth = 4;
    g.setLineDash([10, 8]);
    g.beginPath();
    g.arc(0, 0, 96, 0, Math.PI * 2);
    g.stroke();
    g.restore();
    tex.needsUpdate = true;
    return;
  }

  if (isCastle) {
    g.fillStyle = sec;
    g.strokeStyle = pri;
    g.lineWidth = 6;
    g.beginPath();
    g.arc(0, 0, 104, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = pri;
    g.beginPath();
    g.arc(0, 0, 74, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = sec;
    g.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * 96, Math.sin(a) * 96);
      g.stroke();
    }
  } else {
    g.strokeStyle = pri;
    g.lineWidth = 6;
    g.beginPath();
    g.arc(0, 0, 108, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(0, 0, 82, 0, Math.PI * 2);
    g.stroke();
    for (let t = 0; t < 2; t++) {
      g.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = (t * Math.PI) / 3 + (k * Math.PI * 2) / 3 - Math.PI / 2;
        const x = Math.cos(a) * 102;
        const y = Math.sin(a) * 102;
        if (k === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.closePath();
      g.stroke();
    }
  }
  g.restore();
  tex.needsUpdate = true;
}

