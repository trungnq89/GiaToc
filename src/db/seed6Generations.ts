import { createPerson } from './repositories/personRepository';
import { linkRelatives } from './repositories/relationshipRepository';
import { createMemorialEvent } from './repositories/eventRepository';
import { execute } from './database';

/**
 * Kho ảnh chân dung mẫu từ Internet phù hợp chặt chẽ theo độ tuổi và giới tính:
 * - Đời 1: Bậc Cao Tổ (Khởi tổ, cụ cao niên phúc hậu, râu tóc bạc phơ)
 * - Đời 2: Bậc Tằng Tổ (Cụ Cố ~75-85 tuổi)
 * - Đời 3: Bậc Tiền Bối (Ông Bà ~60-75 tuổi)
 * - Đời 4: Bậc Cha Chú Cô Bác (~45-60 tuổi, trung niên)
 * - Đời 5: Thế hệ Tôi & Anh Chị Em (~20-38 tuổi, thanh niên trẻ)
 * - Đời 6: Bậc Con Cháu Đời Mới (~0-8 tuổi, thiếu nhi & em bé)
 */
const SAMPLE_AVATARS = {
  // ĐỜI 1: CAO TỔ (Sinh ~1880, Cụ già xưa)
  caoToPhu: 'https://images.unsplash.com/photo-1508186225823-0963cf9ab0de?auto=format&fit=crop&w=256&q=80',
  caoToMau: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',

  // ĐỜI 2: TẰNG TỔ (CỤ CỐ, Sinh 1902 - 1915, ~75-85 tuổi)
  tangToHuynh: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=256&q=80',
  cuBacDauMui: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?auto=format&fit=crop&w=256&q=80',
  tangToKhang: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
  tangToLua: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=256&q=80',
  tangToPhuc: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
  cuThimDauSen: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=256&q=80',
  tangToThinh: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&q=80',
  tangToLan: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=256&q=80',
  cuDuongHao: 'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=256&q=80',

  // ĐỜI 3: TIỀN BỐI (ÔNG BÀ, Sinh 1930 - 1948, ~60-75 tuổi)
  ongBacTrong: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80',
  baBacDauQuy: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
  ongNoiChinh: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  baNoiMai: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  ongChuLiem: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
  baThimDauThuc: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
  baCoTuyet: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
  ongDuongChung: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80',
  ongChuHung: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=256&q=80',
  baThimDauPhuong: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=256&q=80',
  baCoVan: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
  ongDuongTuan: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=256&q=80',

  // ĐỜI 4: CHA CHÚ CÔ BÁC (Sinh 1959 - 1978, ~45-60 tuổi, trung niên)
  bacCaTuan: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
  bacGaiHuong: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
  boBinh: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  meThu: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
  chuBaDung: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
  thimOanh: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
  coTuHang: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=256&q=80',
  chuDuongLong: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80',
  chuUtNam: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&q=80',
  thimUtLinh: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',

  // ĐỜI 5: TÔI & ANH CHỊ EM (Sinh 1986 - 2006, ~18-38 tuổi, thanh niên trẻ)
  anhPhong: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80',
  chiDauAnh: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80',
  chiTrang: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  anhReMinh: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=256&q=80',
  anhVu: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
  chiMai: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
  anhHung: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  chiDauHa: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=256&q=80',
  voThao: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  emTraiThanh: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&q=80',
  emDauQuynh: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80',
  emGaiLinh: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  emReTuan: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
  emLong: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=256&q=80',
  emDauLy: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
  emHuyen: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=256&q=80',
  emNamConChu: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&q=80',
  emMy: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80',
  emHuy: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',

  // ĐỜI 6: BẬC CON CHÁU (Sinh 2016 - 2024, ~0-8 tuổi, trẻ em & em bé)
  conTraiKhoi: 'https://images.unsplash.com/photo-1595454223600-91fbdd77ae58?auto=format&fit=crop&w=256&q=80',
  conGaiAn: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=256&q=80',
  chauRuotKhangAn: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=256&q=80',
  chauRuotTueLam: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=256&q=80',
  chauBao: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&q=80',
  chauDiep: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=256&q=80',
};

/**
 * Helper liên kết cha/mẹ và con cái:
 * Đảm bảo người con có cha mẹ là parentId, và người cha/mẹ có con là childId.
 */
async function linkParentChild(parentId: string, childId: string) {
  await linkRelatives(childId, parentId, 'parent');
}

