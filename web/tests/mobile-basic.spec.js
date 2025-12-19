// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Basic Mobile Responsiveness Tests
 * Simplified tests for quick validation
 */

test.describe('Basic Mobile Checks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8001');
    await page.waitForLoadState('networkidle');
  });

  test('Mobile viewport - 375x667', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);

    // Check essential elements visible
    await expect(page.locator('h1')).toContainText('Cora');
    await expect(page.locator('input[placeholder*="Ask"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Tablet viewport - 768x1024', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(768);

    // Check UI elements
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main').first()).toBeVisible();
  });

  test('Touch target sizes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Check send button size (minimum 44x44 for iOS)
    const sendButton = page.locator('button[type="submit"]');
    const box = await sendButton.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test('Responsive text', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });

    // Check text doesn't overflow
    const title = page.locator('h1');
    const titleBox = await title.boundingBox();
    expect(titleBox?.width).toBeLessThanOrEqual(320);
  });

  test('Viewport meta tag', async ({ page }) => {
    const viewport = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute('content');
    });

    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');
  });
});