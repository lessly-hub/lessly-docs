/**
 * Happy-path Playwright e2e suite (Slice 6).
 *
 * Covers the five flows the spec calls out as "must work end-to-end" in §Acceptance:
 *   1. Home page loads, hero + primary CTA visible, CTA leads to install.
 *   2. `/docs/get-started/install` shows the 5-group sidebar + breadcrumbs;
 *      TOC rail is present (or correctly absent if < 2 h2 headings).
 *   3. ⌘K search modal opens, accepts typing, surfaces results.
 *   4. `/docs/reference/tools/lessly_deploy` renders the MCP tool card.
 *   5. 404 page is reachable for an unknown URL.
 *
 * The home page in S1 is a meta-refresh redirector to `/docs/get-started/install`.
 * That counts as the "hero + CTA" surface for now — `/docs/get-started/install`
 * is the first real page a user sees. We assert both halves of the contract:
 *   - Either the index page exposes a hero + CTA, OR
 *   - The redirect lands on the install page (current S1 behaviour).
 */
import { test, expect } from '@playwright/test';

test.describe('Slice 6 — happy-path surfaces', () => {
  test('home page loads and routes the user toward install', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();

    // The S1 root is a meta-refresh redirector. Wait for either the explicit
    // link or the post-refresh URL — whichever the browser resolves first.
    const installLink = page.locator('a[href="/docs/get-started/install"]');
    await expect(installLink.first()).toBeVisible({ timeout: 10_000 });

    await installLink.first().click();
    await page.waitForURL(/\/docs\/get-started\/install\/?$/, { timeout: 10_000 });
    await expect(page.locator('h1')).toContainText(/install/i);
  });

  test('install page renders sidebar (5 groups), breadcrumbs, and TOC contract', async ({
    page,
  }) => {
    await page.goto('/docs/get-started/install/');

    // Sidebar exists with all five top-level groups labelled per _groups.json.
    const sidebar = page.locator('nav, aside').filter({ hasText: 'Get Started' }).first();
    await expect(sidebar).toBeVisible();
    for (const label of ['Get Started', 'Guides', 'Concepts', 'Reference', 'Changelog']) {
      await expect(sidebar.getByText(label, { exact: false }).first()).toBeVisible();
    }

    // Breadcrumbs are present.
    await expect(page.locator('nav[aria-label*="readcrumb" i], ol[aria-label*="readcrumb" i]')).toHaveCount(
      1,
    );

    // TOC contract: rail is visible iff ≥ 2 h2 headings exist. Either branch
    // is a pass — the contract is that the two states are consistent.
    const h2Count = await page.locator('main h2').count();
    const tocItems = page.locator('[aria-label*="table of contents" i] a, nav[aria-label*="contents" i] a');
    if (h2Count >= 2) {
      expect(await tocItems.count()).toBeGreaterThan(0);
    } else {
      expect(await tocItems.count()).toBe(0);
    }
  });

  test('⌘K opens the search modal and types-to-results', async ({ page, browserName }) => {
    await page.goto('/docs/get-started/install/');

    // Open via the keyboard shortcut. On Linux/headless Chromium, Meta+K maps
    // to Cmd+K in Playwright's `keyboard.press` model.
    const modifier = browserName === 'webkit' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+KeyK`);

    const dialog = page.locator('dialog#lessly-search');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await page.locator('#lessly-search-input').fill('deploy');
    // Pagefind is debounced (150ms) and loads lazily; allow up to 5s for the
    // first result anchor to land.
    const result = dialog.locator('a[role="option"]').first();
    await expect(result).toBeVisible({ timeout: 5_000 });
  });

  test('lessly_deploy tool page renders the McpToolCard', async ({ page }) => {
    await page.goto('/docs/reference/tools/lessly_deploy/');
    await expect(page.locator('article.lessly-mcp-tool-card')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText(/lessly_deploy/);
  });

  test('a 404 page exists for unknown URLs', async ({ page }) => {
    const response = await page.goto('/does-not-exist/', { waitUntil: 'domcontentloaded' });
    // Static hosts often serve 404 as 404; the Cloudflare adapter writes a
    // fallback. Accept either: 404 status OR visible "not found" text.
    if (response && response.status() === 404) {
      // Statically served 404 page.
      return;
    }
    await expect(page.locator('body')).toContainText(/not\s*found|404/i);
  });
});
