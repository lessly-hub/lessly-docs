/**
 * a11y-mcp.spec.ts — accessibility skeleton for the MCP fixture page.
 *
 * Spec: 2026-05-21-docs-rewrite-design.md §S4 MCP reference surface.
 *
 * The full Playwright + axe-core wiring (config, browsers, fixtures,
 * baseURL, CI integration) lands in S6 polish. This stub locks the
 * exact assertions S6 must verify for the MCP surface, so the wiring
 * task can land them without re-deriving the contract.
 *
 * TODO(S6): wire `@playwright/test` config (devDependency), serve the
 * built `dist/client/` directory (e.g. via `pnpm exec serve`), and run
 * this spec against `/docs/_fixtures/mcp/`. Until then this file is
 * skipped by default — the assertions below are the authoritative
 * checklist.
 *
 * Assertions encoded:
 *   1. The transcript renders as <ol role="log">.
 *   2. Every transcript <li> contains a `<span class="sr-only">…</span>`
 *      speaker label so screen readers don't infer the speaker from style.
 *   3. A tool-role turn renders <figure><figcaption>…</figcaption>…</figure>
 *      with the figcaption acting as the tool-name pill.
 *   4. The McpToolCard <article> exposes the `lessly-mcp-tool-card`
 *      class hook so future axe-core sweeps can scope-select it.
 *
 * The fixture is `/docs/_fixtures/mcp/` (drafted via `draft: true`,
 * still emitted to `dist/`).
 */

import { test, expect } from '@playwright/test';

test.describe('MCP fixture a11y skeleton', () => {
  // Skipped until S6 wires the Playwright runtime + dev server.
  test.skip(true, 'Playwright runtime + axe wiring lands in S6.');

  test('AgentTranscript exposes role="log" with sr-only speaker labels', async ({ page }) => {
    await page.goto('/docs/_fixtures/mcp/');

    const log = page.locator('ol[role="log"]');
    await expect(log).toHaveCount(1);

    const turns = log.locator('li');
    const turnCount = await turns.count();
    expect(turnCount).toBeGreaterThan(0);

    for (let i = 0; i < turnCount; i++) {
      await expect(turns.nth(i).locator('span.sr-only')).toHaveCount(1);
    }
  });

  test('Tool turn renders <figure><figcaption>', async ({ page }) => {
    await page.goto('/docs/_fixtures/mcp/');

    const toolTurn = page.locator('ol[role="log"] li[data-role="tool"]');
    await expect(toolTurn.locator('figure')).toHaveCount(1);
    await expect(toolTurn.locator('figure > figcaption')).toHaveCount(1);
  });

  test('McpToolCard exposes its class hook', async ({ page }) => {
    await page.goto('/docs/_fixtures/mcp/');
    await expect(page.locator('article.lessly-mcp-tool-card')).toHaveCount(1);
  });
});
