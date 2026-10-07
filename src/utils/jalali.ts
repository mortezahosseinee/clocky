/**
 * Jalali (Solar Hijri) Date Conversion & Formatting utilities.
 * Robust, lightweight, and zero external dependencies.
 */

// Persian Month Names
export const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند'
];

export const ENGLISH_MONTH_EQUIVALENTS = [
  'Farvardin', 'Ordibehesht', 'Khordad',
  'Tir', 'Mordad', 'Shahrivar',
  'Mehr', 'Aban', 'Azar',
  'Dey', 'Bahman', 'Esfand'
];

export const PERSIAN_WEEKDAYS = [
  'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'
];

/**
 * Converts Gregorian date to Jalali (Solar Hijri) date
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  jy += Math.floor((days - 1) / 365);
  if (days > 0) days = (days - 1) % 365;
  const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return [jy, jm, jd];
}

/**
 * Converts Jalali date to Gregorian date
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy = (jy <= 979) ? 621 : 1600;
  jy -= (jy <= 979) ? 0 : 979;
  let days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4) +
    78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  gy += Math.floor((days - 1) / 365);
  if (days > 0) days = (days - 1) % 365;
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    const v = sal_a[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return [gy, gm, gd];
}

/**
 * Formats a Date instance as Jalali string: "1403/07/15"
 */
export function getTodayJalali(): string {
  const now = new Date();
  const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

export function getCurrentJalaliParts(): { year: number; month: number; day: number; monthName: string } {
  const now = new Date();
  const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return {
    year: jy,
    month: jm,
    day: jd,
    monthName: PERSIAN_MONTHS[jm - 1]
  };
}

export function formatJalaliDisplay(jalaliDateStr: string, isPersian = true): string {
  if (!jalaliDateStr) return '';
  const parts = jalaliDateStr.split('/').map(p => parseInt(p, 10));
  if (parts.length !== 3) return jalaliDateStr;
  const [y, m, d] = parts;
  if (isPersian) {
    const monthName = PERSIAN_MONTHS[m - 1] || '';
    return `${d} ${monthName} ${y}`;
  } else {
    const monthName = ENGLISH_MONTH_EQUIVALENTS[m - 1] || '';
    return `${d} ${monthName} ${y}`;
  }
}

/**
 * Calculate minutes between two Jalali date-times with minute precision
 */
export function calculateFullDurationMinutes(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string
): number {
  if (!startDate || !startTime || !endDate || !endTime) return 0;

  const [sy, sm, sd] = startDate.split('/').map(Number);
  const [ey, em, ed] = endDate.split('/').map(Number);
  const [sh, smin] = startTime.split(':').map(Number);
  const [eh, emin] = endTime.split(':').map(Number);

  const [gStartYear, gStartMonth, gStartDay] = jalaliToGregorian(sy, sm, sd);
  const [gEndYear, gEndMonth, gEndDay] = jalaliToGregorian(ey, em, ed);

  const dtStart = new Date(gStartYear, gStartMonth - 1, gStartDay, sh || 0, smin || 0);
  const dtEnd = new Date(gEndYear, gEndMonth - 1, gEndDay, eh || 0, emin || 0);

  const diffMs = dtEnd.getTime() - dtStart.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  return diffMinutes > 0 ? diffMinutes : 0;
}

/**
 * Calculate minutes between two times in HH:mm format (same day legacy helper)
 */
export function calculateDurationMinutes(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startTotal = sh * 60 + sm;
  const endTotal = eh * 60 + em;
  const diff = endTotal - startTotal;
  return diff > 0 ? diff : 0;
}

/**
 * Format minutes into readable Persian/English string, e.g. "۲ ساعت و ۱۵ دقیقه" or "2h 15m"
 */
export function formatMinutes(minutes: number, isPersian = true): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (isPersian) {
    if (h === 0) return `${m} دقیقه`;
    if (m === 0) return `${h} ساعت`;
    return `${h} ساعت و ${m} دقیقه`;
  } else {
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }
}

