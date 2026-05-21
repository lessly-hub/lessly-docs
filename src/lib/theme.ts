/**
 * Theme selection rules shared by the inline head bootstrap and the
 * client-side toggle. Keep this file dependency-free — it is mirrored
 * verbatim into a `<script is:inline>` block, so anything imported here
 * would not be available at bootstrap time.
 */

export type Theme = 'dark' | 'light';

export const THEME_COOKIE = 'lessly_theme';
export const THEME_COOKIE_MAX_AGE = 31_536_000; // 1 year, in seconds

/** Local hour at which the time-based default flips to dark (inclusive). */
export const DARK_START_HOUR = 19;
/** Local hour at which the time-based default flips back to light (inclusive). */
export const DARK_END_HOUR = 7;

/**
 * Time-based default: dark from 19:00 through 06:59 local time, light otherwise.
 * Used only when no explicit cookie preference is present.
 */
export function themeForHour(hour: number): Theme {
  return hour >= DARK_START_HOUR || hour < DARK_END_HOUR ? 'dark' : 'light';
}

/** Resolve the effective theme given an optional cookie value and a Date. */
export function resolveTheme(cookieValue: string | null, now: Date): Theme {
  if (cookieValue === 'dark' || cookieValue === 'light') return cookieValue;
  return themeForHour(now.getHours());
}

/** Parse a `lessly_theme` value out of a raw `document.cookie` string. */
export function readThemeCookie(rawCookieHeader: string): Theme | null {
  const match = rawCookieHeader.match(/(?:^|;\s*)lessly_theme=(dark|light)(?:;|$)/);
  return match ? (match[1] as Theme) : null;
}
