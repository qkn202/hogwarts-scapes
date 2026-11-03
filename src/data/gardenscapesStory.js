/**
 * Harry Potter Hogwarts Grounds — Authentic Relics & Architecture Storyline
 * 12 Iconic Zones × 9 Magical Relics = 108 Customization Spots × 3 Distinct 3D Style Variants!
 */

import { attachExtraGardenSlots } from './gardenscapesExtraSlots.js';
import { GARDENSCAPES_EXTRA_AREAS } from './gardenscapesStoryExtra.js';
import { GARDENSCAPES_ZONES_9_TO_12 } from './gardenscapesStoryZones9To12.js';

export const GARDENSCAPES_CHARACTERS = {
  austin: { name: 'Huynh Trưởng Thảo Dược', role: 'Pháp sư Khuôn Viên Hogwarts', color: '#166541', avatar: '🧙‍♂️' },
  puppy: { name: 'Niffler', role: 'Nhím Mỏ Vịt săn Galleon', color: '#d4af37', avatar: '🐾' },
  robbie: { name: 'Bác Hagrid', role: 'Người giữ khóa & Rừng Cấm', color: '#7f4f24', avatar: '🧔' },
  martha: { name: 'Giáo Sư Sprout', role: 'Chủ nhiệm Thảo Dược Học', color: '#2d8a5e', avatar: '👩‍🌾' },
  molly: { name: 'Bà Molly Weasley', role: 'Chủ nhân Trang Trại Hang Sóc', color: '#c1121f', avatar: '🧶' },
  arthur: { name: 'Ông Arthur Weasley', role: 'Trưởng phòng Đồ Tạo Tác Muggle', color: '#d97706', avatar: '🚗' },
};

const STYLES_PENSIEVE = [
  { name: 'Chậu Đá Cổ Ngữ Bạc Lam', primary: '#72efdd', secondary: '#d4af37', accent: '#ffffff' },
  { name: 'Đài Ngọc Lục Rắn Slytherin', primary: '#38b87c', secondary: '#adb5bd', accent: '#d8f3dc' },
  { name: 'Đài Phượng Hoàng Vàng Ròng', primary: '#ffb703', secondary: '#e09f3e', accent: '#fff3b0' },
];

const STYLES_TRIWIZARD = [
  { name: 'Cúp Pha Lê Tam Pháp Thuật', primary: '#48cae4', secondary: '#d4af37', accent: '#ffffff' },
  { name: 'Cúp Lửa Goblet of Fire', primary: '#7b2cbf', secondary: '#b5172c', accent: '#e0aaff' },
  { name: 'Cúp Vàng Quidditch Snitch', primary: '#ffd166', secondary: '#c1121f', accent: '#ffffff' },
];

const STYLES_KNIGHT = [
  { name: 'Hiệp Sĩ Thép Khiên Hogwarts', primary: '#2d8a5e', secondary: '#adb5bd', accent: '#ffd166' },
  { name: 'Vua Cờ Cẩm Thạch Đỏ Vàng', primary: '#f8f9fa', secondary: '#c1121f', accent: '#ffd166' },
  { name: 'Hộ Vệ Đại Bàng Đồng Lam', primary: '#1d4ed8', secondary: '#cd7f32', accent: '#72efdd' },
];

const STYLES_CANDLES = [
  { name: 'Đèn Ngọc Lục & Nến Trắng', primary: '#ffd166', secondary: '#2d8a5e', accent: '#fffdf5' },
  { name: 'Đèn Hồng Ngọc Vàng Đỏ', primary: '#e63946', secondary: '#ffb703', accent: '#ffe5ec' },
  { name: 'Đèn Trăng Khuyết Bạc Lam', primary: '#48cae4', secondary: '#ced4da', accent: '#e0fbfc' },
];

const STYLES_TELESCOPE = [
  { name: 'Kính Đơn Đồng Thau Cổ Điển', primary: '#d4af37', secondary: '#2d8a5e', accent: '#fff3b0' },
  { name: 'Kính Đôi Bạc Lam Ravenclaw', primary: '#1d4ed8', secondary: '#ced4da', accent: '#ffffff' },
  { name: 'Kính Rồng Vàng Sơn Mài Đỏ', primary: '#b5172c', secondary: '#ffd166', accent: '#fde4cf' },
];

