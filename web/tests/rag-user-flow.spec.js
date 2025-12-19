import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('RAG User Flow - Real User Simulation', () => {
  test('Complete RAG workflow as a real user would do it', async ({ page }) => {
    // Capture console messages
    const consoleMessages = [];
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push(`[${type}] ${text}`);
      if (type === 'error' || type === 'warning') {
        console.log(`Browser ${type}: ${text}`);
      }
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      console.error('Page error:', error.message);
      consoleMessages.push(`[pageerror] ${error.message}`);
    });
    
    // Start fresh
    await page.goto('http://localhost:8001');
    await page.waitForLoadState('networkidle');
    console.log('1. Page loaded');
    
    // Step 1: Click Document Upload button
    console.log('2. Looking for Document Upload button...');
    const uploadButton = page.locator('button[title="Document Upload"]');
    await expect(uploadButton).toBeVisible({ timeout: 10000 });
    await uploadButton.click();
    console.log('3. Clicked Document Upload button');
    
    // Wait for upload modal/area to appear
    await page.waitForTimeout(2000);
    
    // Step 2: Upload the test document
    console.log('4. Looking for file input...');
    const fileInput = page.locator('input[type="file"]');
    const testFilePath = path.join(process.cwd(), 'test-document.txt');
    
    if (await fileInput.count() > 0) {
      console.log('5. Found file input, uploading test-document.txt...');
      await fileInput.setInputFiles(testFilePath);
      console.log('6. File selected for upload');
      
      // Wait for upload to complete
      await page.waitForTimeout(3000);
      console.log('7. Upload should be complete');
      
      // Take screenshot of upload state
      await page.screenshot({ path: '.playwright-mcp/step1-after-upload.png' });
    } else {
      console.error('ERROR: No file input found in Document Upload');
      throw new Error('Cannot find file input for document upload');
    }
    
    // Close upload modal if it's still open
    const closeButtons = page.locator('button').filter({ hasText: '×' });
    if (await closeButtons.count() > 0) {
      await closeButtons.first().click();
      console.log('8. Closed upload modal');
      await page.waitForTimeout(1000);
    }
    
    // Step 3: Click Knowledge Base button (same session)
    console.log('9. Looking for Knowledge Base button...');
    const knowledgeButton = page.locator('button[title="Knowledge Base"]');
    await expect(knowledgeButton).toBeVisible({ timeout: 10000 });
    await knowledgeButton.click();
    console.log('10. Clicked Knowledge Base button');
    
    // Wait for Knowledge Base modal to open
    await page.waitForSelector('text=/Knowledge Base/i', { timeout: 10000 });
    console.log('11. Knowledge Base modal opened');
    await page.waitForTimeout(2000);
    
    // Check if document appears in the list
    const documentsList = page.locator('text=/test-document/i');
    if (await documentsList.count() > 0) {
      console.log('12. SUCCESS: Document appears in Knowledge Base');
    } else {
      console.log('12. WARNING: Document not visible in list yet');
    }
    
    // Take screenshot before initializing RAG
    await page.screenshot({ path: '.playwright-mcp/step2-knowledge-base-open.png' });
    
    // Step 4: Click Initialize RAG button (same session)
    console.log('13. Looking for Initialize RAG button...');
    const initRAGButton = page.locator('button:has-text("Initialize RAG")');
    
    if (await initRAGButton.isVisible()) {
      console.log('14. Found Initialize RAG button, clicking...');
      await initRAGButton.click();
      console.log('15. Clicked Initialize RAG');
      
      // Wait for initialization to start
      await page.waitForTimeout(8000);
      
      // Monitor for errors - look for any error text
      const errorElements = page.locator('text=/error|failed|cannot read/i');
      const errors = [];
      const errorCount = await errorElements.count();
      
      console.log(`Found ${errorCount} potential error elements`);
      
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errorElements.nth(i).textContent();
        if (!errorText.toLowerCase().includes('loading') && 
            !errorText.toLowerCase().includes('initializing')) {
          errors.push(errorText);
          console.error(`ERROR FOUND: ${errorText}`);
        }
      }
      
      // Also check for any alert/error modals
      const alertElements = page.locator('[role="alert"], .error, .alert');
      const alertCount = await alertElements.count();
      for (let i = 0; i < alertCount; i++) {
        const alertText = await alertElements.nth(i).textContent();
        if (alertText && alertText.trim()) {
          errors.push(`Alert: ${alertText}`);
          console.error(`ALERT FOUND: ${alertText}`);
        }
      }
      
      // Check RAG status
      const statusElement = page.locator('text=/Ready|Offline|Initializing/i').first();
      if (await statusElement.isVisible()) {
        const status = await statusElement.textContent();
        console.log(`16. RAG Status: ${status}`);
      }
      
      // Take final screenshot
      await page.screenshot({ path: '.playwright-mcp/step3-after-init-rag.png' });
      
      // Report results
      if (errors.length > 0) {
        console.error('\n=== ERRORS FOUND ===');
        errors.forEach(err => console.error(`- ${err}`));
        throw new Error(`Found ${errors.length} errors during RAG initialization`);
      } else {
        console.log('\n=== SUCCESS ===');
        console.log('RAG workflow completed without errors');
      }
      
    } else {
      console.log('14. Initialize RAG button not found - checking if already initialized');
      const statusElement = page.locator('text=/Ready/i').first();
      if (await statusElement.isVisible()) {
        console.log('15. RAG already initialized (status: Ready)');
      } else {
        throw new Error('Initialize RAG button not found and RAG not ready');
      }
    }
    
    // Final wait to observe any delayed errors
    await page.waitForTimeout(3000);
    
    // Log all console messages for debugging
    console.log('\n=== BROWSER CONSOLE MESSAGES ===');
    consoleMessages.forEach(msg => {
      if (msg.includes('error') || msg.includes('Error') || msg.includes('failed')) {
        console.error(msg);
      } else {
        console.log(msg);
      }
    });
    
    console.log('\nTest completed - check screenshots in .playwright-mcp/ folder');
  });
});