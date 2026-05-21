/**
 * MCP tool catalog — typed loader for `content/mcp-tools.json`.
 *
 * Slice 4 spec (§MCP-specific affordances, §AI surface): one JSON source
 * of truth powers both the per-tool reference pages and the `/mcp/tools.json`
 * endpoint. This module owns the schema and the parse — every consumer
 * (page route, JSON endpoint, components) imports `parseMcpTools()` and
 * trusts the typed result.
 *
 * The JSON is validated eagerly at module load. A bad catalog must fail
 * the Astro build, not silently ship empty pages.
 */

import { z } from 'astro/zod';
import catalogJson from '../../content/mcp-tools.json';

export const mcpToolArgSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  required: z.boolean(),
  description: z.string().min(1),
  default: z.string().optional(),
});

export const mcpToolExampleSchema = z.object({
  prompt: z.string().min(1),
  args: z.record(z.unknown()),
});

export const mcpToolSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/, {
    message: 'Tool names must be snake_case starting with a lowercase letter.',
  }),
  summary: z.string().min(1),
  description: z.string().min(1),
  args: z.array(mcpToolArgSchema),
  example: mcpToolExampleSchema,
  // Page slugs relative to /docs/ (e.g. "reference/tools/lessly_get_logs").
  // Cap at 3 per spec §Component contracts.
  related: z.array(z.string()).max(3).optional(),
});

export const mcpToolsSchema = z.object({
  version: z.string().min(1),
  tools: z.array(mcpToolSchema).min(1),
});

export type McpToolArg = z.infer<typeof mcpToolArgSchema>;
export type McpToolExample = z.infer<typeof mcpToolExampleSchema>;
export type McpTool = z.infer<typeof mcpToolSchema>;
export type McpToolCatalog = z.infer<typeof mcpToolsSchema>;

let cached: McpToolCatalog | null = null;

/**
 * Parse and validate the catalog. Cached after the first call.
 * Throws with a developer-readable message if the JSON drifts from
 * the schema.
 */
export function parseMcpTools(): McpToolCatalog {
  if (cached) return cached;
  const result = mcpToolsSchema.safeParse(catalogJson);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('\n');
    throw new Error(
      `[mcp-tools] content/mcp-tools.json failed schema validation:\n${issues}`,
    );
  }
  cached = result.data;
  return cached;
}

/**
 * Look up a single tool by name. Returns undefined if absent.
 */
export function getMcpTool(name: string): McpTool | undefined {
  return parseMcpTools().tools.find((t) => t.name === name);
}

// Validate at module load so misconfigured catalogs fail the build.
parseMcpTools();
