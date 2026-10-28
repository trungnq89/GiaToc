/**
 * Vietnamese Lunar Calendar (Âm Lịch Việt Nam) Conversion & Anniversary Countdown
 * Based on the standard astronomical algorithm for Vietnam timezone (GMT+7) by Ho Ngoc Duc.
 */

const PI = Math.PI;

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  leap: number; // 1 if leap month, 0 otherwise
}

export interface AnniversaryCountdown {
  daysRemaining: number;
  nextSolarDate: Date;
  formattedNextSolar: string; // "DD/MM/YYYY"
  lunarDay: number;
  lunarMonth: number;
  formattedLunar: string; // "Ngày DD tháng MM (Âm lịch)"
  isToday: boolean;
  isTomorrow: boolean;
  isWithinWeek: boolean;
  isWithinMonth: boolean;
  countdownText: string;
  statusBadge: string;
}

/**
 * Julian day number from Gregorian date
 */
export function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd =
    dd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
  if (jd < 2299161) {
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

/**
 * Gregorian date from Julian day number: [day, month, year]
 */
export function jdToDate(jd: number): [number, number, number] {
  let a: number;
  let b: number;
  let c: number;
  if (jd > 2299160) {
    a = jd + 32044;
    b = Math.floor((4 * a + 3) / 146097);
    c = a - Math.floor((146097 * b) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return [day, month, year];
}

function getNewMoonDay(k: number, timezone: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 = Jd1 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  const C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  const C2 = -0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(2 * dr * Mpr);
  const C3 = -0.0004 * Math.sin(3 * dr * Mpr);
  const C4 = 0.0104 * Math.sin(2 * dr * F) - 0.0051 * Math.sin((M + Mpr) * dr);
  const C5 = -0.0074 * Math.sin((M - Mpr) * dr) + 0.0004 * Math.sin((2 * F + M) * dr);
  const C6 = -0.0004 * Math.sin((2 * F - M) * dr) - 0.0006 * Math.sin((2 * F + Mpr) * dr);
  const C7 = 0.001 * Math.sin((2 * F - Mpr) * dr) + 0.0005 * Math.sin((2 * Mpr + M) * dr);
  const JdNew = Jd1 + C1 + C2 + C3 + C4 + C5 + C6 + C7;
  return Math.floor(JdNew + 0.5 + timezone / 24);
}

function getSunLongitude(jdn: number, timezone: number): number {
  const T = (jdn - 2451545.5 - timezone / 24) / 36525;
  const T2 = T * T;
  const dr = PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  const DL =
    (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M) +
    (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) +
    0.00029 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  L = L * dr;
  L = L - PI * 2 * Math.floor(L / (PI * 2));
  return Math.floor((L / PI) * 6);
}

function getLunarMonth11(yy: number, timezone: number): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, timezone);
  const sunLong = getSunLongitude(nm, timezone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timezone);
  }
  return nm;
}

function getLeapMonthOffset(a11: number, timezone: number): number {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timezone), timezone);
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, timezone), timezone);
  } while (arc !== last && i < 14);
  return i - 1;
}

/**
 * Convert Solar Gregorian date to Vietnamese Lunar date (GMT+7)
 */
export function convertSolar2Lunar(
  dd: number,
  mm: number,
  yy: number,
  timezone = 7,
): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, timezone);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timezone);
  }
  let a11 = getLunarMonth11(yy, timezone);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, timezone);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, timezone);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let lunarLeap = 0;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timezone);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        lunarLeap = 1;
      }
    }
  }
  if (lunarMonth > 12) {
    lunarMonth = lunarMonth - 12;
  }
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }
  return {
    day: lunarDay,
    month: lunarMonth,
    year: lunarYear,
    leap: lunarLeap,
  };
}

/**
 * Convert Vietnamese Lunar date to Solar Gregorian date (GMT+7)
 * Returns [solarDay, solarMonth, solarYear]
 */
export function convertLunar2Solar(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
  lunarLeap = 0,
  timezone = 7,
): [number, number, number] {
  let a11: number;
  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, timezone);
  } else {
    a11 = getLunarMonth11(lunarYear, timezone);
  }
  let b11 = getLunarMonth11(lunarYear, timezone);
  if (lunarMonth >= 11) {
    b11 = getLunarMonth11(lunarYear + 1, timezone);
  }
  const k = Math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = lunarMonth - 11;
  if (off < 0) {
    off += 12;
  }
  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, timezone);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) {
      leapMonth += 12;
    }
    if (lunarLeap !== 0 && lunarMonth !== leapMonth) {
      return [0, 0, 0];
    } else if (lunarLeap !== 0 || off >= leapOff) {
      off += 1;
    }
  }
  const monthStart = getNewMoonDay(k + off, timezone);
  return jdToDate(monthStart + lunarDay - 1);
}

/**
 * Get current Lunar Date for today
 */
