/**
 * Panoramic 9-Slot Anchor Layouts & Extra 3-Style Castle Renderers (`banner`, `alcove`, `hearth`)
 * Supports all 6 Hogwarts Castle 2.5D Room Backdrops (`home_room_0..5`) across 12 Chapters!
 */

import { drawStyledPropSprite, fillPoly } from './isoMath.js';
import {
  drawDustPatch,
  drawEnchantedPropMotes,
  drawFireplaceFlames,
  drawMovingBoxProp,
  getCastleSlotScreenAndWorld,
} from './homescapesVfx.js';

export const ROOM_ANCHORS = [
  // Room 0: Gryffindor / Hufflepuff Circular Tower Room
  {
    floor: [0.50, 0.83], rug: [0.49, 0.70], curtain: [0.50, 0.21],
    bed: [0.35, 0.56], desk: [0.63, 0.58], decor: [0.27, 0.69],
    banner: [0.31, 0.36], alcove: [0.73, 0.66], hearth: [0.50, 0.45],
    austin: [0.41, 0.78], pet: [0.59, 0.80],
  },
  // Room 1: Great Hall & Grand Staircase
  {
    floor: [0.44, 0.82], rug: [0.44, 0.69], curtain: [0.47, 0.23],
    bed: [0.31, 0.60], desk: [0.54, 0.58], decor: [0.22, 0.70],
    banner: [0.31, 0.38], alcove: [0.70, 0.37], hearth: [0.63, 0.76],
    austin: [0.36, 0.77], pet: [0.52, 0.80],
  },
  // Room 2: Potions Dungeon & House-Elf Kitchens
  {
    floor: [0.50, 0.84], rug: [0.49, 0.67], curtain: [0.49, 0.21],
    bed: [0.24, 0.68], desk: [0.32, 0.51], decor: [0.66, 0.62],
    banner: [0.45, 0.34], alcove: [0.58, 0.48], hearth: [0.80, 0.66],
    austin: [0.38, 0.78], pet: [0.61, 0.80],
  },
  // Room 3: Headmaster's Study & Trophy Gallery
  {
    floor: [0.49, 0.84], rug: [0.48, 0.69], curtain: [0.23, 0.52],
    bed: [0.47, 0.54], desk: [0.65, 0.62], decor: [0.26, 0.72],
    banner: [0.29, 0.31], alcove: [0.77, 0.55], hearth: [0.64, 0.79],
    austin: [0.38, 0.78], pet: [0.53, 0.81],
  },
  // Room 4: Sunlit Hospital Wing & Gothic Cloister
  {
    floor: [0.50, 0.82], rug: [0.50, 0.67], curtain: [0.49, 0.20],
    bed: [0.36, 0.61], desk: [0.63, 0.59], decor: [0.28, 0.74],
    banner: [0.42, 0.34], alcove: [0.12, 0.54], hearth: [0.88, 0.56],
    austin: [0.43, 0.76], pet: [0.58, 0.79],
  },
  // Room 5: Divination Star Tower & Astral Gallery
  {
    floor: [0.49, 0.82], rug: [0.49, 0.68], curtain: [0.50, 0.22],
    bed: [0.34, 0.63], desk: [0.65, 0.62], decor: [0.25, 0.73],
    banner: [0.19, 0.42], alcove: [0.50, 0.43], hearth: [0.76, 0.71],
    austin: [0.41, 0.77], pet: [0.58, 0.79],
  },
];

/**
 * Draws 3-Style Hogwarts Silk Banner + Enchanted Crest Frame on Castle Walls (`banner` slot).
 */
