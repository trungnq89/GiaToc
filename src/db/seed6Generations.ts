import { createPerson } from './repositories/personRepository';
import { linkRelatives } from './repositories/relationshipRepository';
import { createMemorialEvent } from './repositories/eventRepository';
import { saveUserProfile } from './repositories/userRepository';
import { execute } from './database';

/**
 * Kho ảnh chân dung mẫu từ Unsplash chất lượng cao, đúng lứa tuổi và giới tính:
 * - Đời 1: Bậc Cao Tổ (~1880, Cụ già xưa, râu tóc bạc phơ)
 * - Đời 2: Bậc Tằng Tổ (~1902 - 1918, Cụ Cố ~75-85 tuổi)
 * - Đời 3: Bậc Tiền Bối (~1930 - 1948, Ông Bà ~60-75 tuổi)
 * - Đời 4: Bậc Cha Chú Cô Bác (~1958 - 1978, trung niên ~45-60 tuổi)
 * - Đời 5: Thế hệ Tôi & Anh Chị Em (~1986 - 2005, thanh niên trẻ ~20-38 tuổi)
 * - Đời 6: Bậc Con Cháu Đời Mới (~2016 - 2024, trẻ thơ & em bé ~0-8 tuổi)
 */
const SAMPLE_AVATARS = {
  // ĐỜI 1: CAO TỔ (Sinh ~1880, Cụ già xưa)
  caoToPhu: 'https://images.unsplash.com/photo-1508186225823-0963cf9ab0de?auto=format&fit=crop&w=256&q=80',
  caoToMau: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',

  // ĐỜI 2: TẰNG TỔ (CỤ CỐ, Sinh 1902 - 1918)
  tangToHuynh: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=256&q=80',
  cuBacDauMui: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?auto=format&fit=crop&w=256&q=80',
  tangToKhang: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
  tangToLua: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=256&q=80',
  cuKeMauNghien: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
  tangToPhuc: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
  cuThimDauSen: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=256&q=80',
  tangToThinh: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&q=80',
  tangToLan: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=256&q=80',
  cuDuongHao: 'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=256&q=80',
  baCoToNhai: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  // Bên Ngoại Đời 2:
  cuNgoaiTu: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80',
  cuNgoaiLanh: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?auto=format&fit=crop&w=256&q=80',

  // ĐỜI 3: TIỀN BỐI (ÔNG BÀ, Sinh 1930 - 1948)
  ongBacTrong: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80',
  baBacDauQuy: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
  baBacKeLoan: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
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
  chuUtBach: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&q=80',
  thimDiep: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=256&q=80',
  // Bên Ngoại Đời 3:
  ongNgoaiDat: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
  baNgoaiDoan: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=256&q=80',
  ongCauThinh: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
  baMoSen: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
  // Bên Vợ Đời 3:
  ongNoiVoPhat: 'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=256&q=80',
  baNoiVoCuc: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=256&q=80',

  // ĐỜI 4: CHA CHÚ CÔ BÁC (Sinh 1958 - 1978, trung niên)
  bacCaTuan: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
  bacGaiHuong: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
  bacPhong: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80',
  bacDauMai: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
  chuUtQuan: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
  boBinh: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  meThu: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
  chuBaDung: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
  thimOanh: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
  conNuoiThien: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
  coTuHang: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=256&q=80',
  chuDuongLong: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80',
  chuUtNam: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&q=80',
  thimUtLinh: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  // Bên Ngoại Đời 4:
  bacNgoaiPhong: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  bacDauNgoaiKim: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
  cauHao: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&q=80',
  moTuyet: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
  diLan: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
  duongQuang: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=256&q=80',
  // Bên Vợ Đời 4:
  boVoDung: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80',
  meVoHien: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=256&q=80',
  bacVoHung: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
  bacDauVoMai: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
  coVoNga: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
  duongVoKhanh: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',

  // ĐỜI 5: TÔI & ANH CHỊ EM (Sinh 1986 - 2005)
  anhPhong: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80',
  chiDauAnh: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80',
  chiTrang: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  anhReMinh: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=256&q=80',
  anhHung: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  chiDauHa: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=256&q=80',
  mePerson: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
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
  // Bên Ngoại Đời 5:
  anhHoNgoaiHuy: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80',
  chiDauNgoaiThuy: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
  chiHoNgoaiNgoc: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80',
  emHoNgoaiKiet: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&q=80',
  // Bên Vợ Đời 5:
  anhVoHoangAnh: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  chiDauVoChi: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=256&q=80',
  emVoThuHa: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  emReVoDuc: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=256&q=80',
  emHoVoBao: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',

  // ĐỜI 6: BẬC CON CHÁU (Sinh 2016 - 2024)
  conTraiKhoi: 'https://images.unsplash.com/photo-1595454223600-91fbdd77ae58?auto=format&fit=crop&w=256&q=80',
  conGaiAn: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=256&q=80',
  chauRuotKhangAn: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=256&q=80',
  chauRuotTueLam: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=256&q=80',
  chauBao: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&q=80',
  chauDiep: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=256&q=80',
  // Bên Ngoại Đời 6:
  chauNgoaiMinh: 'https://images.unsplash.com/photo-1595454223600-91fbdd77ae58?auto=format&fit=crop&w=256&q=80',
  chauNgoaiChau: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=256&q=80',
  // Bên Vợ Đời 6:
  chauVoKhoi: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=256&q=80',
  chauVoHan: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=256&q=80',
};

async function linkParentChild(parentId: string, childId: string) {
  await linkRelatives(childId, parentId, 'parent');
}

