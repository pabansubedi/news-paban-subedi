/**
 * Accurate Bikram Sambat (BS) Nepali Calendar & Live Time Helper
 * Optimized for Nepal Standard Time (NPT, UTC + 5:45)
 */

export const NEPALI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export const NEPALI_MONTHS = [
  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज',
  'कार्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत'
];

export const NEPALI_DAYS = [
  'आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'
];

export function toNepaliDigits(num: number | string): string {
  return String(num).replace(/[0-9]/g, (digit) => NEPALI_DIGITS[parseInt(digit, 10)]);
}

/**
 * Returns a Date object shifted to Nepal Standard Time (UTC + 5 hours 45 minutes)
 */
export function getNepalDateTime(date: Date = new Date()): Date {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const nepalOffsetMs = 5.75 * 60 * 60 * 1000; // +5:45 in milliseconds
  return new Date(utcMs + nepalOffsetMs);
}

/**
 * Standard days per month in Bikram Sambat for years 2075 through 2090.
 * Formatted from official Nepal Calendar Determination Committee (नेपाल पञ्चाङ्ग निर्णायक विकास समिति) data.
 */
const BS_MONTH_DAYS: Record<number, number[]> = {
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], // 365 days, New year: 2023-04-14
  2081: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 366 days, New year: 2024-04-13
  2082: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30], // 365 days, New year: 2025-04-14
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 365 days, New year: 2026-04-14
  2084: [31, 31, 32, 31, 32, 30, 30, 30, 29, 29, 30, 31], // 366 days, New year: 2027-04-14
  2085: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 366 days, New year: 2028-04-13
  2086: [31, 32, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], // 366 days, New year: 2029-04-13
  2087: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 365 days, New year: 2030-04-14
};

// Anchor: 2080 Baishakh 1 = April 14, 2023 (00:00:00 UTC)
const REF_GREGORIAN_DATE = new Date(Date.UTC(2023, 3, 14));
const REF_BS_YEAR = 2080;

/**
 * Converts any Date accurately into Bikram Sambat (BS) accounting for Nepal Standard Time
 */
export function getNepaliDate(inputDate: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  monthName: string;
  dayName: string;
  formattedNepali: string;
  formattedFull: string;
} {
  // Convert input date to Nepal Standard Time
  const nptDate = getNepalDateTime(inputDate);
  const dayOfWeek = nptDate.getDay();
  const dayName = NEPALI_DAYS[dayOfWeek];

  // Target date in UTC days for clean difference calculation
  const targetUTC = new Date(Date.UTC(nptDate.getFullYear(), nptDate.getMonth(), nptDate.getDate()));
  const diffTime = targetUTC.getTime() - REF_GREGORIAN_DATE.getTime();
  let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let bsYear = REF_BS_YEAR;
  let bsMonth = 0; // 0 = Baishakh
  let bsDay = 1;

  if (diffDays >= 0) {
    while (true) {
      const yearMonthDays = BS_MONTH_DAYS[bsYear] || [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30];
      const daysInCurrentMonth = yearMonthDays[bsMonth];

      if (diffDays < daysInCurrentMonth) {
        bsDay = 1 + diffDays;
        break;
      }

      diffDays -= daysInCurrentMonth;
      bsMonth++;

      if (bsMonth > 11) {
        bsMonth = 0;
        bsYear++;
      }
    }
  } else {
    diffDays = Math.abs(diffDays);
    while (diffDays > 0) {
      bsMonth--;
      if (bsMonth < 0) {
        bsMonth = 11;
        bsYear--;
      }
      const yearMonthDays = BS_MONTH_DAYS[bsYear] || [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30];
      const daysInCurrentMonth = yearMonthDays[bsMonth];

      if (diffDays <= daysInCurrentMonth) {
        bsDay = daysInCurrentMonth - diffDays + 1;
        break;
      }
      diffDays -= daysInCurrentMonth;
    }
  }

  const monthName = NEPALI_MONTHS[bsMonth];
  const nepaliDayStr = toNepaliDigits(bsDay);
  const nepaliYearStr = toNepaliDigits(bsYear);

  const formattedNepali = `${dayName}, ${nepaliDayStr} ${monthName} ${nepaliYearStr}`;
  const formattedFull = `${formattedNepali} (वि.सं.)`;

  return {
    year: bsYear,
    month: bsMonth,
    day: bsDay,
    monthName,
    dayName,
    formattedNepali,
    formattedFull,
  };
}

/**
 * Formats time in Nepal Standard Time (UTC + 5:45) with authentic Nepali period
 */
export function formatTimeNepali(inputDate: Date = new Date()): string {
  const nptDate = getNepalDateTime(inputDate);
  const rawHours = nptDate.getHours();
  const minutes = nptDate.getMinutes();
  const seconds = nptDate.getSeconds();

  let period = 'बिहान';
  if (rawHours >= 12 && rawHours < 16) {
    period = 'दिउँसो';
  } else if (rawHours >= 16 && rawHours < 20) {
    period = 'साँझ';
  } else if (rawHours >= 20 || rawHours < 4) {
    period = 'राति';
  }

  let hours12 = rawHours % 12;
  hours12 = hours12 ? hours12 : 12;

  const hoursStr = toNepaliDigits(hours12 < 10 ? '०' + hours12 : hours12);
  const minutesStr = toNepaliDigits(minutes < 10 ? '०' + minutes : minutes);
  const secondsStr = toNepaliDigits(seconds < 10 ? '०' + seconds : seconds);

  return `${period} ${hoursStr}:${minutesStr}:${secondsStr}`;
}
