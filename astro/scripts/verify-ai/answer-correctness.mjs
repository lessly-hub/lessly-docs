#!/usr/bin/env node
/**
 * verify-ai/answer-correctness.mjs
 *
 * Uses the Anthropic SDK to verify the docs corpus is good enough for an
 * LLM to answer canonical questions about Lessly using only /llms-full.txt
 * as context — and to decline gracefully when a question isn't in the
 * corpus.
 *
 * The 3 positive facts (sourced from the actual content):
 *   1. "What MCP server URL do I use to add Lessly to Claude Code?"
 *      Expected: https://mcp.lessly.com
 *      (content/docs/get-started/install.mdx)
 *   2. "How many MCP tools does Lessly expose?"
 *      Expected: 8
 *      (content/docs/reference/tools.mdx)
 *   3. "Name the MCP tool that deploys a git ref."
 *      Expected: lessly_deploy
 *      (content/docs/reference/tools.mdx — line item)
 *
 * The 1 negative:
 *   4. "What is the capital of France?"
 *      Expected: model declines / says it doesn't know.
 *
 * Model: claude-haiku-4-5-20251001 (fast + cheap).
 * temperature: 0; max_tokens: 100.
 * Prompt caching: the /llms-full.txt context is sent with
 * `cache_control: { type: 'ephemeral' }` so repeat runs are cheap.
 *
 * SKIP behavior: prints "SKIP" and exits 0 (per spec) when no API key is
 * available. Looks first at ANTHROPIC_API_KEY env var, then at
 * ~/.anthropic/api_key (newline-trimmed).
 *
 * Usage:
 *   node astro/scripts/verify-ai/answer-correctness.mjs --base http://localhost:8787
 */
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const baseArg = parseBase(process.argv);
const BASE = baseArg.replace(/\/$/, '');

const apiKey = resolveApiKey();
if (!apiKey) {
  console.log('SKIP: ANTHROPIC_API_KEY not set and ~/.anthropic/api_key not found.');
  console.log('      Set ANTHROPIC_API_KEY=sk-ant-... to run this check.');
  process.exit(0);
}

// Dynamic import so the script still runs (and skips cleanly) when the
// SDK is not installed.
let Anthropic;
try {
  ({ default: Anthropic } = await import('@anthropic-ai/sdk'));
} catch (err) {
  console.log('SKIP: @anthropic-ai/sdk not installed.');
  console.log(`      pnpm --filter lessly-docs-astro add -D @anthropic-ai/sdk (got: ${err.message})`);
  process.exit(0);
}

const fullRes = await fetch(`${BASE}/llms-full.txt`);
if (!fullRes.ok) {
  console.error(`FAIL: GET ${BASE}/llms-full.txt returned HTTP ${fullRes.status}.`);
  console.error('      Slice 5 generation must ship /llms-full.txt before this verifier passes.');
  process.exit(1);
}
const docs = await fullRes.text();
if (docs.trim().length < 200) {
  console.error(`FAIL: /llms-full.txt body is suspiciously small (${docs.length} bytes).`);
  process.exit(1);
}

const client = new Anthropic({ apiKey });
const MODEL = 'claude-haiku-4-5-20251001';

const checks = [
  {
    q: 'What MCP server URL do I use to add Lessly to Claude Code?',
    expected: 'https://mcp.lessly.com',
    kind: 'positive',
    match: (a) => /https?:\/\/mcp\.lessly\.com/i.test(a),
  },
  {
    q: 'How many MCP tools does Lessly expose?',
    expected: '8',
    kind: 'positive',
    // Accept "8", "eight", "8 tools", etc. Reject obviously-wrong numbers.
    match: (a) => /\b(8|eight)\b/i.test(a) && !/\b(7|9|10|nine|seven|ten)\b/i.test(a),
  },
  {
    q: 'Name the MCP tool that deploys a git ref.',
    expected: 'lessly_deploy',
    kind: 'positive',
    match: (a) => /lessly_deploy/.test(a),
  },
  {
    q: 'What is the capital of France?',
    expected: 'declines / not in docs',
    kind: 'negative',
    // Pass: any clear "don't know" / "not in docs" signal AND no
    // mention of "Paris" (which would mean it answered from prior
    // knowledge despite the instructions).
    match: (a) => {
      const lower = a.toLowerCase();
      const declines =
        lower.includes("don't know") ||
        lower.includes('do not know') ||
        lower.includes('not in the docs') ||
        lower.includes("isn't in the docs") ||
        lower.includes('is not in the docs') ||
        lower.includes("can't find") ||
        lower.includes('cannot find') ||
        lower.includes("doesn't mention") ||
        lower.includes('does not mention');
      const leakedParis = /\bparis\b/i.test(a);
      return declines && !leakedParis;
    },
  },
];

const systemPrompt =
  `You have the Lessly docs in <docs>...</docs>. Answer the user's question using ONLY those docs. ` +
  `If the answer isn't in the docs, say "I don't know."`;

const results = [];
for (const c of checks) {
  let actual = '';
  let error = null;
  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 100,
      temperature: 0,
      system: [
        {
          type: 'text',
          text: systemPrompt,
        },
        {
          type: 'text',
          text: `<docs>\n${docs}\n</docs>`,
          // Prompt cache the bulky docs blob so repeat questions are cheap.
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: c.q }],
    });
    actual = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
  } catch (err) {
    error = err.message || String(err);
  }
  const ok = error ? false : c.match(actual);
  results.push({ ...c, actual: error ? `ERROR: ${error}` : actual, ok });
}

// Render a compact table.
const w = {
  q: Math.max(8, ...results.map((r) => r.q.length)),
  exp: Math.max(8, ...results.map((r) => r.expected.length)),
  ans: 60,
};
const pad = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n));
console.log(`Model: ${MODEL}`);
console.log(`Corpus: /llms-full.txt (${docs.length} bytes)`);
console.log('');
console.log(`${pad('Question', w.q)}  ${pad('Expected', w.exp)}  ${pad('Actual', w.ans)}  Result`);
console.log(`${'-'.repeat(w.q)}  ${'-'.repeat(w.exp)}  ${'-'.repeat(w.ans)}  ------`);
for (const r of results) {
  const oneLineActual = r.actual.replace(/\s+/g, ' ');
  console.log(
    `${pad(r.q, w.q)}  ${pad(r.expected, w.exp)}  ${pad(oneLineActual, w.ans)}  ${r.ok ? 'PASS' : 'FAIL'}`,
  );
}

const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error(`\nFAIL: ${failed.length}/${results.length} answers wrong.`);
  process.exit(1);
}
console.log(`\nOK: ${results.length}/${results.length} answers correct.`);
process.exit(0);

function parseBase(argv) {
  const i = argv.indexOf('--base');
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  return process.env.VERIFY_BASE || 'http://localhost:4321';
}

function resolveApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY.trim();
  const p = join(homedir(), '.anthropic', 'api_key');
  if (existsSync(p)) {
    try {
      const v = readFileSync(p, 'utf8').trim();
      if (v) return v;
    } catch {
      /* ignore */
    }
  }
  return null;
}
