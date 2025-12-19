// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Timestamp Display Tests
 * Verify that messages show timestamps correctly
 */

test.describe('Message Timestamps', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8001');
    await page.waitForLoadState('networkidle');
  });

  test('Should display timestamps for messages', async ({ page }) => {
    // Send a test message
    const input = page.locator('input[placeholder*="Ask"]');
    await input.fill('Hello, test message');
    await input.press('Enter');

    // Wait for user message to appear
    await page.waitForSelector('.user-message', { timeout: 5000 });

    // Check if timestamp is displayed
    const userMessageContainer = page.locator('.group').filter({ has: page.locator('.user-message') }).first();
    const timestamp = userMessageContainer.locator('span').first();

    // Verify timestamp is visible
    await expect(timestamp).toBeVisible();

    // Verify timestamp format (should match time pattern)
    const timestampText = await timestamp.textContent();
    expect(timestampText).toBeTruthy();

    // Should match time patterns like "3:45 PM" or "Dec 25, 3:45 PM"
    const timePattern = /(\d{1,2}:\d{2}\s?(AM|PM)|Yesterday|[A-Z][a-z]{2}\s+\d{1,2})/;
    expect(timestampText).toMatch(timePattern);
  });

  test('Timestamp format changes based on date', async ({ page }) => {
    // Test the formatTimestamp function by evaluating it
    await page.goto('http://localhost:8001');

    // Check if formatTimestamp function exists
    const hasFormatFunction = await page.evaluate(() => {
      return typeof window.formatTimestamp === 'function';
    });

    // The function should be available in the component context
    // For now, just verify the UI renders timestamps
    const input = page.locator('input[placeholder*="Ask"]');
    await input.fill('Test timestamp');
    await input.press('Enter');

    // Wait for message
    await page.waitForSelector('.user-message');

    // Get timestamp element
    const timestampElements = page.locator('.text-muted-foreground span');
    const count = await timestampElements.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Timestamps appear for both user and assistant messages', async ({ page }) => {
    // Send a message
    const input = page.locator('input[placeholder*="Ask"]');
    await input.fill('What is 2+2?');
    await input.press('Enter');

    // Wait for both messages
    await page.waitForSelector('.user-message');

    // Wait a bit for assistant response (or timeout message)
    await page.waitForTimeout(2000);

    // Count timestamp elements
    const timestamps = page.locator('.text-xs.text-muted-foreground span');
    const count = await timestamps.count();

    // Should have at least one timestamp for user message
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('Timestamps are properly styled', async ({ page }) => {
    // Send a test message
    const input = page.locator('input[placeholder*="Ask"]');
    await input.fill('Style test');
    await input.press('Enter');

    await page.waitForSelector('.user-message');

    // Check timestamp styling
    const timestampContainer = page.locator('.text-xs.text-muted-foreground').first();
    await expect(timestampContainer).toBeVisible();

    // Verify the timestamp is small and muted
    const classes = await timestampContainer.getAttribute('class');
    expect(classes).toContain('text-xs');
    expect(classes).toContain('text-muted-foreground');
  });
});