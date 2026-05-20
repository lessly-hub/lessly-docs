#!/usr/bin/env node
// Walks content/docs/ and fails if any page is more than 3 levels deep
// (top-level area / sub-page / anchor — measured by directory depth under content/docs/).

const fs = require('fs');
const path = require('path');

const ROOT = path.join(process.cwd(), 'content', 'docs');
const MAX_DEPTH = 3;
let violations = 0;

function walk(dir, depth = 0) {
  if (!fs.existsSync(dir)) {
    console.log('lint-nav-depth: content/docs/ does not exist yet; nothing to check');
    return;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, depth + 1);
    } else if (e.name.endsWith('.mdx') || e.name.endsWith('.md')) {
      if (depth > MAX_DEPTH) {
        console.error(`DEPTH ${depth}: ${full}`);
        violations++;
      }
    }
  }
}

walk(ROOT);
if (violations > 0) {
  console.error(`\nERROR: ${violations} page(s) exceed nav depth ${MAX_DEPTH}.`);
  process.exit(1);
}
console.log(`lint-nav-depth: all pages within depth ${MAX_DEPTH}`);
