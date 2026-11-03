/**
 * Extra 3-Style Decoration Slots (`banner`, `alcove`, `hearth`) for Hogwarts Castle Chapters 1–8
 * Expands every existing Castle Chapter from 6 to 9 interactive customization spots!
 */

const STYLES_HOUSE_BANNER = [
  { name: 'Cờ Lụa Đỏ Sư Tử Vàng', primary: '#9b2226', secondary: '#ffb703', accent: '#fff3b0' },
  { name: 'Cờ Lụa Lam Đại Bàng Bạc', primary: '#1d3557', secondary: '#90e0ef', accent: '#ffffff' },
  { name: 'Cờ Lụa Lục Bảo Hoàng Gia', primary: '#1b4332', secondary: '#e9c46a', accent: '#f1faee' },
];

const STYLES_ARCANE_ALCOVE = [
  { name: 'Bệ Gỗ Sồi Khảm Vàng', primary: '#9b2226', secondary: '#ffd166', accent: '#fefae0' },
  { name: 'Bệ Đá Tinh Tú Lam Bạc', primary: '#1d3557', secondary: '#4cc9f0', accent: '#ffffff' },
  { name: 'Bệ Cẩm Thạch Ngọc Bích', primary: '#2d6a4f', secondary: '#ffbe0b', accent: '#e9f5db' },
];

const STYLES_CASTLE_HEARTH = [
  { name: 'Hỏa Đài Phượng Hoàng Vàng', primary: '#fb8500', secondary: '#ffd166', accent: '#ffffff' },
  { name: 'Hỏa Đài Lửa Floo Ngọc Lục', primary: '#2dc653', secondary: '#80ed99', accent: '#e9f5db' },
  { name: 'Hỏa Đài Ánh Sao Tím Lam', primary: '#7b2cbf', secondary: '#4cc9f0', accent: '#f3d5ff' },
];