export function drawCastleHouseBanner(ctx, x, y, sc, styleIdx = 0, style = null, timeSec = 0, preview = false) {
  const pri = style?.primary || '#9b2226';
  const sec = style?.secondary || '#ffb703';
  const acc = style?.accent || '#fff3b0';
  const sway = Math.sin(timeSec * 2.3 + x * 0.01) * 3.2 * sc;

  ctx.save();
  ctx.translate(x, y);
  if (preview) {
    const p = 1 + Math.sin(timeSec * 5.2) * 0.04;
    ctx.scale(p, p);
  }

  // Golden Hanging Rod + Finials
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 3.2 * sc;
  ctx.beginPath();
  ctx.moveTo(-36 * sc, -42 * sc);
  ctx.lineTo(36 * sc, -42 * sc);
  ctx.stroke();
  for (const sx of [-38, 38]) {
    ctx.fillStyle = sec;
    ctx.beginPath();
    ctx.arc(sx * sc, -42 * sc, 4.5 * sc, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3 Distinct Banner Silhouettes (0: Swallowtail Royal, 1: Pointed Astral Pennant, 2: Triptych Shield)
  const w = 28 * sc;
  const h = 44 * sc;
  let pts;
  if (styleIdx === 0) {
    pts = [
      { x: -w, y: -40 * sc },
      { x: w, y: -40 * sc },
      { x: w + sway, y: h * 0.72 },
      { x: sway * 0.7, y: h * 0.42 },
      { x: -w + sway, y: h * 0.72 },
    ];
  } else if (styleIdx === 1) {
    pts = [
      { x: -w * 0.92, y: -40 * sc },
      { x: w * 0.92, y: -40 * sc },
      { x: w * 0.85 + sway, y: h * 0.35 },
      { x: sway, y: h * 0.86 },
      { x: -w * 0.85 + sway, y: h * 0.35 },
    ];
  } else {
    pts = [
      { x: -w * 1.05, y: -40 * sc },
      { x: w * 1.05, y: -40 * sc },
      { x: w * 1.05 + sway, y: h * 0.52 },
      { x: w * 0.45 + sway, y: h * 0.74 },
      { x: -w * 0.45 + sway, y: h * 0.74 },
      { x: -w * 1.05 + sway, y: h * 0.52 },
    ];
  }
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 10 * sc;
  fillPoly(ctx, pts, pri, sec, 2.6 * sc);
  ctx.shadowBlur = 0;

  // Center Glowing House Medallion
  ctx.fillStyle = sec;
  ctx.strokeStyle = acc;
  ctx.lineWidth = 1.8 * sc;
  ctx.beginPath();
  ctx.arc(sway * 0.45, -8 * sc, 13 * sc, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.font = `${Math.round(15 * sc)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const crestGlyph = style?.crest || (styleIdx === 0 ? '🦁' : styleIdx === 1 ? '🦅' : '🛡️');
  ctx.fillText(crestGlyph, sway * 0.45, -7 * sc);

  if (preview) {
    ctx.strokeStyle = '#ffea9c';
    ctx.lineWidth = 2.4 * sc;
    ctx.beginPath();
    ctx.ellipse(0, -4 * sc, 42 * sc, 48 * sc, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

const ALCOVE_PROPS_BY_SCENE = [
  { key: 'g_prop_telescope', size: 128 },
  { key: 'g_prop_knight', size: 138 },
  { key: 'g_prop_triwizard', size: 128 },
  { key: 'g_prop_pensieve', size: 142 },
  { key: 'g_prop_fountain', size: 144 },
  { key: 'g_prop_telescope', size: 134 },
];

const HEARTH_PROPS_BY_SCENE = [
  { key: 'g_prop_candles', size: 132, flame: false },
  { key: 'g_prop_candles', size: 140, flame: true },
  { key: 'g_prop_owlery', size: 134, flame: false },
  { key: 'h_prop_catbed', size: 124, flame: true },
  { key: 'g_prop_candles', size: 136, flame: true },
  { key: 'g_prop_lamp', size: 132, flame: false },
];

/**
 * Renders the 3 extra panoramic Castle slots (`banner`, `alcove`, `hearth`) and registers their hotspots.
 */
export function renderExtraCastleSlots(
  renderer,
  ctx,
  area,
  scene,
  sc,
  timeSec,
  sceneIdx,
  addSpot,
  rendered3DIds = null,
  skipAddSpot = false
) {
  const anchors = ROOM_ANCHORS[sceneIdx % ROOM_ANCHORS.length] || ROOM_ANCHORS[0];
  const getPt = (task, done) => {
    if (!skipAddSpot) return addSpot(task, done);
    const [nx, ny] = anchors[task.slot] || [0.5, 0.6];
    return getCastleSlotScreenAndWorld(scene, task.slot, nx, ny);
  };

  // 7. Wall Banner & Enchanted Portrait ('banner')
  const bannerTask = area.tasks.find((t) => t.slot === 'banner');
  if (bannerTask) {
    const st = renderer._getTaskStyle(bannerTask);
    const pt = getPt(bannerTask, st.done);
    const has3D = Boolean(rendered3DIds && rendered3DIds.has(bannerTask.id));
    if (st.done) {
      if (!has3D) drawCastleHouseBanner(ctx, pt.x, pt.y, sc, st.styleIdx, st.style, timeSec, st.preview);
      drawEnchantedPropMotes(ctx, pt.x, pt.y - 10 * sc, sc * 0.85, timeSec, st.style?.secondary || '#ffd166');
    } else if (!scene?.isFull3D) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 224, 150, 0.34)';
      ctx.setLineDash([5 * sc, 4 * sc]);
      ctx.lineWidth = 2 * sc;
      ctx.strokeRect(pt.x - 24 * sc, pt.y - 36 * sc, 48 * sc, 64 * sc);
      ctx.restore();
    }
  }

  // 8. Side Wing Arcane Alcove ('alcove')
  const alcoveTask = area.tasks.find((t) => t.slot === 'alcove');
  if (alcoveTask) {
    const st = renderer._getTaskStyle(alcoveTask);
    const pt = getPt(alcoveTask, st.done);
    const spec = ALCOVE_PROPS_BY_SCENE[sceneIdx % ALCOVE_PROPS_BY_SCENE.length];
    const has3D = Boolean(rendered3DIds && rendered3DIds.has(alcoveTask.id));
    if (st.done) {
      if (!has3D) {
        drawStyledPropSprite(ctx, spec.key, pt.x, pt.y, spec.size * sc, st.styleIdx, {
          style: st.style,
          preview: st.preview,
          timeSec,
        });
      }
      drawEnchantedPropMotes(ctx, pt.x, pt.y - 26 * sc, sc * 0.9, timeSec, st.style?.primary || '#72efdd');
    } else if (!has3D) {
      drawMovingBoxProp(ctx, pt.x, pt.y, sc * 0.76);
    }
  }

  // 9. Wing Hearth / Candelabra / Magical Perch ('hearth')
  const hearthTask = area.tasks.find((t) => t.slot === 'hearth');
  if (hearthTask) {
    const st = renderer._getTaskStyle(hearthTask);
    const pt = getPt(hearthTask, st.done);
    const spec = HEARTH_PROPS_BY_SCENE[sceneIdx % HEARTH_PROPS_BY_SCENE.length];
    const has3D = Boolean(rendered3DIds && rendered3DIds.has(hearthTask.id));
    if (st.done) {
      if (spec.flame) {
        drawFireplaceFlames(ctx, pt.x, pt.y + 4 * sc, sc * 0.76, timeSec, st.styleIdx, st.style);
      }
      if (!has3D) {
        drawStyledPropSprite(ctx, spec.key, pt.x, pt.y, spec.size * sc, st.styleIdx, {
          style: st.style,
          preview: st.preview,
          timeSec,
        });
      }
    } else if (!skipAddSpot) {
      drawDustPatch(ctx, pt.x, pt.y + 6 * sc, sc * 0.8);
    }
  }
}
