/**
 * llms.txt generator.
 *
 * S1: builds the index from the docs content collection.
 * Future slices add /llms-full.txt and per-page .md/.mdx endpoints.
 */
import type { CollectionEntry } from 'astro:content';

const SITE = 'https://docs.lessly.com';

export function renderLlmsTxt(entries: CollectionEntry<'docs'>[]): string {
  const lines: string[] = ['# Lessly Docs', '', '> Documentation for Lessly — install, deploy, and run apps via the Lessly MCP.', ''];

  for (const entry of entries) {
    const slug = entry.id.replace(/\.mdx?$/, '');
    const url = `${SITE}/docs/${slug}`;
    lines.push(`- [${entry.data.title}](${url}): ${entry.data.description}`);
  }

  lines.push('');
  return lines.join('\n');
}
