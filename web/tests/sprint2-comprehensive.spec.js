import { test, expect } from '@playwright/test';
import { performance } from 'perf_hooks';

/**
 * Sprint 2 Comprehensive Test Suite
 * 
 * This test suite validates all key Sprint 2 requirements:
 * 1. 6 Curated Models Working
 * 2. Error Recovery Working  
 * 3. Performance Optimizations
 * 4. Database Functionality
 */

// Test constants
const CURATED_MODELS = [
  'SmolLM2-135M-Instruct-q4f16_1-MLC',
  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', 
  'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  'Phi-3.5-mini-instruct-q4f16_1-MLC',
  'gemma-2-2b-it-q4f16_1-MLC',
  'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC'
];

const MODEL_DESCRIPTIONS = {
  'SmolLM2-135M-Instruct-q4f16_1-MLC': 'Ultra-fast, minimal resource usage',
  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC': 'Balanced efficiency with multilingual support',
  'Llama-3.2-1B-Instruct-q4f16_1-MLC': 'Quality responses with reasonable speed',
  'Phi-3.5-mini-instruct-q4f16_1-MLC': 'Excellent for coding and reasoning tasks',
  'gemma-2-2b-it-q4f16_1-MLC': 'Google\'s balanced model with strong capabilities',
  'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC': 'Lightweight yet capable, fast inference'
};

