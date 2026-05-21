/**
 * Unit tests for `src/lib/toc.ts`.
 */
import { describe, it, expect } from 'vitest';
import { buildToc, shouldRenderToc, type TocHeading } from '@/lib/toc';
import type { MarkdownHeading } from 'astro';

const h = (depth: number, text: string, slug?: string): MarkdownHeading => ({
  depth,
  text,
  slug: slug ?? text.toLowerCase().replace(/\s+/g, '-'),
});

describe('buildToc', () => {
  it('filters to h2/h3 only — h1, h4, h5, h6 are dropped', () => {
    const out = buildToc([
      h(1, 'Page title'),
      h(2, 'Section one'),
      h(3, 'Subsection'),
      h(4, 'Too deep'),
      h(5, 'Way too deep'),
      h(6, 'Forget it'),
      h(2, 'Section two'),
    ]);
    expect(out.map((x) => x.text)).toEqual(['Section one', 'Subsection', 'Section two']);
  });

  it('preserves document order', () => {
    const out = buildToc([
      h(2, 'Zeta'),
      h(2, 'Alpha'),
      h(3, 'Middle'),
      h(2, 'Mu'),
    ]);
    expect(out.map((x) => x.text)).toEqual(['Zeta', 'Alpha', 'Middle', 'Mu']);
  });

  it('projects depth onto the narrow TocLevel type', () => {
    const out = buildToc([h(2, 'A'), h(3, 'B')]);
    expect(out[0].level).toBe(2);
    expect(out[1].level).toBe(3);
  });
});

describe('shouldRenderToc', () => {
  const make = (...levels: (2 | 3)[]): TocHeading[] =>
    levels.map((level, i) => ({ id: `h${i}`, text: `Heading ${i}`, level }));

  it('returns false when fewer than 2 h2 headings are present', () => {
    expect(shouldRenderToc([])).toBe(false);
    expect(shouldRenderToc(make(2))).toBe(false);
    // Only h3s present.
    expect(shouldRenderToc(make(3, 3, 3))).toBe(false);
    // One h2 plus h3s still under threshold.
    expect(shouldRenderToc(make(2, 3, 3))).toBe(false);
  });

  it('returns true when 2 or more h2 headings are present', () => {
    expect(shouldRenderToc(make(2, 2))).toBe(true);
    expect(shouldRenderToc(make(2, 3, 2, 3))).toBe(true);
  });
});
