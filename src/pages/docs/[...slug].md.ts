import type { APIRoute } from 'astro';
import { entrySlug, getPublishedDocs, renderPageAsMarkdown } from '@/lib/llms';

export const prerender = true;

export async function getStaticPaths() {
  const entries = await getPublishedDocs();
  return entries.map((entry) => ({
    params: { slug: entrySlug(entry) },
    props: { entry },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { entry } = props as { entry: Awaited<ReturnType<typeof getPublishedDocs>>[number] };
  const body = renderPageAsMarkdown(entry);
  const titled = `# ${entry.data.title}\n\n${body}\n`;
  return new Response(titled, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
};