export function getTodayLunarDate(referenceDate = new Date()): {
  lunar: LunarDate;
  formatted: string;
} {
  const d = referenceDate.getDate();
  const m = referenceDate.getMonth() + 1;
  const y = referenceDate.getFullYear();
  const lunar = convertSolar2Lunar(d, m, y);
  return {
    lunar,
    formatted: `Ngày ${lunar.day} tháng ${lunar.month} (Âm lịch)`,
  };
}

/**
 * Parse string like "18/08 Âm lịch", "10/3", "15/7 Âm lịch" to { day, month }
 */
export function parseLunarDateString(
  str?: string,
): { day: number; month: number } | null {
  if (!str) return null;
  const match = str.match(/(\d{1,2})[\s\/\-\.]+tháng\s*(\d{1,2})|(\d{1,2})[\/\-](\d{1,2})/i);
  if (match) {
    const day = parseInt(match[1] || match[3], 10);
    const month = parseInt(match[2] || match[4], 10);
    if (day >= 1 && day <= 30 && month >= 1 && month <= 12) {
      return { day, month };
    }
  }
  return null;
}

/**
 * Calculate countdown of days remaining until the next death anniversary
 */
export function calculateAnniversaryCountdown(
  options: {
    lunarDay?: number;
    lunarMonth?: number;
    solarDate?: string;
  },
  referenceDate = new Date(),
): AnniversaryCountdown | null {
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );

  let nextSolarDate: Date | null = null;
  let lunarDay = options.lunarDay;
  let lunarMonth = options.lunarMonth;

  if (lunarDay && lunarMonth) {
    // Lunar date calculations
    const todayLunar = convertSolar2Lunar(
      today.getDate(),
      today.getMonth() + 1,
      today.getFullYear(),
    );

    // Try current lunar year
    const [sDayThisYear, sMonthThisYear, sYearThisYear] = convertLunar2Solar(
      lunarDay,
      lunarMonth,
      todayLunar.year,
    );
    const targetThisYear = new Date(sYearThisYear, sMonthThisYear - 1, sDayThisYear);

    if (targetThisYear >= today) {
      nextSolarDate = targetThisYear;
    } else {
      // Already passed in current lunar year, find in next lunar year
      const [sDayNextYear, sMonthNextYear, sYearNextYear] = convertLunar2Solar(
        lunarDay,
        lunarMonth,
        todayLunar.year + 1,
      );
      nextSolarDate = new Date(sYearNextYear, sMonthNextYear - 1, sDayNextYear);
    }
  } else if (options.solarDate) {
    // Solar date calculations (YYYY-MM-DD or MM-DD)
    const parts = options.solarDate.split('-');
    const m = parseInt(parts.length === 3 ? parts[1] : parts[0], 10);
    const d = parseInt(parts.length === 3 ? parts[2] : parts[1], 10);

    let target = new Date(today.getFullYear(), m - 1, d);
    if (target < today) {
      target = new Date(today.getFullYear() + 1, m - 1, d);
    }
    nextSolarDate = target;

    // Convert solar to lunar
    const converted = convertSolar2Lunar(d, m, target.getFullYear());
    lunarDay = converted.day;
    lunarMonth = converted.month;
  }

  if (!nextSolarDate || !lunarDay || !lunarMonth) {
    return null;
  }

  const diffMs = nextSolarDate.getTime() - today.getTime();
  const daysRemaining = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  const isToday = daysRemaining === 0;
  const isTomorrow = daysRemaining === 1;
  const isWithinWeek = daysRemaining > 1 && daysRemaining <= 7;
  const isWithinMonth = daysRemaining > 7 && daysRemaining <= 30;

  let countdownText: string;
  let statusBadge: string;

  if (isToday) {
    countdownText = 'Hôm nay là ngày giỗ!';
    statusBadge = '🔥 Hôm nay';
  } else if (isTomorrow) {
    countdownText = 'Ngày mai (Còn 1 ngày)';
    statusBadge = '⚡ Ngày mai';
  } else if (isWithinWeek) {
    countdownText = `Còn ${daysRemaining} ngày nữa`;
    statusBadge = `⏳ Còn ${daysRemaining} ngày`;
  } else if (isWithinMonth) {
    countdownText = `Còn ${daysRemaining} ngày nữa`;
    statusBadge = `🗓️ Còn ${daysRemaining} ngày`;
  } else {
    countdownText = `Còn ${daysRemaining} ngày nữa`;
    statusBadge = `Còn ${daysRemaining} ngày`;
  }

  const formattedNextSolar = `${String(nextSolarDate.getDate()).padStart(2, '0')}/${String(
    nextSolarDate.getMonth() + 1,
  ).padStart(2, '0')}/${nextSolarDate.getFullYear()}`;

  return {
    daysRemaining,
    nextSolarDate,
    formattedNextSolar,
    lunarDay,
    lunarMonth,
    formattedLunar: `Ngày ${lunarDay} tháng ${lunarMonth} (Âm lịch)`,
    isToday,
    isTomorrow,
    isWithinWeek,
    isWithinMonth,
    countdownText,
    statusBadge,
  };
}
