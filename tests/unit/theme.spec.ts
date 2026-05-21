/**
 * Unit tests for `src/lib/theme.ts`.
 *
 * The same time/cookie logic is also inlined verbatim into the bootstrap
 * script in `src/components/Layout.astro` to avoid FOUC — if you change
 * the rules here, update that script too.
 */
import { describe, it, expect } from 'vitest';
import {
  themeForHour,
  resolveTheme,
  readThemeCookie,
  DARK_START_HOUR,
  DARK_END_HOUR,
} from '@/lib/theme';

describe('themeForHour', () => {
  it('returns dark from 19:00 through 06:59', () => {
    expect(themeForHour(19)).toBe('dark');
    expect(themeForHour(22)).toBe('dark');
    expect(themeForHour(0)).toBe('dark');
    expect(themeForHour(6)).toBe('dark');
  });

  it('returns light from 07:00 through 18:59', () => {
    expect(themeForHour(7)).toBe('light');
    expect(themeForHour(12)).toBe('light');
    expect(themeForHour(18)).toBe('light');
  });

  it('boundary at DARK_START_HOUR is dark, one hour earlier is light', () => {
    expect(themeForHour(DARK_START_HOUR)).toBe('dark');
    expect(themeForHour(DARK_START_HOUR - 1)).toBe('light');
  });

  it('boundary at DARK_END_HOUR is light, one hour earlier is dark', () => {
    expect(themeForHour(DARK_END_HOUR)).toBe('light');
    expect(themeForHour(DARK_END_HOUR - 1)).toBe('dark');
  });
});

describe('resolveTheme', () => {
  // Noon-ish: well inside the "light" window so a missing cookie picks light.
  const noon = new Date('2026-05-21T12:00:00');
  // Late evening: well inside the "dark" window so a missing cookie picks dark.
  const night = new Date('2026-05-21T22:00:00');

  it('honors an explicit dark cookie regardless of time', () => {
    expect(resolveTheme('dark', noon)).toBe('dark');
    expect(resolveTheme('dark', night)).toBe('dark');
  });

  it('honors an explicit light cookie regardless of time', () => {
    expect(resolveTheme('light', noon)).toBe('light');
    expect(resolveTheme('light', night)).toBe('light');
  });

  it('falls through to time-based default when cookie is absent', () => {
    expect(resolveTheme(null, noon)).toBe('light');
    expect(resolveTheme(null, night)).toBe('dark');
  });

  it('ignores garbage cookie values and uses time instead', () => {
    expect(resolveTheme('blue' as never, noon)).toBe('light');
    expect(resolveTheme('' as never, night)).toBe('dark');
  });
});

describe('readThemeCookie', () => {
  it('extracts dark from a single-cookie string', () => {
    expect(readThemeCookie('lessly_theme=dark')).toBe('dark');
  });

  it('extracts light when it sits between other cookies', () => {
    expect(readThemeCookie('foo=bar; lessly_theme=light; baz=qux')).toBe('light');
  });

  it('returns null when the cookie is absent', () => {
    expect(readThemeCookie('foo=bar; baz=qux')).toBeNull();
  });

  it('returns null when the value is not dark or light', () => {
    expect(readThemeCookie('lessly_theme=blue')).toBeNull();
    expect(readThemeCookie('lessly_theme=')).toBeNull();
  });

  it('does not match a prefix collision (lessly_theme_other=…)', () => {
    expect(readThemeCookie('lessly_theme_other=dark')).toBeNull();
  });
});
