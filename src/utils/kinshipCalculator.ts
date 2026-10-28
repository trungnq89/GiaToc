import { Gender, FamilyBranch } from '../types';

export interface RelationPreset {
  id: string;
  title: string; // Tên xưng hô: "Bác ruột (Anh của Bố)", "Chú", "Dì"...
  shortTitle: string; // Tên ngắn gọn: "Bác", "Chú", "Dì"
  howTheyCallMe: string; // Họ gọi Tôi là: "Cháu", "Em", "Con"
  branch: FamilyBranch;
  gender: Gender;
  generation: number; // 0, 1, 2, -1, -2
}

export const KINSHIP_PRESETS: RelationPreset[] = [
  // Trực hệ phụ mẫu & bạn đời
  { id: 'father', title: 'Bố (Ba / Cha)', shortTitle: 'Bố', howTheyCallMe: 'Con', branch: 'noi', gender: 'male', generation: 1 },
  { id: 'mother', title: 'Mẹ (Má / U)', shortTitle: 'Mẹ', howTheyCallMe: 'Con', branch: 'ngoai', gender: 'female', generation: 1 },
  { id: 'husband', title: 'Chồng', shortTitle: 'Chồng', howTheyCallMe: 'Vợ', branch: 'vo_chong', gender: 'male', generation: 0 },
  { id: 'wife', title: 'Vợ', shortTitle: 'Vợ', howTheyCallMe: 'Chồng', branch: 'vo_chong', gender: 'female', generation: 0 },
  { id: 'son', title: 'Con trai', shortTitle: 'Con trai', howTheyCallMe: 'Bố / Mẹ', branch: 'noi', gender: 'male', generation: -1 },
  { id: 'daughter', title: 'Con gái', shortTitle: 'Con gái', howTheyCallMe: 'Bố / Mẹ', branch: 'noi', gender: 'female', generation: -1 },

  // Anh chị em ruột
  { id: 'older_brother', title: 'Anh trai ruột', shortTitle: 'Anh trai', howTheyCallMe: 'Em', branch: 'noi', gender: 'male', generation: 0 },
  { id: 'older_sister', title: 'Chị gái ruột', shortTitle: 'Chị gái', howTheyCallMe: 'Em', branch: 'noi', gender: 'female', generation: 0 },
  { id: 'younger_brother', title: 'Em trai ruột', shortTitle: 'Em trai', howTheyCallMe: 'Anh / Chị', branch: 'noi', gender: 'male', generation: 0 },
  { id: 'younger_sister', title: 'Em gái ruột', shortTitle: 'Em gái', howTheyCallMe: 'Anh / Chị', branch: 'noi', gender: 'female', generation: 0 },

  // Bậc Ông Bà (Thế hệ +2)
  { id: 'paternal_grandfather', title: 'Ông nội', shortTitle: 'Ông nội', howTheyCallMe: 'Cháu nội', branch: 'noi', gender: 'male', generation: 2 },
  { id: 'paternal_grandmother', title: 'Bà nội', shortTitle: 'Bà nội', howTheyCallMe: 'Cháu nội', branch: 'noi', gender: 'female', generation: 2 },
  { id: 'maternal_grandfather', title: 'Ông ngoại', shortTitle: 'Ông ngoại', howTheyCallMe: 'Cháu ngoại', branch: 'ngoai', gender: 'male', generation: 2 },
  { id: 'maternal_grandmother', title: 'Bà ngoại', shortTitle: 'Bà ngoại', howTheyCallMe: 'Cháu ngoại', branch: 'ngoai', gender: 'female', generation: 2 },

  // Bên Nội - Bậc Cha Chú Cô Bác (Thế hệ +1)
  { id: 'paternal_uncle_older', title: 'Bác trai (Anh của Bố)', shortTitle: 'Bác trai', howTheyCallMe: 'Cháu', branch: 'noi', gender: 'male', generation: 1 },
  { id: 'paternal_aunt_older', title: 'Bác gái (Vợ của Bác trai)', shortTitle: 'Bác gái', howTheyCallMe: 'Cháu', branch: 'noi', gender: 'female', generation: 1 },
  { id: 'paternal_uncle_younger', title: 'Chú (Em trai của Bố)', shortTitle: 'Chú', howTheyCallMe: 'Cháu', branch: 'noi', gender: 'male', generation: 1 },
  { id: 'paternal_aunt_thim', title: 'Thím (Vợ của Chú)', shortTitle: 'Thím', howTheyCallMe: 'Cháu', branch: 'noi', gender: 'female', generation: 1 },
  { id: 'paternal_aunt_co', title: 'Cô / O (Chị hoặc Em gái của Bố)', shortTitle: 'Cô', howTheyCallMe: 'Cháu', branch: 'noi', gender: 'female', generation: 1 },
  { id: 'paternal_uncle_duong', title: 'Chú rể / Dượng (Chồng của Cô)', shortTitle: 'Dượng', howTheyCallMe: 'Cháu', branch: 'noi', gender: 'male', generation: 1 },

  // Bên Ngoại - Bậc Cậu Mợ Dì (Thế hệ +1)
  { id: 'maternal_uncle_cau', title: 'Cậu (Anh hoặc Em trai của Mẹ)', shortTitle: 'Cậu', howTheyCallMe: 'Cháu', branch: 'ngoai', gender: 'male', generation: 1 },
  { id: 'maternal_aunt_mo', title: 'Mợ (Vợ của Cậu)', shortTitle: 'Mợ', howTheyCallMe: 'Cháu', branch: 'ngoai', gender: 'female', generation: 1 },
  { id: 'maternal_aunt_di', title: 'Dì (Chị hoặc Em gái của Mẹ)', shortTitle: 'Dì', howTheyCallMe: 'Cháu', branch: 'ngoai', gender: 'female', generation: 1 },
  { id: 'maternal_uncle_duong', title: 'Dượng (Chồng của Dì)', shortTitle: 'Dượng', howTheyCallMe: 'Cháu', branch: 'ngoai', gender: 'male', generation: 1 },

  // Anh Chị Em Họ (Cùng thế hệ 0)
  { id: 'cousin_older_brother', title: 'Anh họ (Con của Bác / Chú / Cô / Cậu / Dì)', shortTitle: 'Anh họ', howTheyCallMe: 'Em', branch: 'noi', gender: 'male', generation: 0 },
  { id: 'cousin_older_sister', title: 'Chị họ', shortTitle: 'Chị họ', howTheyCallMe: 'Em', branch: 'noi', gender: 'female', generation: 0 },
  { id: 'cousin_younger_brother', title: 'Em họ (Nam)', shortTitle: 'Em họ', howTheyCallMe: 'Anh / Chị', branch: 'noi', gender: 'male', generation: 0 },
  { id: 'cousin_younger_sister', title: 'Em họ (Nữ)', shortTitle: 'Em họ', howTheyCallMe: 'Anh / Chị', branch: 'noi', gender: 'female', generation: 0 },

  // Bên Vợ / Bên Chồng
  { id: 'inlaw_father', title: 'Bố vợ / Bố chồng', shortTitle: 'Bố', howTheyCallMe: 'Con rể / Con dâu', branch: 'vo_chong', gender: 'male', generation: 1 },
  { id: 'inlaw_mother', title: 'Mẹ vợ / Mẹ chồng', shortTitle: 'Mẹ', howTheyCallMe: 'Con rể / Con dâu', branch: 'vo_chong', gender: 'female', generation: 1 },
  { id: 'inlaw_brother', title: 'Anh / Em vợ (hoặc chồng)', shortTitle: 'Anh/Em', howTheyCallMe: 'Anh/Em/Chị', branch: 'vo_chong', gender: 'male', generation: 0 },
  { id: 'inlaw_sister', title: 'Chị / Em vợ (hoặc chồng)', shortTitle: 'Chị/Em', howTheyCallMe: 'Anh/Em/Chị', branch: 'vo_chong', gender: 'female', generation: 0 },

  // Bậc Cháu (Thế hệ -1)
  { id: 'nephew', title: 'Cháu trai (Con của Anh / Chị / Em)', shortTitle: 'Cháu trai', howTheyCallMe: 'Bác / Chú / Cô / Cậu / Dì', branch: 'noi', gender: 'male', generation: -1 },
  { id: 'niece', title: 'Cháu gái (Con của Anh / Chị / Em)', shortTitle: 'Cháu gái', howTheyCallMe: 'Bác / Chú / Cô / Cậu / Dì', branch: 'noi', gender: 'female', generation: -1 },
];