export async function seed6GenerationsFamily(): Promise<{ totalCount: number }> {
  // 1. Dọn dẹp dữ liệu cũ
  await execute('DELETE FROM relationships;');
  await execute('DELETE FROM memorial_events;');
  await execute('DELETE FROM persons;');

  // Lưu thông tin người dùng chính chủ
  await saveUserProfile({
    name: 'Nguyễn Đình Trung',
    gender: 'male',
    birthYear: 1994,
    avatarUri: SAMPLE_AVATARS.mePerson,
  });

  // =========================================================================
  // BÊN NỘI - ĐỜI 1 (THẾ HỆ +4): BẬC CAO TỔ (Cụ Kỵ Khởi Tổ)
  // =========================================================================
  const caoToPhu = await createPerson({
    name: 'Nguyễn Đình Huệ',
    nickname: 'Cụ Cao Tổ',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Cụ Kỵ ruột (Cao Tổ Phụ)',
    inferredRelationToMe: 'Cụ Kỵ khởi tổ',
    generation: 4,
    birthYear: 1880,
    avatarUri: SAMPLE_AVATARS.caoToPhu,
    isDeceased: true,
    deathDateLunar: '10/03 Âm lịch',
    address: 'Từ đường Họ Nguyễn, Cổ Đô, Ba Vì, Hà Nội',
    notes: 'Khởi tổ chi họ Nguyễn Đình, đỗ tú tài khoa Nhâm Tý. Người đức độ khai hoang lập nghiệp.',
  });

  const caoToMau = await createPerson({
    name: 'Vũ Thị Nhạn',
    nickname: 'Cụ Cao Tổ Mẫu',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Cụ Kỵ bà (Cao Tổ Mẫu)',
    inferredRelationToMe: 'Cụ Kỵ bà',
    generation: 4,
    birthYear: 1883,
    avatarUri: SAMPLE_AVATARS.caoToMau,
    isDeceased: true,
    deathDateLunar: '18/08 Âm lịch',
    address: 'Cổ Đô, Ba Vì, Hà Nội',
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

  // =========================================================================
  // BÊN NỘI - ĐỜI 2 (THẾ HỆ +3): BẬC TẰNG TỔ (CỤ CỐ)
  // - Có đa thê / kế thất: Cụ Khang có Vợ cả Cụ Lụa và Vợ kế Cụ Nghiên
  // - Có Cụ Cô Tiền: Mất trẻ năm 18 tuổi, được thờ làm Bà Cô Tổ
  // =========================================================================
  const tangToHuynh = await createPerson({
    name: 'Nguyễn Đình Huynh',
    nickname: 'Cụ Cố Bác Cả',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Cụ Bác ruột (Cụ Cố Bác)',
    inferredRelationToMe: 'Cụ Bác ruột',
    generation: 3,
    birthYear: 1904,
    avatarUri: SAMPLE_AVATARS.tangToHuynh,
    isDeceased: true,
    deathDateLunar: '14/04 Âm lịch',
  });
  const cuBacDauMui = await createPerson({
    name: 'Phan Thị Mùi',
    nickname: 'Cụ Cố Bác Dâu',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Cụ Bác dâu (Vợ Cụ Huynh)',
    inferredRelationToMe: 'Cụ Bác dâu',
    generation: 3,
    birthYear: 1906,
    avatarUri: SAMPLE_AVATARS.cuBacDauMui,
    isDeceased: true,
    deathDateLunar: '19/08 Âm lịch',
  });
  await linkParentChild(caoToPhu.id, tangToHuynh.id);
  await linkParentChild(caoToMau.id, tangToHuynh.id);
  await linkRelatives(tangToHuynh.id, cuBacDauMui.id, 'spouse');

  // Cụ Tằng Tổ Trưởng: Nguyễn Đình Khang & 2 người vợ (Cụ Lụa & Cụ Nghiên)
  const tangToKhang = await createPerson({
    name: 'Nguyễn Đình Khang',
    nickname: 'Cụ Cố Hai',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Cụ Cố ruột (Tằng Tổ Phụ)',
    inferredRelationToMe: 'Cụ nội ruột',
    generation: 3,
    birthYear: 1907,
    avatarUri: SAMPLE_AVATARS.tangToKhang,
    isDeceased: true,
    deathDateLunar: '02/09 Âm lịch',
    notes: 'Tham gia kháng chiến chống Pháp, cụ ông nghiêm nghị nhưng rất mực thương con cháu.',
  });
  const tangToLua = await createPerson({
    name: 'Đỗ Thị Lụa',
    nickname: 'Cụ Cố Mẫu (Chính thất)',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Cụ Cố bà (Chính thất)',
    inferredRelationToMe: 'Cụ nội bà',
    generation: 3,
    birthYear: 1910,
    avatarUri: SAMPLE_AVATARS.tangToLua,
    isDeceased: true,
    deathDateLunar: '24/11 Âm lịch',
    notes: 'Cụ bà chính thất, sinh hạ 4 người con trai gái đầu lòng.',
  });
  const cuKeMauNghien = await createPerson({
    name: 'Đỗ Thị Nghiên',
    nickname: 'Cụ Cố Kế Mẫu (Vợ hai)',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Cụ Cố Kế Mẫu (Vợ hai của Cụ Khang)',
    inferredRelationToMe: 'Cụ Kế Mẫu',
    generation: 3,
    birthYear: 1916,
    avatarUri: SAMPLE_AVATARS.cuKeMauNghien,
    isDeceased: true,
    deathDateLunar: '18/06 Âm lịch',
    notes: 'Sau khi cụ bà Lụa tạ thế, cụ ông tục huyền cùng cụ bà Nghiên, sinh con trai út Bách.',
  });
  await linkParentChild(caoToPhu.id, tangToKhang.id);
  await linkParentChild(caoToMau.id, tangToKhang.id);
  await linkRelatives(tangToKhang.id, tangToLua.id, 'spouse');
  await linkRelatives(tangToKhang.id, cuKeMauNghien.id, 'spouse');

  await createMemorialEvent({
    personId: tangToKhang.id,
    title: 'Ngày giỗ Cụ Cố Nguyễn Đình Khang',
    eventType: 'death_anniversary',
    lunarDay: 2,
    lunarMonth: 9,
    notes: 'Làm giỗ tại nhà Bác Cả trưởng họ chi hai.',
  });

  // Bà Cô Tổ Nguyễn Thị Nhài (Mất sớm năm 18 tuổi, thờ Tiền Tổ linh thiêng)
  const baCoToNhai = await createPerson({
    name: 'Nguyễn Thị Nhài',
    nickname: 'Bà Cô Tổ (Cụ Cô Tiền)',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Bà Cô Tổ (Mất trẻ khi chưa xuất giá)',
    inferredRelationToMe: 'Bà Cô Tổ',
    generation: 3,
    birthYear: 1912,
    avatarUri: SAMPLE_AVATARS.baCoToNhai,
    isDeceased: true,
    deathDateLunar: '15/01 Âm lịch',
    notes: 'Mất năm 18 tuổi, rất linh thiêng phù hộ độ trì cho con cháu dòng họ học hành đỗ đạt.',
  });
  await linkParentChild(caoToPhu.id, baCoToNhai.id);
  await linkParentChild(caoToMau.id, baCoToNhai.id);

  // Cụ Chú ruột Thọ & Cụ Thím Sen
  const tangToPhuc = await createPerson({
    name: 'Nguyễn Đình Thọ',
    nickname: 'Cụ Cố Chú Ba',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Cụ Chú ruột (Cụ Thọ)',
    inferredRelationToMe: 'Cụ Chú ruột',
    generation: 3,
    birthYear: 1914,
    avatarUri: SAMPLE_AVATARS.tangToPhuc,
    isDeceased: true,
    deathDateLunar: '05/06 Âm lịch',
  });
  const cuThimDauSen = await createPerson({
    name: 'Bùi Thị Sen',
    nickname: 'Cụ Cố Thím Ba',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Cụ Thím dâu (Vợ Cụ Thọ)',
    inferredRelationToMe: 'Cụ Thím dâu',
    generation: 3,
    birthYear: 1917,
    avatarUri: SAMPLE_AVATARS.cuThimDauSen,
    isDeceased: true,
    deathDateLunar: '28/02 Âm lịch',
  });
  await linkParentChild(caoToPhu.id, tangToPhuc.id);
  await linkParentChild(caoToMau.id, tangToPhuc.id);
  await linkRelatives(tangToPhuc.id, cuThimDauSen.id, 'spouse');

  // Cụ Cô ruột Lan & Cụ Dượng Hào
  const tangToLan = await createPerson({
    name: 'Nguyễn Thị Lan',
    nickname: 'Cụ Cố Cô Tư',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Bà Cụ Cô ruột (Cụ Lan)',
    inferredRelationToMe: 'Cụ Cô ruột',
    generation: 3,
    birthYear: 1918,
    avatarUri: SAMPLE_AVATARS.tangToLan,
    isDeceased: true,
    deathDateLunar: '12/12 Âm lịch',
  });
  const cuDuongHao = await createPerson({
    name: 'Trần Văn Hào',
    nickname: 'Cụ Dượng Hào',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Cụ Dượng (Chồng Cụ Lan)',
    inferredRelationToMe: 'Cụ Dượng',
    generation: 3,
    birthYear: 1915,
    avatarUri: SAMPLE_AVATARS.cuDuongHao,
    isDeceased: true,
    deathDateLunar: '08/04 Âm lịch',
  });
  await linkParentChild(caoToPhu.id, tangToLan.id);
  await linkParentChild(caoToMau.id, tangToLan.id);
  await linkRelatives(tangToLan.id, cuDuongHao.id, 'spouse');

  // =========================================================================
  // BÊN NGOẠI - ĐỜI 2 (THẾ HỆ +3): CỤ NGOẠI
  // =========================================================================
  const cuNgoaiTu = await createPerson({
    name: 'Trần Văn Tự',
    nickname: 'Cụ Cố Ngoại',
    gender: 'male',
    branch: 'ngoai',
    customRelationToMe: 'Cụ Cố Ngoại',
    inferredRelationToMe: 'Cụ Ngoại',
    generation: 3,
    birthYear: 1908,
    avatarUri: SAMPLE_AVATARS.cuNgoaiTu,
    isDeceased: true,
    deathDateLunar: '07/07 Âm lịch',
    address: 'Ý Yên, Nam Định',
  });
  const cuNgoaiLanh = await createPerson({
    name: 'Ngô Thị Lành',
    nickname: 'Cụ Cố Ngoại Mẫu',
    gender: 'female',
    branch: 'ngoai',
    customRelationToMe: 'Cụ Cố Ngoại Mẫu',
    inferredRelationToMe: 'Cụ Ngoại Mẫu',
    generation: 3,
    birthYear: 1911,
    avatarUri: SAMPLE_AVATARS.cuNgoaiLanh,
    isDeceased: true,
    deathDateLunar: '14/10 Âm lịch',
    address: 'Ý Yên, Nam Định',
  });
  await linkRelatives(cuNgoaiTu.id, cuNgoaiLanh.id, 'spouse');

  // =========================================================================
  // BÊN NỘI - ĐỜI 3 (THẾ HỆ +2): BẬC ÔNG BÀ TIỀN BỐI
  // - Bác Cả Trọng có 2 vợ: Vợ cả Quý (chính thất) & Vợ kế Loan (kế thất)
  // - Ông Chú Út Bách (con của Cụ Kế Mẫu Nghiên)
  // =========================================================================
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
    nickname: 'Bà Bác Cả (Chính thất)',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Bà Bác dâu (Chính thất)',
    inferredRelationToMe: 'Bà Bác dâu',
    generation: 2,
    birthYear: 1932,
    avatarUri: SAMPLE_AVATARS.baBacDauQuy,
    isDeceased: true,
    deathDateLunar: '16/05 Âm lịch',
  });
  const baBacKeLoan = await createPerson({
    name: 'Hoàng Thị Loan',
    nickname: 'Bà Bác Kế (Vợ hai)',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Bà Bác Kế (Vợ hai của Ông Bác Cả)',
    inferredRelationToMe: 'Bà Bác Kế',
    generation: 2,
    birthYear: 1938,
    avatarUri: SAMPLE_AVATARS.baBacKeLoan,
    isDeceased: false,
    phone: '0912777888',
  });
  await linkParentChild(tangToKhang.id, ongBacTrong.id);
  await linkParentChild(tangToLua.id, ongBacTrong.id);
  await linkRelatives(ongBacTrong.id, baBacDauQuy.id, 'spouse');
  await linkRelatives(ongBacTrong.id, baBacKeLoan.id, 'spouse');

  await createMemorialEvent({
    personId: ongBacTrong.id,
    title: 'Ngày giỗ Ông Bác Cả Nguyễn Đình Trọng',
    eventType: 'death_anniversary',
    lunarDay: 22,
    lunarMonth: 10,
    notes: 'Giỗ Bác Cả tại nhà thờ chi trưởng, các gia đình mang lễ vật cúng giỗ.',
  });

  // Ông Nội ruột Nguyễn Đình Chính & Bà Nội Hoàng Thị Mai
  const ongNoiChinh = await createPerson({
    name: 'Nguyễn Đình Chính',
    nickname: 'Ông Nội',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Ông nội ruột',
    inferredRelationToMe: 'Ông nội',
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

  // Ông Chú Ba Liêm & Bà Thím dâu Thục
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

  await createMemorialEvent({
    personId: ongChuLiem.id,
    title: 'Ngày giỗ Ông Chú Ba Nguyễn Đình Liêm',
    eventType: 'death_anniversary',
    lunarDay: 15,
    lunarMonth: 7,
    notes: 'Lễ giỗ rằm tháng Bảy kết hợp lễ Vu Lan báo hiếu tổ tiên.',
  });
  await createMemorialEvent({
    personId: baThimDauThuc.id,
    title: 'Ngày giỗ Bà Thím Ba Đoàn Thị Thục',
    eventType: 'death_anniversary',
    lunarDay: 3,
    lunarMonth: 11,
    notes: 'Lễ giỗ bà thím do con cháu chi ba phụ trách chuẩn bị cỗ chay và mặn.',
  });

  // Bà Cô Tư Tuyết & Ông Dượng Chung (Ngày giỗ sắp tới nhất: 24/09 Âm lịch)
  const baCoTuyet = await createPerson({
    name: 'Nguyễn Thị Tuyết',
    nickname: 'Bà Cô Tư',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Bà Cô ruột (Cô Tư)',
    inferredRelationToMe: 'Bà Cô ruột',
    generation: 2,
    birthYear: 1942,
    avatarUri: SAMPLE_AVATARS.baCoTuyet,
    isDeceased: false,
    phone: '0983222333',
    address: 'Việt Trì, Phú Thọ',
  });
  const ongDuongChung = await createPerson({
    name: 'Hoàng Đình Chung',
    nickname: 'Ông Dượng Chung',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Ông Dượng (Chồng Bà Cô Tư)',
    inferredRelationToMe: 'Ông Dượng',
    generation: 2,
    birthYear: 1939,
    avatarUri: SAMPLE_AVATARS.ongDuongChung,
    isDeceased: true,
    deathDateLunar: '24/09 Âm lịch',
    address: 'Việt Trì, Phú Thọ',
  });
  await linkParentChild(tangToKhang.id, baCoTuyet.id);
  await linkParentChild(tangToLua.id, baCoTuyet.id);
  await linkRelatives(baCoTuyet.id, ongDuongChung.id, 'spouse');

  await createMemorialEvent({
    personId: ongDuongChung.id,
    title: 'Ngày giỗ Ông Dượng Hoàng Đình Chung',
    eventType: 'death_anniversary',
    lunarDay: 24,
    lunarMonth: 9,
    notes: 'Lễ giỗ ông Dượng Chung tại Việt Trì, con cháu tụ họp đông đủ thắp hương tưởng niệm.',
  });

  // Ông Chú Năm Hùng & Bà Thím dâu Phương
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
  });
  const baThimDauPhuong = await createPerson({
    name: 'Lê Thị Phương',
    nickname: 'Bà Thím Năm',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Bà Thím dâu (Vợ Ông Chú Năm)',
    inferredRelationToMe: 'Bà Thím',
    generation: 2,
    birthYear: 1948,
    avatarUri: SAMPLE_AVATARS.baThimDauPhuong,
    isDeceased: false,
    phone: '0977333555',
  });
  await linkParentChild(tangToKhang.id, ongChuHung.id);
  await linkParentChild(tangToLua.id, ongChuHung.id);
  await linkRelatives(ongChuHung.id, baThimDauPhuong.id, 'spouse');

  // Ông Chú Út Bách (Con của Cụ Kế Mẫu Nghiên) & Thím Diệp
  const chuUtBach = await createPerson({
    name: 'Nguyễn Đình Bách',
    nickname: 'Ông Chú Út Bách',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Ông Chú ruột (Con Cụ Kế Mẫu)',
    inferredRelationToMe: 'Ông Chú cùng cha khác mẹ',
    generation: 2,
    birthYear: 1948,
    avatarUri: SAMPLE_AVATARS.chuUtBach,
    isDeceased: false,
    phone: '0903888777',
    address: 'Vĩnh Yên, Vĩnh Phúc',
  });
  const thimDiep = await createPerson({
    name: 'Trần Thị Diệp',
    nickname: 'Bà Thím Út',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Bà Thím Út (Vợ Chú Bách)',
    inferredRelationToMe: 'Bà Thím',
    generation: 2,
    birthYear: 1950,
    avatarUri: SAMPLE_AVATARS.thimDiep,
    isDeceased: false,
  });
  await linkParentChild(tangToKhang.id, chuUtBach.id);
  await linkParentChild(cuKeMauNghien.id, chuUtBach.id);
  await linkRelatives(chuUtBach.id, thimDiep.id, 'spouse');

  // =========================================================================
  // BÊN NGOẠI - ĐỜI 3 (THẾ HỆ +2): BẬC ÔNG BÀ NGOẠI
  // =========================================================================
  const ongNgoaiDat = await createPerson({
    name: 'Trần Văn Đạt',
    nickname: 'Ông Ngoại',
    gender: 'male',
    branch: 'ngoai',
    customRelationToMe: 'Ông Ngoại ruột',
    inferredRelationToMe: 'Ông Ngoại',
    generation: 2,
    birthYear: 1935,
    avatarUri: SAMPLE_AVATARS.ongNgoaiDat,
    isDeceased: true,
    deathDateLunar: '12/04 Âm lịch',
    address: 'Ý Yên, Nam Định',
  });
  const baNgoaiDoan = await createPerson({
    name: 'Phạm Thị Doan',
    nickname: 'Bà Ngoại',
    gender: 'female',
    branch: 'ngoai',
    customRelationToMe: 'Bà Ngoại ruột',
    inferredRelationToMe: 'Bà Ngoại',
    generation: 2,
    birthYear: 1938,
    avatarUri: SAMPLE_AVATARS.baNgoaiDoan,
    isDeceased: false,
    phone: '0912333444',
    address: 'Ý Yên, Nam Định',
  });
  await linkParentChild(cuNgoaiTu.id, ongNgoaiDat.id);
  await linkParentChild(cuNgoaiLanh.id, ongNgoaiDat.id);
  await linkRelatives(ongNgoaiDat.id, baNgoaiDoan.id, 'spouse');

  const ongCauThinh = await createPerson({
    name: 'Trần Văn Thịnh',
    nickname: 'Ông Cậu Ngoại',
    gender: 'male',
    branch: 'ngoai',
    customRelationToMe: 'Ông Cậu Ngoại (Em trai Ông Ngoại)',
    inferredRelationToMe: 'Ông Cậu',
    generation: 2,
    birthYear: 1940,
    avatarUri: SAMPLE_AVATARS.ongCauThinh,
    isDeceased: false,
    phone: '0915666777',
  });
  const baMoSen = await createPerson({
    name: 'Lương Thị Sen',
    nickname: 'Bà Mợ Ngoại',
    gender: 'female',
    branch: 'ngoai',
    customRelationToMe: 'Bà Mợ Ngoại (Vợ Ông Cậu Thịnh)',
    inferredRelationToMe: 'Bà Mợ',
    generation: 2,
    birthYear: 1943,
    avatarUri: SAMPLE_AVATARS.baMoSen,
    isDeceased: false,
  });
  await linkParentChild(cuNgoaiTu.id, ongCauThinh.id);
  await linkParentChild(cuNgoaiLanh.id, ongCauThinh.id);
  await linkRelatives(ongCauThinh.id, baMoSen.id, 'spouse');

  // =========================================================================
  // BÊN VỢ - ĐỜI 3 (THẾ HỆ +2): BẬC ÔNG BÀ NỘI BÊN VỢ
  // =========================================================================
  const ongNoiVoPhat = await createPerson({
    name: 'Lê Văn Phát',
    nickname: 'Ông Nội Vợ',
    gender: 'male',
    branch: 'vo_chong',
    customRelationToMe: 'Ông Nội của Vợ',
    inferredRelationToMe: 'Ông Nội Vợ',
    generation: 2,
    birthYear: 1936,
    avatarUri: SAMPLE_AVATARS.ongNoiVoPhat,
    isDeceased: true,
    deathDateLunar: '08/08 Âm lịch',
    address: 'Đông Anh, Hà Nội',
  });
  const baNoiVoCuc = await createPerson({
    name: 'Hoàng Thị Cúc',
    nickname: 'Bà Nội Vợ',
    gender: 'female',
    branch: 'vo_chong',
    customRelationToMe: 'Bà Nội của Vợ',
    inferredRelationToMe: 'Bà Nội Vợ',
    generation: 2,
    birthYear: 1939,
    avatarUri: SAMPLE_AVATARS.baNoiVoCuc,
    isDeceased: true,
    deathDateLunar: '19/11 Âm lịch',
    address: 'Đông Anh, Hà Nội',
  });
  await linkRelatives(ongNoiVoPhat.id, baNoiVoCuc.id, 'spouse');

  // =========================================================================
  // BÊN NỘI - ĐỜI 4 (THẾ HỆ +1): BẬC CHA CHÚ CÔ BÁC
  // - Gia đình Bố Mẹ Tôi (Bố Bình & Mẹ Thu)
  // - Chi Trưởng (Bác Tuấn, Bác Phong, Chú Út Quân)
  // - Chú Dũng nhận Con Nuôi: Nguyễn Đình Thiện (Nghĩa tử)
  // =========================================================================
  const bacCaTuan = await createPerson({
    name: 'Nguyễn Đình Tuấn',
    nickname: 'Bác Cả Tuấn',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Bác họ (Bác Cả chi trưởng)',
    inferredRelationToMe: 'Bác họ',
    generation: 1,
    birthYear: 1960,
    avatarUri: SAMPLE_AVATARS.bacCaTuan,
    isDeceased: false,
    phone: '0912555666',
  });
  const bacGaiHuong = await createPerson({
    name: 'Trần Thị Hường',
    nickname: 'Bác Dâu Cả',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Bác dâu họ (Vợ Bác Tuấn)',
    inferredRelationToMe: 'Bác dâu họ',
    generation: 1,
    birthYear: 1963,
    avatarUri: SAMPLE_AVATARS.bacGaiHuong,
    isDeceased: false,
  });
  await linkParentChild(ongBacTrong.id, bacCaTuan.id);
  await linkParentChild(baBacDauQuy.id, bacCaTuan.id);
  await linkRelatives(bacCaTuan.id, bacGaiHuong.id, 'spouse');

  const bacPhong = await createPerson({
    name: 'Nguyễn Đình Phong',
    nickname: 'Bác Hai Phong',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Bác họ (Bác Hai)',
    inferredRelationToMe: 'Bác họ',
    generation: 1,
    birthYear: 1964,
    avatarUri: SAMPLE_AVATARS.bacPhong,
    isDeceased: false,
    phone: '0912444333',
  });
  const bacDauMai = await createPerson({
    name: 'Lê Thị Mai',
    nickname: 'Bác Dâu Hai',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Bác dâu họ (Vợ Bác Phong)',
    inferredRelationToMe: 'Bác dâu họ',
    generation: 1,
    birthYear: 1967,
    avatarUri: SAMPLE_AVATARS.bacDauMai,
    isDeceased: false,
  });
  await linkParentChild(ongBacTrong.id, bacPhong.id);
  await linkParentChild(baBacDauQuy.id, bacPhong.id);
  await linkRelatives(bacPhong.id, bacDauMai.id, 'spouse');

  // Chú Út Quân (con Bác Kế Loan)
  const chuUtQuan = await createPerson({
    name: 'Nguyễn Đình Quân',
    nickname: 'Chú Út Quân',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Chú họ (Con Bà Bác Kế)',
    inferredRelationToMe: 'Chú họ',
    generation: 1,
    birthYear: 1975,
    avatarUri: SAMPLE_AVATARS.chuUtQuan,
    isDeceased: false,
    phone: '0988222111',
  });
  await linkParentChild(ongBacTrong.id, chuUtQuan.id);
  await linkParentChild(baBacKeLoan.id, chuUtQuan.id);

  // Bố Mẹ ruột của Tôi:
  const boBinh = await createPerson({
    name: 'Nguyễn Đình Bình',
    nickname: 'Bố Bình',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Bố ruột',
    inferredRelationToMe: 'Bố',
    howTheyCallMe: 'Con trai Trung',
    generation: 1,
    birthYear: 1963,
    avatarUri: SAMPLE_AVATARS.boBinh,
    isDeceased: false,
    phone: '0913556677',
    address: 'Cầu Giấy, Hà Nội',
    notes: 'Kỹ sư cầu đường, tính cách điềm đạm, thích chơi cây cảnh và uống trà sáng.',
  });
  const meThu = await createPerson({
    name: 'Trần Thị Thu',
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
    notes: 'Giáo viên về hưu, khéo tay, nấu các món ăn gia truyền ngày Tết rất ngon.',
  });
  await linkParentChild(ongNoiChinh.id, boBinh.id);
  await linkParentChild(baNoiMai.id, boBinh.id);
  await linkParentChild(ongNgoaiDat.id, meThu.id);
  await linkParentChild(baNgoaiDoan.id, meThu.id);
  await linkRelatives(boBinh.id, meThu.id, 'spouse');

  // Chú ruột Dũng & Thím Oanh & Con nuôi Thiện (Nghĩa tử)
  const chuBaDung = await createPerson({
    name: 'Nguyễn Đình Dũng',
    nickname: 'Chú Ba',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Chú ruột (Chú Ba)',
    inferredRelationToMe: 'Chú (Em trai của Bố)',
    generation: 1,
    birthYear: 1968,
    avatarUri: SAMPLE_AVATARS.chuBaDung,
    isDeceased: false,
    phone: '0979888999',
  });
  const thimOanh = await createPerson({
    name: 'Vũ Kim Oanh',
    nickname: 'Thím Ba',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Thím dâu ruột (Vợ Chú Ba)',
    inferredRelationToMe: 'Thím dâu',
    generation: 1,
    birthYear: 1971,
    avatarUri: SAMPLE_AVATARS.thimOanh,
    isDeceased: false,
  });
  const conNuoiThien = await createPerson({
    name: 'Nguyễn Đình Thiện',
    nickname: 'Thiện (Con nuôi)',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Em họ (Con nuôi của Chú Ba)',
    inferredRelationToMe: 'Em họ (Nghĩa tử)',
    generation: 0,
    birthYear: 1999,
    avatarUri: SAMPLE_AVATARS.conNuoiThien,
    isDeceased: false,
    notes: 'Con nuôi được chú thím làm lễ nhập tịch dòng họ năm 2 tuổi, rất hiếu thảo.',
  });
  await linkParentChild(ongNoiChinh.id, chuBaDung.id);
  await linkParentChild(baNoiMai.id, chuBaDung.id);
  await linkRelatives(chuBaDung.id, thimOanh.id, 'spouse');
  await linkParentChild(chuBaDung.id, conNuoiThien.id);
  await linkParentChild(thimOanh.id, conNuoiThien.id);

  // Cô ruột Hằng & Dượng Long
  const coTuHang = await createPerson({
    name: 'Nguyễn Thị Thu Hằng',
    nickname: 'Cô Tư',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Cô ruột (Cô Tư)',
    inferredRelationToMe: 'Cô ruột (Em gái của Bố)',
    generation: 1,
    birthYear: 1972,
    avatarUri: SAMPLE_AVATARS.coTuHang,
    isDeceased: false,
    phone: '0988777666',
  });
  const chuDuongLong = await createPerson({
    name: 'Phan Bảo Long',
    nickname: 'Dượng Long',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Dượng ruột (Chồng Cô Tư)',
    inferredRelationToMe: 'Dượng ruột',
    generation: 1,
    birthYear: 1970,
    avatarUri: SAMPLE_AVATARS.chuDuongLong,
    isDeceased: false,
  });
  await linkParentChild(ongNoiChinh.id, coTuHang.id);
  await linkParentChild(baNoiMai.id, coTuHang.id);
  await linkRelatives(coTuHang.id, chuDuongLong.id, 'spouse');

  // =========================================================================
  // BÊN NGOẠI - ĐỜI 4 (THẾ HỆ +1): BẬC BÁC, CẬU, DÌ RUỘT BÊN NGOẠI
  // =========================================================================
  const bacNgoaiPhong = await createPerson({
    name: 'Trần Văn Phong',
    nickname: 'Bác Ngoại Phong',
    gender: 'male',
    branch: 'ngoai',
    customRelationToMe: 'Bác ruột bên Ngoại',
    inferredRelationToMe: 'Bác Ngoại',
    generation: 1,
    birthYear: 1961,
    avatarUri: SAMPLE_AVATARS.bacNgoaiPhong,
    isDeceased: false,
    phone: '0913222888',
    address: 'Ý Yên, Nam Định',
  });
  const bacDauNgoaiKim = await createPerson({
    name: 'Lê Thị Kim',
    nickname: 'Bác Dâu Ngoại',
    gender: 'female',
    branch: 'ngoai',
    customRelationToMe: 'Bác Dâu bên Ngoại',
    inferredRelationToMe: 'Bác Dâu Ngoại',
    generation: 1,
    birthYear: 1964,
    avatarUri: SAMPLE_AVATARS.bacDauNgoaiKim,
    isDeceased: false,
  });
  await linkParentChild(ongNgoaiDat.id, bacNgoaiPhong.id);
  await linkParentChild(baNgoaiDoan.id, bacNgoaiPhong.id);
  await linkRelatives(bacNgoaiPhong.id, bacDauNgoaiKim.id, 'spouse');

  const cauHao = await createPerson({
    name: 'Trần Văn Hào',
    nickname: 'Cậu Ba Hào',
    gender: 'male',
    branch: 'ngoai',
    customRelationToMe: 'Cậu ruột (Em trai của Mẹ)',
    inferredRelationToMe: 'Cậu ruột',
    generation: 1,
    birthYear: 1970,
    avatarUri: SAMPLE_AVATARS.cauHao,
    isDeceased: false,
    phone: '0978111222',
    address: 'TP. Nam Định',
  });
  const moTuyet = await createPerson({
    name: 'Nguyễn Thị Tuyết Mai',
    nickname: 'Mợ Ba Tuyết',
    gender: 'female',
    branch: 'ngoai',
    customRelationToMe: 'Mợ ruột (Vợ Cậu Hào)',
    inferredRelationToMe: 'Mợ ruột',
    generation: 1,
    birthYear: 1973,
    avatarUri: SAMPLE_AVATARS.moTuyet,
    isDeceased: false,
  });
  await linkParentChild(ongNgoaiDat.id, cauHao.id);
  await linkParentChild(baNgoaiDoan.id, cauHao.id);
  await linkRelatives(cauHao.id, moTuyet.id, 'spouse');

  const diLan = await createPerson({
    name: 'Trần Thị Lan',
    nickname: 'Dì Út Lan',
    gender: 'female',
    branch: 'ngoai',
    customRelationToMe: 'Dì ruột (Em gái của Mẹ)',
    inferredRelationToMe: 'Dì ruột',
    generation: 1,
    birthYear: 1975,
    avatarUri: SAMPLE_AVATARS.diLan,
    isDeceased: false,
    phone: '0989333555',
  });
  const duongQuang = await createPerson({
    name: 'Đặng Văn Quang',
    nickname: 'Dượng Quang',
    gender: 'male',
    branch: 'ngoai',
    customRelationToMe: 'Dượng bên Ngoại (Chồng Dì Lan)',
    inferredRelationToMe: 'Dượng Ngoại',
    generation: 1,
    birthYear: 1972,
    avatarUri: SAMPLE_AVATARS.duongQuang,
    isDeceased: false,
  });
  await linkParentChild(ongNgoaiDat.id, diLan.id);
  await linkParentChild(baNgoaiDoan.id, diLan.id);
  await linkRelatives(diLan.id, duongQuang.id, 'spouse');

  // =========================================================================
  // BÊN VỢ - ĐỜI 4 (THẾ HỆ +1): BỐ MẸ VỢ & CÔ BÁC BÊN VỢ
  // =========================================================================
  const boVoDung = await createPerson({
    name: 'Lê Văn Dũng',
    nickname: 'Bố Vợ Dũng',
    gender: 'male',
    branch: 'vo_chong',
    customRelationToMe: 'Bố vợ (Bố đẻ của Vợ Thảo)',
    inferredRelationToMe: 'Bố vợ',
    generation: 1,
    birthYear: 1965,
    avatarUri: SAMPLE_AVATARS.boVoDung,
    isDeceased: false,
    phone: '0912888999',
    address: 'Đông Anh, Hà Nội',
    notes: 'Kỹ sư cơ khí, vui tính, quý con rể.',
  });
  const meVoHien = await createPerson({
    name: 'Trần Thị Hiền',
    nickname: 'Mẹ Vợ Hiền',
    gender: 'female',
    branch: 'vo_chong',
    customRelationToMe: 'Mẹ vợ (Mẹ đẻ của Vợ Thảo)',
    inferredRelationToMe: 'Mẹ vợ',
    generation: 1,
    birthYear: 1968,
    avatarUri: SAMPLE_AVATARS.meVoHien,
    isDeceased: false,
    phone: '0912888000',
    address: 'Đông Anh, Hà Nội',
  });
  await linkParentChild(ongNoiVoPhat.id, boVoDung.id);
  await linkParentChild(baNoiVoCuc.id, boVoDung.id);
  await linkRelatives(boVoDung.id, meVoHien.id, 'spouse');

  const bacVoHung = await createPerson({
    name: 'Lê Văn Hùng',
    nickname: 'Bác Vợ Hùng',
    gender: 'male',
    branch: 'vo_chong',
    customRelationToMe: 'Bác ruột của Vợ (Bác Cả)',
    inferredRelationToMe: 'Bác Vợ',
    generation: 1,
    birthYear: 1962,
    avatarUri: SAMPLE_AVATARS.bacVoHung,
    isDeceased: false,
    phone: '0915333222',
  });
  const bacDauVoMai = await createPerson({
    name: 'Phạm Thị Mai',
    nickname: 'Bác Dâu Vợ',
    gender: 'female',
    branch: 'vo_chong',
    customRelationToMe: 'Bác Dâu của Vợ',
    inferredRelationToMe: 'Bác Dâu Vợ',
    generation: 1,
    birthYear: 1964,
    avatarUri: SAMPLE_AVATARS.bacDauVoMai,
    isDeceased: false,
  });
  await linkParentChild(ongNoiVoPhat.id, bacVoHung.id);
  await linkParentChild(baNoiVoCuc.id, bacVoHung.id);
  await linkRelatives(bacVoHung.id, bacDauVoMai.id, 'spouse');

  const coVoNga = await createPerson({
    name: 'Lê Thị Nga',
    nickname: 'Cô Vợ Nga',
    gender: 'female',
    branch: 'vo_chong',
    customRelationToMe: 'Cô ruột của Vợ',
    inferredRelationToMe: 'Cô Vợ',
    generation: 1,
    birthYear: 1973,
    avatarUri: SAMPLE_AVATARS.coVoNga,
    isDeceased: false,
  });
  const duongVoKhanh = await createPerson({
    name: 'Nguyễn Văn Khánh',
    nickname: 'Dượng Vợ Khánh',
    gender: 'male',
    branch: 'vo_chong',
    customRelationToMe: 'Dượng của Vợ (Chồng Cô Nga)',
    inferredRelationToMe: 'Dượng Vợ',
    generation: 1,
    birthYear: 1970,
    avatarUri: SAMPLE_AVATARS.duongVoKhanh,
    isDeceased: false,
  });
  await linkParentChild(ongNoiVoPhat.id, coVoNga.id);
  await linkParentChild(baNoiVoCuc.id, coVoNga.id);
  await linkRelatives(coVoNga.id, duongVoKhanh.id, 'spouse');

  // =========================================================================
  // ĐỜI 5 (THẾ HỆ 0): TÔI, VỢ, ANH CHỊ EM RUỘT, VỢ & HỌ HÀNG
  // =========================================================================
  // 1. Nhân vật "Tôi" (Chủ thể):
  const mePerson = await createPerson({
    name: 'Nguyễn Đình Trung',
    nickname: 'Tôi (Trung)',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Bản thân Tôi',
    inferredRelationToMe: 'Chính chủ',
    howTheyCallMe: 'Tôi',
    generation: 0,
    birthYear: 1994,
    avatarUri: SAMPLE_AVATARS.mePerson,
    isDeceased: false,
    phone: '0988666888',
    address: 'Cầu Giấy, Hà Nội',
    notes: 'Kỹ sư phần mềm, chủ nhân gia phả gia tộc.',
  });
  await linkParentChild(boBinh.id, mePerson.id);
  await linkParentChild(meThu.id, mePerson.id);

  // 2. Vợ của Tôi: Lê Thị Thảo
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
    notes: 'Bác sĩ nhi khoa, dịu dàng, chu đáo.',
  });
  await linkParentChild(boVoDung.id, voThao.id);
  await linkParentChild(meVoHien.id, voThao.id);
  await linkRelatives(mePerson.id, voThao.id, 'spouse');

  // 3. Anh trai ruột Hưng & Chị dâu Hà
  const anhHung = await createPerson({
    name: 'Nguyễn Đình Hưng',
    nickname: 'Anh Cả Hưng',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Anh trai cả ruột',
    inferredRelationToMe: 'Anh trai ruột',
    howTheyCallMe: 'Em Trung',
    generation: 0,
    birthYear: 1990,
    avatarUri: SAMPLE_AVATARS.anhHung,
    isDeceased: false,
    phone: '0981999888',
    address: 'Hà Đông, Hà Nội',
  });
  const chiDauHa = await createPerson({
    name: 'Hoàng Thu Hà',
    nickname: 'Chị Dâu Hà',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Chị dâu trưởng (Vợ Anh Hưng)',
    inferredRelationToMe: 'Chị dâu ruột',
    howTheyCallMe: 'Chú Trung',
    generation: 0,
    birthYear: 1992,
    avatarUri: SAMPLE_AVATARS.chiDauHa,
    isDeceased: false,
    phone: '0981999777',
  });
  await linkParentChild(boBinh.id, anhHung.id);
  await linkParentChild(meThu.id, anhHung.id);
  await linkRelatives(anhHung.id, chiDauHa.id, 'spouse');

  // 4. Em trai ruột Thành & Em dâu Quỳnh
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
  });
  const emDauQuynh = await createPerson({
    name: 'Võ Thị Quỳnh',
    nickname: 'Quỳnh Dâu',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Em dâu ruột (Vợ Em Thành)',
    inferredRelationToMe: 'Em dâu ruột',
    generation: 0,
    birthYear: 2000,
    avatarUri: SAMPLE_AVATARS.emDauQuynh,
    isDeceased: false,
  });
  await linkParentChild(boBinh.id, emTraiThanh.id);
  await linkParentChild(meThu.id, emTraiThanh.id);
  await linkRelatives(emTraiThanh.id, emDauQuynh.id, 'spouse');

  // 5. Em gái ruột Linh & Em rể Tuấn (Con gái lấy chồng)
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
  });
  const emReTuan = await createPerson({
    name: 'Hoàng Quốc Tuấn',
    nickname: 'Tuấn Rể',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Em rể ruột (Chồng Em Linh)',
    inferredRelationToMe: 'Em rể ruột',
    generation: 0,
    birthYear: 2000,
    avatarUri: SAMPLE_AVATARS.emReTuan,
    isDeceased: false,
  });
  await linkParentChild(boBinh.id, emGaiLinh.id);
  await linkParentChild(meThu.id, emGaiLinh.id);
  await linkRelatives(emGaiLinh.id, emReTuan.id, 'spouse');

  // 6. Anh họ trưởng chi Phong & Chị dâu họ Mai Anh
  const anhPhong = await createPerson({
    name: 'Nguyễn Đình Phong',
    nickname: 'Anh Phong (Trưởng Chi)',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Anh họ (Con Bác Tuấn)',
    inferredRelationToMe: 'Anh họ trưởng',
    generation: 0,
    birthYear: 1986,
    avatarUri: SAMPLE_AVATARS.anhPhong,
    isDeceased: false,
    phone: '0903111222',
  });
  const chiDauAnh = await createPerson({
    name: 'Trần Mai Anh',
    nickname: 'Chị Dâu Mai Anh',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Chị dâu họ (Vợ Anh Phong)',
    inferredRelationToMe: 'Chị dâu họ',
    generation: 0,
    birthYear: 1988,
    avatarUri: SAMPLE_AVATARS.chiDauAnh,
    isDeceased: false,
  });
  await linkParentChild(bacCaTuan.id, anhPhong.id);
  await linkParentChild(bacGaiHuong.id, anhPhong.id);
  await linkRelatives(anhPhong.id, chiDauAnh.id, 'spouse');

  // =========================================================================
  // BÊN NGOẠI - ĐỜI 5 (THẾ HỆ 0): ANH CHỊ EM HỌ NGOẠI
  // =========================================================================
  const anhHoNgoaiHuy = await createPerson({
    name: 'Trần Quang Huy',
    nickname: 'Anh Huy Ngoại',
    gender: 'male',
    branch: 'ngoai',
    customRelationToMe: 'Anh họ bên Ngoại (Con Bác Phong)',
    inferredRelationToMe: 'Anh họ Ngoại',
    generation: 0,
    birthYear: 1989,
    avatarUri: SAMPLE_AVATARS.anhHoNgoaiHuy,
    isDeceased: false,
    phone: '0912666999',
  });
  const chiDauNgoaiThuy = await createPerson({
    name: 'Đặng Thanh Thủy',
    nickname: 'Chị Dâu Thủy',
    gender: 'female',
    branch: 'ngoai',
    customRelationToMe: 'Chị dâu họ bên Ngoại',
    inferredRelationToMe: 'Chị dâu Ngoại',
    generation: 0,
    birthYear: 1992,
    avatarUri: SAMPLE_AVATARS.chiDauNgoaiThuy,
    isDeceased: false,
  });
  await linkParentChild(bacNgoaiPhong.id, anhHoNgoaiHuy.id);
  await linkParentChild(bacDauNgoaiKim.id, anhHoNgoaiHuy.id);
  await linkRelatives(anhHoNgoaiHuy.id, chiDauNgoaiThuy.id, 'spouse');

  const chiHoNgoaiNgoc = await createPerson({
    name: 'Trần Bích Ngọc',
    nickname: 'Chị Ngọc Ngoại',
    gender: 'female',
    branch: 'ngoai',
    customRelationToMe: 'Chị họ bên Ngoại (Con Cậu Hào)',
    inferredRelationToMe: 'Chị họ Ngoại',
    generation: 0,
    birthYear: 1995,
    avatarUri: SAMPLE_AVATARS.chiHoNgoaiNgoc,
    isDeceased: false,
    phone: '0983111444',
  });
  await linkParentChild(cauHao.id, chiHoNgoaiNgoc.id);
  await linkParentChild(moTuyet.id, chiHoNgoaiNgoc.id);

  const emHoNgoaiKiet = await createPerson({
    name: 'Đặng Tuấn Kiệt',
    nickname: 'Kiệt Em',
    gender: 'male',
    branch: 'ngoai',
    customRelationToMe: 'Em họ bên Ngoại (Con Dì Lan)',
    inferredRelationToMe: 'Em họ Ngoại',
    generation: 0,
    birthYear: 2001,
    avatarUri: SAMPLE_AVATARS.emHoNgoaiKiet,
    isDeceased: false,
  });
  await linkParentChild(diLan.id, emHoNgoaiKiet.id);
  await linkParentChild(duongQuang.id, emHoNgoaiKiet.id);

  // =========================================================================
  // BÊN VỢ - ĐỜI 5 (THẾ HỆ 0): ANH CHỊ EM RUỘT & HỌ BÊN VỢ
  // =========================================================================
  const anhVoHoangAnh = await createPerson({
    name: 'Lê Hoàng Anh',
    nickname: 'Anh Vợ Hoàng Anh',
    gender: 'male',
    branch: 'vo_chong',
    customRelationToMe: 'Anh trai của Vợ (Anh Vợ)',
    inferredRelationToMe: 'Anh Vợ',
    generation: 0,
    birthYear: 1993,
    avatarUri: SAMPLE_AVATARS.anhVoHoangAnh,
    isDeceased: false,
    phone: '0912444555',
  });
  const chiDauVoChi = await createPerson({
    name: 'Nguyễn Mai Chi',
    nickname: 'Chị Dâu Chi',
    gender: 'female',
    branch: 'vo_chong',
    customRelationToMe: 'Chị dâu của Vợ',
    inferredRelationToMe: 'Chị dâu Vợ',
    generation: 0,
    birthYear: 1995,
    avatarUri: SAMPLE_AVATARS.chiDauVoChi,
    isDeceased: false,
  });
  await linkParentChild(boVoDung.id, anhVoHoangAnh.id);
  await linkParentChild(meVoHien.id, anhVoHoangAnh.id);
  await linkRelatives(anhVoHoangAnh.id, chiDauVoChi.id, 'spouse');

  const emVoThuHa = await createPerson({
    name: 'Lê Thu Hà',
    nickname: 'Em Vợ Hà',
    gender: 'female',
    branch: 'vo_chong',
    customRelationToMe: 'Em gái của Vợ (Em Vợ)',
    inferredRelationToMe: 'Em Vợ',
    generation: 0,
    birthYear: 2000,
    avatarUri: SAMPLE_AVATARS.emVoThuHa,
    isDeceased: false,
    phone: '0988666333',
  });
  const emReVoDuc = await createPerson({
    name: 'Vũ Minh Đức',
    nickname: 'Đức Rể',
    gender: 'male',
    branch: 'vo_chong',
    customRelationToMe: 'Em rể bên Vợ (Chồng Em Hà)',
    inferredRelationToMe: 'Em rể Vợ',
    generation: 0,
    birthYear: 1998,
    avatarUri: SAMPLE_AVATARS.emReVoDuc,
    isDeceased: false,
  });
  await linkParentChild(boVoDung.id, emVoThuHa.id);
  await linkParentChild(meVoHien.id, emVoThuHa.id);
  await linkRelatives(emVoThuHa.id, emReVoDuc.id, 'spouse');

  const emHoVoBao = await createPerson({
    name: 'Lê Quốc Bảo',
    nickname: 'Bảo Em Họ Vợ',
    gender: 'male',
    branch: 'vo_chong',
    customRelationToMe: 'Em họ bên Vợ (Con Bác Hùng)',
    inferredRelationToMe: 'Em họ Vợ',
    generation: 0,
    birthYear: 1997,
    avatarUri: SAMPLE_AVATARS.emHoVoBao,
    isDeceased: false,
  });
  await linkParentChild(bacVoHung.id, emHoVoBao.id);
  await linkParentChild(bacDauVoMai.id, emHoVoBao.id);

  // =========================================================================
  // ĐỜI 6 (THẾ HỆ -1): CON CHÁU ĐỜI MỚI
  // - 2 con của Tôi & Vợ Thảo
  // - Cháu ruột nội tộc (con anh Hưng)
  // - Cháu họ nội tộc (con anh Phong)
  // - Cháu họ ngoại tộc (con anh Huy)
  // - Cháu bên vợ (con anh Hoàng Anh & em Thu Hà)
  // =========================================================================
  // 1. Con trai cả của Tôi & Vợ Thảo:
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
  await linkParentChild(mePerson.id, conTraiKhoi.id);
  await linkParentChild(voThao.id, conTraiKhoi.id);

  // 2. Con gái út của Tôi & Vợ Thảo:
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
  await linkParentChild(mePerson.id, conGaiAn.id);
  await linkParentChild(voThao.id, conGaiAn.id);

  // 3. Cháu ruột nội: 2 con của Anh Hưng & Chị Hà
  const chauRuotKhangAn = await createPerson({
    name: 'Nguyễn Đình Khang An',
    nickname: 'Bé Khang An',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Cháu trai ruột (Con Anh Hưng)',
    inferredRelationToMe: 'Cháu ruột (gọi là Chú)',
    generation: -1,
    birthYear: 2021,
    avatarUri: SAMPLE_AVATARS.chauRuotKhangAn,
    isDeceased: false,
  });
  await linkParentChild(anhHung.id, chauRuotKhangAn.id);
  await linkParentChild(chiDauHa.id, chauRuotKhangAn.id);

  const chauRuotTueLam = await createPerson({
    name: 'Nguyễn Tuệ Lâm',
    nickname: 'Bé Tuệ Lâm',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Cháu gái ruột (Con Anh Hưng)',
    inferredRelationToMe: 'Cháu ruột (gọi là Chú)',
    generation: -1,
    birthYear: 2023,
    avatarUri: SAMPLE_AVATARS.chauRuotTueLam,
    isDeceased: false,
  });
  await linkParentChild(anhHung.id, chauRuotTueLam.id);
  await linkParentChild(chiDauHa.id, chauRuotTueLam.id);

  // 4. Cháu họ nội: 2 con của Anh Phong & Chị Mai Anh
  const chauBao = await createPerson({
    name: 'Nguyễn Đình Bảo',
    nickname: 'Bảo Bảo',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Cháu trai họ (Con Anh Phong)',
    inferredRelationToMe: 'Cháu họ',
    generation: -1,
    birthYear: 2016,
    avatarUri: SAMPLE_AVATARS.chauBao,
    isDeceased: false,
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
    generation: -1,
    birthYear: 2019,
    avatarUri: SAMPLE_AVATARS.chauDiep,
    isDeceased: false,
  });
  await linkParentChild(anhPhong.id, chauDiep.id);
  await linkParentChild(chiDauAnh.id, chauDiep.id);

  // 5. Cháu bên Ngoại: Con của Anh Huy & Chị Thủy
  const chauNgoaiMinh = await createPerson({
    name: 'Trần Nhật Minh',
    nickname: 'Bé Nhật Minh',
    gender: 'male',
    branch: 'ngoai',
    customRelationToMe: 'Cháu họ bên Ngoại (Con Anh Huy)',
    inferredRelationToMe: 'Cháu họ Ngoại',
    generation: -1,
    birthYear: 2020,
    avatarUri: SAMPLE_AVATARS.chauNgoaiMinh,
    isDeceased: false,
  });
  await linkParentChild(anhHoNgoaiHuy.id, chauNgoaiMinh.id);
  await linkParentChild(chiDauNgoaiThuy.id, chauNgoaiMinh.id);

  // 6. Cháu bên Vợ: Con của Anh Hoàng Anh & Chị Mai Chi
  const chauVoKhoi = await createPerson({
    name: 'Lê Tuấn Khôi',
    nickname: 'Bé Tuấn Khôi',
    gender: 'male',
    branch: 'vo_chong',
    customRelationToMe: 'Cháu ruột bên Vợ (Con Anh Hoàng Anh)',
    inferredRelationToMe: 'Cháu Vợ',
    generation: -1,
    birthYear: 2021,
    avatarUri: SAMPLE_AVATARS.chauVoKhoi,
    isDeceased: false,
  });
  await linkParentChild(anhVoHoangAnh.id, chauVoKhoi.id);
  await linkParentChild(chiDauVoChi.id, chauVoKhoi.id);

  // 7. Cháu ngoại bên Vợ: Con của Em Thu Hà & Em rể Minh Đức
  const chauVoHan = await createPerson({
    name: 'Vũ Gia Hân',
    nickname: 'Bé Gia Hân',
    gender: 'female',
    branch: 'vo_chong',
    customRelationToMe: 'Cháu ngoại bên Vợ (Con Em Thu Hà)',
    inferredRelationToMe: 'Cháu ngoại Vợ',
    generation: -1,
    birthYear: 2023,
    avatarUri: SAMPLE_AVATARS.chauVoHan,
    isDeceased: false,
  });
  await linkParentChild(emVoThuHa.id, chauVoHan.id);
  await linkParentChild(emReVoDuc.id, chauVoHan.id);

  return { totalCount: 65 };
}
