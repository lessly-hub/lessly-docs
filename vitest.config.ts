/**
 * Vitest config for the Astro rewrite (Slice 6).
 *
 * Scope: pure-TypeScript unit tests under `tests/unit/`. We deliberately stay
 * in the default Node environment — no jsdom — because every module under test
 * is build-time logic (nav ordering, TOC projection, MCP-tool schema, MDX
 * markdown stripping). Astro-runtime entry points (`getCollection`, content
 * globs) stay out of scope here; they're covered by the build itself, the
 * link-integrity script, and the Playwright e2e suite.
 */
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Astro's virtual `astro:content` module isn't available outside the
      // Astro build. Our unit tests target pure helpers that don't call
      // `getCollection` — the import only resolves the type. A tiny stub
      // satisfies the resolver without polluting product code.
      'astro:content': resolve(__dirname, 'tests/stubs/astro-content.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.spec.ts'],
    // Exclude the Playwright e2e folder; it loads `@playwright/test`, which
    // Vitest cannot execute (and shouldn't try to).
    exclude: ['tests/e2e/**', 'tests/a11y-mcp.spec.ts', 'node_modules/**', 'dist/**'],
  },
});
