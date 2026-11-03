/**
 * Harry Potter Reskin — HOGWARTS CASTLE ("Hogwartscapes" / Lâu Đài Hogwarts)
 * 12 Iconic Hogwarts Castle Chapters × 9 Magical Renovation Tasks = 108 Spots × 3 House/Style Variants!
 */

import { attachExtraHomeSlots } from './homescapesExtraSlots.js';
import { HOMESCAPES_CHAPTERS_9_TO_12 } from './homescapesStoryChapters9To12.js';
import { HOMESCAPES_EXTRA_AREAS } from './homescapesStoryExtra.js';
import { buildHouseChapter1 } from './houseCommonRooms.js';

export const HOMESCAPES_CHARACTERS = {
  austin: { name: 'Quản Gia Phép Thuật', role: 'Huynh trưởng Lâu đài', color: '#9b2226', avatar: '🧙‍♂️' },
  olivia: { name: 'Giáo Sư McGonagall', role: 'Chủ nhiệm Nhà Gryffindor', color: '#9b2226', avatar: '🧙‍♀️' },
  snape: { name: 'Giáo Sư Snape', role: 'Chủ nhiệm Nhà Slytherin', color: '#1b5e3a', avatar: '🧪' },
  flitwick: { name: 'Giáo Sư Flitwick', role: 'Chủ nhiệm Nhà Ravenclaw', color: '#1d3557', avatar: '🎼' },
  sprout: { name: 'Giáo Sư Sprout', role: 'Chủ nhiệm Nhà Hufflepuff', color: '#b07d12', avatar: '🌿' },
  william: { name: 'Cụ Dumbledore', role: 'Hiệu trưởng Hogwarts', color: '#5a189a', avatar: '🧔‍♂️' },
  cat: { name: 'Hedwig', role: 'Cú Tuyết đưa thư', color: '#f59f00', avatar: '🦉' },
};

