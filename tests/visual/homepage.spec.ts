import { test, expect } from '@playwright/test';

test.describe('homepage', () => {
  test('dark theme', async ({ page }) => {
    await page.goto('/');
    // Wait for fonts and any client-side hydration to settle
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homepage-dark.png', { fullPage: true });
  });

  test('light theme', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('lessly-docs-theme', 'light');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homepage-light.png', { fullPage: true });
  });
});