const STYLES_GAZEBO = [
  { name: 'Đình Đá Vòm Sao Đêm Lam', primary: '#1d3557', secondary: '#d4af37', accent: '#2d8a5e' },
  { name: 'Đình Kính Màu Ngọc Lục Vàng', primary: '#38b87c', secondary: '#d4af37', accent: '#d8f3dc' },
  { name: 'Đình Tháp Ngói Đỏ Phượng Hoàng', primary: '#9b2226', secondary: '#ffb703', accent: '#fff3b0' },
];

const STYLES_OWLERY = [
  { name: 'Cú Tuyết Hedwig & Rương Vàng', primary: '#f8f9fa', secondary: '#ffd166', accent: '#38b87c' },
  { name: 'Phượng Hoàng Fawkes & Hồng Ngọc', primary: '#e63946', secondary: '#ffb703', accent: '#ffe5ec' },
  { name: 'Tháp Cú Sồi & Rương Trứng Rồng', primary: '#7f4f24', secondary: '#38b87c', accent: '#ffd166' },
];

const STYLES_BOAT = [
  { name: 'Thuyền Gỗ Đầu Rồng Vàng', primary: '#38b87c', secondary: '#d4af37', accent: '#ffd166' },
  { name: 'Thuyền Thiên Nga Bạc Pha Lê', primary: '#72efdd', secondary: '#1d4ed8', accent: '#ffffff' },
  { name: 'Chiến Thuyền Đầu Sư Tử Lửa', primary: '#ff7b00', secondary: '#9b2226', accent: '#ffd166' },
];

const STYLES_PLAZA = [
  { name: 'Pháp Trận Sao Vàng 8 Cánh', primary: '#ffd166', secondary: '#166541', accent: '#fffdf0' },
  { name: 'Khảm Kim Cương Ngọc Lục Bảo', primary: '#38b87c', secondary: '#0b3923', accent: '#b7e4c7' },
  { name: 'Phù Ấn Trăng Khuyết Ngân Hà', primary: '#48cae4', secondary: '#1d3557', accent: '#e0fbfc' },
];

