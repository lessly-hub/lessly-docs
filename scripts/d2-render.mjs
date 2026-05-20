#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: pnpm d2-render <input.d2> <output.svg>');
  process.exit(1);
}
const [input, output] = args;
if (!existsSync(input)) {
  console.error(`Input not found: ${input}`);
  process.exit(1);
}

try {
  execSync(`d2 "${input}" "${output}"`, { stdio: 'inherit' });
} catch {
  console.error('d2 CLI failed. Install via: brew install d2  (or curl https://d2lang.com/install.sh | sh)');
  process.exit(1);
}

execSync('pnpm theme-diagrams', { stdio: 'inherit' });
console.log(`d2-render: ${output} ready`);
