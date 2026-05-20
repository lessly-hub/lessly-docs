#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Mapping from Lessly hex literals to their CSS-var equivalents.
 * Keep keys lowercase; the regex match is case-insensitive.
 */
const MAP = {
  // Backgrounds
  '#191b24': 'var(--bg-primary)',
  '#12141b': 'var(--bg-secondary)',
  '#1f222d': 'var(--bg-surface)',
  '#252936': 'var(--bg-elevated)',
  '#0e1015': 'var(--bg-sunken)',
  '#06297d': 'var(--bg-brand)',
  '#1f2541': 'var(--bg-brand-subtle)',
  '#165ff2': 'var(--bg-brand-bright)',
  '#13703c': 'var(--bg-success)',
  '#78100b': 'var(--bg-danger)',
  '#b3780e': 'var(--bg-warning)',
  // Text
  '#eeeff0': 'var(--text-primary)',
  '#a5a9b5': 'var(--text-secondary)',
  '#737c95': 'var(--text-tertiary)',
  '#60687f': 'var(--text-disabled)',
  '#6394f6': 'var(--text-brand)',
  '#2eda76': 'var(--text-success)',
  '#efb042': 'var(--text-warning)',
  '#f06a6a': 'var(--text-danger)',
  // Borders
  '#2a2e3b': 'var(--border-subtle)',
};

/** Replace known hex literals in an SVG string with `var(--*)` references. */
export function themeDiagram(svg) {
  let out = svg;
  for (const [hex, varName] of Object.entries(MAP)) {
    // Match the hex (with the leading #), case-insensitive, anywhere in the string.
    // Escape the # for safety; \w boundary isn't reliable for # so we just match the literal.
    const re = new RegExp(hex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, varName);
  }
  return out;
}

/** Walk a directory recursively, theming every .svg file in place. */
function walk(dir) {
  if (!existsSync(dir)) {
    console.log(`theme-diagrams: ${dir} does not exist; nothing to do`);
    return;
  }
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (entry.endsWith('.svg')) {
      const before = readFileSync(full, 'utf-8');
      const after = themeDiagram(before);
      if (before !== after) {
        writeFileSync(full, after);
        console.log(`theme-diagrams: themed ${full}`);
      } else {
        console.log(`theme-diagrams: ${full} unchanged`);
      }
    }
  }
}

// Run when invoked as a script (not when imported by tests).
const url = import.meta.url;
if (process.argv[1] && (url === `file://${process.argv[1]}` || url.endsWith(process.argv[1]))) {
  const target = process.argv[2] || 'public/diagrams';
  walk(target);
}
