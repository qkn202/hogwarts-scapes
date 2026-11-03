/**
 * Panoramic 9-Slot Anchor Layouts & Relic Renderers for Hogwarts Grounds (`gardenscapes`)
 * Supports all 7 Panoramic 2.5D Outdoor Backdrops (`garden_zone_0..6`) across 12 Zones!
 */

import { drawIsoDiamond, drawStyledPropSprite } from './isoMath.js';
import {
  drawCandleSparkles,
  drawDormantRuneSeal,
  drawEnchantedLakeBoat,
  drawHogwartsRuneCircle,
  drawPensieveWisps,
  drawTriwizardAura,
  drawWillowSpiritCascade,
} from './gardenscapesVfx.js';

export const GARDEN_ANCHORS = [
  // Zone 0: Clocktower Courtyard & Quidditch Pitch
  {
    path: [0.51, 0.67], centerpiece: [0.51, 0.58], flora: [0.27, 0.54],
    seating: [0.42, 0.44], lighting: [0.73, 0.55], special: [0.24, 0.77],
    fountain_wing: [0.13, 0.64], guardian: [0.84, 0.68], pavilion: [0.74, 0.83],
    austin: [0.60, 0.79], pet: [0.38, 0.82],
  },
  // Zone 1: Hagrid's Hut & Unicorn Forest Clearing
  {
    path: [0.49, 0.73], centerpiece: [0.70, 0.64], flora: [0.48, 0.47],
    seating: [0.33, 0.62], lighting: [0.20, 0.72], special: [0.80, 0.79],
    fountain_wing: [0.14, 0.52], guardian: [0.89, 0.56], pavilion: [0.30, 0.84],
    austin: [0.55, 0.83], pet: [0.42, 0.85],
  },
  // Zone 2: Hogwarts Black Lake & Boathouse
  {
    path: [0.64, 0.74], centerpiece: [0.52, 0.68], flora: [0.86, 0.77],
    seating: [0.74, 0.64], lighting: [0.83, 0.55], special: [0.44, 0.48],
    fountain_wing: [0.16, 0.81], guardian: [0.24, 0.58], pavilion: [0.11, 0.54],
    austin: [0.60, 0.83], pet: [0.49, 0.85],
  },
  // Zone 3: Herbology Greenhouses Courtyard
  {
    path: [0.47, 0.67], centerpiece: [0.35, 0.50], flora: [0.76, 0.79],
    seating: [0.22, 0.63], lighting: [0.68, 0.54], special: [0.47, 0.56],
    fountain_wing: [0.11, 0.65], guardian: [0.84, 0.66], pavilion: [0.18, 0.85],
    austin: [0.57, 0.79], pet: [0.37, 0.80],
  },
  // Zone 4: Whomping Willow Valley & Covered Wooden Bridge
  {
    path: [0.56, 0.62], centerpiece: [0.56, 0.50], flora: [0.15, 0.67],
    seating: [0.15, 0.41], lighting: [0.71, 0.41], special: [0.85, 0.67],
    fountain_wing: [0.32, 0.73], guardian: [0.88, 0.46], pavilion: [0.45, 0.84],
    austin: [0.58, 0.79], pet: [0.38, 0.83],
  },
  // Zone 5: Hogsmeade Village & Station 9¾ Viaduct
  {
    path: [0.55, 0.62], centerpiece: [0.55, 0.49], flora: [0.26, 0.53],
    seating: [0.76, 0.68], lighting: [0.38, 0.42], special: [0.15, 0.37],
    fountain_wing: [0.24, 0.70], guardian: [0.88, 0.76], pavilion: [0.49, 0.85],
    austin: [0.39, 0.78], pet: [0.58, 0.82],
  },
  // Zone 6: Trang Trại Hang Sóc — The Burrow (Weasley Family Farmstead)
  {
    path: [0.49, 0.75], centerpiece: [0.49, 0.61], flora: [0.23, 0.73],
    seating: [0.27, 0.48], lighting: [0.69, 0.65], special: [0.41, 0.40],
    fountain_wing: [0.12, 0.51], guardian: [0.85, 0.63], pavilion: [0.74, 0.86],
    austin: [0.58, 0.82], pet: [0.38, 0.84],
  },
];

