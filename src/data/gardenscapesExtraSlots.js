/**
 * Extra 3-Style Decoration Slots (`fountain_wing`, `guardian`, `pavilion`) for Hogwarts Grounds Zones 1–8
 * Expands every existing Grounds Zone from 6 to 9 interactive customization spots!
 */

const STYLES_WING_FOUNTAIN = [
  { name: 'Suối Đá Vàng Ánh Dương', primary: '#ffb703', secondary: '#4cc9f0', accent: '#ffffff' },
  { name: 'Suối Cẩm Thạch Lam Bạc', primary: '#90e0ef', secondary: '#1d3557', accent: '#e0fbfc' },
  { name: 'Suối Ngọc Lục Rừng Xanh', primary: '#52b788', secondary: '#1b4332', accent: '#ffd166' },
];

const STYLES_GUARDIAN_STATUE = [
  { name: 'Tượng Hiệp Sĩ Mạ Vàng', primary: '#ffb703', secondary: '#9b2226', accent: '#fff3b0' },
  { name: 'Tượng Thần Hộ Vệ Đá Bạc', primary: '#adb5bd', secondary: '#1d3557', accent: '#90e0ef' },
  { name: 'Tượng Cổ Ngữ Rêu Ngọc', primary: '#2d6a4f', secondary: '#e9c46a', accent: '#f1faee' },
];

const STYLES_GARDEN_PAVILION = [
  { name: 'Ghế Gỗ Sồi & Đèn Đồng Vàng', primary: '#ca6702', secondary: '#ffd166', accent: '#fefae0' },
  { name: 'Ghế Đá Hoa Cương Ánh Trăng', primary: '#457b9d', secondary: '#a8dadc', accent: '#ffffff' },
  { name: 'Góc Thú Phép Mái Ngói Xanh', primary: '#2d6a4f', secondary: '#ffb703', accent: '#e9f5db' },
];

