/**
 * Chuyển đổi chuỗi tiếng Việt có dấu thành không dấu để hỗ trợ tìm kiếm linh hoạt
 * Ví dụ: "Nguyễn Quang Khôi" -> "nguyen quang khoi"
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

/**
 * Kiểm tra xem chuỗi target có khớp với search query hay không (hỗ trợ cả có dấu, không dấu và tìm đa từ)
 */
export function matchesVietnameseSearch(target: string | undefined | null, query: string): boolean {
  if (!target || !query) return false;
  const rawTarget = target.toLowerCase();
  const rawQuery = query.toLowerCase().trim();

  // 1. Khớp trực tiếp cả cụm (có dấu)
  if (rawTarget.includes(rawQuery)) return true;

  // 2. Khớp không dấu toàn bộ cụm
  const normalizedTarget = removeVietnameseTones(target);
  const normalizedQuery = removeVietnameseTones(query);
  if (normalizedTarget.includes(normalizedQuery)) return true;

  // 3. Khớp từng từ khóa riêng biệt khi query có nhiều từ (ví dụ: "nguyen khoi" tìm ra "Nguyễn Quang Khôi")
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);
  if (queryWords.length > 1) {
    const allWordsMatch = queryWords.every(word => normalizedTarget.includes(word));
    if (allWordsMatch) return true;
  }

  return false;
}
