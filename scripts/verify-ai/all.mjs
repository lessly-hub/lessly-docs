#!/usr/bin/env node
/**
 * verify-ai/all.mjs
 *
 * Run all four AI-surface verifications in sequence and print a summary.
 *
 * Each sub-test is a standalone .mjs module that exits 0 on success or
 * non-zero on failure. answer-correctness.mjs may exit 0 with "SKIP:"
 * in its output when no API key is configured; we surface that as SKIP
 * rather than PASS in the summary.
 *
 * Usage:
 *   node scripts/verify-ai/all.mjs --base http://localhost:8787
 *   pnpm verify:ai
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const baseArgs = process.argv.slice(2);
const base = (() => {
  const i = baseArgs.indexOf('--base');
  if (i !== -1 && baseArgs[i + 1]) return baseArgs[i + 1];
  return process.env.VERIFY_BASE || 'http://localhost:4321';
})();

const tests = [
  { name: 'mcp-tools-schema', file: 'mcp-tools-schema.mjs' },
  { name: 'mcp-tools-layer4', file: 'mcp-tools-layer4.mjs' },
  { name: 'llms-listing', file: 'llms-listing.mjs' },
  { name: 'text-equivalence', file: 'text-equivalence.mjs' },
  { name: 'answer-correctness', file: 'answer-correctness.mjs' },
];

console.log(`verify-ai: base=${base}`);
console.log('');

const results = [];
for (const t of tests) {
  console.log(`────────── ${t.name} ──────────`);
  const { code, stdout } = await run(join(here, t.file), ['--base', base]);
  // SKIP detection: only meaningful for answer-correctness (the only test
  // that opts into skipping). Treat any leading "SKIP:" in stdout +
  // exit-0 as SKIP.
  const skipped = code === 0 && /^SKIP:/m.test(stdout);
  const status = skipped ? 'SKIP' : code === 0 ? 'PASS' : 'FAIL';
  results.push({ name: t.name, status, code });
  console.log('');
}

console.log('────────── summary ──────────');
const w = Math.max(...results.map((r) => r.name.length));
for (const r of results) {
  console.log(`  ${r.name.padEnd(w)}  ${r.status}${r.status === 'FAIL' ? ` (exit ${r.code})` : ''}`);
}

const anyFail = results.some((r) => r.status === 'FAIL');
process.exit(anyFail ? 1 : 0);

function run(file, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [file, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(s);
    });
    child.stderr.on('data', (d) => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(s);
    });
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}
