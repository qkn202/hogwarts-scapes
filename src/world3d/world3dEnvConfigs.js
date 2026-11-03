/**
 * Declarative 100% Full 3D Scene Recipes (`world3dEnvConfigs.js`)
 * Calibrated for Playrix 32° Perspective Isometric Camera (`FOV 26°`, 1280×720 reference).
 */

export const OUTDOOR_3D_ENV_CONFIGS = [
  // Zone 0: Sân Tháp Đồng Hồ Hogwarts (& Đấu Trường Quidditch override)
  {
    id: 'garden_0',
    hero: { key: 'env_clocktower', x: 25, y: 0, z: -305, targetHeight: 305, rotY: 0 },
    hillColor: '#4c8b38',
    farHillColor: '#36683a',
    water: null,
    paths: [
      [0, 155, 25, -210, 130],
      [0, 155, -520, 40, 92],
      [0, 155, 520, 95, 92],
      [0, 155, 0, 580, 120],
    ],
    trees: [
      ['kit_tree_pine', -670, -290, 215, 0.2],
      ['kit_tree_pine', -520, -340, 228, 1.1],
      ['kit_tree_oak', -690, -35, 192, 0.5],
      ['kit_tree_pine', 680, -290, 220, -0.4],
      ['kit_tree_oak', 690, -20, 190, 1.8],
      ['kit_tree_oak', -650, 390, 195, 2.4],
      ['kit_tree_oak', 670, 400, 190, -1.2],
    ],
    bushes: [
      [-390, -160, 102, 0.3], [390, -160, 102, -0.6],
      [-460, 290, 108, 1.2], [460, 310, 108, -1.4],
      [-250, 450, 104, 0.8], [270, 460, 104, -0.5],
    ],
    fences: [
      [-560, -215, 155, 0.42], [560, -215, 155, -0.42],
    ],
    vegPatches: [],
    smokePoints: [],
  },

  // Zone 1: Chòi Đá Bác Hagrid, Vườn Bí Ngô & Rừng Cấm
  {
    id: 'garden_1',
    hero: { key: 'env_hagrid_hut', x: 315, y: 0, z: -245, targetHeight: 255, rotY: -0.26 },
    hillColor: '#3a7a34',
    farHillColor: '#1f4f32',
    water: { x: -610, z: -65, rx: 265, rz: 195, deep: '#16697a', shallow: '#48cae4' },
    paths: [
      [0, 155, 265, -135, 112],
      [0, 155, -390, -25, 92],
      [0, 155, 35, 580, 112],
    ],
    trees: [
      ['kit_tree_pine', -680, -320, 235, 0.4],
      ['kit_tree_pine', -460, -350, 245, 1.3],
      ['kit_tree_pine', -210, -360, 225, 2.1],
      ['kit_tree_oak', -390, -215, 195, 0.7],
      ['kit_tree_pine', 670, -300, 235, -0.6],
      ['kit_tree_pine', 730, -60, 215, 0.9],
      ['kit_tree_oak', -670, 280, 195, 1.5],
    ],
    bushes: [
      [-320, -110, 106, 0.4], [95, -235, 104, 1.7],
      [-470, 220, 110, -0.8], [580, 300, 108, 0.5],
    ],
    fences: [
      [-155, -245, 155, 0.12], [575, -80, 155, 1.35], [-485, 335, 155, 0.3],
    ],
    vegPatches: [[525, 145, -0.22], [-320, 345, 0.18]],
    smokePoints: [[395, 238, -265]],
  },

  // Zone 2: Hồ Đen Hogwarts & Bến Thuyền Cổ
  {
    id: 'garden_2',
    hero: { key: 'env_boathouse', x: 355, y: 0, z: -225, targetHeight: 248, rotY: -0.34 },
    hillColor: '#366948',
    farHillColor: '#1e3f46',
    water: { x: -290, z: -145, rx: 620, rz: 265, deep: '#0f4c5c', shallow: '#38a3a5' },
    paths: [
      [0, 155, 265, -75, 114],
      [0, 155, 470, 175, 94],
      [0, 155, -240, 460, 104],
    ],
    trees: [
      ['kit_tree_pine', -700, -360, 235, 0.3],
      ['kit_tree_pine', 675, -310, 228, 1.1],
      ['kit_tree_oak', 705, 55, 195, -0.7],
      ['kit_tree_pine', -665, 300, 215, 2.0],
      ['kit_tree_oak', 640, 395, 190, 0.4],
    ],
    bushes: [
      [145, -55, 102, 0.5], [545, -20, 108, -0.9],
      [-450, 265, 112, 1.1], [415, 395, 106, -0.4],
    ],
    fences: [[555, 185, 152, 1.2]],
    vegPatches: [],
    smokePoints: [],
  },

  // Zone 3: Nhà Kính Thảo Dược Học (Herbology Greenhouses)
  {
    id: 'garden_3',
    hero: { key: 'env_greenhouse', x: 10, y: 0, z: -295, targetHeight: 258, rotY: 0.12 },
    hillColor: '#529938',
    farHillColor: '#377432',
    water: { x: -620, z: 45, rx: 225, rz: 175, deep: '#1e81b0', shallow: '#64dfdf' },
    paths: [
      [0, 155, 10, -145, 124],
      [0, 155, -455, 40, 92],
      [0, 155, 465, 55, 92],
      [0, 155, 0, 580, 116],
    ],
    trees: [
      ['kit_tree_oak', -585, -295, 205, 0.6],
      ['kit_tree_oak', 595, -285, 205, -0.5],
      ['kit_tree_oak', -680, 320, 192, 1.4],
      ['kit_tree_oak', 680, 320, 192, -1.2],
    ],
    bushes: [
      [-315, -185, 110, 0.2], [325, -185, 110, -0.3],
      [-425, 210, 108, 1.0], [435, 210, 108, -1.0],
      [-265, 445, 105, 0.5], [265, 445, 105, -0.5],
    ],
    fences: [[-495, -245, 152, 0.35], [495, -245, 152, -0.35]],
    vegPatches: [[520, 225, -0.15]],
    smokePoints: [],
  },

  // Zone 4: Thung Lũng Cây Liễu Roi & Cầu Gỗ Có Mái
  {
    id: 'garden_4',
    hero: { key: 'env_covered_bridge', x: 55, y: 0, z: -285, targetHeight: 242, rotY: -0.14 },
    hillColor: '#45823b',
    farHillColor: '#295738',
    water: { x: -145, z: -225, rx: 215, rz: 310, deep: '#1b6ca8', shallow: '#56cfe1' },
    paths: [
      [0, 155, -215, -145, 108],
      [0, 155, 440, 40, 94],
      [0, 155, 20, 580, 114],
    ],
    trees: [
      ['kit_tree_pine', -660, -310, 228, 0.2],
      ['kit_tree_oak', -535, -115, 195, 1.1],
      ['kit_tree_pine', 660, -295, 232, -0.7],
      ['kit_tree_oak', 665, 185, 192, 0.8],
      ['kit_tree_pine', -630, 355, 212, 1.9],
    ],
    bushes: [
      [-385, 80, 106, 0.5], [440, -95, 108, -0.6],
      [-340, 420, 105, 1.3], [415, 410, 105, -1.1],
    ],
    fences: [[-445, -55, 152, 0.8], [525, 285, 152, -0.5]],
    vegPatches: [],
    smokePoints: [],
  },

  // Zone 5: Làng Phù Thủy Hogsmeade & Tàu Tốc Hành Hogwarts
  {
    id: 'garden_5',
    hero: { key: 'env_hogsmeade', x: 40, y: 0, z: -295, targetHeight: 254, rotY: -0.08 },
    hillColor: '#4f8a42',
    farHillColor: '#355f4b',
    water: null,
    paths: [
      [0, 155, -115, -155, 118],
      [0, 155, 435, 60, 98],
      [0, 155, -435, 75, 98],
      [0, 155, 0, 580, 118],
    ],
    trees: [
      ['kit_tree_pine', -680, -305, 228, 0.3],
      ['kit_tree_pine', -575, -115, 210, 1.2],
      ['kit_tree_pine', 695, -295, 232, -0.5],
      ['kit_tree_pine', 665, 135, 212, 0.9],
      ['kit_tree_pine', -635, 365, 218, 2.1],
    ],
    bushes: [
      [-395, -85, 104, 0.4], [450, -85, 104, -0.5],
      [-355, 420, 108, 1.0], [395, 420, 108, -0.8],
    ],
    fences: [[-520, 155, 150, 1.1], [545, 245, 150, -0.7]],
    vegPatches: [],
    smokePoints: [[-115, 245, -215], [225, 215, -210]],
  },

  // Zone 6: Trang Trại Hang Sóc — The Burrow (Weasley Family Farmstead)
  {
    id: 'garden_6',
    hero: { key: 'env_burrow_house', x: 365, y: 0, z: -205, targetHeight: 356, rotY: -0.34 },
    hillColor: '#5da632',
    farHillColor: '#418228',
    water: { x: -585, z: -55, rx: 325, rz: 225, deep: '#1e78a8', shallow: '#64dfdf' },
    millStream: { x: 485, z: -145, rx: 125, rz: 165, deep: '#1d70a2', shallow: '#72efdd' },
    paths: [
      [0, 155, 265, -95, 112],
      [0, 155, -330, -115, 98],
      [0, 155, -475, 205, 92],
      [0, 155, 435, 365, 104],
      [-95, 415, 205, 580, 110],
    ],
    trees: [
      ['kit_tree_oak', -445, -305, 202, 0.2],
      ['kit_tree_oak', -195, -335, 210, 1.4],
      ['kit_tree_oak', -655, -265, 192, 2.3],
      ['kit_tree_oak', 695, -235, 198, -0.8],
      ['kit_tree_oak', 715, 65, 206, 0.6],
      ['kit_tree_oak', -680, 340, 190, 1.1],
    ],
    bushes: [
      [-95, -205, 106, 0.4], [135, -185, 104, -0.5],
      [-345, 155, 108, 1.2], [545, -15, 102, -0.9],
      [-275, 460, 110, 0.7], [265, 475, 106, -1.1],
    ],
    fences: [
      [-515, -235, 155, 0.38], [-295, -275, 155, 0.12],
      [165, -135, 142, 0.48], [585, 235, 150, -0.52], [-525, 225, 150, 0.55],
    ],
    vegPatches: [[525, 155, -0.28], [-415, 340, 0.24]],
    smokePoints: [[345, 362, -222], [425, 265, -218]],
  },
];

