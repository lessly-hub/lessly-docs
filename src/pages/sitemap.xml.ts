import type { APIRoute } from 'astro';
import { SITE, entryPath, getPublishedDocs } from '@/lib/llms';

export const prerender = true;

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const GET: APIRoute = async () => {
  const entries = await getPublishedDocs();

  const urls: string[] = [];
  urls.push(`  <url>\n    <loc>${SITE}/</loc>\n  </url>`);

  for (const entry of entries) {
    const loc = `${SITE}${entryPath(entry)}/`;
    const updated = (entry.data as { updated?: Date }).updated;
    const lastmod = updated ? `\n    <lastmod>${fmtDate(updated)}</lastmod>` : '';
    urls.push(`  <url>\n    <loc>${loc}</loc>${lastmod}\n  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