const EXTRA_GARDEN_TASKS_BY_AREA = {
  0: [
    {
      id: 'gf_wing_fnt',
      slot: 'fountain_wing',
      title: 'Khơi Mạch Đài Phun Nước Oải Hương Cánh Trái',
      cost: 2,
      icon: '⛲',
      desc: 'Đài nước đá chạm khắc chim ưng phun tia nước lấp lánh tưới mát bồn hoa.',
      styles: STYLES_WING_FOUNTAIN,
      afterDialogue: 'Tiếng nước chảy róc rách hòa cùng hương oải hương dễ chịu vô cùng!',
    },
    {
      id: 'gf_guardian',
      slot: 'guardian',
      title: 'Dựng Tượng Hiệp Sĩ Piertotum Locomotor Canh Cổng Vòm',
      cost: 2,
      icon: '🗿',
      desc: 'Tượng đá cổ bảo vệ lối vào hành lang Tháp Đồng Hồ.',
      styles: STYLES_GUARDIAN_STATUE,
      afterDialogue: 'Tượng hiệp sĩ khẽ gõ mũi giáo xuống nền đá chào đón học sinh qua cổng!',
    },
    {
      id: 'gf_pavilion',
      slot: 'pavilion',
      title: 'Đặt Ghế Đá Đọc Sách & Trụ Đèn Phép Đường Dạo Dưới',
      cost: 3,
      icon: '🪑',
      desc: 'Góc ôn bài yên bình dưới nắng chiều ấm áp cho các kỳ thi Pháp Thuật.',
      styles: STYLES_GARDEN_PAVILION,
      afterDialogue: 'Góc dạo mát phía Nam sân trường đã có băng ghế tuyệt đẹp!',
    },
  ],
  1: [
    {
      id: 'gt_wing_fnt',
      slot: 'fountain_wing',
      title: 'Khôi Phục Giếng Nước Nấm Phát Quang Bìa Rừng Cấm',
      cost: 2,
      icon: '🍄',
      desc: 'Mạch nước tinh khiết nuôi dưỡng rặng nấm xanh lam huyền ảo.',
      styles: STYLES_WING_FOUNTAIN,
      afterDialogue: 'Mặt nước giếng cổ phản chiếu ánh nấm xanh lung linh như bầu trời sao!',
    },
    {
      id: 'gt_guardian',
      slot: 'guardian',
      title: 'Dựng Cột Đá Cảnh Giới Nhân Mã Bên Hông Chòi Hagrid',
      cost: 3,
      icon: '🏹',
      desc: 'Bia đá khắc dấu sao Hỏa đánh dấu ranh giới hòa bình với bộ tộc Nhân Mã.',
      styles: STYLES_GUARDIAN_STATUE,
      afterDialogue: 'Từ cánh rừng xa vang lại tiếng tù và chào thân thiện của Firenze!',
    },
    {
      id: 'gt_pavilion',
      slot: 'pavilion',
      title: 'Đặt Chuồng Gỗ Ấm Áp Cho Chú Chó Fang & Niffler',
      cost: 3,
      icon: '🐾',
      desc: 'Ngôi nhà gỗ lợp rơm êm ái ngay bãi cỏ hoa dại phía trước chòi đá.',
      styles: STYLES_GARDEN_PAVILION,
      afterDialogue: 'Niffler hớn hở chạy vào kiểm tra ổ đệm mới êm ru ngay lập tức!',
    },
  ],
  2: [
    {
      id: 'gl_wing_fnt',
      slot: 'fountain_wing',
      title: 'Đặt Đài Phun Hoa Súng Phát Sáng Dưới Chân Cầu Đá',
      cost: 3,
      icon: '🪷',
      desc: 'Những đóa sen tím phát quang cùng đài phun sương bạc trên mặt Hồ Đen.',
      styles: STYLES_WING_FOUNTAIN,
      afterDialogue: 'Vịnh hoa súng bên trái cầu đá tỏa ánh hào quang tím bạc tuyệt mỹ!',
    },
    {
      id: 'gl_guardian',
      slot: 'guardian',
      title: 'Tạc Tượng Nhân Ngư & Thủy Quái Bảo Hộ Đỉnh Cầu Vòm',
      cost: 3,
      icon: '🔱',
      desc: 'Tượng đá trấn giữ nhịp cầu nối liền bờ rừng với bến thuyền Hogwarts.',
      styles: STYLES_GUARDIAN_STATUE,
      afterDialogue: 'Cây đinh ba vàng trên tay tượng phát sáng dẫn đường cho thuyền qua sương mù!',
    },
    {
      id: 'gl_pavilion',
      slot: 'pavilion',
      title: 'Bày Ghế Ngắm Hoàng Hôn Dưới Tán Sồi Bờ Tây Hồ Đen',
      cost: 4,
      icon: '🌅',
      desc: 'Nơi ngắm trọn bóng Lâu Đài Hogwarts soi mình xuống làn nước ngọc bích.',
      styles: STYLES_GARDEN_PAVILION,
      afterDialogue: 'Góc vọng cảnh bờ Tây nhìn thẳng về phía lâu đài đẹp như tranh thủy mặc!',
    },
  ],
  3: [
    {
      id: 'gr_wing_fnt',
      slot: 'fountain_wing',
      title: 'Sửa Đài Phun Tưới Tự Động Vườn Hồng Cánh Tây',
      cost: 3,
      icon: '🌹',
      desc: 'Phun sương dinh dưỡng đều đặn cho các chậu Mandrake non.',
      styles: STYLES_WING_FOUNTAIN,
      afterDialogue: 'Đài phun cánh Tây hoạt động trơn tru tạo cầu vồng nhỏ dưới nắng!',
    },
    {
      id: 'gr_guardian',
      slot: 'guardian',
      title: 'Đặt Tượng Thần Mùa Xuân Giữa Sân Phụ Nhà Kính Số 3',
      cost: 4,
      icon: '🗽',
      desc: 'Giúp cây cối xung quanh luôn xanh tươi bất chấp sương giá mùa đông.',
      styles: STYLES_GUARDIAN_STATUE,
      afterDialogue: 'Những bụi cẩm tú cầu quanh chân tượng đồng loạt bung nở rực rỡ!',
    },
    {
      id: 'gr_pavilion',
      slot: 'pavilion',
      title: 'Dựng Bàn Ghế Nghỉ Giải Lao & Kệ Chậu Đất Nung Cổng Nam',
      cost: 4,
      icon: '🪴',
      desc: 'Nơi học sinh tháo bịt tai nghỉ ngơi sau tiết thay chậu Mandrake.',
      styles: STYLES_GARDEN_PAVILION,
      afterDialogue: 'Lối cổng Nam Nhà Kính gọn gàng và ngập sắc hoa thơm ngát!',
    },
  ],
  gq_4: [
    {
      id: 'gq_wing_fnt',
      slot: 'fountain_wing',
      title: 'Lắp Đài Nước Giải Khát Phép Cho Tuyển Thủ Quidditch',
      cost: 4,
      icon: '💧',
      desc: 'Nước suối mát lạnh tiếp sức tức thì giữa hai hiệp đấu căng thẳng.',
      styles: STYLES_WING_FOUNTAIN,
      afterDialogue: 'Cả đội bay sà xuống uống nước mát lành rồi vút lên trời đầy khí thế!',
    },
    {
      id: 'gq_guardian',
      slot: 'guardian',
      title: 'Dựng Tượng Tầm Thủ Huyền Thoại Bắt Trái Snitch Vàng',
      cost: 5,
      icon: '🏅',
      desc: 'Bức tượng đồng mạ vàng truyền cảm hứng chiến thắng trước cổng sân.',
      styles: STYLES_GUARDIAN_STATUE,
      afterDialogue: 'Áo choàng của bức tượng khẽ tung bay kiêu hãnh trong gió thung lũng!',
    },
    {
      id: 'gq_pavilion',
      slot: 'pavilion',
      title: 'Mở Khu Ghế Dự Bị & Giá Để Chổi Tia Chớp Firebolt',
      cost: 5,
      icon: '🧹',
      desc: 'Bảo dưỡng chổi bay luôn bóng loáng trước giờ ra sân.',
      styles: STYLES_GARDEN_PAVILION,
      afterDialogue: 'Hàng chổi bay xếp ngay ngắn lấp lánh dưới nắng vàng!',
    },
  ],
  gh_5: [
    {
      id: 'gh_wing_fnt',
      slot: 'fountain_wing',
      title: 'Đào Máng Nước Đá Mát Cho Bằng Mã Buckbeak',
      cost: 5,
      icon: '🦅',
      desc: 'Nguồn nước suối rừng trong vắt bên rặng bí ngô khổng lồ.',
      styles: STYLES_WING_FOUNTAIN,
      afterDialogue: 'Chú Bằng Mã cúi đầu chào lịch sự rồi nhấp ngụm nước mát lành!',
    },
    {
      id: 'gh_guardian',
      slot: 'guardian',
      title: 'Dựng Bù Nhìn Phép Xua Gnome Phá Vườn Bí Ngô',
      cost: 5,
      icon: '🎃',
      desc: 'Giữ cho những quả bí ngô khổng lồ kịp lớn cho lễ hội Halloween.',
      styles: STYLES_GUARDIAN_STATUE,
      afterDialogue: 'Mấy chú lùn vườn tinh nghịch thấy tượng canh gác liền chạy biến ngay!',
    },
    {
      id: 'gh_pavilion',
      slot: 'pavilion',
      title: 'Đặt Bàn Trà Đá Khổng Lồ Của Bác Hagrid Ngoài Sân',
      cost: 6,
      icon: '🫖',
      desc: 'Ấm trà đồng to bằng cái xô luôn sẵn sàng đãi các bạn nhỏ ghé thăm.',
      styles: STYLES_GARDEN_PAVILION,
      afterDialogue: 'Bác Hagrid cười vang mời cả nhóm ngồi thưởng trà nóng ngoài hiên!',
    },
  ],
  go_6: [
    {
      id: 'go_wing_fnt',
      slot: 'fountain_wing',
      title: 'Xây Hồ Thủy Sinh Nuôi Cỏ Mang Cá Gillyweed',
      cost: 5,
      icon: '🌿',
      desc: 'Bể đá sục bọt khí phép giữ cho thảo dược Địa Trung Hải luôn tươi mới.',
      styles: STYLES_WING_FOUNTAIN,
      afterDialogue: 'Những nhánh cỏ Mang Cá xanh mướt uốn lượn trong làn nước trong veo!',
    },
    {
      id: 'go_guardian',
      slot: 'guardian',
      title: 'Đặt Tượng Rồng Nhỏ Phun Hơi Ấm Sưởi Vườn Lan Đêm',
      cost: 6,
      icon: '🐉',
      desc: 'Giữ nhiệt độ lý tưởng cho các loài hoa nhiệt đới nở rộ về đêm.',
      styles: STYLES_GUARDIAN_STATUE,
      afterDialogue: 'Tượng rồng đá khẽ thở làn hơi ấm áp làm vườn lan bung cánh ngát hương!',
    },
    {
      id: 'go_pavilion',
      slot: 'pavilion',
      title: 'Bố Trí Vòm Hoa Hồng Leo & Ghế Nghỉ Cánh Đông',
      cost: 6,
      icon: '🌺',
      desc: 'Không gian thư giãn tuyệt đẹp sau giờ thực hành Thảo Dược Học.',
      styles: STYLES_GARDEN_PAVILION,
      afterDialogue: 'Cánh Đông Nhà Kính đã biến thành khu vườn cổ tích ngập tràn sắc hương!',
    },
  ],
  gv_7: [
    {
      id: 'gv_wing_fnt',
      slot: 'fountain_wing',
      title: 'Dựng Đài Phun Sô-cô-la Ấm Trước Tiệm Công Tước Mật',
      cost: 6,
      icon: '🍫',
      desc: 'Tỏa hương ca cao ngọt ngào thu hút mọi học sinh đi chơi cuối tuần.',
      styles: STYLES_WING_FOUNTAIN,
      afterDialogue: 'Hương sô-cô-la nóng ngọt lịm bay khắp con phố Hogsmeade phủ tuyết!',
    },
    {
      id: 'gv_guardian',
      slot: 'guardian',
      title: 'Tạc Tượng Phù Thủy Hengist Sáng Lập Làng Hogsmeade',
      cost: 6,
      icon: '🧙‍♂️',
      desc: 'Di tích lịch sử nổi tiếng tại quảng trường trung tâm ngôi làng phù thủy duy nhất nước Anh.',
      styles: STYLES_GUARDIAN_STATUE,
      afterDialogue: 'Bức tượng cổ uy nghiêm khoác lớp áo choàng tuyết lấp lánh dưới ánh đèn!',
    },
    {
      id: 'gv_pavilion',
      slot: 'pavilion',
      title: 'Bày Ghế Sưởi Lửa Phép & Trạm Đậu Cú Tuyết Đầu Làng',
      cost: 7,
      icon: '🦉',
      desc: 'Giữ ấm cho du khách ngồi ngắm tuyết rơi cùng tách Bia Bơ bốc khói.',
      styles: STYLES_GARDEN_PAVILION,
      afterDialogue: 'Làng Hogsmeade nay có đủ 9 góc check-in lung linh bậc nhất thế giới phù thủy!',
    },
  ],
};

const SCENE_INDEX_BY_GARDEN_AREA = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  gq_4: 0,
  gh_5: 1,
  go_6: 3,
  gv_7: 5,
};

export function attachExtraGardenSlots(baseAreas) {
  return baseAreas.map((area) => {
    const extras = EXTRA_GARDEN_TASKS_BY_AREA[area.id] || [];
    const sceneIndex = SCENE_INDEX_BY_GARDEN_AREA[area.id] ?? 0;
    return {
      ...area,
      sceneIndex,
      tasks: [...area.tasks, ...extras],
    };
  });
}