export async function seed6GenerationsFamily(): Promise<{ totalCount: number }> {
  // Xóa dữ liệu cũ của bảng persons, relationships, memorial_events
  await execute('DELETE FROM relationships;');
  await execute('DELETE FROM memorial_events;');
  await execute('DELETE FROM persons;');

  // ==========================================
  // ĐỜI 1 (THẾ HỆ +4): BẬC CAO TỔ (Cụ Kỵ Khởi Tổ)
  // Sinh năm ~ 1880, Đã mất
  // - Ruột thịt: Cụ Kỵ Khởi Tổ Nguyễn Đình Huệ
  // - Bắc cầu (Hôn phối): Cụ Cao Tổ Mẫu Vũ Thị Nhạn
  // ==========================================
  const caoToPhu = await createPerson({
    name: 'Nguyễn Đình Huệ',
    nickname: 'Cụ Cao Tổ',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Cụ Kỵ ruột (Cao Tổ Phụ)',
    inferredRelationToMe: 'Cụ Kỵ khởi tổ',
    howTheyCallMe: 'Chắt đời thứ 5',
    generation: 4,
    birthYear: 1880,
    avatarUri: SAMPLE_AVATARS.caoToPhu,
    isDeceased: true,
    deathDateLunar: '10/03 Âm lịch',
    address: 'Từ đường Họ Nguyễn, Làng Cổ Đô, Ba Vì, Hà Nội',
    notes: 'Khởi tổ chi họ Nguyễn Đình, đỗ tú tài khoa Nhâm Tý. Người đức độ khai hoang lập nghiệp.',
  });

  const caoToMau = await createPerson({
    name: 'Vũ Thị Nhạn',
    nickname: 'Cụ Cao Tổ Mẫu',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Cụ Kỵ bà (Cao Tổ Mẫu)',
    inferredRelationToMe: 'Cụ Kỵ bà',
    howTheyCallMe: 'Chắt đời thứ 5',
    generation: 4,
    birthYear: 1883,
    avatarUri: SAMPLE_AVATARS.caoToMau,
    isDeceased: true,
    deathDateLunar: '18/08 Âm lịch',
    address: 'Làng Cổ Đô, Ba Vì, Hà Nội',
    notes: 'Cụ bà tần tảo, thêu may nức tiếng trong vùng.',
  });
  await linkRelatives(caoToPhu.id, caoToMau.id, 'spouse');

  await createMemorialEvent({
    personId: caoToPhu.id,
    title: 'Ngày giỗ Cụ Khởi Tổ Nguyễn Đình Huệ',
    eventType: 'death_anniversary',
    lunarDay: 10,
    lunarMonth: 3,
    notes: 'Giỗ tổ lớn của cả dòng họ, con cháu khắp nơi tề tựu cúng bái tại Từ đường.',
  });

  // ==========================================
  // ĐỜI 2 (THẾ HỆ +3): BẬC TẰNG TỔ (5 người con của Đời 1)
  // Cụ Huệ & Cụ Nhạn sinh 5 người con (4 trai, 1 gái) -> Đạt tiêu chuẩn 4-7 con
  // Xen kẽ đủ:
  // - Ruột thịt: Cụ Bác Cả Huỳnh, Cụ Cố Khang, Cụ Chú Ba Phúc, Cụ Chú Tư Thịnh, Cụ Cô Năm Lan
  // - Bắc cầu: Cụ Bác dâu Mùi, Cụ Cố bà Lụa, Cụ Thím dâu Sen, Cụ Dượng Hào
  // ==========================================
  // 1. Cụ Cả Huỳnh (Ruột) & Cụ Bác dâu Mùi (Bắc cầu)
  const tangToHuynh = await createPerson({
    name: 'Nguyễn Đình Huỳnh',
    nickname: 'Cụ Cả',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Cụ Bác ruột (Cụ Cả)',
    inferredRelationToMe: 'Cụ Bác trưởng',
    generation: 3,
    birthYear: 1902,
    avatarUri: SAMPLE_AVATARS.tangToHuynh,
    isDeceased: true,
    deathDateLunar: '14/04 Âm lịch',
    notes: 'Cụ Bác chi trên, gìn giữ gia quy nghiêm ngặt.',
  });
  const cuBacDauMui = await createPerson({
    name: 'Phan Thị Mùi',
    nickname: 'Cụ Bác Dâu Cả',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Cụ Bác dâu (Vợ Cụ Cả)',
    inferredRelationToMe: 'Cụ Bác dâu',
    generation: 3,
    birthYear: 1904,
    avatarUri: SAMPLE_AVATARS.cuBacDauMui,
    isDeceased: true,
    deathDateLunar: '19/08 Âm lịch',
    notes: 'Cụ Bác dâu hiền hậu, hay làm bánh khảo cúng gia tiên.',
  });
  await linkParentChild(caoToPhu.id, tangToHuynh.id);
  await linkParentChild(caoToMau.id, tangToHuynh.id);
  await linkRelatives(tangToHuynh.id, cuBacDauMui.id, 'spouse');

  // 2. Cụ Hai Khang (Tằng Tổ ruột của Tôi) & Cụ Cố bà Lụa
  const tangToKhang = await createPerson({
    name: 'Nguyễn Đình Khang',
    nickname: 'Cụ Cố Hai',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Cụ Cố ruột (Tằng Tổ Phụ)',
    inferredRelationToMe: 'Cụ Cố (Ông Cố nội)',
    howTheyCallMe: 'Chắt nội',
    generation: 3,
    birthYear: 1905,
    avatarUri: SAMPLE_AVATARS.tangToKhang,
    isDeceased: true,
    deathDateLunar: '02/09 Âm lịch',
    address: 'Cổ Đô, Ba Vì, Hà Nội',
    notes: 'Tham gia kháng chiến chống Pháp, được tặng thưởng Huân chương Kháng chiến.',
  });
  const tangToLua = await createPerson({
    name: 'Đỗ Thị Lụa',
    nickname: 'Cụ Cố Bà',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Cụ Cố ruột (Tằng Tổ Mẫu)',
    inferredRelationToMe: 'Cụ Cố bà',
    howTheyCallMe: 'Chắt nội',
    generation: 3,
    birthYear: 1908,
    avatarUri: SAMPLE_AVATARS.tangToLua,
    isDeceased: true,
    deathDateLunar: '24/11 Âm lịch',
    address: 'Cổ Đô, Ba Vì, Hà Nội',
    notes: 'Thầy thuốc đông y bốc thuốc cứu người trong làng.',
  });
  await linkParentChild(caoToPhu.id, tangToKhang.id);
  await linkParentChild(caoToMau.id, tangToKhang.id);
  await linkRelatives(tangToKhang.id, tangToLua.id, 'spouse');

  await createMemorialEvent({
    personId: tangToKhang.id,
    title: 'Ngày giỗ Cụ Cố Nguyễn Đình Khang',
    eventType: 'death_anniversary',
    lunarDay: 2,
    lunarMonth: 9,
    notes: 'Làm giỗ tại nhà Bác Cả trưởng họ chi hai.',
  });

  // 3. Cụ Ba Phúc (Ruột) & Cụ Thím dâu Sen (Bắc cầu)
  const tangToPhuc = await createPerson({
    name: 'Nguyễn Đình Phúc',
    nickname: 'Cụ Ba',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Cụ Chú ruột (Cụ Ba)',
    inferredRelationToMe: 'Cụ Chú',
    generation: 3,
    birthYear: 1909,
    avatarUri: SAMPLE_AVATARS.tangToPhuc,
    isDeceased: true,
    deathDateLunar: '05/06 Âm lịch',
  });
  const cuThimDauSen = await createPerson({
    name: 'Bùi Thị Sen',
    nickname: 'Cụ Thím Ba',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Cụ Thím dâu (Vợ Cụ Ba)',
    inferredRelationToMe: 'Cụ Thím',
    generation: 3,
    birthYear: 1911,
    avatarUri: SAMPLE_AVATARS.cuThimDauSen,
    isDeceased: true,
    deathDateLunar: '28/02 Âm lịch',
  });
  await linkParentChild(caoToPhu.id, tangToPhuc.id);
  await linkParentChild(caoToMau.id, tangToPhuc.id);
  await linkRelatives(tangToPhuc.id, cuThimDauSen.id, 'spouse');

  // 4. Cụ Tư Thịnh (Ruột)
  const tangToThinh = await createPerson({
    name: 'Nguyễn Đình Thịnh',
    nickname: 'Cụ Tư',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Cụ Chú ruột (Cụ Tư)',
    inferredRelationToMe: 'Cụ Chú',
    generation: 3,
    birthYear: 1912,
    avatarUri: SAMPLE_AVATARS.tangToThinh,
    isDeceased: true,
    deathDateLunar: '19/01 Âm lịch',
  });
  await linkParentChild(caoToPhu.id, tangToThinh.id);
  await linkParentChild(caoToMau.id, tangToThinh.id);

  // 5. Cụ Năm Lan (Bà Cụ Cô Ruột) & Cụ Dượng Hào (Bắc cầu)
  const tangToLan = await createPerson({
    name: 'Nguyễn Thị Lan',
    nickname: 'Cụ Năm',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Bà Cụ Cô ruột (Cụ Năm)',
    inferredRelationToMe: 'Bà Cụ Cô',
    generation: 3,
    birthYear: 1915,
    avatarUri: SAMPLE_AVATARS.tangToLan,
    isDeceased: true,
    deathDateLunar: '12/12 Âm lịch',
  });
  const cuDuongHao = await createPerson({
    name: 'Trần Văn Hào',
    nickname: 'Cụ Dượng Năm',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Ông Cụ Dượng (Chồng Bà Cụ Cô)',
    inferredRelationToMe: 'Cụ Dượng',
    generation: 3,
    birthYear: 1913,
    avatarUri: SAMPLE_AVATARS.cuDuongHao,
    isDeceased: true,
    deathDateLunar: '08/04 Âm lịch',
  });
  await linkParentChild(caoToPhu.id, tangToLan.id);
  await linkParentChild(caoToMau.id, tangToLan.id);
  await linkRelatives(tangToLan.id, cuDuongHao.id, 'spouse');

  // ==========================================
  // ĐỜI 3 (THẾ HỆ +2): BẬC ÔNG BÀ (6 con của Cụ Khang & Cụ Lụa)
  // Cụ Khang & Cụ Lụa sinh 6 người con (4 trai, 2 gái) -> Đạt tiêu chuẩn 4-7 con
  // Xen kẽ đầy đủ Ruột thịt và Bắc cầu:
  // - Ông Bác ruột Trọng & Bà Bác dâu Quý
  // - Ông Nội ruột Chính & Bà Nội ruột Mai
  // - Ông Chú ruột Liêm & Bà Thím dâu Thục
  // - Bà Cô ruột Tuyết & Ông Dượng Chung
  // - Ông Chú ruột Hùng & Bà Thím dâu Phương
  // - Bà Cô ruột Vân & Ông Dượng Tuấn
  // ==========================================
  // 1. Ông Bác Cả Trọng (Ruột) & Bà Bác dâu Quý (Bắc cầu)
  const ongBacTrong = await createPerson({
    name: 'Nguyễn Đình Trọng',
    nickname: 'Ông Bác Cả',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Ông Bác ruột (Bác Cả)',
    inferredRelationToMe: 'Ông Bác trưởng',
    generation: 2,
    birthYear: 1930,
    avatarUri: SAMPLE_AVATARS.ongBacTrong,
    isDeceased: true,
    deathDateLunar: '22/10 Âm lịch',
    address: 'Ba Vì, Hà Nội',
  });
  const baBacDauQuy = await createPerson({
    name: 'Phạm Thị Quý',
    nickname: 'Bà Bác Cả',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Bà Bác dâu (Vợ Ông Bác Cả)',
    inferredRelationToMe: 'Bà Bác dâu',
    generation: 2,
    birthYear: 1932,
    avatarUri: SAMPLE_AVATARS.baBacDauQuy,
    isDeceased: true,
    deathDateLunar: '16/05 Âm lịch',
    address: 'Ba Vì, Hà Nội',
  });
  await linkParentChild(tangToKhang.id, ongBacTrong.id);
  await linkParentChild(tangToLua.id, ongBacTrong.id);
  await linkRelatives(ongBacTrong.id, baBacDauQuy.id, 'spouse');

  // 2. Ông Nội ruột: Nguyễn Đình Chính & Bà Nội: Hoàng Thị Mai
  const ongNoiChinh = await createPerson({
    name: 'Nguyễn Đình Chính',
    nickname: 'Ông Nội',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Ông nội ruột',
    inferredRelationToMe: 'Ông nội',
    howTheyCallMe: 'Cháu đích tôn',
    generation: 2,
    birthYear: 1934,
    avatarUri: SAMPLE_AVATARS.ongNoiChinh,
    isDeceased: true,
    deathDateLunar: '06/03 Âm lịch',
    address: 'Cổ Đô, Ba Vì, Hà Nội',
    notes: 'Nhà giáo ưu tú làng Cổ Đô, dạy chữ nho và toán pháp, cẩn thận, yêu con cháu.',
  });
  const baNoiMai = await createPerson({
    name: 'Hoàng Thị Mai',
    nickname: 'Bà Nội',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Bà nội ruột',
    inferredRelationToMe: 'Bà nội',
    howTheyCallMe: 'Cháu nội',
    generation: 2,
    birthYear: 1938,
    avatarUri: SAMPLE_AVATARS.baNoiMai,
    isDeceased: false,
    phone: '0912111222',
    address: 'Cầu Giấy, Hà Nội',
    notes: 'Bà năm nay gần 90 tuổi, rất minh mẫn, thích nhai trầu và kể chuyện xưa.',
  });
  await linkParentChild(tangToKhang.id, ongNoiChinh.id);
  await linkParentChild(tangToLua.id, ongNoiChinh.id);
  await linkRelatives(ongNoiChinh.id, baNoiMai.id, 'spouse');

  await createMemorialEvent({
    personId: ongNoiChinh.id,
    title: 'Ngày giỗ Ông Nội Nguyễn Đình Chính',
    eventType: 'death_anniversary',
    lunarDay: 6,
    lunarMonth: 3,
    notes: 'Giỗ ông nội tại nhà thờ họ chi hai, con cháu tụ họp đông đủ làm cơm dâng cúng.',
  });

  // 3. Ông Chú Ba Liêm (Ruột) & Bà Thím dâu Thục (Bắc cầu)
  const ongChuLiem = await createPerson({
    name: 'Nguyễn Đình Liêm',
    nickname: 'Ông Chú Ba',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Ông Chú ruột (Chú Ba)',
    inferredRelationToMe: 'Ông Chú',
    generation: 2,
    birthYear: 1937,
    avatarUri: SAMPLE_AVATARS.ongChuLiem,
    isDeceased: true,
    deathDateLunar: '15/07 Âm lịch',
  });
  const baThimDauThuc = await createPerson({
    name: 'Đoàn Thị Thục',
    nickname: 'Bà Thím Ba',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Bà Thím dâu (Vợ Ông Chú Ba)',
    inferredRelationToMe: 'Bà Thím',
    generation: 2,
    birthYear: 1940,
    avatarUri: SAMPLE_AVATARS.baThimDauThuc,
    isDeceased: true,
    deathDateLunar: '03/11 Âm lịch',
  });
  await linkParentChild(tangToKhang.id, ongChuLiem.id);
  await linkParentChild(tangToLua.id, ongChuLiem.id);
  await linkRelatives(ongChuLiem.id, baThimDauThuc.id, 'spouse');

  // 4. Bà Cô Tư Tuyết (Ruột) & Ông Dượng Chung (Bắc cầu)
  const baCoTuyet = await createPerson({
    name: 'Nguyễn Thị Tuyết',
    nickname: 'Bà Cô Tư',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Bà Cô ruột (Cô Tư)',
    inferredRelationToMe: 'Bà Cô ruột',
    generation: 2,
    birthYear: 1941,
    avatarUri: SAMPLE_AVATARS.baCoTuyet,
    isDeceased: false,
    phone: '0988222333',
    address: 'Việt Trì, Phú Thọ',
    notes: 'Bà cô rất xởi lởi, hay gửi quà bánh quê về cho các cháu.',
  });
  const ongDuongChung = await createPerson({
    name: 'Lê Văn Chung',
    nickname: 'Ông Dượng Chung',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Ông Dượng (Chồng Bà Cô Tư)',
    inferredRelationToMe: 'Ông Dượng',
    generation: 2,
    birthYear: 1939,
    avatarUri: SAMPLE_AVATARS.ongDuongChung,
    isDeceased: true,
    deathDateLunar: '11/09 Âm lịch',
    address: 'Việt Trì, Phú Thọ',
  });
  await linkParentChild(tangToKhang.id, baCoTuyet.id);
  await linkParentChild(tangToLua.id, baCoTuyet.id);
  await linkRelatives(baCoTuyet.id, ongDuongChung.id, 'spouse');

  // 5. Ông Chú Năm Hùng (Ruột) & Bà Thím dâu Phương (Bắc cầu)
  const ongChuHung = await createPerson({
    name: 'Nguyễn Đình Hùng',
    nickname: 'Ông Chú Năm',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Ông Chú ruột (Chú Năm)',
    inferredRelationToMe: 'Ông Chú',
    generation: 2,
    birthYear: 1945,
    avatarUri: SAMPLE_AVATARS.ongChuHung,
    isDeceased: false,
    phone: '0977333444',
    address: 'Quận 1, TP. Hồ Chí Minh',
    notes: 'Cán bộ miền Nam tập kết, nay nghỉ hưu tại Sài Gòn.',
  });
  const baThimDauPhuong = await createPerson({
    name: 'Ngô Lan Phương',
    nickname: 'Bà Thím Năm',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Bà Thím dâu (Vợ Ông Chú Năm)',
    inferredRelationToMe: 'Bà Thím',
    generation: 2,
    birthYear: 1947,
    avatarUri: SAMPLE_AVATARS.baThimDauPhuong,
    isDeceased: false,
    phone: '0977333555',
    address: 'Quận 1, TP. Hồ Chí Minh',
  });
  await linkParentChild(tangToKhang.id, ongChuHung.id);
  await linkParentChild(tangToLua.id, ongChuHung.id);
  await linkRelatives(ongChuHung.id, baThimDauPhuong.id, 'spouse');

  // 6. Bà Cô Sáu Vân (Ruột) & Ông Dượng Tuấn (Bắc cầu)
  const baCoVan = await createPerson({
    name: 'Nguyễn Thị Vân',
    nickname: 'Bà Cô Sáu',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Bà Cô ruột (Cô Sáu)',
    inferredRelationToMe: 'Bà Cô',
    generation: 2,
    birthYear: 1948,
    avatarUri: SAMPLE_AVATARS.baCoVan,
    isDeceased: false,
    phone: '0966555777',
    address: 'Nha Trang, Khánh Hòa',
  });
  const ongDuongTuan = await createPerson({
    name: 'Ngô Thế Tuấn',
    nickname: 'Ông Dượng Tuấn',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Ông Dượng (Chồng Bà Cô Sáu)',
    inferredRelationToMe: 'Ông Dượng',
    generation: 2,
    birthYear: 1946,
    avatarUri: SAMPLE_AVATARS.ongDuongTuan,
    isDeceased: false,
    phone: '0966555888',
    address: 'Nha Trang, Khánh Hòa',
  });
  await linkParentChild(tangToKhang.id, baCoVan.id);
  await linkParentChild(tangToLua.id, baCoVan.id);
  await linkRelatives(baCoVan.id, ongDuongTuan.id, 'spouse');

  // ==========================================
  // ĐỜI 4 (THẾ HỆ +1): BẬC CHA CHÚ (5 con của Ông Chính & Bà Mai)
  // Ông Chính & Bà Mai sinh 5 người con (4 trai, 1 gái) -> Đạt tiêu chuẩn 4-7 con
  // Xen kẽ đầy đủ Ruột thịt và Bắc cầu:
  // - Bác ruột Tuấn (Bác Cả) & Bác dâu Hương
  // - Bố ruột Bình & Mẹ ruột Thu
  // - Chú ruột Dũng (Chú Ba) & Thím dâu Oanh
  // - Cô ruột Hằng (Cô Tư) & Chú Dượng Long
  // - Chú ruột Nam (Chú Út) & Thím dâu Linh
  // ==========================================
  // 1. Bác Cả Tuấn (Ruột) & Bác Dâu Cả Hương (Bắc cầu)
  const bacCaTuan = await createPerson({
    name: 'Nguyễn Đình Tuấn',
    nickname: 'Bác Cả',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Bác ruột (Bác Cả trưởng họ)',
    inferredRelationToMe: 'Bác trai (Anh của Bố)',
    howTheyCallMe: 'Cháu Trung',
    generation: 1,
    birthYear: 1959,
    avatarUri: SAMPLE_AVATARS.bacCaTuan,
    isDeceased: false,
    phone: '0988667788',
    address: 'Cổ Đô, Ba Vì, Hà Nội',
    notes: 'Trưởng chi họ hai, người giữ chìa khóa từ đường và chủ trì việc tế lễ gia tộc.',
  });
  const bacGaiHuong = await createPerson({
    name: 'Vũ Thị Hương',
    nickname: 'Bác Dâu Cả',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Bác dâu (Vợ Bác Cả)',
    inferredRelationToMe: 'Bác dâu (Vợ Bác Cả)',
    howTheyCallMe: 'Cháu Trung',
    generation: 1,
    birthYear: 1961,
    avatarUri: SAMPLE_AVATARS.bacGaiHuong,
    isDeceased: false,
    address: 'Cổ Đô, Ba Vì, Hà Nội',
  });
  await linkParentChild(ongNoiChinh.id, bacCaTuan.id);
  await linkParentChild(baNoiMai.id, bacCaTuan.id);
  await linkRelatives(bacCaTuan.id, bacGaiHuong.id, 'spouse');

  // 2. Bố ruột: Nguyễn Đình Bình & Mẹ ruột: Lê Thị Thu
  const boBinh = await createPerson({
    name: 'Nguyễn Đình Bình',
    nickname: 'Bố Bình',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Bố ruột',
    inferredRelationToMe: 'Bố',
    howTheyCallMe: 'Con trai',
    generation: 1,
    birthYear: 1963,
    avatarUri: SAMPLE_AVATARS.boBinh,
    isDeceased: false,
    phone: '0913556677',
    address: 'Cầu Giấy, Hà Nội',
    notes: 'Kỹ sư cầu đường, tính cách điềm đạm, thích chơi cây cảnh và uống trà sáng.',
  });
  const meThu = await createPerson({
    name: 'Lê Thị Thu',
    nickname: 'Mẹ Thu',
    gender: 'female',
    branch: 'ngoai',
    customRelationToMe: 'Mẹ ruột',
    inferredRelationToMe: 'Mẹ',
    howTheyCallMe: 'Con trai Trung',
    generation: 1,
    birthYear: 1966,
    avatarUri: SAMPLE_AVATARS.meThu,
    isDeceased: false,
    phone: '0904112233',
    address: 'Cầu Giấy, Hà Nội',
    notes: 'Giáo viên về hưu, rất khéo tay, nấu các món ăn gia truyền ngày Tết rất ngon.',
  });
  await linkParentChild(ongNoiChinh.id, boBinh.id);
  await linkParentChild(baNoiMai.id, boBinh.id);
  await linkRelatives(boBinh.id, meThu.id, 'spouse');

  // 3. Chú ruột Dũng (Chú Ba) & Thím dâu Oanh (Bắc cầu)
  const chuBaDung = await createPerson({
    name: 'Nguyễn Đình Dũng',
    nickname: 'Chú Ba',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Chú ruột (Chú Ba)',
    inferredRelationToMe: 'Chú (Em trai của Bố)',
    howTheyCallMe: 'Cháu Trung',
    generation: 1,
    birthYear: 1968,
    avatarUri: SAMPLE_AVATARS.chuBaDung,
    isDeceased: false,
    phone: '0979888999',
    address: 'Thanh Xuân, Hà Nội',
    notes: 'Giám đốc công ty vận tải, vui tính, hay giúp đỡ anh em họ hàng.',
  });
  const thimOanh = await createPerson({
    name: 'Trần Kim Oanh',
    nickname: 'Thím Ba',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Thím dâu (Vợ Chú Ba)',
    inferredRelationToMe: 'Thím (Vợ Chú Ba)',
    howTheyCallMe: 'Cháu Trung',
    generation: 1,
    birthYear: 1970,
    avatarUri: SAMPLE_AVATARS.thimOanh,
    isDeceased: false,
    address: 'Thanh Xuân, Hà Nội',
  });
  await linkParentChild(ongNoiChinh.id, chuBaDung.id);
  await linkParentChild(baNoiMai.id, chuBaDung.id);
  await linkRelatives(chuBaDung.id, thimOanh.id, 'spouse');

  // 4. Cô ruột Hằng (Cô Tư) & Chú Dượng Long (Bắc cầu)
  const coTuHang = await createPerson({
    name: 'Nguyễn Thị Hằng',
    nickname: 'Cô Tư',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Cô ruột (Cô Tư)',
    inferredRelationToMe: 'Cô ruột (Em gái của Bố)',
    howTheyCallMe: 'Cháu Trung',
    generation: 1,
    birthYear: 1972,
    avatarUri: SAMPLE_AVATARS.coTuHang,
    isDeceased: false,
    phone: '0983123456',
    address: 'Lê Chân, Hải Phòng',
    notes: 'Kế toán trưởng, rất thương các cháu, năm nào cũng gửi hải sản về biếu gia đình.',
  });
  const chuDuongLong = await createPerson({
    name: 'Đặng Văn Long',
    nickname: 'Chú Dượng Long',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Chú Dượng (Chồng Cô Tư)',
    inferredRelationToMe: 'Chú Dượng',
    howTheyCallMe: 'Cháu Trung',
    generation: 1,
    birthYear: 1971,
    avatarUri: SAMPLE_AVATARS.chuDuongLong,
    isDeceased: false,
    phone: '0983123789',
    address: 'Lê Chân, Hải Phòng',
  });
  await linkParentChild(ongNoiChinh.id, coTuHang.id);
  await linkParentChild(baNoiMai.id, coTuHang.id);
  await linkRelatives(coTuHang.id, chuDuongLong.id, 'spouse');

  // 5. Chú ruột Nam (Chú Út) & Thím dâu Linh (Bắc cầu)
  const chuUtNam = await createPerson({
    name: 'Nguyễn Đình Nam',
    nickname: 'Chú Út',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Chú ruột (Chú Út)',
    inferredRelationToMe: 'Chú (Em út của Bố)',
    howTheyCallMe: 'Cháu Trung',
    generation: 1,
    birthYear: 1976,
    avatarUri: SAMPLE_AVATARS.chuUtNam,
    isDeceased: false,
    phone: '0912889900',
    address: 'Hải Châu, Đà Nẵng',
    notes: 'Kiến trúc sư sinh sống tại Đà Nẵng.',
  });
  const thimUtLinh = await createPerson({
    name: 'Ngô Phương Linh',
    nickname: 'Thím Út',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Thím dâu (Vợ Chú Út)',
    inferredRelationToMe: 'Thím (Vợ Chú Út)',
    howTheyCallMe: 'Cháu Trung',
    generation: 1,
    birthYear: 1978,
    avatarUri: SAMPLE_AVATARS.thimUtLinh,
    isDeceased: false,
    address: 'Hải Châu, Đà Nẵng',
  });
  await linkParentChild(ongNoiChinh.id, chuUtNam.id);
  await linkParentChild(baNoiMai.id, chuUtNam.id);
  await linkRelatives(chuUtNam.id, thimUtLinh.id, 'spouse');

  // ==========================================
  // ĐỜI 5 (THẾ HỆ 0): THẾ HỆ CỦA TÔI & ANH CHỊ EM
  // Xen kẽ đầy đủ Ruột thịt và Bắc cầu:
  // - Anh trai ruột Hưng & Chị dâu ruột Hà
  // - Tôi (Trung) & Vợ Thảo
  // - Em trai ruột Thành & Em dâu ruột Quỳnh
  // - Em gái ruột Linh & Em rể ruột Tuấn
  // - Anh họ Phong & Chị dâu họ Mai Anh
  // - Chị họ Trang & Anh rể họ Minh
  // - Anh họ Vũ, Chị họ Mai
  // - Em họ Long & Em dâu họ Ly
  // - Em họ Huyền, Em họ Nam, Em họ My
  // - Em họ Quang Huy
  // ==========================================

  // --- 1. Gia đình Bác Cả (4 con: Phong, Trang, Vũ, Mai) ---
  const anhPhong = await createPerson({
    name: 'Nguyễn Đình Phong',
    nickname: 'Anh Phong',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Anh họ (Con Bác Cả)',
    inferredRelationToMe: 'Anh họ trưởng',
    howTheyCallMe: 'Em Trung',
    generation: 0,
    birthYear: 1986,
    avatarUri: SAMPLE_AVATARS.anhPhong,
    isDeceased: false,
    phone: '0982555666',
    address: 'Tây Hồ, Hà Nội',
    notes: 'Kinh doanh dược phẩm, người chu đáo, nhiệt tình gánh vác việc họ.',
  });
  const chiDauAnh = await createPerson({
    name: 'Đinh Mai Anh',
    nickname: 'Chị Dâu Phong',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Chị dâu họ (Vợ Anh Phong)',
    inferredRelationToMe: 'Chị dâu họ',
    howTheyCallMe: 'Chú Trung',
    generation: 0,
    birthYear: 1988,
    avatarUri: SAMPLE_AVATARS.chiDauAnh,
    isDeceased: false,
  });
  await linkParentChild(bacCaTuan.id, anhPhong.id);
  await linkParentChild(bacGaiHuong.id, anhPhong.id);
  await linkRelatives(anhPhong.id, chiDauAnh.id, 'spouse');

  const chiTrang = await createPerson({
    name: 'Nguyễn Thu Trang',
    nickname: 'Chị Trang',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Chị họ (Con Bác Cả)',
    inferredRelationToMe: 'Chị họ',
    howTheyCallMe: 'Em Trung',
    generation: 0,
    birthYear: 1989,
    avatarUri: SAMPLE_AVATARS.chiTrang,
    isDeceased: false,
    phone: '0976111222',
    address: 'Cầu Giấy, Hà Nội',
    notes: 'Giảng viên Đại học Ngoại Ngữ.',
  });
  const anhReMinh = await createPerson({
    name: 'Trần Đức Minh',
    nickname: 'Anh Rể Minh',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Anh rể họ (Chồng Chị Trang)',
    inferredRelationToMe: 'Anh rể họ',
    howTheyCallMe: 'Cậu Trung',
    generation: 0,
    birthYear: 1987,
    avatarUri: SAMPLE_AVATARS.anhReMinh,
    isDeceased: false,
    phone: '0976111333',
  });
  await linkParentChild(bacCaTuan.id, chiTrang.id);
  await linkParentChild(bacGaiHuong.id, chiTrang.id);
  await linkRelatives(chiTrang.id, anhReMinh.id, 'spouse');

  const anhVu = await createPerson({
    name: 'Nguyễn Đình Vũ',
    nickname: 'Anh Vũ',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Anh họ (Con Bác Cả)',
    inferredRelationToMe: 'Anh họ',
    howTheyCallMe: 'Em Trung',
    generation: 0,
    birthYear: 1992,
    avatarUri: SAMPLE_AVATARS.anhVu,
    isDeceased: false,
    phone: '0985222111',
    address: 'Ba Vì, Hà Nội',
  });
  await linkParentChild(bacCaTuan.id, anhVu.id);
  await linkParentChild(bacGaiHuong.id, anhVu.id);

  const chiMai = await createPerson({
    name: 'Nguyễn Phương Mai',
    nickname: 'Chị Mai',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Chị họ (Con Bác Cả)',
    inferredRelationToMe: 'Chị họ',
    howTheyCallMe: 'Em Trung',
    generation: 0,
    birthYear: 1994,
    avatarUri: SAMPLE_AVATARS.chiMai,
    isDeceased: false,
    phone: '0917333555',
  });
  await linkParentChild(bacCaTuan.id, chiMai.id);
  await linkParentChild(bacGaiHuong.id, chiMai.id);

  // --- 2. Gia đình Bố Bình (4 con ruột: Anh Hưng, Tôi, Em Thành, Em Linh) ---
  // Anh trai ruột Hưng & Chị dâu ruột Hà
  const anhHung = await createPerson({
    name: 'Nguyễn Đình Hưng',
    nickname: 'Anh Hưng',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Anh trai ruột',
    inferredRelationToMe: 'Anh trai ruột',
    howTheyCallMe: 'Em Trung',
    generation: 0,
    birthYear: 1991,
    avatarUri: SAMPLE_AVATARS.anhHung,
    isDeceased: false,
    phone: '0981999888',
    address: 'Hà Đông, Hà Nội',
    notes: 'Bác sĩ ngoại khoa tại Bệnh viện Bạch Mai.',
  });
  const chiDauHa = await createPerson({
    name: 'Phạm Thu Hà',
    nickname: 'Chị Dâu Hà',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Chị dâu ruột (Vợ Anh Hưng)',
    inferredRelationToMe: 'Chị dâu ruột',
    howTheyCallMe: 'Chú Trung',
    generation: 0,
    birthYear: 1993,
    avatarUri: SAMPLE_AVATARS.chiDauHa,
    isDeceased: false,
    phone: '0981999777',
    address: 'Hà Đông, Hà Nội',
    notes: 'Dược sĩ tại Bệnh viện Bạch Mai, khéo léo, chu đáo.',
  });
  await linkParentChild(boBinh.id, anhHung.id);
  await linkParentChild(meThu.id, anhHung.id);
  await linkRelatives(anhHung.id, chiDauHa.id, 'spouse');

  // Vợ của Tôi:
  const voThao = await createPerson({
    name: 'Lê Thị Thảo',
    nickname: 'Vợ Thảo',
    gender: 'female',
    branch: 'vo_chong',
    customRelationToMe: 'Vợ',
    inferredRelationToMe: 'Vợ',
    howTheyCallMe: 'Chồng',
    generation: 0,
    birthYear: 1996,
    avatarUri: SAMPLE_AVATARS.voThao,
    isDeceased: false,
    phone: '0908889911',
    address: 'Cầu Giấy, Hà Nội',
    notes: 'Bác sĩ nhi khoa bệnh viện Nhi TW, hiền dịu, chăm lo chu đáo cho gia đình.',
  });

  // Em trai ruột của Tôi: Thành & Em dâu ruột Quỳnh
  const emTraiThanh = await createPerson({
    name: 'Nguyễn Đình Thành',
    nickname: 'Thành Béo',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Em trai ruột',
    inferredRelationToMe: 'Em trai ruột',
    howTheyCallMe: 'Anh Trung',
    generation: 0,
    birthYear: 1998,
    avatarUri: SAMPLE_AVATARS.emTraiThanh,
    isDeceased: false,
    phone: '0966444555',
    address: 'Cầu Giấy, Hà Nội',
    notes: 'Lập trình viên backend, tính vui vẻ, thích chơi đá bóng cuối tuần.',
  });
  const emDauQuynh = await createPerson({
    name: 'Võ Thị Quỳnh',
    nickname: 'Quỳnh Dâu',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Em dâu ruột (Vợ Em Thành)',
    inferredRelationToMe: 'Em dâu ruột',
    howTheyCallMe: 'Bác Trung',
    generation: 0,
    birthYear: 2000,
    avatarUri: SAMPLE_AVATARS.emDauQuynh,
    isDeceased: false,
    phone: '0966444666',
    notes: 'Thiết kế đồ họa, hiền lành, yêu trẻ con.',
  });
  await linkParentChild(boBinh.id, emTraiThanh.id);
  await linkParentChild(meThu.id, emTraiThanh.id);
  await linkRelatives(emTraiThanh.id, emDauQuynh.id, 'spouse');

  // Em gái ruột của Tôi: Linh & Em rể ruột Tuấn
  const emGaiLinh = await createPerson({
    name: 'Nguyễn Thuỳ Linh',
    nickname: 'Bé Linh',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Em gái ruột',
    inferredRelationToMe: 'Em gái ruột',
    howTheyCallMe: 'Anh Trung',
    generation: 0,
    birthYear: 2002,
    avatarUri: SAMPLE_AVATARS.emGaiLinh,
    isDeceased: false,
    phone: '0987333222',
    address: 'Cầu Giấy, Hà Nội',
    notes: 'Tốt nghiệp cử nhân Ngoại thương, đang làm việc tại công ty đa quốc gia.',
  });
  const emReTuan = await createPerson({
    name: 'Hoàng Quốc Tuấn',
    nickname: 'Tuấn Rể',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Em rể ruột (Chồng Em Linh)',
    inferredRelationToMe: 'Em rể ruột',
    howTheyCallMe: 'Anh Trung',
    generation: 0,
    birthYear: 2000,
    avatarUri: SAMPLE_AVATARS.emReTuan,
    isDeceased: false,
    phone: '0987333111',
    notes: 'Chuyên viên tài chính ngân hàng, năng động.',
  });
  await linkParentChild(boBinh.id, emGaiLinh.id);
  await linkParentChild(meThu.id, emGaiLinh.id);
  await linkRelatives(emGaiLinh.id, emReTuan.id, 'spouse');

  // --- 3. Gia đình Chú Ba Dũng (4 con: Long, Huyền, Nam, My) ---
  const emLong = await createPerson({
    name: 'Nguyễn Đình Long',
    nickname: 'Long Kều',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Em họ (Con Chú Ba)',
    inferredRelationToMe: 'Em họ',
    howTheyCallMe: 'Anh Trung',
    generation: 0,
    birthYear: 1997,
    avatarUri: SAMPLE_AVATARS.emLong,
    isDeceased: false,
    phone: '0943555777',
    address: 'Thanh Xuân, Hà Nội',
  });
  const emDauLy = await createPerson({
    name: 'Bùi Khánh Ly',
    nickname: 'Ly Dâu',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Em dâu họ (Vợ Em Long)',
    inferredRelationToMe: 'Em dâu họ',
    howTheyCallMe: 'Anh Trung',
    generation: 0,
    birthYear: 1999,
    avatarUri: SAMPLE_AVATARS.emDauLy,
    isDeceased: false,
    phone: '0943555888',
  });
  await linkParentChild(chuBaDung.id, emLong.id);
  await linkParentChild(thimOanh.id, emLong.id);
  await linkRelatives(emLong.id, emDauLy.id, 'spouse');

  const emHuyen = await createPerson({
    name: 'Nguyễn Khánh Huyền',
    nickname: 'Huyền Mít',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Em họ (Con Chú Ba)',
    inferredRelationToMe: 'Em họ',
    howTheyCallMe: 'Anh Trung',
    generation: 0,
    birthYear: 2000,
    avatarUri: SAMPLE_AVATARS.emHuyen,
    isDeceased: false,
    phone: '0977888123',
    address: 'Thanh Xuân, Hà Nội',
  });
  await linkParentChild(chuBaDung.id, emHuyen.id);
  await linkParentChild(thimOanh.id, emHuyen.id);

  const emNamConChu = await createPerson({
    name: 'Nguyễn Đình Nam',
    nickname: 'Cu Bin',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Em họ (Con Chú Ba)',
    inferredRelationToMe: 'Em họ',
    howTheyCallMe: 'Anh Trung',
    generation: 0,
    birthYear: 2003,
    avatarUri: SAMPLE_AVATARS.emNamConChu,
    isDeceased: false,
  });
  await linkParentChild(chuBaDung.id, emNamConChu.id);
  await linkParentChild(thimOanh.id, emNamConChu.id);

  const emMy = await createPerson({
    name: 'Nguyễn Hà My',
    nickname: 'Bé My',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Em họ (Con Chú Ba)',
    inferredRelationToMe: 'Em họ',
    howTheyCallMe: 'Anh Trung',
    generation: 0,
    birthYear: 2006,
    avatarUri: SAMPLE_AVATARS.emMy,
    isDeceased: false,
  });
  await linkParentChild(chuBaDung.id, emMy.id);
  await linkParentChild(thimOanh.id, emMy.id);

  // --- 4. Con Cô Tư Hằng ---
  const emHuy = await createPerson({
    name: 'Đặng Quang Huy',
    nickname: 'Huy Còi',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Em họ (Con Cô Tư)',
    inferredRelationToMe: 'Em họ',
    howTheyCallMe: 'Anh Trung',
    generation: 0,
    birthYear: 1999,
    avatarUri: SAMPLE_AVATARS.emHuy,
    isDeceased: false,
    phone: '0936777888',
    address: 'Hải Phòng',
  });
  await linkParentChild(coTuHang.id, emHuy.id);
  await linkParentChild(chuDuongLong.id, emHuy.id);

  // ==========================================
  // ĐỜI 6 (THẾ HỆ -1): BẬC CON CHÁU ĐỜI MỚI NHẤT
  // "Đời gần nhất thì có 2 con":
  // - Tôi & Vợ Thảo có đúng 2 con ruột (Bé Khôi & Bé An)
  // - Anh trai ruột Hưng & Chị dâu Hà có đúng 2 con (Cháu ruột)
  // - Anh họ trưởng chi Phong & Chị Mai Anh có đúng 2 con (Cháu họ)
  // ==========================================
  // 1. Con trai cả ruột của Tôi:
  const conTraiKhoi = await createPerson({
    name: 'Nguyễn Quang Khôi',
    nickname: 'Bé Khôi (Cún)',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Con trai cả ruột',
    inferredRelationToMe: 'Con trai ruột',
    howTheyCallMe: 'Bố Trung',
    generation: -1,
    birthYear: 2022,
    avatarUri: SAMPLE_AVATARS.conTraiKhoi,
    isDeceased: false,
    notes: 'Thích ô tô đồ chơi, tính cách lém lỉnh, hay cười.',
  });
  await linkParentChild(voThao.id, conTraiKhoi.id);

  // 2. Con gái út ruột của Tôi:
  const conGaiAn = await createPerson({
    name: 'Nguyễn Tuệ An',
    nickname: 'Bé An (Thỏ)',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Con gái út ruột',
    inferredRelationToMe: 'Con gái ruột',
    howTheyCallMe: 'Bố Trung',
    generation: -1,
    birthYear: 2024,
    avatarUri: SAMPLE_AVATARS.conGaiAn,
    isDeceased: false,
    notes: 'Công chúa nhỏ của gia đình, vừa biết bi bô gọi bố mẹ.',
  });
  await linkParentChild(voThao.id, conGaiAn.id);

  // 3. Cháu ruột: 2 con của Anh ruột Hưng & Chị dâu Hà
  const chauRuotKhangAn = await createPerson({
    name: 'Nguyễn Đình Khang An',
    nickname: 'Bé Khang An',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Cháu trai ruột (Con Anh Hưng)',
    inferredRelationToMe: 'Cháu ruột (gọi là Chú)',
    howTheyCallMe: 'Chú Trung',
    generation: -1,
    birthYear: 2021,
    avatarUri: SAMPLE_AVATARS.chauRuotKhangAn,
    isDeceased: false,
    notes: 'Cháu đích tôn của Bố Mẹ, rất thông minh, mê đàn piano.',
  });
  await linkParentChild(anhHung.id, chauRuotKhangAn.id);
  await linkParentChild(chiDauHa.id, chauRuotKhangAn.id);

  const chauRuotTueLam = await createPerson({
    name: 'Nguyễn Tuệ Lâm',
    nickname: 'Bé Nhím',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Cháu gái ruột (Con Anh Hưng)',
    inferredRelationToMe: 'Cháu ruột (gọi là Chú)',
    howTheyCallMe: 'Chú Trung',
    generation: -1,
    birthYear: 2023,
    avatarUri: SAMPLE_AVATARS.chauRuotTueLam,
    isDeceased: false,
  });
  await linkParentChild(anhHung.id, chauRuotTueLam.id);
  await linkParentChild(chiDauHa.id, chauRuotTueLam.id);

  // 4. Cháu họ: 2 con của Anh họ Phong & Chị dâu họ Mai Anh
  const chauBao = await createPerson({
    name: 'Nguyễn Đình Bảo',
    nickname: 'Bảo Bảo',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Cháu trai họ (Con Anh Phong)',
    inferredRelationToMe: 'Cháu họ',
    howTheyCallMe: 'Chú Trung',
    generation: -1,
    birthYear: 2016,
    avatarUri: SAMPLE_AVATARS.chauBao,
    isDeceased: false,
    notes: 'Học sinh giỏi lớp 4, thích môn cờ vua.',
  });
  await linkParentChild(anhPhong.id, chauBao.id);
  await linkParentChild(chiDauAnh.id, chauBao.id);

  const chauDiep = await createPerson({
    name: 'Nguyễn Ngọc Diệp',
    nickname: 'Bé Diệp',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Cháu gái họ (Con Anh Phong)',
    inferredRelationToMe: 'Cháu họ',
    howTheyCallMe: 'Chú Trung',
    generation: -1,
    birthYear: 2019,
    avatarUri: SAMPLE_AVATARS.chauDiep,
    isDeceased: false,
    notes: 'Đang học mầm non, múa hát rất dạn dĩ.',
  });
  await linkParentChild(anhPhong.id, chauDiep.id);
  await linkParentChild(chiDauAnh.id, chauDiep.id);

  return { totalCount: 47 };
}
