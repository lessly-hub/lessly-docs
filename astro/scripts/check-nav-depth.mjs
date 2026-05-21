#!/usr/bin/env node
/**
 * Nav-depth lint for the Astro rewrite (Slice 6).
 *
 * Spec rule (§Architecture): no MDX file may live more than 3 directories
 * deep under `astro/content/docs/`. `astro/content/docs/A/B/C.mdx` is OK
 * (depth 3), `astro/content/docs/A/B/C/D.mdx` is not (depth 4).
 *
 * Underscore-prefixed directories (`_fixtures/`, `_drafts/`) are excluded
 * because they don't ship to readers.
 *
 * Exit non-zero on any violation. Output names every offender so contributors
 * can fix the tree in one pass.
 */
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(here, '..', 'content', 'docs');
const MAX_DEPTH = 3;

if (!existsSync(ROOT)) {
  console.log(`check-nav-depth: ${ROOT} does not exist; nothing to check.`);
  process.exit(0);
}

const violations = [];

async function walk(dir, depth) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('_') && e.isDirectory()) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      await walk(full, depth + 1);
    } else if (e.name.endsWith('.mdx') || e.name.endsWith('.md')) {
      if (depth > MAX_DEPTH) {
        violations.push({ depth, file: relative(ROOT, full) });
      }
    }
  }
}

await walk(ROOT, 0);

if (violations.length === 0) {
  console.log(`check-nav-depth: OK — every page within depth ${MAX_DEPTH}.`);
  process.exit(0);
}

console.error(`check-nav-depth: FAIL — ${violations.length} page(s) exceed depth ${MAX_DEPTH}:\n`);
for (const v of violations) {
  console.error(`  depth ${v.depth}: content/docs/${v.file}`);
}
process.exit(1);
