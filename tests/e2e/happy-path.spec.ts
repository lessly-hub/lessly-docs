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

    // Scope to the hero CTA in <main>: the global mobile-nav drawer also
    // carries an (initially hidden) install link, so an unscoped locator would
    // match that first. The homepage's own "Get started" CTA is the surface
    // under test.
    const installLink = page.locator('main a[href="/docs/get-started/install"]');
    await expect(installLink.first()).toBeVisible({ timeout: 10_000 });

    await installLink.first().click();
    await page.waitForURL(/\/docs\/get-started\/install\/?$/, { timeout: 10_000 });
    await expect(page.locator('h1')).toContainText(/install/i);
  });

  test('install page: header tabs (5, active section), scoped sidebar, breadcrumbs, TOC', async ({
    page,
  }) => {
    await page.goto('/docs/get-started/install/');

    // Scoped-tab nav: the five sections live in the header as tabs (per
    // _groups.json), and the tab for the current section is marked active.
    const tabs = page.locator('nav[aria-label="Primary"] a');
    await expect(tabs).toHaveCount(5);
    for (const label of ['Get Started', 'Guides', 'Concepts', 'Reference', 'Changelog']) {
      await expect(tabs.filter({ hasText: label })).toHaveCount(1);
    }
    await expect(page.locator('nav[aria-label="Primary"] a[aria-current="page"]')).toContainText(
      'Get Started',
    );

    // The desktop sidebar is scoped to the active section: it lists Get
    // Started's pages and NOT the other sections' landings.
    const sidebar = page.locator('aside[aria-label="Section navigation"]');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('a[href="/docs/get-started/install"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/docs/guides"]')).toHaveCount(0);
    await expect(sidebar.locator('a[href="/docs/concepts"]')).toHaveCount(0);

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

  test('mobile drawer exposes every section and closes on navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/docs/get-started/install/');

    // Below `lg` the tabs + desktop sidebar are hidden; the hamburger is the
    // only nav entry point and the drawer starts closed.
    const drawer = page.locator('dialog#lessly-mobile-nav');
    await expect(drawer).toBeHidden();

    await page.locator('[data-mobile-nav-trigger]').click();
    await expect(drawer).toBeVisible();

    // All five section labels are present (group toggles stay visible even
    // when a group is collapsed).
    for (const label of ['Get Started', 'Guides', 'Concepts', 'Reference', 'Changelog']) {
      await expect(drawer.getByText(label, { exact: false }).first()).toBeVisible();
    }

    // The active section starts expanded — its pages are reachable.
    const next = drawer.locator('a[href="/docs/get-started/next-steps"]');
    await expect(next).toBeVisible();

    // Navigating closes the drawer.
    await next.click();
    await page.waitForURL(/\/docs\/get-started\/next-steps\/?$/, { timeout: 10_000 });
    await expect(drawer).toBeHidden();
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

    // Regression: the search input must not paint the global :focus-visible
    // outline (global.css applies a 2px brand-bright ring to every focused
    // element by default — fine for buttons, visually wrong inside the
    // command-palette-style dialog). The dialog + caret are the focus cue.
    // Tailwind v4's `outline-none` sets outline-style:none (which suppresses
    // painting); outline-width may still report 2px. Style is what matters.
    const outlineStyle = await page.locator('#lessly-search-input').evaluate(
      (el) => getComputedStyle(el).outlineStyle,
    );
    expect(outlineStyle).toBe('none');
  });

  test('code block Copy button gives synchronous feedback and copies source', async ({
    page,
  }) => {
    await page.goto('/docs/get-started/install/');

    // Spy on the clipboard before any click — headless Chromium does not
    // expose the system clipboard for readback, so we intercept the write.
    await page.evaluate(() => {
      (window as unknown as { __copied: string[] }).__copied = [];
      navigator.clipboard.writeText = (text: string) => {
        (window as unknown as { __copied: string[] }).__copied.push(text);
        return Promise.resolve();
      };
    });

    const copyButton = page.locator('button.lessly-code__copy').first();
    await expect(copyButton).toBeVisible();
    await expect(copyButton).toContainText('Copy');

    await copyButton.click();

    // lessly:ux audit rule 3.2 — every action gets feedback inside ~100ms. The wire-up flips
    // the label synchronously inside the click handler, so this resolves on
    // the next microtask, well under the budget.
    await expect(copyButton).toContainText('Copied', { timeout: 200 });

    // Source must be the decoded text, not the HTML-entity-escaped form the
    // rehype plugin stamps into the <template> tag.
    const copied = await page.evaluate(
      () => (window as unknown as { __copied: string[] }).__copied,
    );
    expect(copied.length).toBe(1);
    expect(copied[0].length).toBeGreaterThan(0);
    expect(copied[0]).not.toContain('&lt;');
    expect(copied[0]).not.toContain('&amp;');
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