const BASE_HOMESCAPES_AREAS = [
  {
    id: 1,
    dayLabel: 'Chương 2',
    name: 'Đại Sảnh Đường Hogwarts',
    subtitle: 'Thắp sáng bầu trời sao phép thuật và cầu thang cẩm thạch đón Đại Tiệc Phân Loại!',
    wallBase: ['#f8edeb', '#e8eef2', '#f3e9dc'],
    floorBase: ['#d9c5b2', '#9e7b66', '#cfd8dc'],
    cutscene: '🧔‍♂️ Cụ Dumbledore vỗ tay vang dội: "Bầu trời sao Đại Sảnh Đường chưa bao giờ lộng lẫy đến thế — mời đại tiệc bắt đầu!"',
    chestReward: { coins: 800, hand: 1, pre_rainbow: 1 },
    introDialogue: [
      { speaker: 'william', text: 'Chà, Đại Sảnh Đường cần được đánh thức phép thuật trước khi chiếc Nón Phân Loại cất tiếng hát!' },
      { speaker: 'austin', text: 'Thưa cụ Dumbledore, hàng trăm ngọn nến lơ lửng và cầu thang lớn sẽ tỏa sáng ngay lập tức!' },
    ],
    tasks: [
      {
        id: 'hh_wall',
        slot: 'floor',
        title: 'Đánh bóng nền đá phiến cổ Đại Sảnh Đường',
        cost: 1,
        icon: '🏛️',
        desc: 'Khôi phục mặt sàn đá cẩm thạch phản chiếu dải ngân hà trên trần sảnh.',
        styles: [
          { name: 'Đá Vàng Hoàng Kim', primary: '#e9d8a6', secondary: '#ca6702', accent: '#fffdf7' },
          { name: 'Cẩm Thạch Ánh Trăng', primary: '#cad2c5', secondary: '#354f52', accent: '#f4f9f9' },
          { name: 'Đá Hồng Ngọc Cổ', primary: '#b07d62', secondary: '#774936', accent: '#edc4b3' },
        ],
        afterDialogue: 'Nền đá sáng bóng soi rõ cả bầu trời đầy sao trên vòm trần phép thuật!',
      },
      {
        id: 'hh_stairs',
        slot: 'bed',
        title: 'Đặt trường kỷ nhung quý tộc sảnh chờ',
        cost: 2,
        icon: '🛋️',
        desc: 'Bố trí ghế trường kỷ chạm vàng dưới chân Cầu Thang Biến Đổi.',
        styles: [
          { name: 'Nhung Đỏ Viền Vàng', primary: '#9b2226', secondary: '#ffd166', accent: '#fff8e7' },
          { name: 'Nhung Lam Tinh Tú', primary: '#1d3557', secondary: '#f1faee', accent: '#ffd166' },
          { name: 'Nhung Lục Bảo Cổ', primary: '#2d6a4f', secondary: '#d8f3dc', accent: '#ffb703' },
        ],
        afterDialogue: 'Cầu thang phép thuật hôm nay ngoan ngoãn hẳn, không thèm đổi bậc trêu chọc ai nữa!',
      },
      {
        id: 'hh_chandelier',
        slot: 'curtain',
        title: 'Triệu hồi Đèn Chùm Nến Bay Ngân Hà',
        cost: 2,
        icon: '✨',
        desc: 'Treo đèn chùm vàng kết hợp hàng trăm ngọn nến lơ lửng giữa không trung.',
        styles: [
          { name: 'Lửa Vàng 24K', primary: '#ffb703', secondary: '#fff3b0', accent: '#ffffff' },
          { name: 'Tinh Tú Băng Lam', primary: '#90e0ef', secondary: '#0077b6', accent: '#ffffff' },
          { name: 'Hổ Phách Cổ Đại', primary: '#bc6c25', secondary: '#fefae0', accent: '#dda15e' },
        ],
        afterDialogue: 'Đẹp nghẹt thở! Bầu trời sao trên trần Đại Sảnh Đường đang lấp lánh hòa nhịp!',
      },
      {
        id: 'hh_runner',
        slot: 'rug',
        title: 'Trải thảm nghi lễ Tứ Đại Học Viện',
        cost: 2,
        icon: '🛡️',
        desc: 'Tấm thảm thêu biểu tượng Hogwarts dẫn thẳng tới bục Phân Loại.',
        styles: [
          { name: 'Thảm Đỏ Hoàng Tộc', primary: '#9e2a2b', secondary: '#ffb703', accent: '#fff3b0' },
          { name: 'Thảm Ngọc Bích Pháp Sư', primary: '#2d6a4f', secondary: '#b7e4c7', accent: '#d8f3dc' },
          { name: 'Thảm Tím Hội Phượng Hoàng', primary: '#5a189a', secondary: '#e0aaff', accent: '#f3d5b5' },
        ],
        afterDialogue: 'Các tân sinh viên bước trên tấm thảm này sẽ tự hào suốt đời!',
      },
      {
        id: 'hh_clock',
        slot: 'desk',
        title: 'Lắp bàn Sổ Đăng Ký Nhập Học & Bút Lông Phép',
        cost: 2,
        icon: '📖',
        desc: 'Đặt bàn gỗ cổ giữ Cuốn Sổ Ghi Danh tự động viết tên phù thủy trẻ.',
        styles: [
          { name: 'Gỗ Gụ Khóa Đồng', primary: '#582f0e', secondary: '#ffba08', accent: '#fff8e7' },
          { name: 'Gỗ Bạch Dương Bạc', primary: '#d6ccc2', secondary: '#4ea8de', accent: '#ffffff' },
          { name: 'Gỗ Đen Huyền Bí', primary: '#22223b', secondary: '#f9c74f', accent: '#f2e9e4' },
        ],
        afterDialogue: 'Cây bút lông ngỗng phép thuật vừa tự động chấm mực ghi danh thêm một học viên mới!',
      },
      {
        id: 'hh_console',
        slot: 'decor',
        title: 'Đặt đài hoa Snitch Vàng nghênh đón',
        cost: 2,
        icon: '🏆',
        desc: 'Trang trí đài đá cẩm thạch nở hoa hồng đỏ điểm xuyết cánh Snitch vàng.',
        styles: [
          { name: 'Đài Hoa Hồng Snitch Vàng', primary: '#c1121f', secondary: '#ffb703', accent: '#f1faee' },
          { name: 'Đài Hoa Lam Nguyệt Quế', primary: '#1d3557', secondary: '#90e0ef', accent: '#ffffff' },
          { name: 'Đài Hoa Ngọc Lục Bảo', primary: '#40916c', secondary: '#ffd166', accent: '#ffffff' },
        ],
        afterDialogue: 'Đại Sảnh Đường đã hoàn mỹ! Giờ hãy xuống Hầm Độc Dược & Bếp Lâu Đài chuẩn bị đại tiệc nhé!',
      },
    ],
  },
  {
    id: 2,
    dayLabel: 'Chương 3',
    name: 'Hầm Độc Dược & Bếp Gia Tinh',
    subtitle: 'Thắp lửa vạc đồng, sắp xếp kệ dược liệu phát sáng và bàn tiệc Bia Bơ!',
    wallBase: ['#fff3e0', '#e8f5e9', '#e3f2fd'],
    floorBase: ['#e0c097', '#cfd8dc', '#d7ccc8'],
    cutscene: '🍬 Các Gia Tinh Hogwarts reo hò dâng cốc Bia Bơ sủi bọt: "Gian bếp và hầm pha chế sáng bóng như phép màu của Merlin!"',
    chestReward: { coins: 1000, kettlebell: 1, pre_planes: 1 },
    introDialogue: [
      { speaker: 'olivia', text: 'Các gia tinh dưới bếp và phòng pha chế Độc Dược đang tất bật chuẩn bị cho đêm hội Halloween!' },
      { speaker: 'austin', text: 'Để con dựng bàn pha chế đá cẩm thạch và vạc đồng sôi sục giúp mọi người ngay!' },
    ],
    tasks: [
      {
        id: 'hk_tiles',
        slot: 'floor',
        title: 'Khôi phục nền gạch caro đá cổ chống cháy phép',
        cost: 1,
        icon: '🟧',
        desc: 'Đánh bóng nền gạch đất nung và đá vôi chịu nhiệt vạc độc dược.',
        styles: [
          { name: 'Đá Nung Hổ Phách', primary: '#d4a373', secondary: '#faedcd', accent: '#fefae0' },
          { name: 'Đá Lục Bảo Hầm Ngục', primary: '#2d6a4f', secondary: '#d8f3dc', accent: '#a8dadc' },
          { name: 'Đá Lam Hogsmeade', primary: '#457b9d', secondary: '#f1faee', accent: '#ffffff' },
        ],
        afterDialogue: 'Dù vạc thuốc có bắn tia lửa cũng không làm xước nổi nền đá phép thuật này!',
      },
      {
        id: 'hk_cabinets',
        slot: 'bed',
        title: 'Đặt bàn tra cứu công thức Độc Dược Hoàng Tử Lai',
        cost: 2,
        icon: '🧪',
        desc: 'Bàn gỗ sẫm bày sách Độc Dược nâng cao, cân đồng và đèn pha chế.',
        styles: [
          { name: 'Gỗ Sẫm Cổ Ngữ', primary: '#7f4f24', secondary: '#ffd166', accent: '#ffb703' },
          { name: 'Gỗ Rêu Slytherin', primary: '#2d6a4f', secondary: '#ede0d4', accent: '#52b788' },
          { name: 'Gỗ Đỏ Giả Kim', primary: '#9b2226', secondary: '#f3d5b5', accent: '#ffffff' },
        ],
        afterDialogue: 'Những bí kíp khuấy ngược chiều kim đồng hồ đã sẵn sàng trên mặt bàn!',
      },
      {
        id: 'hk_stove',
        slot: 'desk',
        title: 'Thắp lửa phép thuật dưới Vạc Đồng Lò Đá',
        cost: 2,
        icon: '🔥',
        desc: 'Nhóm ngọn lửa bất diệt sưởi ấm những chiếc vạc đồng treo trong lò đá.',
        styles: [
          { name: 'Lửa Cam Phượng Hoàng', primary: '#f77f00', secondary: '#fcbf49', accent: '#eae2b7' },
          { name: 'Lửa Lục Bột Floo', primary: '#2dc653', secondary: '#80ed99', accent: '#edf2f4' },
          { name: 'Lửa Lam Gubraithian', primary: '#00b4d8', secondary: '#90e0ef', accent: '#ffffff' },
        ],
        afterDialogue: 'Hương thơm bánh bí ngô và thuốc Phúc Lạc Dược lan tỏa khắp gian hầm!',
      },
      {
        id: 'hk_island',
        slot: 'rug',
        title: 'Dựng Đảo Pha Chế Cẩm Thạch & Vạc Vàng',
        cost: 2,
        icon: '⚗️',
        desc: 'Bàn đảo mặt đá trắng đặt vạc vàng đang sôi cùng bộ bình thủy tinh ngũ sắc.',
        styles: [
          { name: 'Đảo Đá Trắng Vạc Đồng', primary: '#8ecae6', secondary: '#ffffff', accent: '#ffb703' },
          { name: 'Đảo Ngọc Lục Giả Kim', primary: '#52b788', secondary: '#f5ebe0', accent: '#e76f51' },
          { name: 'Đảo Tím Tinh Linh', primary: '#7209b7', secondary: '#fefae0', accent: '#dda15e' },
        ],
        afterDialogue: 'Mặt đá mát lạnh, vạc đồng sủi tăm lấp lánh như kiệt tác của bậc thầy Độc Dược!',
      },
      {
        id: 'hk_table',
        slot: 'curtain',
        title: 'Treo Đèn Chùm Nến Phép Trần Vòm Đá',
        cost: 2,
        icon: '🕯️',
        desc: 'Thắp sáng vòm đá cổ bằng vòng đèn chùm nến vàng ấm áp.',
        styles: [
          { name: 'Đèn Chùm Vàng Ấm', primary: '#ffb703', secondary: '#f1faee', accent: '#ffd166' },
          { name: 'Đèn Chùm Lục Quang', primary: '#52b788', secondary: '#fefae0', accent: '#606c38' },
          { name: 'Đèn Chùm Pha Lê Tím', primary: '#9d4edd', secondary: '#ffffff', accent: '#e0aaff' },
        ],
        afterDialogue: 'Gian hầm đá giờ ấm cúng và rực rỡ chẳng kém phòng yến tiệc!',
      },
      {
        id: 'hk_tea',
        slot: 'decor',
        title: 'Đặt đài hoa Thảo Dược & Kẹo Công Tước',
        cost: 3,
        icon: '🍬',
        desc: 'Trang trí bình đá điêu khắc hoa phép thuật và cánh Snitch trước cửa vòm.',
        styles: [
          { name: 'Hoa Hồng Phép & Snitch', primary: '#d90429', secondary: '#ffbe0b', accent: '#fff0f3' },
          { name: 'Hoa Thảo Dược Bạc Hà', primary: '#2dc653', secondary: '#ffd166', accent: '#ffffff' },
          { name: 'Hoa Ánh Sao Tím', primary: '#9d4edd', secondary: '#4cc9f0', accent: '#ffffff' },
        ],
        afterDialogue: 'Tuyệt đỉnh! Giờ chỉ còn Tháp Hiệu Trưởng & Thư Viện Cấm là hoàn thành toàn bộ Lâu Đài!',
      },
    ],
  },
  {
    id: 3,
    dayLabel: 'Chương 4',
    name: 'Phòng Hiệu Trưởng & Thư Viện',
    subtitle: 'Hoàn thiện trái tim tri thức phép thuật bên cạnh Tưởng Ký và lò sưởi Bột Floo!',
    wallBase: ['#f5ebe0', '#eae4e9', '#e8f1f2'],
    floorBase: ['#9c6644', '#7f5539', '#b08968'],
    cutscene: '🦅 Phượng Hoàng Fawkes cất tiếng hót ngân vang quanh Tưởng Ký, chúc mừng bạn mở khóa 8 Chương Lâu Đài mở rộng kế tiếp!',
    chestReward: { coins: 1500, hammer: 2, hand: 1, pre_rainbow: 2 },
    introDialogue: [
      { speaker: 'william', text: 'Âm nhạc và phép thuật luôn hòa quyện tại căn phòng này... Hãy giúp ta khôi phục vẻ huy hoàng cho Tháp Hiệu Trưởng nhé!' },
      { speaker: 'austin', text: 'Rõ thưa cụ Dumbledore! Lò sưởi phép thuật và chiếc Đại Dương Cầm tự chơi nhạc sẽ ngân vang ngay!' },
    ],
    tasks: [
      {
        id: 'hl_parquet',
        slot: 'floor',
        title: 'Đánh bóng sàn gỗ xương cá cổ thụ ngàn năm',
        cost: 2,
        icon: '🪵',
        desc: 'Phục hồi mặt sàn gỗ ghép xương cá phản chiếu ánh sáng khung kính màu.',
        styles: [
          { name: 'Gỗ Hổ Phách Cổ Điển', primary: '#a47148', secondary: '#9b2226', accent: '#f9dcc4' },
          { name: 'Gỗ Gụ Đêm Trăng', primary: '#582f0e', secondary: '#ede0d4', accent: '#d4a373' },
          { name: 'Gỗ Sáng Phượng Hoàng', primary: '#ddb892', secondary: '#1d3557', accent: '#a8dadc' },
        ],
        afterDialogue: 'Những bức chân dung hiệu trưởng trên tường đều gật gù tán thưởng mặt sàn mới!',
      },
      {
        id: 'hl_fireplace',
        slot: 'curtain',
        title: 'Thắp Lò Sưởi Mạng Lưới Floo & Đèn Chùm Tháp',
        cost: 2,
        icon: '🔥',
        desc: 'Khơi bùng ngọn lửa phép thuật trong lò đá chạm khắc huy hiệu Hogwarts.',
        styles: [
          { name: 'Lửa Vàng Phượng Hoàng', primary: '#f8f9fa', secondary: '#ff7b00', accent: '#ffb703' },
          { name: 'Lửa Xanh Bột Floo', primary: '#2dc653', secondary: '#52b788', accent: '#d8f3dc' },
          { name: 'Lửa Tím Huyền Bí', primary: '#7209b7', secondary: '#c77dff', accent: '#ffd166' },
        ],
        afterDialogue: 'Ngọn lửa phép bập bùng sưởi ấm cả kho tàng sách cổ quý giá!',
      },
      {
        id: 'hl_sofa',
        slot: 'bed',
        title: 'Đặt Sofa Nhung Hoàng Gia tiếp đón Hội Phượng Hoàng',
        cost: 2,
        icon: '🛋️',
        desc: 'Bộ ghế sofa bọc nhung đỏ thêu chỉ vàng sang trọng giữa phòng.',
        styles: [
          { name: 'Nhung Đỏ Phượng Hoàng', primary: '#9b2226', secondary: '#ffd166', accent: '#fff0f3' },
          { name: 'Nhung Xanh Lục Bảo', primary: '#2d6a4f', secondary: '#ffd166', accent: '#d8f3dc' },
          { name: 'Nhung Tím Đạo Sĩ', primary: '#5a189a', secondary: '#ffccd5', accent: '#ffb703' },
        ],
        afterDialogue: 'Cụ Dumbledore vừa mời chúng ta dùng kẹo Chanh Giọt trên bộ sofa êm ái này!',
      },
      {
        id: 'hl_armchair',
        slot: 'rug',
        title: 'Trải Thảm Phép Thuật Hoàng Kim giữa thư viện',
        cost: 2,
        icon: '🦁',
        desc: 'Tấm thảm dệt biểu tượng Sư Tử vàng tôn vinh lòng quả cảm.',
        styles: [
          { name: 'Thảm Đỏ Vàng Hogwarts', primary: '#9b2226', secondary: '#f4a261', accent: '#fefae0' },
          { name: 'Thảm Xanh Tinh Tú', primary: '#1d3557', secondary: '#e9c46a', accent: '#f1faee' },
          { name: 'Thảm Ngọc Cổ Đại', primary: '#2d6a4f', secondary: '#ffd166', accent: '#f8f9fa' },
        ],
        afterDialogue: 'Hoa văn vàng óng của tấm thảm làm cả gian phòng bừng sáng uy nghiêm!',
      },
      {
        id: 'hl_piano',
        slot: 'desk',
        title: 'Đặt Đại Dương Cầm Tự Động Ngân Vang Bùa Nhạc',
        cost: 3,
        icon: '🎹',
        desc: 'Chiếc dương cầm gỗ gụ chạm vàng tự tấu lên giai điệu huyền diệu.',
        styles: [
          { name: 'Gỗ Gụ Khảm Vàng', primary: '#582f0e', secondary: '#ffd166', accent: '#ffffff' },
          { name: 'Dương Cầm Lam Ngọc', primary: '#1b263b', secondary: '#4cc9f0', accent: '#ffffff' },
          { name: 'Dương Cầm Tím Pháp Thuật', primary: '#5a189a', secondary: '#ffbe0b', accent: '#ffffff' },
        ],
        afterDialogue: 'Những nốt nhạc bằng vàng đang bay lơ lửng từ phím đàn kìa — kỳ diệu quá!',
      },
      {
        id: 'hl_bookcase',
        slot: 'decor',
        title: 'Đặt Đài Hoa Bảo Bối & Quả Cầu Snitch Kỷ Niệm',
        cost: 3,
        icon: '✨',
        desc: 'Hoàn thiện kiệt tác trang trí vinh danh Cúp Nhà danh giá.',
        styles: [
          { name: 'Đài Hoa Cúp Nhà Đỏ Vàng', primary: '#c1121f', secondary: '#ffb703', accent: '#e9c46a' },
          { name: 'Đài Hoa Ánh Bạc Tưởng Ký', primary: '#4ea8de', secondary: '#90e0ef', accent: '#ffffff' },
          { name: 'Đài Hoa Rừng Cấm Xanh', primary: '#2d6a4f', secondary: '#ee9b00', accent: '#e9d8a6' },
        ],
        afterDialogue: 'Tháp Hiệu Trưởng đã hoàn mỹ! Cùng khám phá 8 Chương mở rộng kế tiếp của Lâu Đài Hogwarts!',
      },
    ],
  },
  ...HOMESCAPES_EXTRA_AREAS,
];

