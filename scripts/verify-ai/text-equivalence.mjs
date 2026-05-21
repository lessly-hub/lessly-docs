#!/usr/bin/env node
/**
 * verify-ai/text-equivalence.mjs
 *
 * For every published docs page, fetch both /docs/<slug> (HTML) and
 * /docs/<slug>.md (plain markdown) from the running site. Assert that
 * the markdown's textual content overlaps significantly with the HTML's
 * rendered textContent.
 *
 * Test implemented:
 *   Bigram overlap. Both strings are normalized (lowercase, whitespace
 *   collapsed, punctuation stripped to spaces), split into word bigrams,
 *   and we compute |MD ∩ HTML| / |MD| — that is, what fraction of the
 *   markdown's bigrams appear in the HTML. Threshold ≥ 0.80.
 *
 *   Why this test (not strict substring): the HTML wraps the same prose
 *   in chrome (header, sidebar, TOC, footer) AND the MDX renderer
 *   restructures certain components (Tabs flatten the tab labels into
 *   the text stream, OpenInClaude renders nothing readable, CodeBlock
 *   may stretch tokens with extra whitespace). A bigram-overlap test
 *   tolerates these structural transforms while still failing on real
 *   content drift.
 *
 *   The HTML side is also stripped of <script>, <style>, <noscript>,
 *   the <nav>/<aside> chrome, and tag content using a tolerant regex —
 *   that's good enough because the test is asymmetric (markdown ⊆ HTML).
 *
 * Pages tested: every entry served in /llms.txt. The script does not
 * import the content collection at runtime; it derives the list from
 * /llms.txt so it can run against any deploy (preview, local, prod).
 *
 * Usage:
 *   node scripts/verify-ai/text-equivalence.mjs --base http://localhost:8787
 *
 * Per-page failures are aggregated; the script exits non-zero if any
 * page falls below threshold, OR if the markdown endpoint is missing
 * (404) — that is a real Slice 5 deliverable that must land.
 */
const baseArg = parseBase(process.argv);
const BASE = baseArg.replace(/\/$/, '');
const THRESHOLD = 0.8;

const llmsRes = await fetchOrFail(`${BASE}/llms.txt`);
const llmsText = await llmsRes.text();
const slugs = extractSlugsFromLlmsTxt(llmsText);
if (slugs.length === 0) fail(`No /docs/<slug> entries found in /llms.txt`);

let pass = 0;
let fail404 = 0;
let failOverlap = 0;
const failures = [];

for (const slug of slugs) {
  const htmlUrl = `${BASE}/docs/${slug}`;
  const mdUrl = `${BASE}/docs/${slug}.md`;

  const htmlRes = await fetch(htmlUrl);
  if (!htmlRes.ok) {
    failures.push(`  [${slug}] HTML missing: HTTP ${htmlRes.status} at ${htmlUrl}`);
    fail404++;
    continue;
  }
  const html = await htmlRes.text();

  const mdRes = await fetch(mdUrl);
  if (!mdRes.ok) {
    failures.push(`  [${slug}] .md missing: HTTP ${mdRes.status} at ${mdUrl}`);
    fail404++;
    continue;
  }
  const md = await mdRes.text();

  const htmlText = normalize(stripHtml(html));
  const mdText = normalize(stripMarkdown(md));

  const overlap = bigramOverlap(mdText, htmlText);
  if (overlap < THRESHOLD) {
    failures.push(
      `  [${slug}] bigram overlap ${overlap.toFixed(3)} < ${THRESHOLD} (md bigrams=${countBigrams(mdText)}, html bigrams=${countBigrams(htmlText)})`,
    );
    failOverlap++;
  } else {
    pass++;
  }
}

console.log(`text-equivalence: ${pass}/${slugs.length} pages PASS (threshold bigram overlap ≥ ${THRESHOLD}).`);
if (failures.length) {
  console.error('Failures:');
  for (const f of failures) console.error(f);
  console.error(`Summary: ${fail404} 404s, ${failOverlap} below threshold.`);
  process.exit(1);
}
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
  // Lines look like "- [Title](https://docs.lessly.com/docs/<slug>): desc"
  // or "- [Title](/docs/<slug>): desc" for absolute-path variants.
  const re = /\(([^)]*\/docs\/[^)\s]+)\)/g;
  const out = new Set();
  for (const m of text.matchAll(re)) {
    const u = m[1];
    const idx = u.indexOf('/docs/');
    const path = u.slice(idx + '/docs/'.length).replace(/\/$/, '');
    if (path && !path.includes('#')) out.add(path);
  }
  return [...out];
}

function stripHtml(html) {
  return html
    // Strip HTML comments FIRST. Otherwise a comment containing literal
    // <script>/<style>/<aside>/<header> text (in prose, code samples, or
    // dev comments) will trick the tag-region regexes below into eating
    // page content up to the next matching close tag.
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // Drop the entire <head>; <body> chrome we keep then strip — see below.
    .replace(/<head\b[\s\S]*?<\/head>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    // Sidebar / TOC / nav chrome. The asymmetric test (md ⊆ html) does not
    // require us to strip them, but doing so produces cleaner failure
    // diagnostics if a real mismatch shows up.
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<aside\b[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<header\b[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, ' ')
    // Tag strip.
    .replace(/<[^>]+>/g, ' ')
    // HTML entity decode for the common ones we care about.
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripMarkdown(md) {
  return md
    // Frontmatter block (--- ... ---)
    .replace(/^---[\s\S]*?---\s*/m, ' ')
    // Fenced code blocks: keep contents (HTML page renders them too).
    .replace(/```[a-z0-9]*\n?/gi, ' ')
    .replace(/```/g, ' ')
    // Inline code backticks.
    .replace(/`+/g, ' ')
    // MDX/JSX components: keep child text, drop tags.
    .replace(/<[^>]+>/g, ' ')
    // Markdown link [text](url) → text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Heading hashes, blockquote markers, list bullets, emphasis.
    .replace(/^[ \t]*[#>\-*+][ \t]+/gm, ' ')
    .replace(/[*_~]/g, ' ');
}

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bigrams(text) {
  const words = text.split(' ').filter(Boolean);
  if (words.length < 2) return new Set(words);
  const out = new Set();
  for (let i = 0; i < words.length - 1; i++) {
    out.add(words[i] + ' ' + words[i + 1]);
  }
  return out;
}

function countBigrams(text) {
  return bigrams(text).size;
}

function bigramOverlap(needle, haystack) {
  const a = bigrams(needle);
  if (a.size === 0) return 1;
  const b = bigrams(haystack);
  let hit = 0;
  for (const bg of a) if (b.has(bg)) hit++;
  return hit / a.size;
}
