import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('RAG Full Flow Test', () => {
  test('Complete RAG workflow with documents', async ({ page }) => {
    // Set up monitoring
    const errors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Browser error: ${msg.text()}`);
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.error('Page error:', error.message);
      errors.push(`Page error: ${error.message}`);
    });

    page.on('crash', () => {
      console.error('!!! PAGE CRASHED !!!');
      errors.push('PAGE CRASHED');
    });

    // Step 1: Load page
    console.log('1. Loading page...');
    await page.goto('http://localhost:8001', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Step 2: Upload a document first
    console.log('2. Uploading document...');
    const uploadButton = page.locator('button[title="Document Upload"]');
    await uploadButton.click();
    await page.waitForTimeout(1000);
    
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      const testFilePath = path.join(process.cwd(), 'test-document.txt');
      await fileInput.setInputFiles(testFilePath);
      console.log('3. Document uploaded');
      await page.waitForTimeout(2000);
    }
    
    // Close upload modal
    const closeButtons = page.locator('button').filter({ hasText: '×' });
    if (await closeButtons.count() > 0) {
      await closeButtons.first().click();
      await page.waitForTimeout(1000);
    }
    
    // Step 3: Open Knowledge Base with document loaded
    console.log('4. Opening Knowledge Base...');
    const knowledgeButton = page.locator('button[title="Knowledge Base"]');
    await knowledgeButton.click();
    await page.waitForSelector('text=/Knowledge Base/i', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Check documents are visible
    const documentsList = page.locator('text=/test-document/i');
    const docCount = await documentsList.count();
    console.log(`5. Found ${docCount} document(s) in Knowledge Base`);
    
    // Step 4: Initialize RAG with documents present
    console.log('6. Initializing RAG with documents present...');
    const initRAGButton = page.locator('button:has-text("Initialize RAG")');
    
    if (await initRAGButton.isVisible()) {
      try {
        await initRAGButton.click();
        console.log('7. Clicked Initialize RAG');
        
        // Wait for initialization
        await page.waitForTimeout(5000);
        
        // Check if still responsive
        const isResponsive = await page.evaluate(() => {
          return document.body !== null;
        }).catch(() => false);
        
        if (!isResponsive) {
          console.error('!!! Page unresponsive after RAG init with documents !!!');
          errors.push('Page unresponsive with documents');
        } else {
          console.log('8. Page still responsive after init');
          
          // Check for Index All button
          const indexButton = page.locator('button:has-text("Index All")');
          if (await indexButton.isVisible()) {
            console.log('9. Index All button appeared');
            
            // Try clicking Index All
            try {
              await indexButton.click();
              console.log('10. Clicked Index All');
              await page.waitForTimeout(5000);
              
              // Check if still responsive
              const stillResponsive = await page.evaluate(() => {
                return document.body !== null;
              }).catch(() => false);
              
              if (!stillResponsive) {
                console.error('!!! Page crashed during indexing !!!');
                errors.push('Page crashed during indexing');
              } else {
                console.log('11. Indexing completed without crash');
              }
              
            } catch (indexError) {
              console.error('Error during indexing:', indexError.message);
              errors.push(`Indexing error: ${indexError.message}`);
            }
          }
        }
        
      } catch (error) {
        console.error('Error during RAG initialization:', error.message);
        if (error.message.includes('Target closed') || error.message.includes('crashed')) {
          console.error('!!! CRASH DETECTED !!!');
          errors.push('CRASH DETECTED');
        }
      }
    }
    
    // Final check
    await page.screenshot({ path: '.playwright-mcp/final-state.png' });
    
    if (errors.length > 0) {
      console.error('\n=== ERRORS/CRASHES DETECTED ===');
      errors.forEach(err => console.error(err));
      throw new Error(`Test failed with crashes/errors`);
    } else {
      console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
    }
  });
});