const EXTRA_HOME_TASKS_BY_AREA = {
  1: [
    {
      id: 'hh_banner',
      slot: 'banner',
      title: 'Treo Quốc Kỳ Hogwarts Bốn Nhà Trên Cổng Sồi',
      cost: 2,
      icon: '🛡️',
      desc: 'Biểu tượng đoàn kết Sư Tử, Rắn, Đại Bàng, Lửng với châm ngôn Draco Dormiens.',
      styles: STYLES_HOUSE_BANNER,
      afterDialogue: 'Lá cờ bốn Nhà tung bay uy nghi ngay phía trên cánh cổng Đại Sảnh!',
    },
    {
      id: 'hh_alcove',
      slot: 'alcove',
      title: 'Đặt Giáp Hiệp Sĩ Phép Canh Hành Lang Tầng Lửng',
      cost: 2,
      icon: '⚔️',
      desc: 'Bộ giáp bạc biết cúi chào mỗi khi giáo sư và huynh trưởng đi ngang.',
      styles: STYLES_ARCANE_ALCOVE,
      afterDialogue: 'Bộ giáp hiệp sĩ vừa giơ thanh kiếm ánh sáng chào kiểu hoàng gia kìa!',
    },
    {
      id: 'hh_hearth',
      slot: 'hearth',
      title: 'Dựng Đài Đuốc Chân Cầu Thang Cẩm Thạch',
      cost: 3,
      icon: '🔥',
      desc: 'Ngọn lửa phép không bao giờ tắt sưởi ấm tiền sảnh suốt mùa đông.',
      styles: STYLES_CASTLE_HEARTH,
      afterDialogue: 'Tiền sảnh rộng lớn đã ngập tràn ánh lửa vàng ấm cúng!',
    },
  ],
  2: [
    {
      id: 'hk_banner',
      slot: 'banner',
      title: 'Treo Bảng Công Thức Độc Dược Hoàng Tử Lai',
      cost: 2,
      icon: '📜',
      desc: 'Khung đá cổ khắc bí kíp pha Phúc Lạc Dược Felix Felicis chuẩn xác.',
      styles: STYLES_HOUSE_BANNER,
      afterDialogue: 'Những dòng chữ phép tự phát sáng hướng dẫn khuấy ngược chiều kim đồng hồ!',
    },
    {
      id: 'hk_alcove',
      slot: 'alcove',
      title: 'Lắp Tủ Pha Lê Trưng Bày Dược Liệu Quý Hiếm',
      cost: 3,
      icon: '🧪',
      desc: ' Cất giữ sừng Bạch Kỳ Mã, cỏ Mang Cá và nước mắt Phượng Hoàng lấp lánh.',
      styles: STYLES_ARCANE_ALCOVE,
      afterDialogue: 'Hàng chục lọ thuốc pha lê phát quang ngũ sắc đẹp mê hồn!',
    },
    {
      id: 'hk_hearth',
      slot: 'hearth',
      title: 'Đặt Lò Ủ Bia Bơ & Đèn Lồng Cổng Hầm Bếp',
      cost: 3,
      icon: '🍺',
      desc: 'Góc ủ bánh nướng và Bia Bơ thơm phức của các Gia Tinh hiếu khách.',
      styles: STYLES_CASTLE_HEARTH,
      afterDialogue: 'Hương quế mật ong và Bia Bơ ấm nóng lan tỏa khắp căn hầm!',
    },
  ],
  3: [
    {
      id: 'hl_banner',
      slot: 'banner',
      title: 'Treo Khung Tranh Các Cựu Hiệu Trưởng Hogwarts',
      cost: 3,
      icon: '🖼️',
      desc: 'Những bức chân dung thông thái luôn sẵn lòng cố vấn cho người kế nhiệm.',
      styles: STYLES_HOUSE_BANNER,
      afterDialogue: 'Các cụ Hiệu Trưởng trong tranh đồng loạt vỗ tay khen ngợi tài bài trí của bạn!',
    },
    {
      id: 'hl_alcove',
      slot: 'alcove',
      title: 'Đặt Chậu Tưởng Ký Pensieve Bên Cửa Vòm Kính',
      cost: 3,
      icon: '🌀',
      desc: 'Lưu giữ những sợi ký ức bạc xoay tròn lấp lánh dưới ánh trăng.',
      styles: STYLES_ARCANE_ALCOVE,
      afterDialogue: 'Những dải sương bạc ký ức khẽ cuộn trào đầy huyền bí bên khung cửa!',
    },
    {
      id: 'hl_hearth',
      slot: 'hearth',
      title: 'Dựng Giá Đậu Phượng Hoàng Fawkes Mạ Vàng',
      cost: 4,
      icon: '🦅',
      desc: 'Đài lửa tái sinh ấm áp dành riêng cho chú chim Phượng Hoàng trung thành.',
      styles: STYLES_CASTLE_HEARTH,
      afterDialogue: 'Ngân vang một khúc ca Phượng Hoàng dịu êm làm ấm lòng mọi phù thủy!',
    },
  ],
  hd_4: [
    {
      id: 'hd_banner',
      slot: 'banner',
      title: 'Giăng Dải Lụa Tuyết Bạc Vũ Hội Tam Pháp Thuật',
      cost: 4,
      icon: '🎀',
      desc: 'Kết nối truyền thống Hogwarts, Beauxbatons và Durmstrang trong đêm lễ hội.',
      styles: STYLES_HOUSE_BANNER,
      afterDialogue: 'Dải lụa băng tuyết buông rủ lấp lánh như cực quang phương Bắc!',
    },
    {
      id: 'hd_alcove',
      slot: 'alcove',
      title: 'Đặt Đài Pha Lê Nước Hoa Hồng Ở Hành Lang Tiệc',
      cost: 4,
      icon: '💎',
      desc: 'Tháp pha lê chạm khắc thiên nga tỏa sương lạnh mát lành cho các cặp khiêu vũ.',
      styles: STYLES_ARCANE_ALCOVE,
      afterDialogue: 'Góc hành lang dạ vũ trở thành điểm hẹn lãng mạn nhất đêm Giáng Sinh!',
    },
    {
      id: 'hd_hearth',
      slot: 'hearth',
      title: 'Thắp Đài Lửa Cốc Tam Pháp Thuật Goblet of Fire',
      cost: 5,
      icon: '🏆',
      desc: 'Ngọn lửa xanh trắng uy nghiêm nhảy múa vinh danh các quán quân.',
      styles: STYLES_CASTLE_HEARTH,
      afterDialogue: 'Ngọn lửa phép thuật bùng lên tia sáng bạc rực rỡ khắp Đại Sảnh!',
    },
  ],
  hp_5: [
    {
      id: 'hp_banner',
      slot: 'banner',
      title: 'Khắc Phù Điêu Rắn Bạc Slytherin Trên Vách Đá Ngầm',
      cost: 4,
      icon: '🐍',
      desc: 'Phù điêu đá cẩm thạch đen khảm ngọc lục bảo phản chiếu ánh nước Hồ Đen.',
      styles: STYLES_HOUSE_BANNER,
      afterDialogue: 'Đôi mắt ngọc lục bảo trên phù điêu ánh lên vẻ sang trọng cổ điển!',
    },
    {
      id: 'hp_alcove',
      slot: 'alcove',
      title: 'Bày Tủ Kính Bảo Bối Gia Tộc & Sách Độc Dược Cổ',
      cost: 5,
      icon: '📗',
      desc: 'Những cuốn cổ thư gáy bạc và cân tiểu ly bằng đồng ròng.',
      styles: STYLES_ARCANE_ALCOVE,
      afterDialogue: 'Góc trưng bày của Giáo sư Slughorn trông đẳng cấp chẳng kém viện bảo tàng!',
    },
    {
      id: 'hp_hearth',
      slot: 'hearth',
      title: 'Thắp Đèn Thủy Tinh Xanh Lối Vòm Đá Dưới Đáy Hồ',
      cost: 5,
      icon: '🟢',
      desc: 'Ánh sáng lục bảo huyền ảo hòa cùng bóng mực khổng lồ bơi ngang.',
      styles: STYLES_CASTLE_HEARTH,
      afterDialogue: 'Hành lang hầm ngầm giờ ấm áp và cuốn hút lạ thường!',
    },
  ],
  hr_6: [
    {
      id: 'hr_banner',
      slot: 'banner',
      title: 'Treo Bảng Danh Sách Đoàn Quân Dumbledore (D.A.)',
      cost: 5,
      icon: '⚡',
      desc: 'Tấm da dê yểm bùa gắn kết lòng quả cảm của những người bạn đồng hành.',
      styles: STYLES_HOUSE_BANNER,
      afterDialogue: 'Chữ ký của cả đội sáng rực lên tiếp thêm tinh thần luyện tập!',
    },
    {
      id: 'hr_alcove',
      slot: 'alcove',
      title: 'Dựng Hình Nhân Hiệp Sĩ Tập Phản Chú Expelliarmus',
      cost: 5,
      icon: '🛡️',
      desc: 'Góc luyện bùa tự động bật khiên Protego an toàn ở hành lang phụ.',
      styles: STYLES_ARCANE_ALCOVE,
      afterDialogue: 'Hình nhân hiệp sĩ đã sẵn sàng cho buổi rèn luyện phép thuật chiều nay!',
    },
    {
      id: 'hr_hearth',
      slot: 'hearth',
      title: 'Khơi Lò Sưởi Bí Mật & Tủ Kính Máy Dò Hắc Ám',
      cost: 6,
      icon: '🔮',
      desc: 'Gương Thù Nghịch và Kính Mách Lẻo xoay tít canh gác cửa Phòng Cần Thiết.',
      styles: STYLES_CASTLE_HEARTH,
      afterDialogue: 'Phòng Cần Thiết đã mở rộng gấp đôi để chứa đủ mọi bảo bối thần kỳ!',
    },
  ],
  ha_7: [
    {
      id: 'ha_banner',
      slot: 'banner',
      title: 'Treo Bản Đồ Mười Hai Cung Hoàng Đạo Thêu Chỉ Vàng',
      cost: 6,
      icon: '🌌',
      desc: 'Các chòm sao trên tấm lụa tự dịch chuyển theo bầu trời đêm thực tế.',
      styles: STYLES_HOUSE_BANNER,
      afterDialogue: 'Chòm sao Sư Tử và Thiên Nga vừa lóe sáng trên tấm thảm tường!',
    },
    {
      id: 'ha_alcove',
      slot: 'alcove',
      title: 'Đặt Hỗn Thiên Nghi Đồng Cổ Ở Vòm Ngắm Trăng',
      cost: 6,
      icon: '🧭',
      desc: 'Vòng đồng khắc cổ ngữ đo chính xác thời khắc nguyệt thực phép thuật.',
      styles: STYLES_ARCANE_ALCOVE,
      afterDialogue: 'Các vòng kim loại đồng tâm bắt đầu tự quay êm ru theo nhịp trăng lên!',
    },
    {
      id: 'ha_hearth',
      slot: 'hearth',
      title: 'Thắp Lồng Đèn Tinh Vân Dọc Lan Can Gió Đỉnh Tháp',
      cost: 7,
      icon: '🌠',
      desc: 'Giữ ấm cho các buổi thực hành Thiên Văn Học lúc nửa đêm.',
      styles: STYLES_CASTLE_HEARTH,
      afterDialogue: 'Lan can Tháp Thiên Văn rực sáng như một dải ngân hà thu nhỏ!',
    },
  ],
};

const SCENE_INDEX_BY_HOME_AREA = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  hd_4: 1,
  hp_5: 2,
  hr_6: 4,
  ha_7: 5,
};

export function attachExtraHomeSlots(baseAreas) {
  return baseAreas.map((area) => {
    const extras = EXTRA_HOME_TASKS_BY_AREA[area.id] || [];
    const sceneIndex = SCENE_INDEX_BY_HOME_AREA[area.id] ?? 0;
    return {
      ...area,
      sceneIndex,
      tasks: [...area.tasks, ...extras],
    };
  });
}
