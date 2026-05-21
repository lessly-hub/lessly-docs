import type { APIRoute } from 'astro';
import { getPublishedDocs, renderLlmsFullTxt } from '@/lib/llms';

export const prerender = true;

export const GET: APIRoute = async () => {
  const entries = await getPublishedDocs();
  const body = renderLlmsFullTxt(entries);
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
