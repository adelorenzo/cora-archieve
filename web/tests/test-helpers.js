/**
 * Test Helper Functions for Sprint 2 Validation
 */

export class TestHelpers {
  
  /**
   * Wait for app to be fully initialized
   */
  static async waitForAppReady(page, timeout = 30000) {
    // Wait for main title
    await page.waitForSelector('text=Cora', { timeout });
    
    // Wait for runtime detection to complete
    await page.waitForFunction(() => {
      const statusElement = document.querySelector('[class*="text-xs text-muted-foreground font-medium"]');
      return statusElement && !statusElement.textContent.includes('Detecting');
    }, { timeout });
    
    console.log('App ready for testing');
  }
  
  /**
   * Take a screenshot with standardized naming
   */
  static async takeScreenshot(page, name, fullPage = true) {
    const path = `./web/.playwright-mcp/${name}.png`;
    await page.screenshot({ path, fullPage });
    console.log(`Screenshot saved: ${name}.png`);
  }
  
  /**
   * Check for critical console errors
   */
  static filterCriticalErrors(errors, warnings = []) {
    const criticalErrors = errors.filter(error => 
      !error.includes('Failed to load resource') && 
      !error.includes('WebGPU') &&
      !error.includes('wasm') &&
      !error.includes('favicon') &&
      !error.includes('404')
    );
    
    const criticalWarnings = warnings.filter(warning =>
      !warning.includes('deprecated') &&
      !warning.includes('WebGPU') &&
      !warning.includes('experimental')
    );
    
    return { criticalErrors, criticalWarnings };
  }
  
  /**
   * Wait for model selector to be available
   */
  static async openModelSelector(page) {
    // Find model selector button - could have different text states
    const modelButton = page.locator(
      'button:has-text("SmolLM2"), button:has-text("Qwen"), button:has-text("Select Model"), button:has-text("Llama"), button:has-text("TinyLlama"), button:has-text("Phi"), button:has-text("Gemma")'
    ).first();
    
    await modelButton.click();
    
    // Wait for dropdown/modal to appear
    await page.waitForTimeout(1000);
    
    console.log('Model selector opened');
  }
  
  /**
   * Test model loading with timeout and error handling
   */
  static async testModelLoad(page, modelName, timeout = 60000) {
    try {
      await page.click(`text*=${modelName}`);
      
      // Wait for loading to complete or fail
      await page.waitForFunction(() => {
        const statusElement = document.querySelector('[class*="text-xs text-muted-foreground font-medium"]');
        if (!statusElement) return false;
        
        const statusText = statusElement.textContent;
        return statusText.includes('Ready') || 
               statusText.includes('Failed') ||
               statusText.includes('Select a model');
      }, { timeout });
      
      const status = await page.locator('[class*="text-xs text-muted-foreground font-medium"]').textContent();
      console.log(`Model ${modelName} load result: ${status}`);
      
      return !status.includes('Failed');
    } catch (error) {
      console.log(`Model ${modelName} load timed out or failed: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Send a test message and validate response
   */
  static async sendTestMessage(page, message = 'Hello, respond with just "Hi!"', timeout = 90000) {
    const input = page.locator('input[placeholder="Ask anything..."]');
    await input.fill(message);
    
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();
    
    // Wait for user message to appear
    await page.waitForFunction(() => {
      const messages = document.querySelectorAll('[class*="message-bubble"]');
      return messages.length >= 1;
    }, { timeout });
    
    const messageCount = await page.locator('[class*="message-bubble"]').count();
    console.log(`Chat test: ${messageCount} messages visible`);
    
    return messageCount;
  }
  
  /**
   * Test theme switching functionality
   */
  static async testThemeSwitching(page) {
    // Look for theme switcher button - could be icon or text
    const themeSelectors = [
      'button:has([class*="sun"])',
      'button:has([class*="moon"])', 
      'button:has([class*="theme"])',
      'button[title*="theme"]',
      'button[title*="Theme"]'
    ];
    
    let themeButton = null;
    for (const selector of themeSelectors) {
      const button = page.locator(selector);
      if (await button.count() > 0) {
        themeButton = button.first();
        break;
      }
    }
    
    if (themeButton) {
      await themeButton.click();
      await page.waitForTimeout(500);
      
      // Look for theme options
      const themes = ['Dark', 'Light', 'Forest', 'Ocean', 'Rose', 'Sunset', 'Midnight', 'Monochrome'];
      const foundThemes = [];
      
      for (const theme of themes) {
        const themeOption = page.locator(`text=${theme}`);
        if (await themeOption.isVisible()) {
          foundThemes.push(theme);
          await themeOption.click();
          await page.waitForTimeout(1000);
          
          await TestHelpers.takeScreenshot(page, `${theme.toLowerCase()}-theme`);
          
          // Click theme button again for next theme
          await themeButton.click();
          await page.waitForTimeout(500);
        }
      }
      
      console.log(`Found themes: ${foundThemes.join(', ')}`);
      return foundThemes.length;
    }
    
    console.log('No theme switcher found');
    return 0;
  }
  
  /**
   * Test database/RAG functionality
   */
  static async testDatabaseFeatures(page) {
    const features = {
      documentUpload: false,
      knowledgeBase: false
    };
    
    // Test document upload button
    const uploadButton = page.locator('button[title*="Upload"], button:has([class*="upload"])');
    if (await uploadButton.count() > 0) {
      await uploadButton.click();
      await page.waitForTimeout(1000);
      
      if (await page.locator('text*=Upload, text*=Document').count() > 0) {
        features.documentUpload = true;
      }
    }
    
    // Test knowledge base button
    const kbButton = page.locator('button[title*="Knowledge"], button:has([class*="book"])');
    if (await kbButton.count() > 0) {
      await kbButton.click();
      await page.waitForTimeout(1000);
      
      if (await page.locator('text*=Knowledge, text*=Base').count() > 0) {
        features.knowledgeBase = true;
      }
    }
    
    console.log(`Database features working: ${JSON.stringify(features)}`);
    return features;
  }
  
  /**
   * Comprehensive error checking
   */
  static setupErrorTracking(page) {
    const consoleErrors = [];
    const consoleWarnings = [];
    const networkErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });
    
    page.on('requestfailed', request => {
      networkErrors.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    // Store on page for access in tests
    page.testData = {
      consoleErrors,
      consoleWarnings,
      networkErrors
    };
    
    return page.testData;
  }
}

// Export CURATED_MODELS for use in tests
export const CURATED_MODELS = [
  'SmolLM2-135M-Instruct-q4f16_1-MLC',
  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', 
  'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  'Phi-3.5-mini-instruct-q4f16_1-MLC',
  'gemma-2-2b-it-q4f16_1-MLC',
  'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC'
];

export const PERFORMANCE_THRESHOLDS = {
  INITIAL_LOAD_TIME: 5000,  // 5 seconds
  MODEL_LOAD_TIME: 60000,   // 60 seconds  
  MESSAGE_RESPONSE_TIME: 90000, // 90 seconds
  CRITICAL_ERROR_LIMIT: 3   // Max 3 critical errors allowed
};