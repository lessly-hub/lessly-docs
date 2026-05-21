#!/usr/bin/env node
/**
 * generate-og.mjs
 *
 * Renders one OG PNG per published doc into `dist/client/og/<slug>.png`.
 * Runs as a post-build step because the Cloudflare adapter's prerender
 * happens inside Miniflare — native modules (`@resvg/resvg-js`, satori
 * binaries) can't load there. Doing this in Node post-build keeps the OG
 * surface fully baked at build time while staying compatible with the
 * Worker-bound Astro entrypoint.
 *
 * Idempotent: rebuilds every PNG every run (cheap at the current page
 * count). When the corpus grows past ~50 pages, add content-hash caching
 * keyed on `title|description|slug`.
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const here = dirname(fileURLToPath(import.meta.url));
const astroDir = resolve(here, '..');
const contentDir = join(astroDir, 'content', 'docs');
const fontsDir = join(astroDir, 'node_modules', '@fontsource', 'inter', 'files');
const outDir = join(astroDir, 'dist', 'client', 'og');

const BG = '#191b24';
const TEXT_PRIMARY = '#eeeff0';
const TEXT_SECONDARY = '#a5a9b5';
const BRAND = '#165ff2';

const fonts = [
  {
    name: 'Inter',
    data: readFileSync(join(fontsDir, 'inter-latin-400-normal.woff')),
    weight: 400,
    style: 'normal',
  },
  {
    name: 'Inter',
    data: readFileSync(join(fontsDir, 'inter-latin-700-normal.woff')),
    weight: 700,
    style: 'normal',
  },
];

const docs = collectPublishedDocs(contentDir);
mkdirSync(outDir, { recursive: true });

const t0 = Date.now();
for (const doc of docs) {
  const png = await renderOg(doc);
  const target = join(outDir, `${doc.slug}.png`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, png);
}

// Default OG used by any page that doesn't pass `ogSlug`.
const defaultPng = await renderOg({
  slug: 'default',
  title: 'Lessly Docs',
  description: 'Install, deploy, and run apps via the Lessly MCP.',
});
writeFileSync(join(outDir, 'default.png'), defaultPng);

const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
console.log(`generate-og: rendered ${docs.length + 1} PNGs in ${elapsed}s → dist/client/og/`);

// ---------------------------------------------------------------------------

async function renderOg({ slug, title, description }) {
  const tree = {
    type: 'div',
    props: {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px',
        backgroundColor: BG,
        color: TEXT_PRIMARY,
        fontFamily: 'Inter',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: BRAND,
            },
            children: 'LESSLY',
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              maxWidth: '900px',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontSize: '64px',
                    fontWeight: 700,
                    lineHeight: 1.1,
                    color: TEXT_PRIMARY,
                  },
                  children: title,
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontSize: '28px',
                    fontWeight: 400,
                    lineHeight: 1.4,
                    color: TEXT_SECONDARY,
                  },
                  children: description,
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              justifyContent: 'flex-end',
              fontSize: '20px',
              color: TEXT_SECONDARY,
            },
            children: `docs.lessly.com/docs/${slug}`,
          },
        },
      ],
    },
  };

  const svg = await satori(tree, {
    width: 1200,
    height: 630,
    fonts,
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}

function collectPublishedDocs(root) {
  const out = [];
  walk(root);
  out.sort((a, b) => a.slug.localeCompare(b.slug));
  return out;

  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const rel = relative(root, full).replace(/\\/g, '/');
      if (rel.startsWith('_fixtures')) continue;
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!name.endsWith('.mdx')) continue;
      const raw = readFileSync(full, 'utf8');
      const fm = parseFrontmatter(raw);
      if (!fm) continue;
      if (fm.draft === true || fm.draft === 'true') continue;
      if (fm.status === 'draft') continue;
      if (!fm.title || !fm.description) continue;
      const slug = rel.replace(/\.mdx?$/, '');
      out.push({ slug, title: fm.title, description: fm.description });
    }
  }
}

function parseFrontmatter(source) {
  if (!source.startsWith('---')) return null;
  const end = source.indexOf('\n---', 3);
  if (end === -1) return null;
  const block = source.slice(3, end).trim();
  const out = {};
  for (const line of block.split('\n')) {
    const m = /^([a-zA-Z_][\w-]*):\s*(.*)$/.exec(line);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value === 'true') out[m[1]] = true;
    else if (value === 'false') out[m[1]] = false;
    else out[m[1]] = value;
  }
  return out;
}
