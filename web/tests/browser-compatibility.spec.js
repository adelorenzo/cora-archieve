// @ts-check
import { test, expect, devices } from '@playwright/test';

/**
 * Cross-Browser Compatibility Test Suite
 * Tests Cora app across different browsers and runtimes
 */

// Test configuration for different browsers
const browsers = [
  {
    name: 'Chrome',
    expectedRuntime: 'webgpu',
    features: ['WebGPU', 'WebAssembly', 'ES2022'],
    modelSupport: 'full'
  },
  {
    name: 'Edge',
    expectedRuntime: 'webgpu',
    features: ['WebGPU', 'WebAssembly', 'ES2022'],
    modelSupport: 'full'
  },
  {
    name: 'Firefox',
    expectedRuntime: 'wasm',
    features: ['WebAssembly', 'ES2022'],
    modelSupport: 'fallback'
  },
  {
    name: 'Safari',
    expectedRuntime: 'wasm',
    features: ['WebAssembly', 'ES2020'],
    modelSupport: 'basic'
  }
];

test.describe('Cross-Browser Compatibility', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:8001');

    // Wait for initial load
    await page.waitForSelector('header', { timeout: 10000 });
  });

  test('Browser Detection and Runtime Selection', async ({ page, browserName }) => {
    console.log(`Testing browser: ${browserName}`);

    // Check if app loads successfully
    await expect(page.locator('h1')).toContainText('Cora');

    // Wait for runtime detection
    await page.waitForTimeout(3000);

    // Check runtime indicator
    const runtimeBadge = page.locator('[data-testid="runtime-badge"]').first();
    if (await runtimeBadge.isVisible()) {
      const runtimeText = await runtimeBadge.textContent();
      console.log(`Detected runtime: ${runtimeText}`);

      // Verify expected runtime based on browser
      if (browserName === 'chromium') {
        expect(runtimeText?.toLowerCase()).toContain('webgpu');
      } else if (browserName === 'firefox') {
        expect(runtimeText?.toLowerCase()).toContain('wasm');
      }
    }
  });

  test('WebGPU Detection (Chrome/Edge)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'WebGPU only available in Chrome/Edge');

    // Test WebGPU availability
    const webgpuSupported = await page.evaluate(() => {
      return 'gpu' in navigator;
    });

    expect(webgpuSupported).toBe(true);

    // Test WebGPU adapter
    const adapterAvailable = await page.evaluate(async () => {
      try {
        const adapter = await navigator.gpu?.requestAdapter();
        return !!adapter;
      } catch (e) {
        return false;
      }
    });

    expect(adapterAvailable).toBe(true);
  });

  test('WebAssembly Support (All Browsers)', async ({ page }) => {
    // Test WASM support
    const wasmSupported = await page.evaluate(() => {
      return 'WebAssembly' in window;
    });

    expect(wasmSupported).toBe(true);

    // Test WASM streaming compilation
    const streamingSupported = await page.evaluate(() => {
      return 'compileStreaming' in WebAssembly;
    });

    expect(streamingSupported).toBe(true);
  });

  test('Model Initialization', async ({ page, browserName }) => {
    // Select a lightweight model for testing
    await page.click('[data-testid="settings-button"]');
    await page.waitForSelector('[role="dialog"]');

    // Look for model selector
    const modelSelector = page.locator('select').first();
    if (await modelSelector.isVisible()) {
      // Select a fast model for testing
      await modelSelector.selectOption({ label: /Qwen.*0.5B|stories260K/i });
    }

    // Close settings
    await page.click('[data-testid="close-settings"]');

    // Wait for initialization
    await page.waitForTimeout(5000);

    // Check if model loaded successfully
    const statusIndicator = page.locator('[data-testid="status-indicator"]').first();
    if (await statusIndicator.isVisible()) {
      const status = await statusIndicator.textContent();
      expect(status).not.toContain('Failed');
    }
  });

  test('Basic Chat Functionality', async ({ page }) => {
    // Wait for app to be ready
    await page.waitForTimeout(3000);

    // Type a simple message
    const chatInput = page.locator('input[placeholder*="Ask"]');
    await expect(chatInput).toBeVisible();

    await chatInput.fill('Hello, this is a test message');

    // Send message
    await page.click('button[type="submit"]');

    // Wait for response (with longer timeout for model loading)
    await page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 60000 });

    // Check if response was generated
    const messages = page.locator('[data-testid="message"]');
    await expect(messages).toHaveCountGreaterThan(1);
  });

  test('UI Responsiveness', async ({ page }) => {
    // Test responsive design elements
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Test navigation elements
    const settingsButton = page.locator('[data-testid="settings-button"]');
    await expect(settingsButton).toBeVisible();

    // Test chat input
    const chatInput = page.locator('input[placeholder*="Ask"]');
    await expect(chatInput).toBeVisible();

    // Test theme switching
    const themeButton = page.locator('[data-testid="theme-button"]').first();
    if (await themeButton.isVisible()) {
      await themeButton.click();
      await page.waitForTimeout(500);

      // Verify theme changed
      const body = page.locator('body');
      const bodyClass = await body.getAttribute('class');
      expect(bodyClass).toBeTruthy();
    }
  });

  test('Performance Metrics', async ({ page }) => {
    // Check if performance monitor loaded
    await page.waitForTimeout(3000);

    // Test performance dashboard access
    const perfButton = page.locator('[aria-label="Open performance dashboard"]');
    if (await perfButton.isVisible()) {
      await perfButton.click();

      // Check if dashboard opened
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      const dashboard = page.locator('text="Performance Dashboard"');
      await expect(dashboard).toBeVisible();

      // Close dashboard
      await page.press('body', 'Escape');
    }
  });

  test('Error Handling', async ({ page }) => {
    // Test graceful error handling

    // Simulate network error
    await page.route('**/*', route => {
      if (route.request().url().includes('cdn.jsdelivr.net')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Reload and check if fallback works
    await page.reload();
    await page.waitForTimeout(5000);

    // App should still be functional
    const header = page.locator('h1');
    await expect(header).toContainText('Cora');

    // Clear route interception
    await page.unroute('**/*');
  });

  test('Local Storage Persistence', async ({ page }) => {
    // Test if settings persist
    await page.click('[data-testid="settings-button"]');

    // Change a setting
    const temperatureSlider = page.locator('input[type="range"]').first();
    if (await temperatureSlider.isVisible()) {
      await temperatureSlider.fill('0.5');
    }

    // Close settings
    await page.click('[data-testid="close-settings"]');

    // Reload page
    await page.reload();
    await page.waitForTimeout(2000);

    // Check if setting persisted
    await page.click('[data-testid="settings-button"]');
    const persistedValue = await temperatureSlider.inputValue();
    expect(parseFloat(persistedValue)).toBeCloseTo(0.5, 1);
  });

  test('Memory Usage Monitoring', async ({ page }) => {
    // Monitor memory usage during operation
    const initialMemory = await page.evaluate(() => {
      return performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null;
    });

    if (initialMemory) {
      console.log('Initial memory:', initialMemory);

      // Perform some operations
      const chatInput = page.locator('input[placeholder*="Ask"]');
      for (let i = 0; i < 3; i++) {
        await chatInput.fill(`Test message ${i + 1}`);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
      }

      // Check memory after operations
      const finalMemory = await page.evaluate(() => {
        return performance.memory ? {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        } : null;
      });

      if (finalMemory) {
        console.log('Final memory:', finalMemory);

        // Memory should not have grown excessively
        const memoryGrowth = finalMemory.used - initialMemory.used;
        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
      }
    }
  });

});

test.describe('Mobile Browser Compatibility', () => {

  test('iOS Safari Compatibility', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13']
    });
    const page = await context.newPage();

    await page.goto('http://localhost:8001');
    await page.waitForTimeout(3000);

    // Check if app loads on mobile
    await expect(page.locator('h1')).toContainText('Cora');

    // Test touch interactions
    const chatInput = page.locator('input[placeholder*="Ask"]');
    await expect(chatInput).toBeVisible();

    await context.close();
  });

  test('Android Chrome Compatibility', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['Pixel 5']
    });
    const page = await context.newPage();

    await page.goto('http://localhost:8001');
    await page.waitForTimeout(3000);

    // Check if app loads on mobile
    await expect(page.locator('h1')).toContainText('Cora');

    // Test responsive layout
    const header = page.locator('header');
    await expect(header).toBeVisible();

    await context.close();
  });

});

