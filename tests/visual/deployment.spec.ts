import { test, expect } from '@playwright/test';

test.describe('deployment', () => {
  test('dark theme', async ({ page }) => {
    await page.goto('/docs/deployment', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot('deployment-dark.png', { fullPage: true });
  });

  test('light theme', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('lessly-docs-theme', 'light');
    });
    await page.goto('/docs/deployment', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot('deployment-light.png', { fullPage: true });
  });
});
