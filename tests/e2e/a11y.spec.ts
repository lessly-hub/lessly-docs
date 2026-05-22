/**
 * axe-core/Playwright accessibility sweep (Slice 6).
 *
 * Asserts zero violations on the four highest-traffic surfaces:
 *   - Home page
 *   - /docs/get-started/install
 *   - /docs/reference/tools/lessly_deploy (MCP tool reference)
 *   - The search modal (open state)
 *
 * Why no per-rule allowlist: any new violation is a regression we want to
 * surface in CI. If a legitimate exception arises later, add it as a per-page
 * disabled rule with a comment explaining why.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function expectNoViolations(page: import('@playwright/test').Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  if (results.violations.length > 0) {
    // Print a compact summary before the assertion fails so CI logs are useful.
    for (const v of results.violations) {
      console.error(
        `[${label}] axe ${v.id} (${v.impact}) — ${v.help} (${v.nodes.length} node(s))`,
      );
    }
  }
  expect(results.violations, `${label}: axe-core violations`).toEqual([]);
}

test.describe('Accessibility (axe-core)', () => {
  test('home page is clean', async ({ page }) => {
    await page.goto('/');
    await expectNoViolations(page, 'home');
  });

  test('install page is clean', async ({ page }) => {
    await page.goto('/docs/get-started/install/');
    await expectNoViolations(page, 'install');
  });

  test('MCP tool reference is clean', async ({ page }) => {
    await page.goto('/docs/reference/tools/lessly_deploy/');
    await expectNoViolations(page, 'mcp-tool');
  });

  test('search modal (open + results) is clean', async ({ page, browserName }) => {
    await page.goto('/docs/get-started/install/');
    const modifier = browserName === 'webkit' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+KeyK`);
    await expect(page.locator('dialog#lessly-search')).toBeVisible();
    // Type to surface results — the empty `<div role="listbox">` would
    // otherwise fail `aria-required-children` (listbox needs ≥ 1 option).
    // We assert the realistic "user has typed" state.
    await page.locator('#lessly-search-input').fill('deploy');
    await expect(page.locator('dialog#lessly-search a[role="option"]').first()).toBeVisible({
      timeout: 5_000,
    });
    await expectNoViolations(page, 'search-modal');
  });

  test('mobile nav drawer (open) is clean', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/docs/get-started/install/');
    await page.locator('[data-mobile-nav-trigger]').click();
    await expect(page.locator('dialog#lessly-mobile-nav')).toBeVisible();
    await expectNoViolations(page, 'mobile-nav');
  });
});
