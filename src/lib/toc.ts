/**
 * Table-of-contents helper.
 *
 * Astro's content `render()` already returns `{ headings }` — an array of
 * `MarkdownHeading` objects with `depth`, `slug`, and `text`. We project that
 * into our own narrow shape (h2/h3 only, in document order) so the TOC
 * component never has to know about depths it does not render.
 */
import type { MarkdownHeading } from 'astro';

export type TocLevel = 2 | 3;

export interface TocHeading {
  id: string;
  text: string;
  level: TocLevel;
}

/**
 * Filter raw Astro headings down to h2 + h3 in order.
 * Use the return of `await entry.render()` (S1) or `await render(entry)` (S3+) as input.
 */
export function buildToc(headings: MarkdownHeading[]): TocHeading[] {
  const out: TocHeading[] = [];
  for (const h of headings) {
    if (h.depth === 2 || h.depth === 3) {
      out.push({ id: h.slug, text: h.text, level: h.depth as TocLevel });
    }
  }
  return out;
}

/** True if the TOC rail should render (>= 2 h2 headings, per design spec §Layout). */
export function shouldRenderToc(headings: TocHeading[]): boolean {
  return headings.filter((h) => h.level === 2).length >= 2;
}