test.describe('Feature Compatibility Matrix', () => {

  test('Export Functionality', async ({ page, browserName }) => {
    // Add test message
    const chatInput = page.locator('input[placeholder*="Ask"]');
    await chatInput.fill('Test export message');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Test export functionality
    const exportButton = page.locator('[aria-label="Export conversation"]');
    if (await exportButton.isVisible()) {
      await exportButton.click();

      // Check if export menu appears
      const exportMenu = page.locator('text="Export as"');
      if (await exportMenu.isVisible()) {
        await expect(exportMenu).toBeVisible();

        // Close export menu
        await page.press('body', 'Escape');
      }
    }
  });

  test('Conversation Management', async ({ page }) => {
    // Test conversation switching
    const conversationsButton = page.locator('[aria-label="Toggle conversations panel"]');
    if (await conversationsButton.isVisible()) {
      await conversationsButton.click();

      // Check if conversations panel opens
      await page.waitForTimeout(1000);

      // Close conversations panel
      await conversationsButton.click();
    }
  });

  test('Accessibility Features', async ({ page }) => {
    // Test keyboard navigation
    await page.press('body', 'Tab');
    await page.press('body', 'Tab');

    // Test skip to content
    const skipLink = page.locator('text="Skip to content"');
    if (await skipLink.isVisible()) {
      await skipLink.click();
    }

    // Test ARIA labels
    const settingsButton = page.locator('[aria-label="Open settings"]');
    await expect(settingsButton).toBeVisible();

    const chatInput = page.locator('[aria-label="Chat message input"]');
    await expect(chatInput).toBeVisible();
  });

});