/**
 * Suy diễn xưng hô tự động dựa trên mối liên kết trực hệ gia phả:
 * - A là gì của B
 * - B là gì của Tôi
 */
export function inferKinshipTitle(options: {
  gender: Gender;
  relationType: 'parent' | 'child' | 'spouse' | 'sibling';
  relativeOfWhom?: string; // Tên xưng hô của người trung gian: 'Bố', 'Mẹ', 'Tôi', 'Anh trai'...
  isOlderThanIntermediate?: boolean; // Lớn tuổi hơn hay nhỏ hơn người trung gian
}): { title: string; howTheyCallMe: string; generation: number; branch: FamilyBranch } {
  const { gender, relationType, relativeOfWhom, isOlderThanIntermediate } = options;

  // Quan hệ trực tiếp với 'Tôi'
  if (!relativeOfWhom || relativeOfWhom === 'Tôi' || relativeOfWhom === 'me') {
    if (relationType === 'parent') {
      return gender === 'female'
        ? { title: 'Mẹ', howTheyCallMe: 'Con', generation: 1, branch: 'ngoai' }
        : { title: 'Bố', howTheyCallMe: 'Con', generation: 1, branch: 'noi' };
    }
    if (relationType === 'spouse') {
      return gender === 'female'
        ? { title: 'Vợ', howTheyCallMe: 'Chồng', generation: 0, branch: 'vo_chong' }
        : { title: 'Chồng', howTheyCallMe: 'Vợ', generation: 0, branch: 'vo_chong' };
    }
    if (relationType === 'child') {
      return gender === 'female'
        ? { title: 'Con gái', howTheyCallMe: 'Bố / Mẹ', generation: -1, branch: 'noi' }
        : { title: 'Con trai', howTheyCallMe: 'Bố / Mẹ', generation: -1, branch: 'noi' };
    }
    if (relationType === 'sibling') {
      if (isOlderThanIntermediate) {
        return gender === 'female'
          ? { title: 'Chị gái ruột', howTheyCallMe: 'Em', generation: 0, branch: 'noi' }
          : { title: 'Anh trai ruột', howTheyCallMe: 'Em', generation: 0, branch: 'noi' };
      }
      return gender === 'female'
        ? { title: 'Em gái ruột', howTheyCallMe: 'Anh / Chị', generation: 0, branch: 'noi' }
        : { title: 'Em trai ruột', howTheyCallMe: 'Anh / Chị', generation: 0, branch: 'noi' };
    }
  }

  // Quan hệ qua Bố
  if (relativeOfWhom === 'Bố' || relativeOfWhom === 'father') {
    if (relationType === 'parent') {
      return gender === 'female'
        ? { title: 'Bà nội', howTheyCallMe: 'Cháu nội', generation: 2, branch: 'noi' }
        : { title: 'Ông nội', howTheyCallMe: 'Cháu nội', generation: 2, branch: 'noi' };
    }
    if (relationType === 'sibling') {
      if (gender === 'female') {
        return { title: 'Cô / O (Chị/Em của Bố)', howTheyCallMe: 'Cháu', generation: 1, branch: 'noi' };
      }
      return isOlderThanIntermediate
        ? { title: 'Bác trai (Anh của Bố)', howTheyCallMe: 'Cháu', generation: 1, branch: 'noi' }
        : { title: 'Chú (Em trai của Bố)', howTheyCallMe: 'Cháu', generation: 1, branch: 'noi' };
    }
  }

  // Quan hệ qua Mẹ
  if (relativeOfWhom === 'Mẹ' || relativeOfWhom === 'mother') {
    if (relationType === 'parent') {
      return gender === 'female'
        ? { title: 'Bà ngoại', howTheyCallMe: 'Cháu ngoại', generation: 2, branch: 'ngoai' }
        : { title: 'Ông ngoại', howTheyCallMe: 'Cháu ngoại', generation: 2, branch: 'ngoai' };
    }
    if (relationType === 'sibling') {
      if (gender === 'female') {
        return { title: 'Dì (Chị/Em gái của Mẹ)', howTheyCallMe: 'Cháu', generation: 1, branch: 'ngoai' };
      }
      return { title: 'Cậu (Anh/Em trai của Mẹ)', howTheyCallMe: 'Cháu', generation: 1, branch: 'ngoai' };
    }
  }

  // Mặc định
  return {
    title: 'Họ hàng',
    howTheyCallMe: 'Tôi',
    generation: 0,
    branch: 'noi',
  };
}

/** Tên hiển thị chi nhánh tiếng Việt */
export function getBranchLabel(branch: FamilyBranch): string {
  switch (branch) {
    case 'noi':
      return 'Bên Nội';
    case 'ngoai':
      return 'Bên Ngoại';
    case 'vo_chong':
      return 'Bên Vợ / Chồng';
    case 'khac':
    default:
      return 'Khác';
  }
}