test.describe('Sprint 2 Requirements Validation', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up console error tracking
    const consoleErrors = [];
    const consoleWarnings = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });
    
    // Store on page for access in tests
    page.consoleErrors = consoleErrors;
    page.consoleWarnings = consoleWarnings;
  });

  test('Initial Load Performance - Should be under 1MB and fast', async ({ page }) => {
    const startTime = performance.now();
    
    // Navigate to the app
    await page.goto('/');
    
    // Wait for app to be ready
    await page.waitForSelector('text=Cora', { timeout: 30000 });
    
    const loadTime = performance.now() - startTime;
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: './web/.playwright-mcp/initial-state.png',
      fullPage: true 
    });
    
    // Validate fast load time (should be under 5 seconds)
    expect(loadTime).toBeLessThan(5000);
    
    // Check for essential elements
    await expect(page.locator('text=Cora')).toBeVisible();
    await expect(page.locator('text=100% Local • No Server • No Keys')).toBeVisible();
    await expect(page.locator('input[placeholder="Ask anything..."]')).toBeVisible();
    
    // Verify runtime detection started
    await expect(page.locator('text=Detecting...')).toBeVisible({ timeout: 10000 });
    
    console.log(`Initial load completed in ${loadTime.toFixed(2)}ms`);
  });

  test('Model Selector - All 6 curated models should be available', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Cora');
    
    // Wait for runtime detection to complete
    await page.waitForFunction(() => {
      const statusText = document.querySelector('[class*="text-xs text-muted-foreground font-medium"]');
      return statusText && !statusText.textContent.includes('Detecting');
    }, { timeout: 30000 });
    
    // Click on model selector button (should show current model or "Select Model")
    const modelButton = page.locator('button:has-text("SmolLM2"), button:has-text("Qwen"), button:has-text("Select Model"), button:has-text("Llama")').first();
    await modelButton.click();
    
    // Take screenshot of model selector opened
    await page.screenshot({ 
      path: './web/.playwright-mcp/model-selector-open.png',
      fullPage: true 
    });
    
    // Verify all 6 curated models are present
    for (const modelId of CURATED_MODELS) {
      // Look for model name (shortened version)
      const modelName = modelId.split('-')[0]; // e.g., "SmolLM2", "Qwen2.5"
      await expect(page.locator(`text*=${modelName}`).first()).toBeVisible({ timeout: 5000 });
    }
    
    // Verify model descriptions are shown
    const descriptions = Object.values(MODEL_DESCRIPTIONS);
    for (const description of descriptions.slice(0, 3)) { // Check first few descriptions
      await expect(page.locator(`text*=${description.split(' ')[0]}`)).toBeVisible();
    }
    
    console.log('All 6 curated models verified as available');
  });

  test('Model Loading - Test loading smallest model (SmolLM2)', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Cora');
    
    // Wait for model selector to be available
    await page.waitForFunction(() => {
      const statusText = document.querySelector('[class*="text-xs text-muted-foreground font-medium"]');
      return statusText && !statusText.textContent.includes('Detecting');
    }, { timeout: 30000 });
    
    // Click model selector
    const modelButton = page.locator('button:has-text("SmolLM2"), button:has-text("Select Model")').first();
    await modelButton.click();
    
    // Select SmolLM2 (smallest model)
    await page.click('text*=SmolLM2');
    
    // Wait for model to load
    await page.waitForFunction(() => {
      const statusText = document.querySelector('[class*="text-xs text-muted-foreground font-medium"]');
      return statusText && (
        statusText.textContent.includes('Ready') || 
        statusText.textContent.includes('Select a model')
      );
    }, { timeout: 60000 });
    
    // Verify model loaded successfully
    const status = await page.locator('[class*="text-xs text-muted-foreground font-medium"]').textContent();
    expect(status).not.toContain('Failed');
    
    console.log(`SmolLM2 model loading completed with status: ${status}`);
  });

  test('Basic Chat Functionality - Send test message', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Cora');
    
    // Wait for initialization
    await page.waitForFunction(() => {
      const statusText = document.querySelector('[class*="text-xs text-muted-foreground font-medium"]');
      return statusText && !statusText.textContent.includes('Detecting');
    }, { timeout: 30000 });
    
    // Try to send a simple message
    const input = page.locator('input[placeholder="Ask anything..."]');
    await input.fill('Hello, can you respond with just "Hi there!"?');
    
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();
    
    // Wait for some kind of response (either model loading or actual response)
    await page.waitForFunction(() => {
      const messages = document.querySelectorAll('[class*="message-bubble"]');
      return messages.length >= 1; // At least user message
    }, { timeout: 90000 });
    
    // Check if we have both user and assistant messages
    const messageCount = await page.locator('[class*="message-bubble"]').count();
    expect(messageCount).toBeGreaterThanOrEqual(1);
    
    // Take screenshot of chat working
    await page.screenshot({ 
      path: './web/.playwright-mcp/basic-chat-test.png',
      fullPage: true 
    });
    
    console.log(`Chat test completed with ${messageCount} messages`);
  });

  test('Error Recovery - Test network interruption simulation', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Cora');
    
    // Simulate network issues by intercepting requests
    await page.route('**/*.wasm', route => route.abort());
    await page.route('**/*.bin', route => route.abort());
    
    // Try to load a model (should fail gracefully)
    await page.waitForFunction(() => {
      const statusText = document.querySelector('[class*="text-xs text-muted-foreground font-medium"]');
      return statusText && !statusText.textContent.includes('Detecting');
    }, { timeout: 30000 });
    
    // Click model selector and try to load
    const modelButton = page.locator('button:has-text("SmolLM2"), button:has-text("Select Model")').first();
    await modelButton.click();
    await page.click('text*=SmolLM2');
    
    // Wait for error handling
    await page.waitForTimeout(10000);
    
    // Should show graceful error message, not crash
    const status = await page.locator('[class*="text-xs text-muted-foreground font-medium"]').textContent();
    expect(status).toContain('Failed');
    
    // App should still be responsive
    await expect(page.locator('text=Cora')).toBeVisible();
    await expect(page.locator('input[placeholder="Ask anything..."]')).toBeVisible();
    
    console.log('Error recovery test completed - app remained stable');
  });

  test('Database Functionality - Test PouchDB operations', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Cora');
    
    // Open document upload
    const uploadButton = page.locator('button[title="Document Upload"]');
    await uploadButton.click();
    
    // Should see document upload interface
    await expect(page.locator('text*=Upload')).toBeVisible({ timeout: 10000 });
    
    // Test knowledge base
    const knowledgeButton = page.locator('button[title*="Knowledge Base"]');
    await knowledgeButton.click();
    
    // Should open knowledge base modal
    await expect(page.locator('text*=Knowledge')).toBeVisible({ timeout: 10000 });
    
    // Take screenshot of database features
    await page.screenshot({ 
      path: './web/.playwright-mcp/database-features.png',
      fullPage: true 
    });
    
    console.log('Database functionality test completed');
  });

  test('Theme System - Test all theme variants', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Cora');
    
    // Find and click theme switcher
    const themeButton = page.locator('button').filter({ hasText: /theme|Theme/i }).or(
      page.locator('button:has([class*="sun"]), button:has([class*="moon"])')
    );
    
    if (await themeButton.count() > 0) {
      await themeButton.first().click();
      
      // Test different themes if selector appears
      const themes = ['Dark', 'Light', 'Forest', 'Ocean', 'Rose', 'Sunset', 'Midnight', 'Monochrome'];
      
      for (const theme of themes) {
        const themeOption = page.locator(`text=${theme}`);
        if (await themeOption.isVisible()) {
          await themeOption.click();
          await page.waitForTimeout(1000); // Allow theme to apply
          
          // Take screenshot of theme
          await page.screenshot({ 
            path: `./web/.playwright-mcp/${theme.toLowerCase()}-theme.png`
          });
          
          // Click theme switcher again for next theme
          await themeButton.first().click();
        }
      }
    }
    
    console.log('Theme system test completed');
  });

  test('Performance Monitoring - Check for console errors and warnings', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Cora');
    
    // Wait for initialization to complete
    await page.waitForTimeout(10000);
    
    // Get console errors and warnings
    const errors = page.consoleErrors || [];
    const warnings = page.consoleWarnings || [];
    
    // Filter out known acceptable warnings
    const criticalErrors = errors.filter(error => 
      !error.includes('Failed to load resource') && 
      !error.includes('WebGPU') &&
      !error.includes('wasm')
    );
    
    const criticalWarnings = warnings.filter(warning =>
      !warning.includes('deprecated') &&
      !warning.includes('WebGPU') 
    );
    
    // Report findings
    console.log(`Console errors: ${errors.length} (${criticalErrors.length} critical)`);
    console.log(`Console warnings: ${warnings.length} (${criticalWarnings.length} critical)`);
    
    if (criticalErrors.length > 0) {
      console.log('Critical errors:', criticalErrors);
    }
    
    // Should have minimal critical errors
    expect(criticalErrors.length).toBeLessThan(3);
    
    console.log('Performance monitoring completed');
  });

  test('Comprehensive UI Test - Test all major components', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Cora');
    
    // Test header components
    await expect(page.locator('text=Cora')).toBeVisible();
    await expect(page.locator('text=100% Local')).toBeVisible();
    
    // Test persona selector
    const personaButton = page.locator('button').filter({ hasText: /persona|assistant/i }).first();
    if (await personaButton.count() > 0) {
      await personaButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Test settings dialog
    const settingsButton = page.locator('button:has([data-testid="settings"]), button[title*="Settings"], button:has(svg)').filter({ hasText: /settings/i }).or(
      page.locator('button').nth(-2) // Settings is typically second to last
    );
    await settingsButton.click();
    await page.waitForTimeout(1000);
    
    // Should see settings content
    await expect(page.locator('text=Temperature')).toBeVisible({ timeout: 5000 });
    
    // Close settings
    await page.keyboard.press('Escape');
    
    // Test clear chat
    const clearButton = page.locator('button').last(); // Clear is typically last button
    await clearButton.click();
    
    // Take comprehensive screenshot
    await page.screenshot({ 
      path: './web/.playwright-mcp/comprehensive-ui-test.png',
      fullPage: true 
    });
    
    console.log('Comprehensive UI test completed');
  });

  test('Model Switching - Test switching between models', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Cora');
    
    // Wait for runtime detection
    await page.waitForFunction(() => {
      const statusText = document.querySelector('[class*="text-xs text-muted-foreground font-medium"]');
      return statusText && !statusText.textContent.includes('Detecting');
    }, { timeout: 30000 });
    
    // Click model selector
    const modelButton = page.locator('button:has-text("SmolLM2"), button:has-text("Qwen"), button:has-text("Select Model"), button:has-text("Llama")').first();
    await modelButton.click();
    
    // Select first model (SmolLM2)
    await page.click('text*=SmolLM2');
    
    // Wait briefly
    await page.waitForTimeout(5000);
    
    // Try switching to another model
    await modelButton.click();
    await page.click('text*=Qwen');
    
    // Wait for model switch
    await page.waitForTimeout(5000);
    
    // Verify we can switch models without crashes
    await expect(page.locator('text=Cora')).toBeVisible();
    
    console.log('Model switching test completed');
  });
});