/**
 * Locale and Number Formatting Utilities for Multi-Language Support
 * Supports English (en), Indonesian (id), Spanish (es), and Arabic (ar)
 */

export const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Maps app language codes to standard BCP 47 locale codes
 */
export function getLocaleCode(lang: string = 'id'): string {
  switch (lang) {
    case 'en':
      return 'en-US';
    case 'es':
      return 'es-ES';
    case 'ar':
      return 'ar-EG';
    case 'id':
    default:
      return 'id-ID';
  }
}

/**
 * Converts any Latin/ASCII digits in a string to Eastern Arabic numerals if language is Arabic.
 */
export function toLocalizedDigits(str: string | number, lang: string = 'id'): string {
  const text = String(str);
  if (lang !== 'ar') return text;
  return text.replace(/[0-9]/g, (d) => ARABIC_DIGITS[parseInt(d, 10)]);
}

/**
 * Formats a number according to the target language locale.
 * For Arabic ('ar'), it converts numbers into Eastern Arabic numerals (٠, ١, ٢, ٣, ٤, ٥, ٦, ٧, ٨, ٩).
 */
export function formatNumber(
  value: number | string,
  lang: string = 'id',
  options?: Intl.NumberFormatOptions
): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return lang === 'ar' ? '٠' : '0';

  const locale = getLocaleCode(lang);

  try {
    const formatted = num.toLocaleString(locale, options);
    // Ensure Arabic locale uses Eastern Arabic digits
    if (lang === 'ar') {
      return toLocalizedDigits(formatted, 'ar');
    }
    return formatted;
  } catch {
    const fallback = num.toString();
    return lang === 'ar' ? toLocalizedDigits(fallback, 'ar') : fallback;
  }
}

/**
 * Formats an amount with currency symbol or asset ticker.
 * E.g.:
 * - formatCurrency(1000000, 'IDR', 'id') -> "Rp 1.000.000"
 * - formatCurrency(1000000, 'IDR', 'ar') -> "Rp ١٬٠٠٠٬٠٠٠"
 * - formatCurrency(50.5, 'USDT', 'en') -> "50.5 USDT"
 * - formatCurrency(50.5, 'USDT', 'ar') -> "٥٠٫٥ USDT"
 */
export function formatCurrency(
  amount: number | string,
  symbol: string = 'IDR',
  lang: string = 'id',
  options?: {
    showSign?: boolean;
    isPositive?: boolean;
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  }
): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (isNaN(num)) {
    const zero = lang === 'ar' ? '٠' : '0';
    return symbol === 'IDR' ? `Rp ${zero}` : `${zero} ${symbol}`;
  }

  const isIDR = symbol.toUpperCase() === 'IDR';
  const defaultMaxDecimals = isIDR ? 0 : num < 0.01 && num > 0 ? 6 : 4;
  const maxDecimals = options?.maximumFractionDigits ?? defaultMaxDecimals;
  const minDecimals = options?.minimumFractionDigits ?? 0;

  const numFormatted = formatNumber(num, lang, {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: minDecimals,
  });

  const sign = options?.showSign ? (num > 0 ? '+' : num < 0 ? '-' : '') : '';

  if (isIDR) {
    return `${sign}Rp ${numFormatted}`;
  }
  return `${sign}${numFormatted} ${symbol}`;
}

/**
 * Formats a clean number string stripping unnecessary trailing zeros
 */
export function cleanNumber(
  val: number | string,
  lang: string = 'id',
  maxDecimals: number = 6
): string {
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num) || num === 0) return lang === 'ar' ? '٠' : '0';

  const fixed = num.toFixed(maxDecimals);
  const parsed = parseFloat(fixed);
  return formatNumber(parsed, lang, {
    maximumFractionDigits: maxDecimals,
  });
}

/**
 * Formats dates according to current language
 */
export function formatLocalizedDate(
  date: Date | string,
  lang: string = 'id',
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);

    const locale = getLocaleCode(lang);
    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    };

    const formatted = d.toLocaleDateString(locale, defaultOptions);
    if (lang === 'ar') {
      return toLocalizedDigits(formatted, 'ar');
    }
    return formatted;
  } catch {
    return String(date);
  }
}
