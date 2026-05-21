/**
 * Playwright config for the Astro rewrite (Slice 6).
 *
 * Spins up the prerendered static output via `astro preview` (built-in static
 * server, no Wrangler needed for e2e). Tests live under `tests/e2e/`.
 *
 * Why `astro preview` instead of `wrangler dev`:
 *   - Pure static server with deterministic startup signal ("astro" prints the
 *     local URL on stdout, which `webServer.url` waits for).
 *   - No Cloudflare Workers runtime overhead — every Slice-1 page is
 *     prerendered, so the asset binding is the only meaningful surface and
 *     `astro preview` covers it.
 *   - Matches Lighthouse CI, which also targets the preview server.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 4321);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Build only if dist/client is missing; rebuilding every test run wastes
    // ~30s. CI does a clean build in an earlier job and reuses the artifact.
    command: `sh -c "([ -d dist/client ] || pnpm build) && ([ -d dist/client/pagefind ] || pnpm exec pagefind --site dist/client) && pnpm exec astro preview --host 127.0.0.1 --port ${PORT}"`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
