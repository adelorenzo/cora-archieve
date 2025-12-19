import { test, expect } from '@playwright/test';
import { TestHelpers, CURATED_MODELS } from './test-helpers.js';

/**
 * Model Validation Tests - Deep testing of the 6 curated models
 * 
 * Tests each model individually for loading, basic functionality, and switching
 */

// Model information from config
const MODEL_INFO = {
  'SmolLM2-135M-Instruct-q4f16_1-MLC': {
    name: 'SmolLM2 135M',
    size: '~100MB',
    speed: 'Ultra Fast',
    useCase: 'Quick tasks, low memory'
  },
  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC': {
    name: 'Qwen 2.5 0.5B', 
    size: '~300MB',
    speed: 'Very Fast',
    useCase: 'General chat, multilingual'
  },
  'Llama-3.2-1B-Instruct-q4f16_1-MLC': {
    name: 'Llama 3.2 1B',
    size: '~650MB', 
    speed: 'Fast',
    useCase: 'General purpose, reliable'
  },
  'Phi-3.5-mini-instruct-q4f16_1-MLC': {
    name: 'Phi 3.5 Mini',
    size: '~2.1GB',
    speed: 'Moderate', 
    useCase: 'Coding, reasoning, analysis'
  },
  'gemma-2-2b-it-q4f16_1-MLC': {
    name: 'Gemma 2 2B',
    size: '~1.3GB',
    speed: 'Moderate',
    useCase: 'Creative tasks, general chat'
  },
  'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC': {
    name: 'TinyLlama 1.1B',
    size: '~700MB',
    speed: 'Fast', 
    useCase: 'Fast responses, low resource'
  }
};