const BASE_GARDENSCAPES_AREAS = [
  {
    id: 0,
    dayLabel: 'Khu Vực 1',
    name: 'Sân Tháp Đồng Hồ Hogwarts',
    subtitle: 'Khôi phục cổ vật pháp thuật và kiến trúc cổ ngữ ngay tâm Sân Tháp Đồng Hồ!',
    skyPalette: ['#fbf3de', '#e8f5ee', '#f6e7c8'],
    turfPalette: ['#2d8a5e', '#1e6b47', '#3ca370'],
    cutscene: '🕰️ Chuông Tháp Đồng Hồ ngân vang 12 tiếng vàng rền: Niffler nhảy múa quanh Đài Tưởng Ký chúc mừng bạn hoàn tất Khu Vực 1!',
    chestReward: { coins: 650, shovel: 1, pre_bomb_dynamite: 1 },
    introDialogue: [
      { speaker: 'austin', text: 'Chào mừng tới Sân Tháp Đồng Hồ Hogwarts! Mỗi bệ cổ vật đều có 3 bảo vật hoàn toàn khác nhau để bạn lựa chọn!' },
      { speaker: 'puppy', text: '*Khịt khịt!* Niffler vừa tha về một đồng Galleon vàng lấp lánh ngay giữa vòng tròn cổ ngữ!' },
    ],
    tasks: [
      {
        id: 'gf_path',
        slot: 'path',
        title: 'Khắc sáng Pháp Trận Cổ Ngữ giữa quảng trường đá',
        cost: 1,
        icon: '🔯',
        desc: 'Chọn giữa Pháp Trận Sao Vàng 8 Cánh, Khảm Ngọc Lục Bảo hoặc Phù Ấn Trăng Khuyết.',
        styles: STYLES_PLAZA,
        afterDialogue: 'Lumos Maxima! Pháp trận cổ ngữ và 4 trụ ngọc quanh quảng trường đá đã bừng sáng!',
      },
      {
        id: 'gf_fountain',
        slot: 'centerpiece',
        title: 'An vị Đài Tưởng Ký Pensieve xoay dòng ký ức',
        cost: 1,
        icon: '🌀',
        desc: 'Chọn Chậu Đá Bạc Lam, Đài Ngọc Lục Rắn Slytherin hoặc Đài Phượng Hoàng Vàng Ròng.',
        styles: STYLES_PENSIEVE,
        afterDialogue: 'Đài Tưởng Ký Pensieve tuyệt mỹ đang cuộn trào những dải ký ức phép thuật!',
      },
      {
        id: 'gf_flowers',
        slot: 'flora',
        title: 'Dựng Cúp Vinh Quang Hogwarts tỏa hào quang',
        cost: 1,
        icon: '🏆',
        desc: 'Chọn Cúp Pha Lê Tam Pháp Thuật, Cúp Lửa Goblet of Fire hoặc Cúp Vàng Quidditch Snitch.',
        styles: STYLES_TRIWIZARD,
        afterDialogue: 'Chiếc cúp huyền thoại rực sáng khiến cả hành lang đá Sân Tháp trầm trồ!',
      },
      {
        id: 'gf_bench',
        slot: 'seating',
        title: 'Lắp Đài Kính Viễn Vọng Thiên Văn Hogwarts',
        cost: 2,
        icon: '🔭',
        desc: 'Chọn Kính Đồng Cổ Điển, Kính Đôi Bạc Lam Ravenclaw hoặc Kính Rồng Vàng Sơn Mài Đỏ.',
        styles: STYLES_TELESCOPE,
        afterDialogue: 'Từ Sân Tháp Đồng Hồ giờ có thể ngắm trọn chòm sao Nhân Mã và Mộc Tinh!',
      },
      {
        id: 'gf_lamps',
        slot: 'lighting',
        title: 'Thắp Trụ Đèn Lồng & Chùm Nến Bay Phép Thuật',
        cost: 2,
        icon: '🕯️',
        desc: 'Chọn Đèn Ngọc Lục, Đèn Hồng Ngọc Vàng Đỏ hoặc Đèn Trăng Khuyết Bạc Lam.',
        styles: STYLES_CANDLES,
        afterDialogue: 'Những ngọn nến bay bập bùng sưởi ấm cả Sân Tháp Đồng Hồ lúc hoàng hôn!',
      },
      {
        id: 'gf_doghouse',
        slot: 'special',
        title: 'Xây Đài Linh Thú Đưa Thư & Rương Kho Báu',
        cost: 2,
        icon: '🦉',
        desc: 'Chọn Cú Tuyết Hedwig, Phượng Hoàng Lửa Fawkes hoặc Tháp Cú & Rương Trứng Rồng.',
        styles: STYLES_OWLERY,
        afterDialogue: 'Linh thú Hogwarts và rương báu đã an vị! Khu Vực 1 hoàn tất 100%!',
      },
    ],
  },
  {
    id: 1,
    dayLabel: 'Khu Vực 2',
    name: 'Chòi Bác Hagrid & Rừng Cấm',
    subtitle: 'Bố trí Tượng Hộ Vệ, Đình Vòm Phép và Bệ Rễ Cổ Ngữ quanh chòi đá của bác Hagrid!',
    skyPalette: ['#e6f7d9', '#fff4d9', '#e0f4ff'],
    turfPalette: ['#2d8a5e', '#38b000', '#1b6944'],
    cutscene: '🧔 Bác Hagrid vỗ vai bạn cười ha hả: "Bìa Rừng Cấm chưa bao giờ ấm cúng và uy nghiêm đến vậy! Thẳng tiến ra Hồ Đen thôi bồ!"',
    chestReward: { coins: 900, glove: 1, pre_rainbow: 1 },
    introDialogue: [
      { speaker: 'robbie', text: 'Chào bồ! Khoảng sân trước chòi của bác sát bìa Rừng Cấm nên cần thêm Tượng Hộ Vệ và Đình Phép!' },
      { speaker: 'austin', text: 'Bác Hagrid yên tâm! Mình mang tới 3 mẫu cổ vật khác hẳn nhau cho từng vị trí luôn!' },
    ],
    tasks: [
      {
        id: 'gt_lawn',
        slot: 'path',
        title: 'Kích hoạt Pháp Trận Bảo Hộ sân cỏ chòi Hagrid',
        cost: 1,
        icon: '🌿',
        desc: 'Chọn Pháp Trận Sao Vàng, Khảm Ngọc Lục Bảo hoặc Phù Ấn Trăng Khuyết giữa vòng đá.',
        styles: STYLES_PLAZA,
        afterDialogue: 'Vòng đá tròn trước chòi bác Hagrid đã tỏa hào quang ấm áp xua tan sương mù!',
      },
      {
        id: 'gt_tree',
        slot: 'flora',
        title: 'Dựng Điện Thờ Cổ Thụ & Tinh Linh Rừng Cấm',
        cost: 2,
        icon: '🌳',
        desc: 'Chọn Trụ Đèn Nến Vàng, Bệ Rễ Đá Lửa Lam Bluebell hoặc Vòm Đá Hoa Tử Đằng Tím.',
        styles: [
          { name: 'Trụ Đèn Lồng & Đom Đóm Vàng', primary: '#ffd166', secondary: '#2d8a5e', accent: '#fff3b0' },
          { name: 'Bệ Rễ Cổ Ngữ Lửa Lam Bluebell', primary: '#48cae4', secondary: '#166541', accent: '#caf0f8' },
          { name: 'Vòm Đá Hoa Tử Đằng & Đèn Tiên', primary: '#c77dff', secondary: '#ffd166', accent: '#fff3b0' },
        ],
        afterDialogue: 'Dưới gốc đại thụ Rừng Cấm nay bừng sáng cổ ngữ và mưa bụi tinh linh huyền ảo!',
      },
      {
        id: 'gt_treehouse',
        slot: 'centerpiece',
        title: 'Đặt Kính Viễn Vọng quan sát chòm sao Nhân Mã',
        cost: 2,
        icon: '🔭',
        desc: 'Chọn Kính Đồng Cổ Điển, Kính Đôi Bạc Lam hoặc Kính Rồng Vàng Sơn Mài Đỏ.',
        styles: STYLES_TELESCOPE,
        afterDialogue: 'Hỏa Tinh hôm nay sáng lạ thường — đúng như lời các Nhân Mã trong Rừng Cấm dự báo!',
      },
      {
        id: 'gt_swing',
        slot: 'seating',
        title: 'Dựng Đình Vọng Lâu Hogwarts bên vườn bí ngô',
        cost: 2,
        icon: '🏛️',
        desc: 'Chọn Đình Đá Vòm Sao Lam, Đình Kính Màu Ngọc Lục hoặc Đình Tháp Ngói Đỏ Phượng Hoàng.',
        styles: STYLES_GAZEBO,
        afterDialogue: 'Học viên lớp Chăm Sóc Sinh Vật Huyền Bí đã có tòa vọng lâu trú mưa tuyệt đẹp!',
      },
      {
        id: 'gt_picnic',
        slot: 'special',
        title: 'Đặt Đài Linh Thú & Rương Kho Báu cạnh hiên chòi',
        cost: 2,
        icon: '💰',
        desc: 'Chọn Cú Tuyết Hedwig, Phượng Hoàng Fawkes hoặc Tháp Cú Sồi & Trứng Rồng.',
        styles: STYLES_OWLERY,
        afterDialogue: 'Bé Niffler nhảy cẫng lên sung sướng bên chiếc rương báu lấp lánh!',
      },
      {
        id: 'gt_hedge',
        slot: 'lighting',
        title: 'Triệu hồi Tượng Chiến Binh Phép canh bìa rừng',
        cost: 2,
        icon: '🛡️',
        desc: 'Chọn Hiệp Sĩ Thép Khiên H, Vua Cờ Cẩm Thạch Đỏ Vàng hoặc Hộ Vệ Đại Bàng Đồng Lam.',
        styles: STYLES_KNIGHT,
        afterDialogue: 'Tượng Chiến Binh Phép đã dộng vũ khí chào nghiêm trang! Chòi Bác Hagrid hoàn tất!',
      },
    ],
  },
  {
    id: 2,
    dayLabel: 'Khu Vực 3',
    name: 'Hồ Đen Hogwarts & Bến Thuyền',
    subtitle: 'Hạ thủy Thuyền Phép và kiến tạo đài vọng cảnh cổ vật bên bờ Hồ Đen!',
    skyPalette: ['#fce4ec', '#e0f2f1', '#fff8e1'],
    turfPalette: ['#166541', '#2d8a5e', '#0f4c35'],
    cutscene: '🌊 Chú Mực Khổng Lồ dưới Hồ Đen khẽ vẫy xúc tu chào những chiếc Thuyền Phép rực sáng ven bờ!',
    chestReward: { coins: 1150, rake: 1, pre_double_bomb: 1 },
    introDialogue: [
      { speaker: 'martha', text: 'Nhìn tòa lâu đài Hogwarts rực sáng trên vách đá soi bóng xuống mặt Hồ Đen lúc chiều tà kìa!' },
      { speaker: 'austin', text: 'Chúng ta hãy chọn mẫu Thuyền Phép và Đình Vọng Cảnh ưng ý nhất bên bờ hồ nhé!' },
    ],
    tasks: [
      {
        id: 'gp_water',
        slot: 'path',
        title: 'Thắp sáng Phù Ấn Phép Thuật trên mặt Hồ Đen',
        cost: 2,
        icon: '🌊',
        desc: 'Chọn Pháp Trận Sao Vàng, Khảm Ngọc Lục Bảo hoặc Phù Ấn Trăng Khuyết trên mặt hồ.',
        styles: STYLES_PLAZA,
        afterDialogue: 'Mặt nước Hồ Đen ngân lên những gợn sóng cổ ngữ lấp lánh ánh phép!',
      },
      {
        id: 'gp_bridge',
        slot: 'centerpiece',
        title: 'Đặt Cúp Huyền Thoại tỏa sáng đầu nhịp Cầu Đá',
        cost: 2,
        icon: '🏆',
        desc: 'Chọn Cúp Pha Lê Tam Pháp Thuật, Cúp Lửa Goblet of Fire hoặc Cúp Vàng Quidditch.',
        styles: STYLES_TRIWIZARD,
        afterDialogue: 'Chiếc cúp danh giá soi bóng xuống thảm hoa súng tím dưới chân cầu vòm!',
      },
      {
        id: 'gp_gazebo',
        slot: 'seating',
        title: 'Dựng Đình Vọng Cảnh trên thềm đá Hồ Đen',
        cost: 2,
        icon: '🏛️',
        desc: 'Chọn Đình Đá Vòm Sao Lam, Đình Kính Màu Ngọc Lục hoặc Đình Ngói Đỏ Phượng Hoàng.',
        styles: STYLES_GAZEBO,
        afterDialogue: 'Thềm đá ven Hồ Đen đã có tòa vọng lâu cổ kính đúng chất kiến trúc Hogwarts!',
      },
      {
        id: 'gp_swans',
        slot: 'special',
        title: 'Hạ thủy Thuyền Phép Năm Nhất trên mặt Hồ Đen',
        cost: 2,
        icon: '🛶',
        desc: 'Chọn Thuyền Gỗ Đầu Rồng Vàng, Thuyền Thiên Nga Bạc Pha Lê hoặc Thuyền Đầu Sư Tử Lửa.',
        styles: STYLES_BOAT,
        afterDialogue: 'Chiếc thuyền phép rẽ sóng lung linh đưa các phù thủy hướng về phía lâu đài!',
      },
      {
        id: 'gp_willow',
        slot: 'flora',
        title: 'Dựng Tượng Chiến Binh hộ vệ lan can Bến Thuyền',
        cost: 2,
        icon: '⚔️',
        desc: 'Chọn Hiệp Sĩ Thép Khiên H, Vua Cờ Cẩm Thạch hoặc Hộ Vệ Đại Bàng Đồng Lam.',
        styles: STYLES_KNIGHT,
        afterDialogue: 'Bến thuyền Hogwarts nay vừa thơ mộng vừa uy phong lẫm liệt!',
      },
      {
        id: 'gp_lanterns',
        slot: 'lighting',
        title: 'Thắp Trụ Đèn Lồng & Chùm Nến Bay ven bờ hồ',
        cost: 3,
        icon: '🕯️',
        desc: 'Chọn Đèn Ngọc Lục, Đèn Hồng Ngọc Vàng Đỏ hoặc Đèn Trăng Khuyết Bạc Lam.',
        styles: STYLES_CANDLES,
        afterDialogue: 'Hồ Đen Hogwarts hoàn tất lộng lẫy! Cùng tiến tới Nhà Kính Thảo Dược Học nào!',
      },
    ],
  },
  {
    id: 3,
    dayLabel: 'Khu Vực 4',
    name: 'Nhà Kính Thảo Dược Học',
    subtitle: 'Hoàn thiện quảng trường cổ vật bát giác trước Nhà Kính Pha Lê số 3 của Giáo sư Sprout!',
    skyPalette: ['#f4fbf7', '#fef9e7', '#e8f8f5'],
    turfPalette: ['#2d8a5e', '#166541', '#40916c'],
    cutscene: '👩‍🌾 Giáo sư Sprout trao huy hiệu Thảo Dược Học Vàng: "Xuất sắc! 8 Khu Vực mở rộng tới tận Cầu Gỗ & Sân Ga Hogsmeade đang chờ trò!"',
    chestReward: { coins: 1700, shovel: 2, glove: 1, pre_rainbow: 2 },
    introDialogue: [
      { speaker: 'martha', text: 'Hội đồng Pháp Thuật Quốc Tế sắp tới chấm giải khu Nhà Kính Thảo Dược số 3 rồi!' },
      { speaker: 'austin', text: 'Thưa Giáo sư Sprout, mỗi góc sân bát giác đều có thể đổi giữa 3 kiệt tác cổ vật Hogwarts!' },
    ],
    tasks: [
      {
        id: 'gr_paving',
        slot: 'path',
        title: 'Khảm Pháp Trận Cổ Ngữ giữa sân đá Bát Giác',
        cost: 2,
        icon: '🧭',
        desc: 'Chọn Pháp Trận Sao Vàng 8 Cánh, Khảm Ngọc Lục Bảo hoặc Phù Ấn Trăng Khuyết.',
        styles: STYLES_PLAZA,
        afterDialogue: 'Mặt sân đá bát giác bừng sáng những đường chỉ pháp thuật tinh xảo!',
      },
      {
        id: 'gr_arch',
        slot: 'lighting',
        title: 'Thắp Trụ Đèn Lồng & Nến Bay trước sảnh Nhà Kính',
        cost: 2,
        icon: '🕯️',
        desc: 'Chọn Đèn Ngọc Lục, Đèn Hồng Ngọc Vàng Đỏ hoặc Đèn Trăng Khuyết Bạc Lam.',
        styles: STYLES_CANDLES,
        afterDialogue: 'Những chậu cây phép thuật khẽ đung đưa reo vui dưới ánh nến bay lung linh!',
      },
      {
        id: 'gr_orangery',
        slot: 'centerpiece',
        title: 'Đặt Đài Kính Viễn Vọng đo chu kỳ trăng Thảo Dược',
        cost: 3,
        icon: '🔭',
        desc: 'Chọn Kính Đồng Cổ Điển, Kính Đôi Bạc Lam Ravenclaw hoặc Kính Rồng Vàng Sơn Mài Đỏ.',
        styles: STYLES_TELESCOPE,
        afterDialogue: 'Chu kỳ trăng tròn đã khớp từng khắc — mùa thu hoạch độc dược năm nay sẽ bội thu!',
      },
      {
        id: 'gr_statue',
        slot: 'special',
        title: 'An vị Đài Tưởng Ký Pensieve chính tâm sân Bát Giác',
        cost: 2,
        icon: '🌀',
        desc: 'Chọn Chậu Đá Bạc Lam, Đài Ngọc Lục Rắn Slytherin hoặc Đài Phượng Hoàng Vàng Ròng.',
        styles: STYLES_PENSIEVE,
        afterDialogue: 'Đài Tưởng Ký Pensieve tỏa vầng hào quang kỳ vĩ ngay trung tâm bốn bồn thảo dược!',
      },
      {
        id: 'gr_pergola',
        slot: 'seating',
        title: 'Dựng Đình Vọng Cảnh đón Hội Đồng Phù Thủy',
        cost: 2,
        icon: '🏛️',
        desc: 'Chọn Đình Đá Vòm Sao Lam, Đình Kính Màu Ngọc Lục hoặc Đình Ngói Đỏ Phượng Hoàng.',
        styles: STYLES_GAZEBO,
        afterDialogue: 'Niffler đã leo tót lên băng ghế trong đình nằm ngắm khu vườn mãn nguyện chưa kìa!',
      },
      {
        id: 'gr_parterre',
        slot: 'flora',
        title: 'Đặt Cúp Danh Dự Thảo Dược Học Hogwarts',
        cost: 3,
        icon: '🏆',
        desc: 'Chọn Cúp Pha Lê Tam Pháp Thuật, Cúp Lửa Goblet of Fire hoặc Cúp Vàng Quidditch.',
        styles: STYLES_TRIWIZARD,
        afterDialogue: 'Sân Bát Giác Thảo Dược đã hoàn mỹ — sẵn sàng tiến tới Đấu Trường Quidditch & Làng Hogsmeade!',
      },
    ],
  },
  ...GARDENSCAPES_EXTRA_AREAS,
];

