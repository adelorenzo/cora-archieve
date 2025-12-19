import { test, expect } from '@playwright/test';
import { TestHelpers, CURATED_MODELS, PERFORMANCE_THRESHOLDS } from './test-helpers.js';

/**
 * Sprint 2 Critical Tests - Essential functionality validation
 * 
 * Focus on the most critical Sprint 2 requirements that must pass
 */

test.describe('Sprint 2 Critical Requirements', () => {
  
  test.beforeEach(async ({ page }) => {
    TestHelpers.setupErrorTracking(page);
  });

  test('CRITICAL: App loads and initializes successfully', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);
    
    const loadTime = Date.now() - startTime;
    console.log(`App loaded in ${loadTime}ms`);
    
    // Critical assertions
    await expect(page.locator('text=Cora')).toBeVisible();
    await expect(page.locator('input[placeholder="Ask anything..."]')).toBeVisible();
    
    // Performance check
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INITIAL_LOAD_TIME);
    
    await TestHelpers.takeScreenshot(page, 'critical-app-loaded');
    
    console.log('✓ CRITICAL: App loads successfully');
  });

  test('CRITICAL: Model selector shows curated models', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);
    
    await TestHelpers.openModelSelector(page);
    await TestHelpers.takeScreenshot(page, 'critical-model-selector');
    
    // Verify at least 4 of the 6 curated models are visible
    let modelsFound = 0;
    const modelPrefixes = ['SmolLM2', 'Qwen', 'Llama', 'Phi', 'Gemma', 'TinyLlama'];
    
    for (const prefix of modelPrefixes) {
      const modelElement = page.locator(`text*=${prefix}`).first();
      if (await modelElement.isVisible()) {
        modelsFound++;
      }
    }
    
    console.log(`Found ${modelsFound} curated models`);
    expect(modelsFound).toBeGreaterThanOrEqual(4);
    
    console.log('✓ CRITICAL: Curated models are available');
  });

  test('CRITICAL: Smallest model (SmolLM2) can be selected', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);
    
    await TestHelpers.openModelSelector(page);
    
    // Try to load the smallest model
    const success = await TestHelpers.testModelLoad(page, 'SmolLM2');
    
    await TestHelpers.takeScreenshot(page, 'critical-smollm2-selected');
    
    // Model should at least be selectable (even if loading fails)
    const status = await page.locator('[class*="text-xs text-muted-foreground font-medium"]').textContent();
    expect(status).not.toBe('Detecting...');
    
    console.log('✓ CRITICAL: SmolLM2 model can be selected');
  });

  test('CRITICAL: Basic chat interface works', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);
    
    // Test basic chat functionality (send message)
    const messageCount = await TestHelpers.sendTestMessage(page, 'Test message');
    
    await TestHelpers.takeScreenshot(page, 'critical-chat-interface');
    
    // Should have at least the user message
    expect(messageCount).toBeGreaterThanOrEqual(1);
    
    // Input should be cleared after sending
    const inputValue = await page.locator('input[placeholder="Ask anything..."]').inputValue();
    expect(inputValue).toBe('');
    
    console.log('✓ CRITICAL: Chat interface accepts messages');
  });

  test('CRITICAL: Error handling works (graceful failures)', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);
    
    // Simulate network interruption
    await page.route('**/*.wasm', route => route.abort());
    await page.route('**/*.bin', route => route.abort());
    
    await TestHelpers.openModelSelector(page);
    
    // Try to load a model with network blocked
    await page.click('text*=SmolLM2');
    
    // Wait a bit for loading attempt
    await page.waitForTimeout(10000);
    
    // App should still be responsive despite failures
    await expect(page.locator('text=Cora')).toBeVisible();
    await expect(page.locator('input[placeholder="Ask anything..."]')).toBeVisible();
    
    await TestHelpers.takeScreenshot(page, 'critical-error-handling');
    
    console.log('✓ CRITICAL: App handles errors gracefully');
  });

  test('CRITICAL: Database features are accessible', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);
    
    const features = await TestHelpers.testDatabaseFeatures(page);
    
    await TestHelpers.takeScreenshot(page, 'critical-database-features');
    
    // At least one database feature should be working
    const hasAnyFeature = features.documentUpload || features.knowledgeBase;
    expect(hasAnyFeature).toBe(true);
    
    console.log('✓ CRITICAL: Database features are accessible');
  });

  test('CRITICAL: No critical console errors during basic usage', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);
    
    // Basic usage flow
    await TestHelpers.openModelSelector(page);
    await page.keyboard.press('Escape'); // Close model selector
    
    await TestHelpers.sendTestMessage(page, 'Test');
    
    // Wait for any async operations
    await page.waitForTimeout(5000);
    
    // Check console errors
    const { criticalErrors } = TestHelpers.filterCriticalErrors(
      page.testData?.consoleErrors || [],
      page.testData?.consoleWarnings || []
    );
    
    console.log(`Critical errors found: ${criticalErrors.length}`);
    if (criticalErrors.length > 0) {
      console.log('Critical errors:', criticalErrors);
    }
    
    expect(criticalErrors.length).toBeLessThan(PERFORMANCE_THRESHOLDS.CRITICAL_ERROR_LIMIT);
    
    console.log('✓ CRITICAL: Minimal console errors during usage');
  });

  test('CRITICAL: All major UI components are present', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);
    
    // Essential UI components
    const components = [
      'text=Cora',
      'text=100% Local',
      'input[placeholder="Ask anything..."]',
      'button[type="submit"]'
    ];
    
    for (const component of components) {
      await expect(page.locator(component)).toBeVisible();
    }
    
    // Try to find major buttons (settings, clear, etc.)
    const buttonCount = await page.locator('button:visible').count();
    expect(buttonCount).toBeGreaterThan(5); // Should have multiple buttons
    
    await TestHelpers.takeScreenshot(page, 'critical-ui-components');
    
    console.log('✓ CRITICAL: Major UI components are present');
  });

  test('CRITICAL: Theme system is functional', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);
    
    const themeCount = await TestHelpers.testThemeSwitching(page);
    
    // Should have at least basic theme switching
    expect(themeCount).toBeGreaterThan(0);
    
    console.log('✓ CRITICAL: Theme system is functional');
  });
});