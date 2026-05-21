import type { APIRoute } from 'astro';
import { getPublishedDocs, renderLlmsTxt } from '@/lib/llms';

export const prerender = true;

export const GET: APIRoute = async () => {
  const entries = await getPublishedDocs();
  const body = renderLlmsTxt(entries);
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