export const GARDENSCAPES_AREAS = [
  ...attachExtraGardenSlots(BASE_GARDENSCAPES_AREAS),
  ...GARDENSCAPES_ZONES_9_TO_12,
];

/**
 * Balanced Progression Star Cost across 12 Zones × 9 Relics (108 spots/tier):
 * Zone 1 starts at 1⭐..3⭐ so players can renovate immediately, scaling smoothly across 12 Zones & Mastery Tiers!
 */
export function getTaskDynamicCost(areaIdx, taskIdx, masteryTier = 0) {
  return 1 + Math.floor(areaIdx * 0.75) + Math.floor(taskIdx / 3) + Math.max(0, masteryTier) * 4;
}

export function getGardenscapesAreasForTier(masteryTier = 0) {
  const tier = Math.max(0, Math.floor(masteryTier || 0));
  const rankBadge = tier > 0 ? ` · Tinh Luyện Bậc ${tier + 1}` : '';
  return GARDENSCAPES_AREAS.map((area, aIdx) => ({
    ...area,
    id: tier > 0 ? `${area.id}_t${tier}` : area.id,
    baseId: area.id,
    dayLabel: `${area.dayLabel}${rankBadge}`,
    chestReward: {
      coins: Math.round((area.chestReward.coins || 500) * (1 + tier * 0.5)),
      shovel: (area.chestReward.shovel || 1) + Math.min(3, tier),
      ...(area.chestReward.pre_rainbow ? { pre_rainbow: area.chestReward.pre_rainbow + Math.min(2, tier) } : {}),
      ...(area.chestReward.pre_bomb_dynamite ? { pre_bomb_dynamite: area.chestReward.pre_bomb_dynamite } : {}),
      ...(area.chestReward.rake ? { rake: area.chestReward.rake } : {}),
      ...(area.chestReward.glove ? { glove: area.chestReward.glove } : {}),
    },
    tasks: area.tasks.map((t, tIdx) => ({
      ...t,
      cost: getTaskDynamicCost(aIdx, tIdx, tier),
    })),
  }));
}

