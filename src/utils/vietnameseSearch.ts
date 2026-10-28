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
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Kiểm tra xem chuỗi target có khớp với search query hay không (hỗ trợ cả có dấu và không dấu)
 */
export function matchesVietnameseSearch(target: string | undefined | null, query: string): boolean {
  if (!target || !query) return false;
  const rawTarget = target.toLowerCase();
  const rawQuery = query.toLowerCase().trim();

  // Khớp trực tiếp có dấu
  if (rawTarget.includes(rawQuery)) return true;

  // Khớp không dấu
  const normalizedTarget = removeVietnameseTones(target);
  const normalizedQuery = removeVietnameseTones(query);
  return normalizedTarget.includes(normalizedQuery);
}
