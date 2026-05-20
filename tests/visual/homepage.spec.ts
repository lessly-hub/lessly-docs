import { test, expect } from '@playwright/test';

test.describe('homepage', () => {
  test('dark theme', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Fonts ready ensures consistent metrics for diff; toHaveScreenshot itself retries until stable.
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot('homepage-dark.png', { fullPage: true });
  });

  test('light theme', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('lessly-docs-theme', 'light');
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot('homepage-light.png', { fullPage: true });
  });
});