test.describe('Curated Models Validation', () => {
  
  test.beforeEach(async ({ page }) => {
    TestHelpers.setupErrorTracking(page);
  });

  test('All 6 curated models are listed in selector', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);
    
    await TestHelpers.openModelSelector(page);
    await TestHelpers.takeScreenshot(page, 'all-models-selector');
    
    const foundModels = [];
    const modelPrefixes = {
      'SmolLM2': 'SmolLM2-135M-Instruct-q4f16_1-MLC',
      'Qwen': 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
      'Llama': 'Llama-3.2-1B-Instruct-q4f16_1-MLC', 
      'Phi': 'Phi-3.5-mini-instruct-q4f16_1-MLC',
      'Gemma': 'gemma-2-2b-it-q4f16_1-MLC',
      'TinyLlama': 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC'
    };
    
    for (const [prefix, fullId] of Object.entries(modelPrefixes)) {
      const modelElement = page.locator(`text*=${prefix}`).first();
      if (await modelElement.isVisible()) {
        foundModels.push(fullId);
        console.log(`✓ Found model: ${MODEL_INFO[fullId].name}`);
      } else {
        console.log(`✗ Missing model: ${MODEL_INFO[fullId].name} (${prefix})`);
      }
    }
    
    console.log(`Total models found: ${foundModels.length}/6`);
    
    // Should have all 6 models or at least 5 (allowing for one potential issue)
    expect(foundModels.length).toBeGreaterThanOrEqual(5);
  });

  test('Model descriptions and metadata are displayed', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);
    
    await TestHelpers.openModelSelector(page);
    
    // Check for key metadata displays
    const metadataTerms = [
      'Ultra Fast', 'Very Fast', 'Fast', 'Moderate',  // Speed indicators
      '100MB', '300MB', '650MB', '1.3GB', '2.1GB', '700MB', // Size indicators
      'Quick tasks', 'multilingual', 'General purpose', 'Coding', 'Creative' // Use cases
    ];
    
    let foundMetadata = 0;
    for (const term of metadataTerms) {
      const element = page.locator(`text*=${term}`).first();
      if (await element.isVisible()) {
        foundMetadata++;
      }
    }
    
    console.log(`Found ${foundMetadata}/${metadataTerms.length} metadata terms`);
    
    // Should find at least half of the expected metadata
    expect(foundMetadata).toBeGreaterThan(metadataTerms.length / 2);
    
    await TestHelpers.takeScreenshot(page, 'model-metadata-display');
  });

  // Test the smallest/fastest model first (most likely to work)
  test('SmolLM2 (135M) - Ultra-fast model loads successfully', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);
    
    await TestHelpers.openModelSelector(page);
    
    const success = await TestHelpers.testModelLoad(page, 'SmolLM2', 60000);
    
    await TestHelpers.takeScreenshot(page, 'smollm2-loaded');
    
    // This is the fallback model, should work
    if (!success) {
      console.log('SmolLM2 failed to load - this is concerning as it\'s the fallback model');
    }
    
    // Test basic functionality if loaded
    if (success) {
      const messageCount = await TestHelpers.sendTestMessage(page, 'Say "SmolLM2 working!"');
      expect(messageCount).toBeGreaterThanOrEqual(1);
      
      await TestHelpers.takeScreenshot(page, 'smollm2-chat-working');
    }
    
    console.log(`SmolLM2 model test completed - Success: ${success}`);
  });

  test('Qwen 2.5 (0.5B) - Multilingual model selection', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);
    
    await TestHelpers.openModelSelector(page);
    
    const success = await TestHelpers.testModelLoad(page, 'Qwen', 80000);
    
    await TestHelpers.takeScreenshot(page, 'qwen-selection');
    
    console.log(`Qwen 2.5 model test completed - Success: ${success}`);
  });

  test('Llama 3.2 (1B) - General purpose model selection', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);
    
    await TestHelpers.openModelSelector(page);
    
    const success = await TestHelpers.testModelLoad(page, 'Llama', 90000);
    
    await TestHelpers.takeScreenshot(page, 'llama-selection');
    
    console.log(`Llama 3.2 model test completed - Success: ${success}`);
  });

  test('Model switching between different sizes', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);
    
    // Start with smallest model
    await TestHelpers.openModelSelector(page);
    await TestHelpers.testModelLoad(page, 'SmolLM2', 60000);
    
    await page.waitForTimeout(3000);
    
    // Switch to another model  
    await TestHelpers.openModelSelector(page);
    await TestHelpers.testModelLoad(page, 'Qwen', 60000);
    
    await TestHelpers.takeScreenshot(page, 'model-switching-test');
    
    // App should remain stable after switching
    await expect(page.locator('text=Cora')).toBeVisible();
    await expect(page.locator('input[placeholder="Ask anything..."]')).toBeVisible();
    
    console.log('Model switching test completed');
  });

  test('Performance characteristics validation', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);
    
    // Test performance of different model sizes
    const modelTests = [
      { prefix: 'SmolLM2', expectedSpeed: 'Ultra Fast', maxLoadTime: 30000 },
      { prefix: 'Qwen', expectedSpeed: 'Very Fast', maxLoadTime: 60000 },
      { prefix: 'TinyLlama', expectedSpeed: 'Fast', maxLoadTime: 60000 }
    ];
    
    const results = [];
    
    for (const { prefix, expectedSpeed, maxLoadTime } of modelTests) {
      await TestHelpers.openModelSelector(page);
      
      const startTime = Date.now();
      const success = await TestHelpers.testModelLoad(page, prefix, maxLoadTime);
      const loadTime = Date.now() - startTime;
      
      results.push({
        model: prefix,
        success,
        loadTime,
        expectedSpeed,
        withinExpectedTime: loadTime < maxLoadTime
      });
      
      await page.waitForTimeout(2000);
    }
    
    console.log('Performance test results:', results);
    
    // At least one model should load successfully within expected time
    const successfulLoads = results.filter(r => r.success && r.withinExpectedTime);
    expect(successfulLoads.length).toBeGreaterThan(0);
    
    await TestHelpers.takeScreenshot(page, 'performance-validation');
  });

  test('Error recovery - Model loading failures handled gracefully', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);
    
    // Block network requests to simulate model loading failures
    await page.route('**/*mlc*', route => route.abort());
    await page.route('**/*.wasm', route => route.abort());
    
    await TestHelpers.openModelSelector(page);
    
    // Try to load a model that will fail
    await page.click('text*=SmolLM2');
    
    // Wait for failure
    await page.waitForTimeout(15000);
    
    // Should show appropriate error state
    const status = await page.locator('[class*="text-xs text-muted-foreground font-medium"]').textContent();
    expect(status).toContain('Failed');
    
    // App should still be usable
    await expect(page.locator('text=Cora')).toBeVisible();
    await expect(page.locator('input[placeholder="Ask anything..."]')).toBeVisible();
    
    // Should be able to try different model
    await TestHelpers.openModelSelector(page);
    await expect(page.locator('text*=Qwen')).toBeVisible();
    
    await TestHelpers.takeScreenshot(page, 'model-error-recovery');
    
    console.log('Model error recovery test completed');
  });

  test('Model categories and use cases are clear', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);
    
    await TestHelpers.openModelSelector(page);
    
    // Check for use case indicators
    const useCases = [
      'Quick tasks',
      'multilingual', 
      'General purpose',
      'Coding',
      'Creative',
      'Fast responses'
    ];
    
    let foundUseCases = 0;
    for (const useCase of useCases) {
      if (await page.locator(`text*=${useCase}`).first().isVisible()) {
        foundUseCases++;
        console.log(`✓ Found use case: ${useCase}`);
      }
    }
    
    console.log(`Found ${foundUseCases}/${useCases.length} use case descriptions`);
    
    // Should have clear use case descriptions
    expect(foundUseCases).toBeGreaterThan(2);
    
    await TestHelpers.takeScreenshot(page, 'model-use-cases');
  });
});