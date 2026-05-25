#!/usr/bin/env node
/**
 * verify-ai/mcp-tools-layer4.mjs
 *
 * Enforces the Lessly Voice Layer 4 contract (Notarial-Terse register) on
 * the allowlisted MCP tools. Reads content/mcp-tools.json directly (no HTTP)
 * because the contract is about source-of-truth content, not served output.
 *
 * Spec: lessly-landing/docs/superpowers/specs/2026-05-25-lessly-voice-system-design.md §4
 * Skill: lessly-landing/.claude/skills/lessly-voice/SKILL.md (Layer 4)
 *
 * Allowlist grows as more tools are rewritten — see follow-up issues.
 *
 * Usage:
 *   node scripts/verify-ai/mcp-tools-layer4.mjs
 *
 * Exit 0 on success, non-zero with a clear message on failure.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const localJsonPath = resolve(here, '..', '..', 'content', 'mcp-tools.json');

// Tools rewritten to Notarial-Terse. Grow as more tools migrate.
const ALLOWLIST = ['lessly_deploy', 'lessly_get_deployment', 'lessly_list_deployments'];

const HEDGE_TOKENS = [' may ', ' usually ', ' optionally ', ' if available '];
const MARKETING_TOKENS = ['powerful', 'simple', 'easy', 'comprehensive', 'seamless', 'robust'];

const catalog = JSON.parse(readFileSync(localJsonPath, 'utf8'));
const byName = Object.fromEntries(catalog.tools.map((t) => [t.name, t]));

const failures = [];

for (const name of ALLOWLIST) {
  const tool = byName[name];
  if (!tool) {
    failures.push(`${name}: allowlisted tool not present in catalog`);
    continue;
  }
  const desc = tool.description;
  const descLower = desc.toLowerCase();

  // Rule 1: verb-first, no tool-name restatement
  if (descLower.startsWith(name.toLowerCase())) {
    failures.push(`${name}: description restates the tool name at the start`);
  }
  if (!/^[A-Z][a-z]+/.test(desc)) {
    failures.push(`${name}: description does not start with a capitalized verb`);
  }

  // Rule 3: Returns contract present
  if (!/Returns:\s*[`{]/.test(desc)) {
    failures.push(`${name}: missing "Returns: {…}" contract line`);
  }

  // Rule 6: banned tokens
  for (const hedge of HEDGE_TOKENS) {
    if (descLower.includes(hedge)) {
      failures.push(`${name}: contains banned hedge token "${hedge.trim()}"`);
    }
  }
  for (const word of MARKETING_TOKENS) {
    if (descLower.includes(word)) {
      failures.push(`${name}: contains banned marketing token "${word}"`);
    }
  }
}

// Tool-specific checks
const deploy = byName['lessly_deploy'];
if (deploy) {
  if (!/Irreversible(\.|\s+for)/.test(deploy.description)) {
    failures.push('lessly_deploy: missing irreversibility tail');
  }
  if (!/Fails when:\s/.test(deploy.description)) {
    failures.push('lessly_deploy: missing "Fails when:" disclosure');
  }
  if (!/Typical sequence:\s/.test(deploy.description)) {
    failures.push('lessly_deploy: missing "Typical sequence:" planning hint');
  }
}

const list = byName['lessly_list_deployments'];
if (list && !list.description.includes('lessly_get_deployment')) {
  failures.push('lessly_list_deployments: missing sibling disambiguator (lessly_get_deployment)');
}

if (failures.length > 0) {
  console.error('mcp-tools-layer4: FAIL');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`mcp-tools-layer4: PASS (${ALLOWLIST.length} tools checked)`);
process.exit(0);