const FIXED_CHAPTERS_2_TO_12 = [
  ...attachExtraHomeSlots(BASE_HOMESCAPES_AREAS),
  ...HOMESCAPES_CHAPTERS_9_TO_12,
];

export const HOMESCAPES_AREAS = [
  buildHouseChapter1('gryffindor'),
  ...FIXED_CHAPTERS_2_TO_12,
];

/**
 * Balanced Progression Star Cost across 12 Chapters × 9 Spots (108 spots/tier):
 * Chapter 1 starts at 1 ⭐..3 ⭐ so new players can decorate immediately, scaling smoothly up to Chapter 12!
 */
export function getHomeTaskDynamicCost(areaIndex, taskIndex, masteryTier = 0) {
  return 1 + Math.floor(areaIndex * 0.75) + Math.floor(taskIndex / 3) + Math.max(0, masteryTier) * 4;
}

/**
 * Returns Hogwarts Castle Rooms scaled for the player's current Castle Mastery Tier AND dynamic Chapter 1 House Common Room!
 */
export function getHomescapesAreasForTier(masteryTier = 0, house = 'gryffindor') {
  const tier = Math.max(0, Math.floor(Number(masteryTier) || 0));
  const tierBadge = tier > 0 ? ` ✦ Bậc Tinh Luyện ${tier + 1}` : '';
  const sourceAreas = [buildHouseChapter1(house), ...FIXED_CHAPTERS_2_TO_12];
  return sourceAreas.map((area, aIdx) => ({
    ...area,
    id: tier > 0 ? `${area.id}_t${tier}` : area.id,
    baseId: area.id,
    dayLabel: `${area.dayLabel}${tierBadge}`,
    chestReward: {
      coins: Math.round(area.chestReward.coins * (1 + tier * 0.5)),
      ...(area.chestReward.hammer ? { hammer: area.chestReward.hammer + Math.min(3, tier) } : {}),
      ...(area.chestReward.hand ? { hand: area.chestReward.hand + Math.min(2, tier) } : {}),
      ...(area.chestReward.kettlebell ? { kettlebell: area.chestReward.kettlebell + Math.min(2, tier) } : {}),
      ...(area.chestReward.pre_rainbow ? { pre_rainbow: area.chestReward.pre_rainbow + Math.min(2, tier) } : {}),
      ...(area.chestReward.pre_rocket_bomb ? { pre_rocket_bomb: area.chestReward.pre_rocket_bomb } : {}),
      ...(area.chestReward.pre_planes ? { pre_planes: area.chestReward.pre_planes } : {}),
    },
    tasks: area.tasks.map((t, tIdx) => ({
      ...t,
      cost: getHomeTaskDynamicCost(aIdx, tIdx, tier),
    })),
  }));
}