export const CASTLE_3D_ENV_CONFIGS = [
  // Room 0: Circular Tower Common Room (4-House dynamic theme!)
  { id: 'castle_0', shellKey: 'env_castle_tower_room', isCommonRoom: true, scale: [170, 122, 174], pos: [0, 0, 78], sunbeam: true },
  // Room 1: Great Hall & Yule Ball
  { id: 'castle_1', shellKey: 'env_castle_greathall', isCommonRoom: false, scale: [172, 118, 176], pos: [0, 0, 78], sunbeam: true },
  // Room 2: Potions Dungeon & House-Elf Kitchens
  { id: 'castle_2', shellKey: 'env_castle_dungeon', isCommonRoom: false, scale: [170, 122, 174], pos: [0, 0, 78], sunbeam: false },
  // Room 3: Headmaster's Study & Trophy Gallery
  { id: 'castle_3', shellKey: 'env_castle_study_tower', isCommonRoom: false, scale: [170, 120, 174], pos: [0, 0, 78], sunbeam: true },
  // Room 4: Room of Requirement / Hospital Wing Cloister
  { id: 'castle_4', shellKey: 'env_castle_greathall', isCommonRoom: false, scale: [172, 118, 176], pos: [0, 0, 78], sunbeam: true },
  // Room 5: Astronomy & Divination Star Tower
  { id: 'castle_5', shellKey: 'env_castle_study_tower', isCommonRoom: false, scale: [170, 120, 174], pos: [0, 0, 78], sunbeam: true },
];
