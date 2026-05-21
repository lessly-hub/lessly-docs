#!/usr/bin/env node
/**
 * Round-trip test for content/mcp-tools.json.
 *
 * 1. Read the raw JSON.
 * 2. Parse it through the same Zod schema the Astro modules use.
 * 3. Re-stringify the parsed value with stable key order from the
 *    parsed object (Zod preserves it) and compare to a normalized copy
 *    of the original.
 * 4. Assert tool count = 8 (Slice 4 catalog spec).
 *
 * Run: `node astro/scripts/test-mcp-tools.mjs` from anywhere.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
// Use the zod re-export Astro ships so we don't need a separate top-level
// dependency. `astro/zod` resolves to the same `zod@4.x` the Content
// Collection schema uses.
import { z } from 'astro/zod';

const here = dirname(fileURLToPath(import.meta.url));
const jsonPath = resolve(here, '..', 'content', 'mcp-tools.json');
const raw = readFileSync(jsonPath, 'utf8');
const original = JSON.parse(raw);

// Mirror of src/lib/mcp-tools.ts. Kept in sync by convention; this
// script is the canary if they drift.
const argSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  required: z.boolean(),
  description: z.string().min(1),
  default: z.string().optional(),
});
const exampleSchema = z.object({
  prompt: z.string().min(1),
  args: z.record(z.string(), z.unknown()),
});
const toolSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  summary: z.string().min(1),
  description: z.string().min(1),
  args: z.array(argSchema),
  example: exampleSchema,
  related: z.array(z.string()).max(3).optional(),
});
const catalogSchema = z.object({
  version: z.string().min(1),
  tools: z.array(toolSchema).min(1),
});

const parsed = catalogSchema.parse(original);

// Deep-equal check. Compare via canonical JSON stringification so
// undefined optional fields don't trip us up.
const a = JSON.stringify(original);
const b = JSON.stringify(parsed);
if (a !== b) {
  console.error('FAIL: round-trip mismatch.');
  console.error('original len:', a.length, 'parsed len:', b.length);
  process.exit(1);
}

if (parsed.tools.length !== 8) {
  console.error(`FAIL: expected 8 tools, got ${parsed.tools.length}`);
  process.exit(1);
}

const names = parsed.tools.map((t) => t.name).join(', ');
console.log(`OK: ${parsed.tools.length} tools parsed, round-trip equal.`);
console.log(`    version: ${parsed.version}`);
console.log(`    tools: ${names}`);
