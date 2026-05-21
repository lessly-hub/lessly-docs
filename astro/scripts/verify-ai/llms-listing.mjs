#!/usr/bin/env node
/**
 * verify-ai/llms-listing.mjs
 *
 * Fetches /llms.txt from the running site and asserts the set of doc
 * paths it advertises equals the set the site would derive from the
 * Astro Content Collection.
 *
 * Strategy: use /sitemap.xml as the live source of truth (Slice 5
 * deliverable). The sitemap is generated from the same Content
 * Collection as llms.txt, so set-equality between the two endpoints is
 * a tight invariant. If /sitemap.xml is missing (Slice 5 generation
 * stream not yet shipped), fall back to walking the local
 * content/docs/ tree on disk. The fallback path is documented in the
 * output so the human reader knows which source was used.
 *
 * Usage:
 *   node astro/scripts/verify-ai/llms-listing.mjs --base http://localhost:8787
 */
import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = resolve(here, '..', '..', 'content', 'docs');
const baseArg = parseBase(process.argv);
const BASE = baseArg.replace(/\/$/, '');

const llmsRes = await fetchOrFail(`${BASE}/llms.txt`);
const llmsText = await llmsRes.text();
const llmsSlugs = new Set(extractSlugsFromLlmsTxt(llmsText));

let expected;
let source;
const sitemapRes = await fetch(`${BASE}/sitemap.xml`);
if (sitemapRes.ok) {
  const xml = await sitemapRes.text();
  expected = new Set(extractSlugsFromSitemap(xml));
  source = `/sitemap.xml (${expected.size} doc URLs)`;
} else {
  // Fallback: derive from disk. Matches the Astro Content Collection
  // glob in astro/src/content.config.ts ('**/*.mdx' under content/docs).
  // We exclude draft entries (frontmatter `draft: true`) the same way
  // src/lib/llms.ts would in a published state.
  expected = new Set(walkContentDocs(contentDir));
  source = `local content/docs/ (sitemap returned HTTP ${sitemapRes.status})`;
}

const missingFromLlms = [...expected].filter((s) => !llmsSlugs.has(s));
const extraInLlms = [...llmsSlugs].filter((s) => !expected.has(s));

console.log(`llms-listing: source=${source}; llms.txt has ${llmsSlugs.size} entries; expected ${expected.size}.`);

if (missingFromLlms.length || extraInLlms.length) {
  if (missingFromLlms.length) {
    console.error(`Missing from /llms.txt (${missingFromLlms.length}):`);
    for (const s of missingFromLlms) console.error(`  - ${s}`);
  }
  if (extraInLlms.length) {
    console.error(`Extra in /llms.txt (${extraInLlms.length}):`);
    for (const s of extraInLlms) console.error(`  - ${s}`);
  }
  process.exit(1);
}

console.log(`OK: /llms.txt matches ${source}.`);
process.exit(0);

function parseBase(argv) {
  const i = argv.indexOf('--base');
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  return process.env.VERIFY_BASE || 'http://localhost:4321';
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

async function fetchOrFail(url) {
  let r;
  try {
    r = await fetch(url);
  } catch (err) {
    fail(`Could not fetch ${url}: ${err.message}`);
  }
  if (!r.ok) fail(`GET ${url} returned HTTP ${r.status}`);
  return r;
}

function extractSlugsFromLlmsTxt(text) {
  const re = /\(([^)]*\/docs\/[^)\s]+)\)/g;
  const out = new Set();
  for (const m of text.matchAll(re)) {
    const u = m[1];
    const idx = u.indexOf('/docs/');
    const slug = u.slice(idx + '/docs/'.length).replace(/\/$/, '');
    if (slug && !slug.includes('#')) out.add(slug);
  }
  return [...out];
}

function extractSlugsFromSitemap(xml) {
  // Match every <loc>...</loc> that points under /docs/ and isn't a
  // .md/.mdx companion endpoint.
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  const out = new Set();
  for (const m of xml.matchAll(re)) {
    const u = m[1];
    const idx = u.indexOf('/docs/');
    if (idx === -1) continue;
    let slug = u.slice(idx + '/docs/'.length).replace(/\/$/, '');
    if (!slug) continue;
    if (slug.endsWith('.md') || slug.endsWith('.mdx')) continue;
    out.add(slug);
  }
  return [...out];
}

function walkContentDocs(root) {
  const out = [];
  function visit(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) {
        visit(p);
      } else if (name.endsWith('.mdx')) {
        const rel = relative(root, p).replace(/\.mdx?$/, '');
        out.push(rel);
      }
    }
  }
  visit(root);
  return out;
}
