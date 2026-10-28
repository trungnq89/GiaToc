import { inferKinshipTitle, getBranchLabel, KINSHIP_PRESETS } from '../kinshipCalculator';

describe('kinshipCalculator', () => {
  describe('inferKinshipTitle - Direct to Me', () => {
    it('infers father correctly', () => {
      const res = inferKinshipTitle({
        gender: 'male',
        relationType: 'parent',
        relativeOfWhom: 'Tôi',
      });
      expect(res.title).toBe('Bố');
      expect(res.howTheyCallMe).toBe('Con');
      expect(res.generation).toBe(1);
      expect(res.branch).toBe('noi');
    });

    it('infers mother correctly', () => {
      const res = inferKinshipTitle({
        gender: 'female',
        relationType: 'parent',
        relativeOfWhom: 'Tôi',
      });
      expect(res.title).toBe('Mẹ');
      expect(res.howTheyCallMe).toBe('Con');
      expect(res.generation).toBe(1);
      expect(res.branch).toBe('ngoai');
    });

    it('infers wife correctly', () => {
      const res = inferKinshipTitle({
        gender: 'female',
        relationType: 'spouse',
        relativeOfWhom: 'Tôi',
      });
      expect(res.title).toBe('Vợ');
      expect(res.howTheyCallMe).toBe('Chồng');
      expect(res.generation).toBe(0);
      expect(res.branch).toBe('vo_chong');
    });

    it('infers older brother correctly', () => {
      const res = inferKinshipTitle({
        gender: 'male',
        relationType: 'sibling',
        relativeOfWhom: 'Tôi',
        isOlderThanIntermediate: true,
      });
      expect(res.title).toBe('Anh trai ruột');
      expect(res.howTheyCallMe).toBe('Em');
      expect(res.generation).toBe(0);
    });

    it('infers younger sister correctly', () => {
      const res = inferKinshipTitle({
        gender: 'female',
        relationType: 'sibling',
        relativeOfWhom: 'Tôi',
        isOlderThanIntermediate: false,
      });
      expect(res.title).toBe('Em gái ruột');
      expect(res.howTheyCallMe).toBe('Anh / Chị');
      expect(res.generation).toBe(0);
    });
  });

  describe('inferKinshipTitle - Via Father (Paternal)', () => {
    it('infers paternal grandfather correctly', () => {
      const res = inferKinshipTitle({
        gender: 'male',
        relationType: 'parent',
        relativeOfWhom: 'Bố',
      });
      expect(res.title).toBe('Ông nội');
      expect(res.howTheyCallMe).toBe('Cháu nội');
      expect(res.generation).toBe(2);
      expect(res.branch).toBe('noi');
    });

    it('infers paternal older uncle (Bác trai) correctly', () => {
      const res = inferKinshipTitle({
        gender: 'male',
        relationType: 'sibling',
        relativeOfWhom: 'Bố',
        isOlderThanIntermediate: true,
      });
      expect(res.title).toBe('Bác trai (Anh của Bố)');
      expect(res.howTheyCallMe).toBe('Cháu');
      expect(res.generation).toBe(1);
    });

    it('infers paternal younger uncle (Chú) correctly', () => {
      const res = inferKinshipTitle({
        gender: 'male',
        relationType: 'sibling',
        relativeOfWhom: 'Bố',
        isOlderThanIntermediate: false,
      });
      expect(res.title).toBe('Chú (Em trai của Bố)');
      expect(res.howTheyCallMe).toBe('Cháu');
      expect(res.generation).toBe(1);
    });

    it('infers paternal aunt (Cô) correctly', () => {
      const res = inferKinshipTitle({
        gender: 'female',
        relationType: 'sibling',
        relativeOfWhom: 'Bố',
      });
      expect(res.title).toContain('Cô');
      expect(res.howTheyCallMe).toBe('Cháu');
      expect(res.generation).toBe(1);
    });
  });

  describe('inferKinshipTitle - Via Mother (Maternal)', () => {
    it('infers maternal grandmother correctly', () => {
      const res = inferKinshipTitle({
        gender: 'female',
        relationType: 'parent',
        relativeOfWhom: 'Mẹ',
      });
      expect(res.title).toBe('Bà ngoại');
      expect(res.howTheyCallMe).toBe('Cháu ngoại');
      expect(res.generation).toBe(2);
      expect(res.branch).toBe('ngoai');
    });

    it('infers maternal uncle (Cậu) correctly', () => {
      const res = inferKinshipTitle({
        gender: 'male',
        relationType: 'sibling',
        relativeOfWhom: 'Mẹ',
      });
      expect(res.title).toContain('Cậu');
      expect(res.generation).toBe(1);
    });

    it('infers maternal aunt (Dì) correctly', () => {
      const res = inferKinshipTitle({
        gender: 'female',
        relationType: 'sibling',
        relativeOfWhom: 'Mẹ',
      });
      expect(res.title).toContain('Dì');
      expect(res.generation).toBe(1);
    });
  });

  describe('getBranchLabel', () => {
    it('returns Vietnamese display names for each branch', () => {
      expect(getBranchLabel('noi')).toBe('Bên Nội');
      expect(getBranchLabel('ngoai')).toBe('Bên Ngoại');
      expect(getBranchLabel('vo_chong')).toBe('Bên Vợ / Chồng');
      expect(getBranchLabel('khac')).toBe('Khác');
    });
  });

  describe('KINSHIP_PRESETS', () => {
    it('contains presets for key kinship roles', () => {
      expect(KINSHIP_PRESETS.length).toBeGreaterThan(15);
      const ids = KINSHIP_PRESETS.map(p => p.id);
      expect(ids).toContain('father');
      expect(ids).toContain('mother');
      expect(ids).toContain('paternal_grandfather');
      expect(ids).toContain('maternal_grandmother');
      expect(ids).toContain('paternal_uncle_older');
      expect(ids).toContain('maternal_aunt_di');
    });
  });
});
