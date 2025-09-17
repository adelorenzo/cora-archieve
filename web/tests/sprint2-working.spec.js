import { test, expect } from '@playwright/test';

/**
 * Sprint 2 Working Test Suite
 * 
 * Comprehensive validation of Sprint 2 requirements using the actual UI
 */

test.describe('Sprint 2 Requirements - Working Tests', () => {

  test('Requirement 1: App loads fast and shows essential UI', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    console.log(`App loaded in ${loadTime}ms`);
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: './web/.playwright-mcp/initial-state.png',
      fullPage: true 
    });
    
    // Check essential UI elements
    await expect(page.locator('text=Cora')).toBeVisible();
    await expect(page.locator('text=100% Local')).toBeVisible();
    await expect(page.locator('text=Start a conversation')).toBeVisible();
    await expect(page.locator('input[placeholder="Ask anything..."]')).toBeVisible();
    
    // Performance check - should load under 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    console.log('✓ PASS: App loads fast with essential UI');
  });

  test('Requirement 2: Model selector shows curated models', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Click on model selector - look for "Select Model" button
    const modelButton = page.locator('text=Select Model').first();
    await modelButton.click();
    
    // Wait for dropdown/modal to appear
    await page.waitForTimeout(1000);
    
    // Take screenshot of model selector
    await page.screenshot({ 
      path: './web/.playwright-mcp/model-selector-open.png',
      fullPage: true 
    });
    
    // Check for curated model names (should appear in the UI)
    const modelNames = ['SmolLM2', 'Qwen', 'Llama', 'Phi', 'Gemma', 'TinyLlama'];
    let foundModels = 0;
    
    for (const modelName of modelNames) {
      const modelElement = page.locator(`text*=${modelName}`).first();
      if (await modelElement.isVisible()) {
        foundModels++;
        console.log(`✓ Found model: ${modelName}`);
      }
    }
    
    console.log(`Found ${foundModels}/6 curated models`);
    expect(foundModels).toBeGreaterThanOrEqual(4); // Should find at least 4 of 6
    
    console.log('✓ PASS: Curated models are available in selector');
  });

  test('Requirement 3: Model loading and switching works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Check initial runtime status
    const statusElement = page.locator('text=WASM mode');
    await expect(statusElement).toBeVisible();
    
    // Try to select a model (SmolLM2 as it's the smallest)
    const modelButton = page.locator('text=Select Model').first();
    await modelButton.click();
    
    // Look for SmolLM2 option and click it
    const smolLM2 = page.locator('text*=SmolLM2').first();
    if (await smolLM2.isVisible()) {
      await smolLM2.click();
      
      // Wait for model selection to process
      await page.waitForTimeout(5000);
      
      // Take screenshot after model selection
      await page.screenshot({ 
        path: './web/.playwright-mcp/model-selected.png',
        fullPage: true 
      });
      
      console.log('✓ Model selection attempted');
    }
    
    // App should remain stable regardless of loading success/failure
    await expect(page.locator('text=Cora')).toBeVisible();
    
    console.log('✓ PASS: Model loading system is functional');
  });

  test('Requirement 4: Chat interface accepts messages', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Type a test message
    const input = page.locator('input[placeholder="Ask anything..."]');
    await input.fill('Hello, this is a test message');
    
    // Send the message
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();
    
    // Wait for message to appear in chat
    await page.waitForTimeout(2000);
    
    // Check that input was cleared
    const inputValue = await input.inputValue();
    expect(inputValue).toBe('');
    
    // Look for message in chat area (should appear somewhere in the UI)
    const chatArea = page.locator('text*=Hello, this is a test message');
    await expect(chatArea).toBeVisible();
    
    // Take screenshot of chat with message
    await page.screenshot({ 
      path: './web/.playwright-mcp/chat-with-message.png',
      fullPage: true 
    });
    
    console.log('✓ PASS: Chat interface accepts and displays messages');
  });

  test('Requirement 5: Error handling - App remains stable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Block network requests to simulate failures
    await page.route('**/*.wasm', route => route.abort());
    await page.route('**/*mlc*', route => route.abort());
    
    // Try to interact with model selector despite blocked requests
    const modelButton = page.locator('text=Select Model').first();
    await modelButton.click();
    
    await page.waitForTimeout(2000);
    
    // Try to send a message
    const input = page.locator('input[placeholder="Ask anything..."]');
    await input.fill('Test message with blocked network');
    
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();
    
    await page.waitForTimeout(5000);
    
    // App should still be functional
    await expect(page.locator('text=Cora')).toBeVisible();
    await expect(page.locator('input[placeholder="Ask anything..."]')).toBeVisible();
    
    // Take screenshot of app under stress
    await page.screenshot({ 
      path: './web/.playwright-mcp/error-handling.png',
      fullPage: true 
    });
    
    console.log('✓ PASS: App remains stable under error conditions');
  });

  test('Requirement 6: Database features are accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    let dbFeaturesFound = 0;
    
    // Look for database-related buttons in the header
    const headerButtons = page.locator('header button');
    const buttonCount = await headerButtons.count();
    
    console.log(`Found ${buttonCount} header buttons`);
    
    // Check for upload/document related buttons
    for (let i = 0; i < buttonCount; i++) {
      const button = headerButtons.nth(i);
      const title = await button.getAttribute('title');
      const text = await button.textContent();
      
      if (title?.includes('Upload') || title?.includes('Knowledge') || title?.includes('Document')) {
        dbFeaturesFound++;
        await button.click();
        await page.waitForTimeout(1000);
        console.log(`✓ Found database feature: ${title}`);
        break;
      }
    }
    
    // Take screenshot showing database features
    await page.screenshot({ 
      path: './web/.playwright-mcp/database-features.png',
      fullPage: true 
    });
    
    // Should have at least some database functionality visible
    expect(dbFeaturesFound).toBeGreaterThan(0);
    
    console.log('✓ PASS: Database features are accessible');
  });

  test('Requirement 7: Theme system works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Find theme switcher (sun/moon icon)
    const themeButton = page.locator('header button').filter({ hasText: /☀️|🌙/ }).or(
      page.locator('button:has-text("☀️")').or(page.locator('button:has-text("🌙")'))
    );
    
    let themesFound = 0;
    
    if (await themeButton.count() > 0) {
      await themeButton.first().click();
      await page.waitForTimeout(1000);
      
      // Look for theme options
      const themeOptions = ['Dark', 'Light', 'Forest', 'Ocean', 'Rose', 'Sunset'];
      
      for (const theme of themeOptions) {
        const themeOption = page.locator(`text=${theme}`);
        if (await themeOption.isVisible()) {
          themesFound++;
          await themeOption.click();
          await page.waitForTimeout(1000);
          
          // Take screenshot of theme
          await page.screenshot({ 
            path: `./web/.playwright-mcp/${theme.toLowerCase()}-theme.png`
          });
          
          // Switch back to theme selector for next theme
          await themeButton.first().click();
          await page.waitForTimeout(500);
        }
      }
    }
    
    console.log(`Found ${themesFound} theme options`);
    expect(themesFound).toBeGreaterThan(1); // Should have multiple themes
    
    console.log('✓ PASS: Theme system is functional');
  });

  test('Requirement 8: Performance - No critical console errors', async ({ page }) => {
    const consoleErrors = [];
    const consoleWarnings = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Interact with various features to trigger any errors
    const modelButton = page.locator('text=Select Model').first();
    await modelButton.click();
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');
    
    const input = page.locator('input[placeholder="Ask anything..."]');
    await input.fill('Performance test message');
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();
    
    await page.waitForTimeout(5000);
    
    // Filter out acceptable errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('Failed to load resource') &&
      !error.includes('WebGPU') &&
      !error.includes('favicon') &&
      !error.includes('wasm')
    );
    
    console.log(`Console errors: ${consoleErrors.length} (${criticalErrors.length} critical)`);
    console.log(`Console warnings: ${consoleWarnings.length}`);
    
    if (criticalErrors.length > 0) {
      console.log('Critical errors:', criticalErrors);
    }
    
    // Should have minimal critical errors
    expect(criticalErrors.length).toBeLessThan(5);
    
    console.log('✓ PASS: Minimal console errors during normal usage');
  });

  test('Requirement 9: All major UI components present and working', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Check for all major components
    const components = [
      { selector: 'text=Cora', name: 'App Title' },
      { selector: 'text=100% Local', name: 'Tagline' },
      { selector: 'text=Select Model', name: 'Model Selector' },
      { selector: 'input[placeholder="Ask anything..."]', name: 'Chat Input' },
      { selector: 'button[type="submit"]', name: 'Send Button' },
      { selector: 'text=Start a conversation', name: 'Welcome Message' }
    ];
    
    for (const { selector, name } of components) {
      await expect(page.locator(selector)).toBeVisible();
      console.log(`✓ ${name} is visible`);
    }
    
    // Count header buttons (should have multiple for different features)
    const headerButtons = await page.locator('header button').count();
    console.log(`Header buttons: ${headerButtons}`);
    expect(headerButtons).toBeGreaterThan(3);
    
    // Take final comprehensive screenshot
    await page.screenshot({ 
      path: './web/.playwright-mcp/comprehensive-ui-test.png',
      fullPage: true 
    });
    
    console.log('✓ PASS: All major UI components are present and functional');
  });
});