/**
 * Get days in a specific Jalali month
 */
export function getDaysInJalaliMonth(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  // Esfand check for leap year
  const isLeap = isJalaliLeapYear(year);
  return isLeap ? 30 : 29;
}

export function isJalaliLeapYear(jy: number): boolean {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  let jp = breaks[0];
  let jm = 0;
  let jump = 0;
  let leap = -14;
  if (jy < jp || jy >= breaks[breaks.length - 1]) return false;
  for (let i = 1; i < breaks.length; i++) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leap += Math.floor(jump / 33) * 8 + Math.floor((jump % 33) / 4);
    jp = jm;
  }
  let n = jy - jp;
  leap += Math.floor(n / 33) * 8 + Math.floor(((n % 33) + 3) / 4);
  if ((jump % 33) === 4 && jump - n === 4) leap++;
  const r = (leap + 33) % 33;
  return r === 1 || r === 5 || r === 9 || r === 13 || r === 17 || r === 22 || r === 26 || r === 30;
}

/**
 * Quick date ranges generator
 */
export function getPredefinedDateRanges(currentJalali: { year: number; month: number }) {
  const { year, month } = currentJalali;
  
  // Current Month
  const currentMonthDays = getDaysInJalaliMonth(year, month);
  const currentMonth = {
    key: 'current_month',
    titleFa: `گزارش ${PERSIAN_MONTHS[month - 1]} ماه`,
    titleEn: `${ENGLISH_MONTH_EQUIVALENTS[month - 1]} Report`,
    startDate: `${year}/${String(month).padStart(2, '0')}/01`,
    endDate: `${year}/${String(month).padStart(2, '0')}/${String(currentMonthDays).padStart(2, '0')}`,
  };

  // Specific Named Months of Current Year for easy shortcuts
  const monthShortcuts = PERSIAN_MONTHS.map((name, idx) => {
    const m = idx + 1;
    const days = getDaysInJalaliMonth(year, m);
    return {
      key: `month_${m}`,
      titleFa: `گزارش ${name} ماه`,
      titleEn: `${ENGLISH_MONTH_EQUIVALENTS[idx]} Report`,
      startDate: `${year}/${String(m).padStart(2, '0')}/01`,
      endDate: `${year}/${String(m).padStart(2, '0')}/${String(days).padStart(2, '0')}`,
    };
  });

  // Current Year
  const currentYear = {
    key: 'current_year',
    titleFa: `گزارش سال جاری (${year})`,
    titleEn: `Current Year (${year})`,
    startDate: `${year}/01/01`,
    endDate: `${year}/12/${getDaysInJalaliMonth(year, 12)}`,
  };

  // Quarter 1: Farvardin to Khordad
  const q1 = {
    key: 'quarter_1',
    titleFa: 'گزارش ۳ ماهه اول',
    titleEn: '1st Quarter Report',
    startDate: `${year}/01/01`,
    endDate: `${year}/03/31`,
  };

  // Quarter 2: Tir to Shahrivar
  const q2 = {
    key: 'quarter_2',
    titleFa: 'گزارش ۳ ماهه دوم',
    titleEn: '2nd Quarter Report',
    startDate: `${year}/04/01`,
    endDate: `${year}/06/31`,
  };

  // Quarter 3: Mehr to Azar
  const q3 = {
    key: 'quarter_3',
    titleFa: 'گزارش ۳ ماهه سوم',
    titleEn: '3rd Quarter Report',
    startDate: `${year}/07/01`,
    endDate: `${year}/09/30`,
  };

  // Quarter 4: Dey to Esfand
  const q4 = {
    key: 'quarter_4',
    titleFa: 'گزارش ۳ ماهه چهارم',
    titleEn: '4th Quarter Report',
    startDate: `${year}/10/01`,
    endDate: `${year}/12/${getDaysInJalaliMonth(year, 12)}`,
  };

  return {
    currentMonth,
    monthShortcuts,
    currentYear,
    quarters: [q1, q2, q3, q4]
  };
}
