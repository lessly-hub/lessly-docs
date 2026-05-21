#!/usr/bin/env node
/**
 * Build-time link-integrity check (Slice 6).
 *
 * Walks `dist/client/`:
 *   1. For every HTML file, collect each `<a href="/...">` (internal links
 *      only — external + protocol-relative + mailto + tel + anchor-only links
 *      are skipped). Verify the target resolves to a file under `dist/client/`.
 *   2. For every `*.md` file (and `llms.txt` / `llms-full.txt`), scan for
 *      markdown links `[text](/path)` with the same rules.
 *
 * A link target resolves if any of these exist:
 *   - `dist/client/<path>`                       (literal file, e.g. `/llms.txt`)
 *   - `dist/client/<path>.html`                  (file-style HTML, rare in Astro)
 *   - `dist/client/<path>/index.html`            (directory route, the Astro default)
 *
 * Anchors (`#x`) on the same path are stripped before resolution. Query
 * strings (`?q=`) are stripped too.
 *
 * Exit non-zero on any broken link. Output groups broken links by source page.
 *
 * Usage:
 *   node scripts/check-links.mjs
 *   pnpm check:links
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(here, '..', 'dist', 'client');

if (!existsSync(DIST)) {
  console.error(`check-links: ${DIST} does not exist. Run \`pnpm build\` first.`);
  process.exit(2);
}

/** Recursively list files under `dir`. */
async function listFiles(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await listFiles(full)));
    } else if (e.isFile()) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Resolve an internal href against the dist tree. Returns true if it points
 * to an existing file or directory route.
 */
function resolveInternalHref(href) {
  // Strip query + fragment.
  const clean = href.split('#')[0].split('?')[0];
  if (!clean || clean === '/') {
    // Root → index.html.
    return existsSync(join(DIST, 'index.html'));
  }
  // Strip leading slash, decode percent-encoding.
  const rel = decodeURIComponent(clean.replace(/^\/+/, ''));
  const direct = join(DIST, rel);
  if (existsSync(direct)) {
    // Either a real file or a directory; if a directory, require index.html.
    try {
      const st = statSync(direct);
      if (st.isFile()) return true;
      if (st.isDirectory()) return existsSync(join(direct, 'index.html'));
    } catch {
      /* fall through */
    }
  }
  if (existsSync(`${direct}.html`)) return true;
  if (existsSync(join(direct, 'index.html'))) return true;
  return false;
}

/** Decide whether an href should be checked at all. */
function isInternalHref(href) {
  if (!href) return false;
  if (href.startsWith('#')) return false; // anchor-only on same page
  if (href.startsWith('mailto:') || href.startsWith('tel:')) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return false; // any scheme (http, https, ...)
  if (href.startsWith('//')) return false; // protocol-relative
  if (!href.startsWith('/')) return false; // ignore relative — Astro pages emit absolute
  return true;
}

/** Extract every <a href="..."> from an HTML string. */
function extractHtmlHrefs(html) {
  const out = [];
  const re = /<a\b[^>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push(m[1] ?? m[2] ?? m[3]);
  }
  return out;
}

/** Extract every [text](url) markdown link from a markdown string. */
function extractMarkdownHrefs(md) {
  const out = [];
  // Match (foo) but skip image refs which start with `!`. Avoid matching
  // inside fenced code blocks by stripping them first.
  const stripped = md.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
  const re = /(?<!!)\[[^\]]*\]\(([^)\s]+)\)/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    out.push(m[1]);
  }
  return out;
}

const files = await listFiles(DIST);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const mdFiles = files.filter(
  (f) =>
    f.endsWith('.md') ||
    f.endsWith('.mdx') ||
    f.endsWith('/llms.txt') ||
    f.endsWith('/llms-full.txt'),
);

let brokenCount = 0;
const broken = new Map(); // source → [{ href, kind }]

function record(source, href, kind) {
  brokenCount += 1;
  const key = relative(DIST, source);
  if (!broken.has(key)) broken.set(key, []);
  broken.get(key).push({ href, kind });
}

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  for (const href of extractHtmlHrefs(html)) {
    if (!isInternalHref(href)) continue;
    if (!resolveInternalHref(href)) record(file, href, 'html');
  }
}

for (const file of mdFiles) {
  const md = await readFile(file, 'utf8');
  for (const href of extractMarkdownHrefs(md)) {
    if (!isInternalHref(href)) continue;
    if (!resolveInternalHref(href)) record(file, href, 'md');
  }
}

if (brokenCount === 0) {
  console.log(
    `check-links: OK — ${htmlFiles.length} HTML + ${mdFiles.length} markdown file(s) scanned, no broken internal links.`,
  );
  process.exit(0);
}

console.error(`check-links: FAIL — ${brokenCount} broken internal link(s):\n`);
for (const [source, refs] of broken) {
  console.error(`  ${source}`);
  for (const { href, kind } of refs) {
    console.error(`    └─ [${kind}] ${href}`);
  }
}
process.exit(1);
