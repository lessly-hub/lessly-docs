import { test, expect } from '@playwright/test';

test.describe('get-started', () => {
  test('dark theme', async ({ page }) => {
    await page.goto('/docs/get-started');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('get-started-dark.png', { fullPage: true });
  });

  test('light theme', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('lessly-docs-theme', 'light');
    });
    await page.goto('/docs/get-started');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('get-started-light.png', { fullPage: true });
  });
});
