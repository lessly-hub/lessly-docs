#!/usr/bin/env node
/**
 * verify-ai/mcp-tools-schema.mjs
 *
 * Fetches /mcp/tools.json from a running site and validates two things:
 *  1. The served body parses against the same Zod schema the Astro build
 *     uses (re-implemented inline; the canonical source lives in
 *     src/lib/mcp-tools.ts and the existing test-mcp-tools.mjs).
 *  2. The served body is deep-equal to the local content/mcp-tools.json.
 *
 * Usage:
 *   node scripts/verify-ai/mcp-tools-schema.mjs --base http://localhost:8787
 *
 * Exit 0 on success, non-zero with a clear message on failure.
 *
 * Note: we do not statically import src/lib/mcp-tools.ts here because
 * that module imports from 'astro/zod' inside the Astro runtime. The schema
 * is replicated 1:1 below; scripts/test-mcp-tools.mjs is the canary
 * if the two ever drift (and that script is run from `verify:ai` too).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { z } from 'astro/zod';

const here = dirname(fileURLToPath(import.meta.url));
const baseArg = parseBase(process.argv);
const localJsonPath = resolve(here, '..', '..', 'content', 'mcp-tools.json');

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

const url = `${baseArg.replace(/\/$/, '')}/mcp/tools.json`;
let res;
try {
  res = await fetch(url);
} catch (err) {
  fail(`Could not fetch ${url}: ${err.message}`);
}
if (!res.ok) {
  fail(`GET ${url} returned HTTP ${res.status}`);
}

let served;
try {
  served = await res.json();
} catch (err) {
  fail(`Body at ${url} is not valid JSON: ${err.message}`);
}

const parseResult = catalogSchema.safeParse(served);
if (!parseResult.success) {
  const issues = parseResult.error.issues
    .map((i) => `  - ${i.path.join('.') || '<root>'}: ${i.message}`)
    .join('\n');
  fail(`/mcp/tools.json failed schema validation:\n${issues}`);
}

const localRaw = readFileSync(localJsonPath, 'utf8');
const localParsed = JSON.parse(localRaw);

// Compare via canonical JSON. Both should be byte-equal after JSON
// round-trip because the served endpoint is `JSON.stringify(parseMcpTools(),
// null, 2)` of the same on-disk file.
const a = JSON.stringify(served);
const b = JSON.stringify(localParsed);
if (a !== b) {
  fail(
    `/mcp/tools.json drifted from local content/mcp-tools.json (served=${a.length} bytes, local=${b.length} bytes)`,
  );
}

console.log(
  `OK: /mcp/tools.json — ${parseResult.data.tools.length} tools, version ${parseResult.data.version}, deep-equal to local source.`,
);
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
