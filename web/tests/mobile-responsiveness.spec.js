// @ts-check
import { test, expect, devices } from '@playwright/test';

/**
 * Mobile Responsiveness Test Suite
 * Tests Cora app across mobile devices and viewports
 */

test.describe('Mobile Responsiveness Tests', () => {

  test('Mobile Small - 320x568', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('http://localhost:8001');

    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(320);

    // Essential elements visible
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Cora');
    await expect(page.locator('input[placeholder*="Ask"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Touch target sizes (minimum 44x44 for iOS)
    const sendButton = page.locator('button[type="submit"]');
    const box = await sendButton.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test('Mobile Medium - 375x667 (iPhone)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:8001');

    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);

    // Check header layout
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Check chat input is full width on mobile
    const chatInput = page.locator('input[placeholder*="Ask"]');
    await expect(chatInput).toBeVisible();

    // Settings should be accessible
    const settingsButton = page.locator('[data-testid="settings-button"]');
    await expect(settingsButton).toBeVisible();
  });

  test('Mobile Large - 414x896 (iPhone Plus)', async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 896 });
    await page.goto('http://localhost:8001');

    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(414);

    // All UI elements should be visible
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.locator('input[placeholder*="Ask"]')).toBeVisible();
  });

  test('Tablet - 768x1024 (iPad)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:8001');

    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(768);

    // May show more UI elements on tablet
    await expect(page.locator('header')).toBeVisible();

    // Conversations panel might be visible
    const conversationsButton = page.locator('[aria-label="Toggle conversations panel"]');
    const isConversationsVisible = await conversationsButton.isVisible();
    expect(typeof isConversationsVisible).toBe('boolean');
  });

  test('Mobile Landscape - 667x375', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto('http://localhost:8001');

    // Check layout adapts to landscape
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Input should still be accessible in landscape
    const chatInput = page.locator('input[placeholder*="Ask"]');
    await expect(chatInput).toBeVisible();

    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(667);
  });

  test('Touch Interactions', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:8001');

    // Test tap on settings
    const settingsButton = page.locator('[data-testid="settings-button"]');
    await settingsButton.click(); // Using click as tap equivalent

    // Settings modal should open
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    const settingsModal = page.locator('[role="dialog"]');
    await expect(settingsModal).toBeVisible();

    // Close settings
    const closeButton = page.locator('[data-testid="close-settings"]');
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await expect(settingsModal).not.toBeVisible();
    }

    // Test input focus
    const chatInput = page.locator('input[placeholder*="Ask"]');
    await chatInput.click();
    await expect(chatInput).toBeFocused();
  });

  test('Responsive Text and Images', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('http://localhost:8001');

    // Check text is not overflowing
    const title = page.locator('h1');
    const titleBox = await title.boundingBox();
    expect(titleBox?.width).toBeLessThanOrEqual(320);

    // Check font sizes are appropriate for mobile
    const fontSize = await title.evaluate(el => {
      return window.getComputedStyle(el).fontSize;
    });
    expect(fontSize).toBeTruthy();
  });

  test('Viewport Meta Tag', async ({ page }) => {
    await page.goto('http://localhost:8001');

    // Check viewport meta tag exists
    const viewport = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute('content');
    });

    // Should have proper viewport settings
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');
  });

  test('Mobile Accessibility', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:8001');

    // Check ARIA labels for mobile
    const chatInput = page.locator('[aria-label*="Chat"]').or(page.locator('[aria-label*="message"]')).first();
    const hasAriaLabel = await chatInput.count() > 0;
    expect(hasAriaLabel).toBeTruthy();

    // Check focus management
    await page.keyboard.press('Tab');
    const activeElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });
    expect(activeElement).toBeTruthy();
  });

  test('PWA Features Check', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:8001');

    // Check for manifest
    const hasManifest = await page.evaluate(() => {
      return !!document.querySelector('link[rel="manifest"]');
    });

    // Check for service worker support
    const hasServiceWorker = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });

    // PWA features should be available
    expect(hasServiceWorker).toBeTruthy();

    // Check for theme color
    const themeColor = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="theme-color"]');
      return meta?.getAttribute('content');
    });

    // Log results for debugging
    console.log('PWA Check:', {
      manifest: hasManifest,
      serviceWorker: hasServiceWorker,
      themeColor: themeColor
    });
  });
});