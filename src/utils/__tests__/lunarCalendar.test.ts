import {
  convertSolar2Lunar,
  convertLunar2Solar,
  getTodayLunarDate,
  parseLunarDateString,
  calculateAnniversaryCountdown,
} from '../lunarCalendar';

describe('Vietnamese Lunar Calendar & Anniversary Countdown', () => {
  it('converts known solar date to lunar correctly', () => {
    // 2026-02-17 is Lunar New Year (1/1/2026 lunar)
    const lunarTet = convertSolar2Lunar(17, 2, 2026);
    expect(lunarTet.day).toBe(1);
    expect(lunarTet.month).toBe(1);
    expect(lunarTet.year).toBe(2026);

    // 2026-10-28 is 19/9/2026 lunar
    const lunarToday = convertSolar2Lunar(28, 10, 2026);
    expect(lunarToday.day).toBe(19);
    expect(lunarToday.month).toBe(9);
    expect(lunarToday.year).toBe(2026);
  });

  it('converts known lunar date to solar correctly', () => {
    // 10/3/2026 lunar -> 26/4/2026 solar
    const solarGioTo = convertLunar2Solar(10, 3, 2026);
    expect(solarGioTo).toEqual([26, 4, 2026]);

    // 10/3/2027 lunar -> 16/4/2027 solar
    const solarGioTo2027 = convertLunar2Solar(10, 3, 2027);
    expect(solarGioTo2027).toEqual([16, 4, 2027]);
  });

  it('parses lunar date strings correctly', () => {
    expect(parseLunarDateString('18/08 Âm lịch')).toEqual({ day: 18, month: 8 });
    expect(parseLunarDateString('10/03 Âm lịch')).toEqual({ day: 10, month: 3 });
    expect(parseLunarDateString('Ngày 15 tháng 7')).toEqual({ day: 15, month: 7 });
    expect(parseLunarDateString('')).toBeNull();
    expect(parseLunarDateString(undefined)).toBeNull();
  });

  it('calculates anniversary countdown accurately', () => {
    // Reference date: 2026-10-28 (which is 19/9/2026 lunar)
    const refDate = new Date(2026, 9, 28); // Month is 0-indexed: 9 = October

    // 1. Anniversary TODAY (19/9 lunar)
    const todayCountdown = calculateAnniversaryCountdown(
      { lunarDay: 19, lunarMonth: 9 },
      refDate,
    );
    expect(todayCountdown).not.toBeNull();
    expect(todayCountdown?.daysRemaining).toBe(0);
    expect(todayCountdown?.isToday).toBe(true);
    expect(todayCountdown?.statusBadge).toBe('🔥 Hôm nay');

    // 2. Anniversary TOMORROW (20/9 lunar)
    const tomorrowCountdown = calculateAnniversaryCountdown(
      { lunarDay: 20, lunarMonth: 9 },
      refDate,
    );
    expect(tomorrowCountdown).not.toBeNull();
    expect(tomorrowCountdown?.daysRemaining).toBe(1);
    expect(tomorrowCountdown?.isTomorrow).toBe(true);
    expect(tomorrowCountdown?.statusBadge).toBe('⚡ Ngày mai');

    // 3. Anniversary in 6 days (25/9 lunar -> 2026-11-03 solar)
    const soonCountdown = calculateAnniversaryCountdown(
      { lunarDay: 25, lunarMonth: 9 },
      refDate,
    );
    expect(soonCountdown).not.toBeNull();
    expect(soonCountdown?.daysRemaining).toBe(6);
    expect(soonCountdown?.isWithinWeek).toBe(true);
    expect(soonCountdown?.formattedNextSolar).toBe('03/11/2026');

    // 4. Anniversary in next lunar year (10/3 lunar -> 2027-04-16 solar)
    const nextYearCountdown = calculateAnniversaryCountdown(
      { lunarDay: 10, lunarMonth: 3 },
      refDate,
    );
    expect(nextYearCountdown).not.toBeNull();
    expect(nextYearCountdown?.daysRemaining).toBe(170);
    expect(nextYearCountdown?.formattedNextSolar).toBe('16/04/2027');
  });
});