export const ZONE_RELIC_PROPS = [
  // Scene 0: Clocktower / Quidditch
  {
    centerpiece: { key: 'g_prop_pensieve', size: 174, vfx: 'pensieve' },
    flora: { key: 'g_prop_triwizard', size: 152, vfx: 'sparks' },
    seating: { key: 'g_prop_telescope', size: 146 },
    lighting: { key: 'g_prop_candles', size: 164, vfx: 'candles' },
    special: { key: 'g_prop_owlery', size: 160 },
    fountain_wing: { key: 'g_prop_fountain', size: 154, vfx: 'water_arcs' },
    guardian: { key: 'g_prop_knight', size: 158, vfx: 'plinth' },
    pavilion: { key: 'g_prop_bench', size: 148, lamp: true },
  },
  // Scene 1: Hagrid's Hut / Unicorn Clearing
  {
    centerpiece: { key: 'g_prop_telescope', size: 150, flipX: true },
    flora: { key: 'g_prop_candles', size: 160, vfx: 'willow_shrine' },
    seating: { key: 'g_prop_gazebo', size: 182 },
    lighting: { key: 'g_prop_knight', size: 162 },
    special: { key: 'g_prop_owlery', size: 156 },
    fountain_wing: { key: 'g_prop_fountain', size: 148, vfx: 'water_arcs' },
    guardian: { key: 'g_prop_statue', size: 152, vfx: 'plinth' },
    pavilion: { key: 'g_prop_doghouse', size: 146, lamp: true },
  },
  // Scene 2: Black Lake & Boathouse
  {
    centerpiece: { key: 'g_prop_triwizard', size: 150, vfx: 'sparks' },
    flora: { key: 'g_prop_knight', size: 158, flipX: true },
    seating: { key: 'g_prop_gazebo', size: 184 },
    lighting: { key: 'g_prop_candles', size: 160, vfx: 'candles' },
    special: { key: 'g_prop_boat', size: 178, vfx: 'boat' },
    fountain_wing: { key: 'g_prop_fountain', size: 150, vfx: 'water_arcs' },
    guardian: { key: 'g_prop_statue', size: 148, vfx: 'plinth' },
    pavilion: { key: 'g_prop_bench', size: 144, lamp: true },
  },
  // Scene 3: Herbology Greenhouses
  {
    centerpiece: { key: 'g_prop_telescope', size: 146 },
    flora: { key: 'g_prop_triwizard', size: 152, vfx: 'sparks' },
    seating: { key: 'g_prop_gazebo', size: 180 },
    lighting: { key: 'g_prop_candles', size: 158, vfx: 'candles' },
    special: { key: 'g_prop_pensieve', size: 168, vfx: 'pensieve' },
    fountain_wing: { key: 'g_prop_fountain', size: 148, vfx: 'water_arcs' },
    guardian: { key: 'g_prop_statue', size: 150, vfx: 'plinth' },
    pavilion: { key: 'g_prop_bench', size: 146, lamp: true },
  },
  // Scene 4: Whomping Willow Valley & Covered Bridge
  {
    centerpiece: { key: 'g_prop_pensieve', size: 162, vfx: 'pensieve' },
    flora: { key: 'g_prop_triwizard', size: 148, vfx: 'sparks' },
    seating: { key: 'g_prop_gazebo', size: 178 },
    lighting: { key: 'g_prop_candles', size: 152, vfx: 'candles' },
    special: { key: 'g_prop_owlery', size: 162 },
    fountain_wing: { key: 'g_prop_fountain', size: 146, vfx: 'water_arcs' },
    guardian: { key: 'g_prop_knight', size: 152, vfx: 'plinth' },
    pavilion: { key: 'g_prop_bench', size: 148, lamp: true },
  },
  // Scene 5: Hogsmeade Village & Station 9¾
  {
    centerpiece: { key: 'g_prop_fountain', size: 166, vfx: 'water_arcs' },
    flora: { key: 'g_prop_triwizard', size: 150, vfx: 'sparks' },
    seating: { key: 'g_prop_gazebo', size: 178 },
    lighting: { key: 'g_prop_lamp', size: 148, vfx: 'candles' },
    special: { key: 'g_prop_owlery', size: 152 },
    fountain_wing: { key: 'g_prop_pensieve', size: 148, vfx: 'pensieve' },
    guardian: { key: 'g_prop_statue', size: 152, vfx: 'plinth' },
    pavilion: { key: 'g_prop_bench', size: 148, lamp: true },
  },
  // Scene 6: Trang Trại Hang Sóc — The Burrow
  {
    centerpiece: { key: 'g_prop_fountain', size: 162, vfx: 'water_arcs' },
    flora: { key: 'g_prop_triwizard', size: 148, vfx: 'sparks' },
    seating: { key: 'g_prop_gazebo', size: 180 },
    lighting: { key: 'g_prop_candles', size: 158, vfx: 'candles' },
    special: { key: 'g_prop_owlery', size: 158 },
    fountain_wing: { key: 'g_prop_pensieve', size: 150, vfx: 'pensieve' },
    guardian: { key: 'g_prop_knight', size: 154, vfx: 'plinth' },
    pavilion: { key: 'g_prop_bench', size: 148, lamp: true },
  },
];

