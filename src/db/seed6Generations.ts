import { createPerson } from './repositories/personRepository';
import { linkRelatives } from './repositories/relationshipRepository';
import { createMemorialEvent } from './repositories/eventRepository';
import { execute } from './database';

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
  // ==========================================
  const caoToPhu = await createPerson({
    name: 'Nguyễn Đình Huệ',
    nickname: 'Cụ Cao Tổ',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Cụ Kỵ (Cao Tổ Phụ)',
    inferredRelationToMe: 'Cụ Kỵ khởi tổ',
    howTheyCallMe: 'Chắt đời thứ 5',
    generation: 4,
    birthYear: 1880,
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
    customRelationToMe: 'Cụ Kỵ (Cao Tổ Mẫu)',
    inferredRelationToMe: 'Cụ Kỵ bà',
    howTheyCallMe: 'Chắt đời thứ 5',
    generation: 4,
    birthYear: 1883,
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
  // ĐỜI 2 (THẾ HỆ +3): BẬC TẰNG TỔ (5 con của Đời 1)
  // Cụ Huệ & Cụ Nhạn sinh 5 người con (4 trai, 1 gái) -> Đạt tiêu chuẩn 4-7 con
  // ==========================================
  // 1. Cụ Cả Huỳnh
  const tangToHuynh = await createPerson({
    name: 'Nguyễn Đình Huỳnh',
    nickname: 'Cụ Cả',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Cụ Bác Cả',
    inferredRelationToMe: 'Cụ Bác trưởng',
    generation: 3,
    birthYear: 1902,
    isDeceased: true,
    deathDateLunar: '14/04 Âm lịch',
    notes: 'Cụ Bác chi trên, gìn giữ gia quy nghiêm ngặt.',
  });
  await linkParentChild(caoToPhu.id, tangToHuynh.id);
  await linkParentChild(caoToMau.id, tangToHuynh.id);

  // 2. Cụ Hai Khang (Tằng Tổ ruột của Tôi)
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

  // 3. Cụ Ba Phúc
  const tangToPhuc = await createPerson({
    name: 'Nguyễn Đình Phúc',
    nickname: 'Cụ Ba',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Cụ Chú Ba',
    inferredRelationToMe: 'Cụ Chú',
    generation: 3,
    birthYear: 1909,
    isDeceased: true,
    deathDateLunar: '05/06 Âm lịch',
  });
  await linkParentChild(caoToPhu.id, tangToPhuc.id);
  await linkParentChild(caoToMau.id, tangToPhuc.id);

  // 4. Cụ Tư Thịnh
  const tangToThinh = await createPerson({
    name: 'Nguyễn Đình Thịnh',
    nickname: 'Cụ Tư',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Cụ Chú Tư',
    inferredRelationToMe: 'Cụ Chú',
    generation: 3,
    birthYear: 1912,
    isDeceased: true,
    deathDateLunar: '19/01 Âm lịch',
  });
  await linkParentChild(caoToPhu.id, tangToThinh.id);
  await linkParentChild(caoToMau.id, tangToThinh.id);

  // 5. Cụ Năm Lan (Bà Cụ Cô)
  const tangToLan = await createPerson({
    name: 'Nguyễn Thị Lan',
    nickname: 'Cụ Năm',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Bà Cụ Cô',
    inferredRelationToMe: 'Bà Cụ Cô',
    generation: 3,
    birthYear: 1915,
    isDeceased: true,
    deathDateLunar: '12/12 Âm lịch',
  });
  await linkParentChild(caoToPhu.id, tangToLan.id);
  await linkParentChild(caoToMau.id, tangToLan.id);

  // ==========================================
  // ĐỜI 3 (THẾ HỆ +2): BẬC ÔNG BÀ (6 con của Cụ Khang & Cụ Lụa)
  // Cụ Khang & Cụ Lụa sinh 6 người con (4 trai, 2 gái) -> Đạt tiêu chuẩn 4-7 con
  // ==========================================
  // 1. Ông Bác Cả Trọng
  const ongBacTrong = await createPerson({
    name: 'Nguyễn Đình Trọng',
    nickname: 'Ông Bác Cả',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Ông Bác Cả',
    inferredRelationToMe: 'Ông Bác trưởng',
    generation: 2,
    birthYear: 1930,
    isDeceased: true,
    deathDateLunar: '22/10 Âm lịch',
    address: 'Ba Vì, Hà Nội',
  });
  await linkParentChild(tangToKhang.id, ongBacTrong.id);
  await linkParentChild(tangToLua.id, ongBacTrong.id);

  // 2. Ông Nội của Tôi: Nguyễn Đình Chính
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

  // 3. Ông Chú Ba Liêm
  const ongChuLiem = await createPerson({
    name: 'Nguyễn Đình Liêm',
    nickname: 'Ông Chú Ba',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Ông Chú Ba',
    inferredRelationToMe: 'Ông Chú',
    generation: 2,
    birthYear: 1937,
    isDeceased: true,
    deathDateLunar: '15/07 Âm lịch',
  });
  await linkParentChild(tangToKhang.id, ongChuLiem.id);
  await linkParentChild(tangToLua.id, ongChuLiem.id);

  // 4. Bà Cô Tư Tuyết
  const baCoTuyet = await createPerson({
    name: 'Nguyễn Thị Tuyết',
    nickname: 'Bà Cô Tư',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Bà Cô Tư',
    inferredRelationToMe: 'Bà Cô ruột',
    generation: 2,
    birthYear: 1941,
    isDeceased: false,
    phone: '0988222333',
    address: 'Việt Trì, Phú Thọ',
    notes: 'Bà cô rất xởi lởi, hay gửi quà bánh quê về cho các cháu.',
  });
  await linkParentChild(tangToKhang.id, baCoTuyet.id);
  await linkParentChild(tangToLua.id, baCoTuyet.id);

  // 5. Ông Chú Năm Hùng
  const ongChuHung = await createPerson({
    name: 'Nguyễn Đình Hùng',
    nickname: 'Ông Chú Năm',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Ông Chú Năm',
    inferredRelationToMe: 'Ông Chú',
    generation: 2,
    birthYear: 1945,
    isDeceased: false,
    phone: '0977333444',
    address: 'Quận 1, TP. Hồ Chí Minh',
    notes: 'Cán bộ miền Nam tập kết, nay nghỉ hưu tại Sài Gòn.',
  });
  await linkParentChild(tangToKhang.id, ongChuHung.id);
  await linkParentChild(tangToLua.id, ongChuHung.id);

  // 6. Bà Cô Sáu Vân
  const baCoVan = await createPerson({
    name: 'Nguyễn Thị Vân',
    nickname: 'Bà Cô Sáu',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Bà Cô Sáu',
    inferredRelationToMe: 'Bà Cô',
    generation: 2,
    birthYear: 1948,
    isDeceased: false,
    phone: '0966555777',
    address: 'Nha Trang, Khánh Hòa',
  });
  await linkParentChild(tangToKhang.id, baCoVan.id);
  await linkParentChild(tangToLua.id, baCoVan.id);

  // ==========================================
  // ĐỜI 4 (THẾ HỆ +1): BẬC CHA CHÚ (5 con của Ông Chính & Bà Mai)
  // Ông Chính & Bà Mai sinh 5 người con (4 trai, 1 gái) -> Đạt tiêu chuẩn 4-7 con
  // ==========================================
  // 1. Bác Cả Tuấn (Trưởng họ chi hai)
  const bacCaTuan = await createPerson({
    name: 'Nguyễn Đình Tuấn',
    nickname: 'Bác Cả',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Bác Cả (Trưởng họ)',
    inferredRelationToMe: 'Bác trai (Anh của Bố)',
    howTheyCallMe: 'Cháu Trung',
    generation: 1,
    birthYear: 1959,
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
    customRelationToMe: 'Bác Dâu Cả',
    inferredRelationToMe: 'Bác dâu (Vợ Bác Cả)',
    howTheyCallMe: 'Cháu',
    generation: 1,
    birthYear: 1961,
    isDeceased: false,
    address: 'Cổ Đô, Ba Vì, Hà Nội',
  });
  await linkParentChild(ongNoiChinh.id, bacCaTuan.id);
  await linkParentChild(baNoiMai.id, bacCaTuan.id);
  await linkRelatives(bacCaTuan.id, bacGaiHuong.id, 'spouse');

  // 2. Bố của Tôi: Nguyễn Đình Bình
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
    isDeceased: false,
    phone: '0904112233',
    address: 'Cầu Giấy, Hà Nội',
    notes: 'Giáo viên về hưu, rất khéo tay, nấu các món ăn gia truyền ngày Tết rất ngon.',
  });
  await linkParentChild(ongNoiChinh.id, boBinh.id);
  await linkParentChild(baNoiMai.id, boBinh.id);
  await linkRelatives(boBinh.id, meThu.id, 'spouse');

  // 3. Chú Ba Dũng
  const chuBaDung = await createPerson({
    name: 'Nguyễn Đình Dũng',
    nickname: 'Chú Ba',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Chú Ba',
    inferredRelationToMe: 'Chú (Em trai của Bố)',
    howTheyCallMe: 'Cháu Trung',
    generation: 1,
    birthYear: 1968,
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
    customRelationToMe: 'Thím Ba',
    inferredRelationToMe: 'Thím (Vợ Chú Ba)',
    howTheyCallMe: 'Cháu',
    generation: 1,
    birthYear: 1970,
    isDeceased: false,
    address: 'Thanh Xuân, Hà Nội',
  });
  await linkParentChild(ongNoiChinh.id, chuBaDung.id);
  await linkParentChild(baNoiMai.id, chuBaDung.id);
  await linkRelatives(chuBaDung.id, thimOanh.id, 'spouse');

  // 4. Cô Tư Hằng
  const coTuHang = await createPerson({
    name: 'Nguyễn Thị Hằng',
    nickname: 'Cô Tư',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Cô Tư',
    inferredRelationToMe: 'Cô ruột (Em gái của Bố)',
    howTheyCallMe: 'Cháu',
    generation: 1,
    birthYear: 1972,
    isDeceased: false,
    phone: '0983123456',
    address: 'Lê Chân, Hải Phòng',
    notes: 'Kế toán trưởng, rất thương các cháu, năm nào cũng gửi hải sản về biếu gia đình.',
  });
  await linkParentChild(ongNoiChinh.id, coTuHang.id);
  await linkParentChild(baNoiMai.id, coTuHang.id);

  // 5. Chú Út Nam
  const chuUtNam = await createPerson({
    name: 'Nguyễn Đình Nam',
    nickname: 'Chú Út',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Chú Út',
    inferredRelationToMe: 'Chú (Em út của Bố)',
    howTheyCallMe: 'Cháu Trung',
    generation: 1,
    birthYear: 1976,
    isDeceased: false,
    phone: '0912889900',
    address: 'Hải Châu, Đà Nẵng',
    notes: 'Kiến trúc sư sinh sống tại Đà Nẵng.',
  });
  await linkParentChild(ongNoiChinh.id, chuUtNam.id);
  await linkParentChild(baNoiMai.id, chuUtNam.id);

  // ==========================================
  // ĐỜI 5 (THẾ HỆ 0): THẾ HỆ CỦA TÔI & ANH CHỊ EM
  // Mỗi gia đình đời trước (Bác Cả, Bố Bình, Chú Dũng) đều có 4 con:
  // - Bác Cả Tuấn & Bác Hương: 4 con (Phong, Trang, Vũ, Mai) -> 4 con
  // - Bố Bình & Mẹ Thu: 4 con (Anh Hưng, Tôi - Trung, Em Thành, Em Linh) -> 4 con
  // - Chú Ba Dũng & Thím Oanh: 4 con (Long, Huyền, Nam, My) -> 4 con
  // - Cô Tư Hằng: Em Huy
  // - Vợ của Tôi: Lê Thị Thảo
  // ==========================================

  // --- Gia đình Bác Cả (4 con) ---
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
    customRelationToMe: 'Chị dâu họ',
    inferredRelationToMe: 'Chị dâu',
    howTheyCallMe: 'Chú Trung',
    generation: 0,
    birthYear: 1988,
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
    isDeceased: false,
    phone: '0976111222',
    address: 'Cầu Giấy, Hà Nội',
    notes: 'Giảng viên Đại học Ngoại Ngữ.',
  });
  await linkParentChild(bacCaTuan.id, chiTrang.id);
  await linkParentChild(bacGaiHuong.id, chiTrang.id);

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
    isDeceased: false,
    phone: '0917333555',
  });
  await linkParentChild(bacCaTuan.id, chiMai.id);
  await linkParentChild(bacGaiHuong.id, chiMai.id);

  // --- Gia đình Bố Bình (4 con: Anh Hưng, Tôi, Em Thành, Em Linh) ---
  const anhHung = await createPerson({
    name: 'Nguyễn Đình Hưng',
    nickname: 'Anh Hưng',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Anh trai cả ruột',
    inferredRelationToMe: 'Anh ruột',
    howTheyCallMe: 'Em Trung',
    generation: 0,
    birthYear: 1991,
    isDeceased: false,
    phone: '0981999888',
    address: 'Hà Đông, Hà Nội',
    notes: 'Bác sĩ ngoại khoa tại Bệnh viện Bạch Mai.',
  });
  await linkParentChild(boBinh.id, anhHung.id);
  await linkParentChild(meThu.id, anhHung.id);

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
    isDeceased: false,
    phone: '0908889911',
    address: 'Cầu Giấy, Hà Nội',
    notes: 'Bác sĩ nhi khoa bệnh viện Nhi TW, hiền dịu, chăm lo chu đáo cho gia đình.',
  });

  // Em trai ruột của Tôi:
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
    isDeceased: false,
    phone: '0966444555',
    address: 'Cầu Giấy, Hà Nội',
    notes: 'Lập trình viên backend, tính vui vẻ, thích chơi đá bóng cuối tuần.',
  });
  await linkParentChild(boBinh.id, emTraiThanh.id);
  await linkParentChild(meThu.id, emTraiThanh.id);

  // Em gái ruột của Tôi:
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
    isDeceased: false,
    phone: '0987333222',
    address: 'Cầu Giấy, Hà Nội',
    notes: 'Tốt nghiệp cử nhân Ngoại thương, đang làm việc tại công ty đa quốc gia.',
  });
  await linkParentChild(boBinh.id, emGaiLinh.id);
  await linkParentChild(meThu.id, emGaiLinh.id);

  // --- Gia đình Chú Ba Dũng (4 con) ---
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
    isDeceased: false,
    phone: '0943555777',
    address: 'Thanh Xuân, Hà Nội',
  });
  await linkParentChild(chuBaDung.id, emLong.id);
  await linkParentChild(thimOanh.id, emLong.id);

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
    isDeceased: false,
  });
  await linkParentChild(chuBaDung.id, emMy.id);
  await linkParentChild(thimOanh.id, emMy.id);

  // --- Con Cô Tư Hằng ---
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
    isDeceased: false,
    phone: '0936777888',
    address: 'Hải Phòng',
  });
  await linkParentChild(coTuHang.id, emHuy.id);

  // ==========================================
  // ĐỜI 6 (THẾ HỆ -1): BẬC CON CHÁU ĐỜI MỚI NHẤT
  // "Đời gần nhất thì có 2 con":
  // - Tôi & Vợ Thảo có đúng 2 con nhỏ (Bé Khôi & Bé An)
  // - Anh họ trưởng chi (Anh Phong & Chị Mai Anh) có đúng 2 con (Bé Bảo & Bé Diệp)
  // ==========================================
  // 1. Con trai cả của Tôi:
  const conTraiKhoi = await createPerson({
    name: 'Nguyễn Quang Khôi',
    nickname: 'Bé Khôi (Cún)',
    gender: 'male',
    branch: 'noi',
    customRelationToMe: 'Con trai cả',
    inferredRelationToMe: 'Con trai',
    howTheyCallMe: 'Bố Trung',
    generation: -1,
    birthYear: 2022,
    isDeceased: false,
    notes: 'Thích ô tô đồ chơi, tính cách lém lỉnh, hay cười.',
  });
  await linkParentChild(voThao.id, conTraiKhoi.id);

  // 2. Con gái út của Tôi:
  const conGaiAn = await createPerson({
    name: 'Nguyễn Tuệ An',
    nickname: 'Bé An (Thỏ)',
    gender: 'female',
    branch: 'noi',
    customRelationToMe: 'Con gái út',
    inferredRelationToMe: 'Con gái',
    howTheyCallMe: 'Bố Trung',
    generation: -1,
    birthYear: 2024,
    isDeceased: false,
    notes: 'Công chúa nhỏ của gia đình, vừa biết bi bô gọi bố mẹ.',
  });
  await linkParentChild(voThao.id, conGaiAn.id);

  // Cháu họ: 2 con của Anh Phong
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
    isDeceased: false,
    notes: 'Đang học mầm non, múa hát rất dạn dĩ.',
  });
  await linkParentChild(anhPhong.id, chauDiep.id);
  await linkParentChild(chiDauAnh.id, chauDiep.id);

  return { totalCount: 35 };
}
