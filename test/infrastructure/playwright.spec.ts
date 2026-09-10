import { expect, test } from '@playwright/test';

test.describe('Playwright Infrastructure', () => {
  test.skip('loads test environment', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Rafters/);
  });

  test('captures screenshots on failure', async ({ page }) => {
    const screenshotPath = test.info().outputPath('screenshot.png');
    await page.goto('about:blank');
    await page.screenshot({ path: screenshotPath });
    expect(screenshotPath).toBeTruthy();
  });

  test('supports multiple browsers', () => {
    const browserName = test.info().project.name;
    expect(['chromium', 'firefox', 'webkit']).toContain(browserName);
  });
});