function drawMagicalWaterArcs(ctx, x, y, sc, timeSec, style) {
  ctx.save();
  const col = style?.secondary || '#72efdd';
  ctx.strokeStyle = col;
  ctx.lineWidth = 2.1 * sc;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x, y - 22 * sc);
    ctx.quadraticCurveTo(x + dir * 18 * sc, y - (44 + Math.sin(timeSec * 5 + dir) * 5) * sc, x + dir * 28 * sc, y - 6 * sc);
    ctx.stroke();
  }
  ctx.fillStyle = style?.accent || '#ffffff';
  for (let i = 0; i < 4; i++) {
    const ph = (timeSec * 1.4 + i * 0.25) % 1;
    const dx = (i % 2 === 0 ? -1 : 1) * ph * 26 * sc;
    const dy = -22 * sc - Math.sin(ph * Math.PI) * 20 * sc + ph * 14 * sc;
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 2.2 * sc, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function renderGardenZoneSlots(renderer, ctx, area, scene, sc, timeSec) {
  const zoneMod = (area.sceneIndex ?? renderer.areaIndex) % GARDEN_ANCHORS.length;
  const anchors = GARDEN_ANCHORS[zoneMod] || GARDEN_ANCHORS[0];
  const relicMap = ZONE_RELIC_PROPS[zoneMod] || ZONE_RELIC_PROPS[0];

  const addSpot = (task, done) => {
    const [nx, ny] = anchors[task.slot] || [0.5, 0.6];
    const p = scene.pt(nx, ny);
    renderer.hotspots.push({
      task,
      nx,
      ny,
      x: p.x,
      y: p.y,
      pinY: p.y - 24 * sc,
      r: Math.max(30, 41 * sc),
      completed: done,
    });
    return p;
  };

  // 1. Central Rune Plaza ('path')
  const pathTask = area.tasks.find((t) => t.slot === 'path');
  const pathSt = renderer._getTaskStyle(pathTask);
  const pathPt = addSpot(pathTask, pathSt.done);
  if (pathSt.done) {
    drawHogwartsRuneCircle(ctx, pathPt.x, pathPt.y, sc, timeSec, pathSt.styleIdx, pathSt.style, pathSt.preview);
  } else {
    drawDormantRuneSeal(ctx, pathPt.x, pathPt.y, sc, timeSec);
  }

  // 2–9. Render all 8 3D Relics & Wing Landmarks sorted back-to-front by Y!
  const orderedSlots = ['flora', 'seating', 'lighting', 'centerpiece', 'special', 'fountain_wing', 'guardian', 'pavilion']
    .map((slot) => {
      const task = area.tasks.find((t) => t.slot === slot);
      if (!task) return null;
      const st = renderer._getTaskStyle(task);
      const pt = addSpot(task, st.done);
      return { slot, task, st, pt, spec: relicMap[slot] };
    })
    .filter(Boolean)
    .sort((a, b) => a.pt.y - b.pt.y);

  for (const { st, pt, spec } of orderedSlots) {
    if (!spec) continue;
    if (st.done) {
      if (spec.vfx === 'plinth') {
        drawIsoDiamond(ctx, pt.x, pt.y + 18 * sc, 36 * sc, 16 * sc, st.style?.secondary || '#1d3557', st.style?.primary || '#ffd166');
      }
      if (spec.vfx === 'boat') {
        drawEnchantedLakeBoat(ctx, pt.x, pt.y, sc, timeSec, st);
      } else if (spec.vfx === 'willow_shrine') {
        const willowKey = st.styleIdx === 0 ? 'g_prop_candles' : 'g_prop_willow';
        drawStyledPropSprite(ctx, willowKey, pt.x, pt.y, spec.size * sc, st.styleIdx === 0 ? 0 : st.styleIdx, {
          preview: st.preview,
          timeSec,
        });
        drawWillowSpiritCascade(ctx, pt.x, pt.y - 46 * sc, sc, timeSec, st.style);
      } else if (spec.key) {
        drawStyledPropSprite(ctx, spec.key, pt.x, pt.y, spec.size * sc, st.styleIdx, {
          flipX: Boolean(spec.flipX),
          preview: st.preview,
          timeSec,
        });
        if (spec.lamp) {
          drawStyledPropSprite(ctx, 'g_prop_lamp', pt.x + 36 * sc, pt.y - 12 * sc, 94 * sc, st.styleIdx, { timeSec });
        }
        if (spec.vfx === 'pensieve') {
          drawPensieveWisps(ctx, pt.x, pt.y - 34 * sc, sc, timeSec, st.style.primary);
        } else if (spec.vfx === 'candles') {
          drawCandleSparkles(ctx, pt.x, pt.y - 36 * sc, sc, timeSec, st.style.primary, st.style.accent);
        } else if (spec.vfx === 'sparks') {
          drawTriwizardAura(ctx, pt.x, pt.y - 26 * sc, sc, timeSec, st.style.primary);
        } else if (spec.vfx === 'water_arcs') {
          drawMagicalWaterArcs(ctx, pt.x, pt.y, sc, timeSec, st.style);
        }
      }
    } else if (spec.vfx !== 'boat') {
      drawDormantRuneSeal(ctx, pt.x, pt.y + 8 * sc, sc * 0.68, timeSec);
    }
  }
}
