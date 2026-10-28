export type Gender = 'male' | 'female' | 'other';

export type FamilyBranch = 'noi' | 'ngoai' | 'vo_chong' | 'khac';

export type AtomicRelationType = 'parent' | 'child' | 'spouse' | 'sibling';

export type GenerationLevel =
  | 'ancestor' // Cụ/Kỵ (thế hệ +2 trở lên)
  | 'grandparent' // Ông bà (+2)
  | 'parent' // Cha chú, cô dì bác (+1)
  | 'peer' // Cùng thế hệ tôi, anh chị em họ (0)
  | 'child' // Con cháu đời sau (-1)
  | 'grandchild'; // Cháu chắt (-2 trở xuống)

export interface UserProfile {
  id: string; // thường là 'me'
  name: string; // Tên của Tôi
  gender: Gender;
  birthYear?: number;
  avatarUri?: string;
  createdAt: number; // epoch ms
  updatedAt: number;
}

export interface Person {
  id: string;
  name: string; // Họ và tên
  nickname?: string; // Tên gọi thân mật / ở nhà
  gender: Gender;
  avatarUri?: string;
  branch: FamilyBranch; // Bên Nội, Bên Ngoại, Bên Vợ/Chồng, Khác
  customRelationToMe?: string; // Nhãn người dùng đặt riêng: ví dụ "Bác Cả", "Dì 5"
  inferredRelationToMe?: string; // Quan hệ suy diễn tự động: ví dụ "Bác ruột (Anh của Bố)"
  howTheyCallMe?: string; // Cách người đó gọi Tôi: ví dụ "Cháu", "Em"
  birthDate?: string; // YYYY-MM-DD
  birthYear?: number;
  isDeceased: boolean;
  deathDate?: string;
  deathDateLunar?: string; // ví dụ: "15 tháng 7 Âm lịch"
  phone?: string;
  address?: string;
  notes?: string;
  generation: number; // 0 = cùng lứa với Tôi, 1 = lứa cha chú, 2 = lứa ông bà, -1 = lứa con...
  createdAt: number;
  updatedAt: number;
}

export interface PersonSummary {
  id: string;
  name: string;
  nickname?: string;
  gender: Gender;
  avatarUri?: string;
  branch: FamilyBranch;
  customRelationToMe?: string;
  inferredRelationToMe?: string;
  phone?: string;
  isDeceased: boolean;
  generation: number;
}

export interface KinshipRelation {
  id: string;
  personId: string; // Người A
  relatedPersonId: string; // Người B
  relationType: AtomicRelationType; // A là [relationType] của B
  orderIndex?: number; // Thứ bậc (con thứ 1, con thứ 2...)
  createdAt: number;
  updatedAt: number;
}

export interface MemorialEvent {
  id: string;
  personId: string;
  personName: string;
  title: string;
  eventType: 'death_anniversary' | 'birthday' | 'other';
  lunarDay?: number;
  lunarMonth?: number;
  solarDate?: string; // YYYY-MM-DD
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FamilyTreeMemberNode {
  person: Person;
  spouse?: Person[];
  children?: FamilyTreeMemberNode[];
  parents?: Person[];
  siblings?: Person[];
}
