#!/usr/bin/env node
/**
 * Banned-vocabulary lint for customer-facing content.
 *
 * Banned vocab = internal team terms that must not leak into customer content
 * under `content/docs/`. This script is the SINGLE SOURCE OF TRUTH for the
 * list: `AGENTS.md`, `agents/new-docs-page.md`, and `CONTRIBUTING.md` point
 * here instead of re-listing the terms in prose (which is how they drifted —
 * AGENTS.md said 2, the docs said 6, CI enforced 2).
 *
 * Runs both locally (`pnpm check:vocab`) and in CI (`.github/workflows/ci.yml`,
 * `lint` job), symmetric with `check:links` and `check:nav-depth`. Per AGENTS.md
 * rule 6, CI gates are deterministic Node/regex lints only — no LLM. This is one.
 *
 * Matching rules, per term:
 *   - `glossary/` is excluded — terms may be explained there.
 *   - Fenced code blocks (``` fences) and inline code (`backticks`) are stripped
 *     before matching, so legitimate code/identifiers don't trip the gate.
 *   - Each term declares its own case-sensitivity and word-boundary mode below.
 *
 * `MCP` is NOT banned — it's the customer's install path and is discussed plainly.
 *
 * Exit non-zero on any hit, naming every offender (file:line) in one pass so the
 * contributor can fix the whole tree at once.
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(here, '..', 'content', 'docs');

/**
 * The banned-vocabulary list. SINGLE SOURCE OF TRUTH — keep docs pointing here,
 * not re-listing terms in prose.
 *
 * Each entry: a human label and the RegExp that detects it (global flag required
 * so we can report every occurrence). Add `i` for case-insensitive terms.
 *   - word-boundary (`\b…\b`) avoids substring false positives ("extensible").
 *   - `Dev Console` is an exact, case-sensitive phrase (matches the prior gate).
 *   - repo names of the form `*-extension` (e.g. `lessly-deployment-extension`).
 */
const BANNED = [
  { label: 'extension', re: /\bextension\b/gi },
  { label: 'Dev Console', re: /Dev Console/g },
  { label: 'manifest', re: /\bmanifest\b/gi },
  { label: 'synapse', re: /\bsynapse\b/gi },
  { label: 'gateway', re: /\bgateway\b/gi },
  { label: '*-extension repo name', re: /\b[a-z0-9]+-extension\b/gi },
];

/**
 * Strip fenced code blocks and inline code so banned terms inside code samples
 * don't fail the gate. Mirrors the prior CI awk+sed (drop fenced lines, remove
 * `inline` spans), but BLANKS fence/code lines instead of removing them so the
 * array index still maps 1:1 to the original file line number — the `::error`
 * annotation must point at the real line in the diff.
 */
function stripCode(text) {
  let inFence = false;
  return text.split('\n').map((line) => {
    if (/^```/.test(line)) {
      inFence = !inFence;
      return '';
    }
    if (inFence) return '';
    return line.replace(/`[^`]*`/g, '');
  });
}

if (!existsSync(ROOT)) {
  console.log(`check-vocab: ${ROOT} does not exist; nothing to check.`);
  process.exit(0);
}

const violations = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'glossary') continue; // terms may be explained here
      await walk(full);
    } else if (e.name.endsWith('.mdx') || e.name.endsWith('.md')) {
      const raw = await readFile(full, 'utf8');
      const lines = stripCode(raw);
      lines.forEach((line, i) => {
        for (const term of BANNED) {
          term.re.lastIndex = 0;
          if (term.re.test(line)) {
            violations.push({
              file: relative(ROOT, full),
              line: i + 1,
              term: term.label,
            });
          }
        }
      });
    }
  }
}

await walk(ROOT);

if (violations.length === 0) {
  console.log('check-vocab: content clean — no banned vocabulary.');
  process.exit(0);
}

// GitHub Actions surfaces `::error` annotations inline on the PR diff.
console.error(`check-vocab: FAIL — ${violations.length} banned-vocab hit(s):\n`);
for (const v of violations) {
  const path = `content/docs/${v.file}`;
  console.error(`::error file=${path},line=${v.line}::banned vocabulary '${v.term}'`);
  console.error(`  ${path}:${v.line} — '${v.term}'`);
}
console.error('\nSee the banned list in scripts/check-vocab.mjs (and AGENTS.md).');
process.exit(1);
