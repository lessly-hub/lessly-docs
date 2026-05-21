/**
 * Unit tests for `src/lib/nav.ts` — covers the pure `orderGroupFilenames`
 * helper extracted in Slice 6. The end-to-end `getNav()` is exercised by the
 * Astro build + Playwright e2e suite (sidebar rendering).
 */
import { describe, it, expect } from 'vitest';
import { orderGroupFilenames } from '@/lib/nav';

describe('orderGroupFilenames', () => {
  describe('with _order.json', () => {
    it('throws naming the missing file when _order.json is empty but files exist', () => {
      // Empty _order.json: every present file is "missing from the order".
      // We assert the first reported filename appears in the error message.
      expect(() => orderGroupFilenames('get-started', ['install'], [])).toThrowError(
        /content\/docs\/get-started\/install\.mdx exists but is missing from content\/docs\/get-started\/_order\.json/,
      );
    });

    it('throws naming the offending entry when _order.json references a missing file', () => {
      expect(() =>
        orderGroupFilenames('reference', ['index', 'tools'], ['index', 'tools', 'ghost']),
      ).toThrowError(
        /_order\.json in "reference" references "ghost" but content\/docs\/reference\/ghost\.mdx does not exist/,
      );
    });

    it('returns the explicit order when the configuration is valid', () => {
      const out = orderGroupFilenames(
        'get-started',
        ['install', 'first-deploy', 'next-steps'],
        ['install', 'first-deploy', 'next-steps'],
      );
      expect(out).toEqual(['install', 'first-deploy', 'next-steps']);
    });
  });

  describe('without _order.json (alphabetical fallback)', () => {
    it('sorts filenames alphabetically', () => {
      const out = orderGroupFilenames('guides', ['c', 'a', 'b'], null);
      expect(out).toEqual(['a', 'b', 'c']);
    });

    it('pins `index` first regardless of alphabetical position', () => {
      const out = orderGroupFilenames(
        'get-started',
        ['first-deploy', 'next-steps', 'install', 'index'],
        null,
      );
      expect(out[0]).toBe('index');
      // Remaining items keep alphabetical order.
      expect(out.slice(1)).toEqual(['first-deploy', 'install', 'next-steps']);
    });
  });
});
