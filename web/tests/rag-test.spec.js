import { test, expect } from '@playwright/test';

test.describe('RAG Knowledge Base Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8001');
    await page.waitForLoadState('networkidle');
  });

  test('Knowledge Base button should be visible and clickable', async ({ page }) => {
    // Check if Knowledge Base button exists
    const knowledgeButton = page.locator('button[title="Knowledge Base"]');
    await expect(knowledgeButton).toBeVisible();
    
    // Click the button
    await knowledgeButton.click();
    
    // Check if modal opens
    const modal = page.locator('text=/Knowledge Base/i').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Take screenshot for debugging
    await page.screenshot({ path: '.playwright-mcp/rag-modal-open.png' });
  });

  test('RAG service initialization', async ({ page }) => {
    // Open browser console to capture errors
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    // Click Knowledge Base button
    const knowledgeButton = page.locator('button[title="Knowledge Base"]');
    await knowledgeButton.click();
    
    // Wait for modal
    await page.waitForSelector('text=/Knowledge Base/i', { timeout: 5000 });
    
    // Check for initialization errors in console
    const errors = consoleMessages.filter(msg => 
      msg.type === 'error' && 
      (msg.text.includes('RAG') || msg.text.includes('embedding') || msg.text.includes('knowledge'))
    );
    
    console.log('Console errors related to RAG:', errors);
    
    // Check if upload button exists
    const uploadButton = page.locator('button:has-text("Upload Documents")');
    const uploadButtonExists = await uploadButton.count() > 0;
    
    if (uploadButtonExists) {
      await expect(uploadButton).toBeVisible();
    }
    
    // Check for any error messages in the UI
    const errorMessage = page.locator('text=/error|failed|unable/i');
    const hasError = await errorMessage.count() > 0;
    
    if (hasError) {
      const errorText = await errorMessage.first().textContent();
      console.log('UI Error message:', errorText);
    }
    
    // Take screenshot of current state
    await page.screenshot({ path: '.playwright-mcp/rag-initialization-state.png' });
  });

  test('Check RAG service lazy loading', async ({ page }) => {
    // Monitor network requests
    const ragRequests = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('rag') || url.includes('embedding') || url.includes('transformers')) {
        ragRequests.push({
          url: url,
          method: request.method(),
          resourceType: request.resourceType()
        });
      }
    });

    // Click Knowledge Base button
    const knowledgeButton = page.locator('button[title="Knowledge Base"]');
    await knowledgeButton.click();
    
    // Wait a bit for lazy loading
    await page.waitForTimeout(3000);
    
    console.log('RAG-related network requests:', ragRequests);
    
    // Check if any RAG modules were requested
    expect(ragRequests.length).toBeGreaterThan(0);
  });

  test('Test document upload interface', async ({ page }) => {
    // Click Knowledge Base button
    const knowledgeButton = page.locator('button[title="Knowledge Base"]');
    await knowledgeButton.click();
    
    // Wait for modal
    await page.waitForSelector('text=/Knowledge Base/i', { timeout: 5000 });
    
    // Look for file input
    const fileInput = page.locator('input[type="file"]');
    const hasFileInput = await fileInput.count() > 0;
    
    if (hasFileInput) {
      // Check if file input accepts correct types
      const acceptAttr = await fileInput.getAttribute('accept');
      console.log('File input accepts:', acceptAttr);
      
      expect(acceptAttr).toContain('.pdf');
      expect(acceptAttr).toContain('.txt');
    } else {
      console.log('No file input found - RAG may not be initialized');
    }
    
    // Take screenshot
    await page.screenshot({ path: '.playwright-mcp/rag-upload-interface.png' });
  });

  test('Check for RAG error handling', async ({ page }) => {
    // Intercept console errors
    const errors = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Try to trigger RAG functionality
    const knowledgeButton = page.locator('button[title="Knowledge Base"]');
    await knowledgeButton.click();
    
    // Wait for any async operations
    await page.waitForTimeout(2000);
    
    // Check for specific RAG-related errors
    const ragErrors = errors.filter(err => 
      err.toLowerCase().includes('rag') ||
      err.toLowerCase().includes('embedding') ||
      err.toLowerCase().includes('vector') ||
      err.toLowerCase().includes('transformer') ||
      err.toLowerCase().includes('knowledge')
    );
    
    if (ragErrors.length > 0) {
      console.log('RAG-related errors found:');
      ragErrors.forEach(err => console.log('  -', err));
    }
    
    // Check localStorage for any RAG state
    const ragState = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const ragKeys = keys.filter(key => 
        key.includes('rag') || 
        key.includes('knowledge') || 
        key.includes('embedding')
      );
      const state = {};
      ragKeys.forEach(key => {
        state[key] = localStorage.getItem(key);
      });
      return state;
    });
    
    console.log('RAG state in localStorage:', ragState);
  });

  test('Verify performance optimizer integration', async ({ page }) => {
    // Check if performance optimizer is tracking RAG usage
    const performanceMetrics = await page.evaluate(() => {
      // Try to access performance optimizer if it exists
      if (window.performanceOptimizer) {
        return window.performanceOptimizer.getPerformanceMetrics();
      }
      return null;
    });
    
    console.log('Performance metrics:', performanceMetrics);
    
    // Click Knowledge Base to trigger RAG loading
    const knowledgeButton = page.locator('button[title="Knowledge Base"]');
    await knowledgeButton.click();
    
    // Wait for lazy loading
    await page.waitForTimeout(2000);
    
    // Check metrics again
    const metricsAfter = await page.evaluate(() => {
      if (window.performanceOptimizer) {
        return window.performanceOptimizer.getPerformanceMetrics();
      }
      return null;
    });
    
    console.log('Performance metrics after RAG trigger:', metricsAfter);
  });
});