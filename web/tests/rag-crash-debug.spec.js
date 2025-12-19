import { test, expect } from '@playwright/test';

test.describe('RAG Initialization Debug', () => {
  test('Debug RAG initialization crash', async ({ page }) => {
    // Set up console monitoring
    const consoleMessages = [];
    const errors = [];
    
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push(`[${type}] ${text}`);
      
      if (type === 'error') {
        console.log(`Browser error: ${text}`);
        errors.push(text);
      } else if (type === 'warning') {
        console.log(`Browser warning: ${text}`);
      }
    });
    
    page.on('pageerror', error => {
      console.error('Page error:', error.message);
      errors.push(`Page error: ${error.message}`);
    });

    // Monitor for crashes
    page.on('crash', () => {
      console.error('!!! PAGE CRASHED !!!');
      errors.push('PAGE CRASHED');
    });

    console.log('1. Loading page...');
    await page.goto('http://localhost:8001', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    console.log('2. Page loaded successfully');
    
    // Wait for app to initialize
    await page.waitForTimeout(3000);
    
    // Step 1: Open Knowledge Base
    console.log('3. Looking for Knowledge Base button...');
    const knowledgeButton = page.locator('button[title="Knowledge Base"]');
    await expect(knowledgeButton).toBeVisible({ timeout: 10000 });
    await knowledgeButton.click();
    console.log('4. Clicked Knowledge Base button');
    
    // Wait for modal to open
    await page.waitForSelector('text=/Knowledge Base/i', { timeout: 10000 });
    console.log('5. Knowledge Base modal opened');
    await page.waitForTimeout(2000);
    
    // Take screenshot before initializing
    await page.screenshot({ path: '.playwright-mcp/before-init-rag.png' });
    
    // Step 2: Click Initialize RAG
    console.log('6. Looking for Initialize RAG button...');
    const initRAGButton = page.locator('button:has-text("Initialize RAG")');
    
    if (await initRAGButton.isVisible()) {
      console.log('7. Initialize RAG button found');
      console.log('8. Clicking Initialize RAG button...');
      
      // Click and wait for potential crash
      try {
        await initRAGButton.click();
        console.log('9. Clicked Initialize RAG button');
        
        // Wait to see if page crashes
        await page.waitForTimeout(5000);
        
        // Check if page is still responsive
        const isResponsive = await page.evaluate(() => {
          return document.body !== null;
        }).catch(() => false);
        
        if (!isResponsive) {
          console.error('!!! Page became unresponsive after clicking Initialize RAG !!!');
          errors.push('Page unresponsive after Initialize RAG');
        } else {
          console.log('10. Page is still responsive');
          
          // Check RAG status
          const statusElement = page.locator('text=/Ready|Offline|Initializing/i').first();
          if (await statusElement.isVisible()) {
            const status = await statusElement.textContent();
            console.log(`11. RAG Status: ${status}`);
          }
          
          // Take screenshot after initialization
          await page.screenshot({ path: '.playwright-mcp/after-init-rag.png' });
        }
        
      } catch (error) {
        console.error('Error during RAG initialization:', error.message);
        errors.push(`Init error: ${error.message}`);
        
        // Check if it's a crash
        if (error.message.includes('Target closed') || error.message.includes('crashed')) {
          console.error('!!! PAGE CRASHED DURING INITIALIZATION !!!');
          errors.push('PAGE CRASHED DURING INIT');
        }
      }
      
    } else {
      console.log('7. Initialize RAG button not found - RAG may already be initialized');
    }
    
    // Log all console messages at the end
    console.log('\n=== ALL CONSOLE MESSAGES ===');
    consoleMessages.slice(-50).forEach(msg => console.log(msg));
    
    // Report errors
    if (errors.length > 0) {
      console.error('\n=== ERRORS FOUND ===');
      errors.forEach(err => console.error(err));
      throw new Error(`Test failed with ${errors.length} errors. First error: ${errors[0]}`);
    } else {
      console.log('\n=== TEST COMPLETED WITHOUT CRASHES ===');
    }
  });
});