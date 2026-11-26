import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Accessibility Infrastructure @a11y", () => {
  test("detects no violations in accessible button", async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Test Page</title>
        </head>
        <body>
          <button type="button">Accessible Button</button>
        </body>
      </html>
    `);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("validates AxeBuilder is working correctly", async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Test Page</title>
        </head>
        <body>
          <button type="button">Accessible Button</button>
        </body>
      </html>
    `);

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults).toBeDefined();
    expect(Array.isArray(accessibilityScanResults.violations)).toBe(true);
  });

  test("validates WCAG 2.2 AA compliance", async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Test Page</title>
        </head>
        <body>
          <button type="button" aria-label="Close dialog">
            X
          </button>
        </body>
      </html>
    `);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("validates color contrast requirements", async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Test Page</title>
        </head>
        <body>
          <div style="background-color: white; color: black; padding: 1rem;">
            This text has sufficient contrast
          </div>
        </body>
      </html>
    `);

    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2aa"]).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("validates keyboard navigation", async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Test Page</title>
        </head>
        <body>
          <nav>
            <a href="#home">Home</a>
            <button type="button">Action</button>
            <input type="text" aria-label="Search" />
          </nav>
        </body>
      </html>
    `);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
