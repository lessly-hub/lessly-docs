import type { APIRoute } from 'astro';
import { entrySlug, getPublishedDocs } from '@/lib/llms';

export const prerender = true;

// Vite resolves these at build time — bodies are inlined as plain strings.
// The keys look like `/content/docs/get-started/install.mdx`.
const rawSources = import.meta.glob('/content/docs/**/*.mdx', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function lookupRaw(slug: string): string | undefined {
  const wantedSuffix = `/content/docs/${slug}.mdx`;
  for (const [key, value] of Object.entries(rawSources)) {
    if (key.endsWith(wantedSuffix)) return value;
  }
  return undefined;
}

export async function getStaticPaths() {
  const entries = await getPublishedDocs();
  return entries.map((entry) => ({
    params: { slug: entrySlug(entry) },
    props: { slug: entrySlug(entry) },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { slug } = props as { slug: string };
  const raw = lookupRaw(slug);
  if (!raw) {
    return new Response(`Not found: ${slug}`, { status: 404 });
  }
  return new Response(raw, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
};
