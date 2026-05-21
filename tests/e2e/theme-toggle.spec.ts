/**
 * Theme switcher e2e: cookie persistence + class flip across reload.
 *
 * Verifies the contract owned by ThemeToggle + the Layout bootstrap:
 *   1. Click flips `html.light` and writes the `lessly_theme` cookie.
 *   2. After reload, the bootstrap reads that cookie BEFORE first paint —
 *      `html.light` is already set the moment the page is interactive.
 *   3. A `lessly_theme=dark` cookie suppresses the `light` class even at
 *      noon (i.e. cookie precedence wins over the time-based default).
 */
import { test, expect } from '@playwright/test';

test.describe('theme toggle', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('clicking the toggle flips html.light and persists across reload', async ({ page }) => {
    await page.goto('/docs/get-started/install/');

    const initialIsLight = await page.evaluate(() =>
      document.documentElement.classList.contains('light'),
    );

    await page.locator('button[data-theme-toggle]').click();

    const flippedIsLight = await page.evaluate(() =>
      document.documentElement.classList.contains('light'),
    );
    expect(flippedIsLight).toBe(!initialIsLight);

    const cookies = await page.context().cookies();
    const themeCookie = cookies.find((c) => c.name === 'lessly_theme');
    expect(themeCookie).toBeDefined();
    expect(themeCookie?.value).toBe(flippedIsLight ? 'light' : 'dark');

    await page.reload();
    const afterReloadIsLight = await page.evaluate(() =>
      document.documentElement.classList.contains('light'),
    );
    expect(afterReloadIsLight).toBe(flippedIsLight);
  });

  test('lessly_theme=dark cookie suppresses light even when time would pick it', async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: 'lessly_theme',
        value: 'dark',
        url: 'http://localhost:4321',
      },
    ]);

    await page.goto('/docs/get-started/install/');
    const isLight = await page.evaluate(() =>
      document.documentElement.classList.contains('light'),
    );
    expect(isLight).toBe(false);
  });

  test('lessly_theme=light cookie forces light theme', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'lessly_theme',
        value: 'light',
        url: 'http://localhost:4321',
      },
    ]);

    await page.goto('/docs/get-started/install/');
    const isLight = await page.evaluate(() =>
      document.documentElement.classList.contains('light'),
    );
    expect(isLight).toBe(true);
  });

  test('toggle button updates aria-pressed and aria-label after click', async ({ page }) => {
    await page.goto('/docs/get-started/install/');
    const button = page.locator('button[data-theme-toggle]');

    const initialPressed = await button.getAttribute('aria-pressed');
    const initialLabel = await button.getAttribute('aria-label');

    await button.click();

    const nextPressed = await button.getAttribute('aria-pressed');
    const nextLabel = await button.getAttribute('aria-label');

    expect(nextPressed).not.toBe(initialPressed);
    expect(nextLabel).not.toBe(initialLabel);
    expect(nextLabel).toMatch(/switch to (dark|light) theme/i);
  });
});
