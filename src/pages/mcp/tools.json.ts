/**
 * `/mcp/tools.json` — machine-readable MCP tool catalog.
 *
 * Spec §AI surface: this endpoint is one of the seven exports derived from
 * a single Content Collection. The MCP server and LLM crawlers fetch it
 * here. Prerendered per spec §Prerender policy (no Worker hit at request
 * time).
 *
 * The body is the validated, typed catalog — re-serializing through the
 * Zod parse guarantees `/mcp/tools.json` and the per-tool HTML pages
 * never drift from each other.
 */

import type { APIRoute } from 'astro';
import { parseMcpTools } from '@/lib/mcp-tools';

export const prerender = true;

export const GET: APIRoute = () => {
  const catalog = parseMcpTools();
  return new Response(JSON.stringify(catalog, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
};
