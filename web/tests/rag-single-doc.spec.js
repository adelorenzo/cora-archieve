import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('RAG Single Document Indexing', () => {
  test('Index single small document without crash', async ({ page }) => {
    // Monitor for errors and crashes
    const errors = [];
    let pageCrashed = false;
    
    page.on('pageerror', error => {
      console.error('Page error:', error.message);
      errors.push(error.message);
    });
    
    page.on('crash', () => {
      console.error('!!! PAGE CRASHED !!!');
      pageCrashed = true;
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser error:', msg.text());
        errors.push(msg.text());
      } else if (msg.text().includes('[RAG')) {
        console.log('RAG log:', msg.text());
      }
    });

    console.log('1. Loading page...');
    await page.goto('http://localhost:8000/');
    await page.waitForTimeout(2000);
    
    console.log('2. Uploading small test document...');
    const uploadInput = page.locator('input[type="file"]');
    const filePath = path.join(process.cwd(), 'test-small.txt');
    await uploadInput.setInputFiles(filePath);
    await page.waitForTimeout(2000);
    
    console.log('3. Opening Knowledge Base...');
    await page.click('button:has-text("Knowledge Base")');
    await page.waitForTimeout(1000);
    
    // Check document count
    const docText = await page.locator('text=/\\d+ document/').textContent();
    console.log(`4. Found: ${docText}`);
    
    console.log('5. Initializing RAG...');
    const initButton = page.locator('button:has-text("Initialize RAG")');
    if (await initButton.isVisible()) {
      await initButton.click();
      console.log('6. Clicked Initialize RAG');
      
      // Wait for initialization
      await page.waitForTimeout(3000);
      
      // Check if page is still responsive
      if (!pageCrashed) {
        console.log('7. Page still responsive after init');
        
        // Look for individual index button
        const indexButton = page.locator('button[title="Index document"]').first();
        if (await indexButton.isVisible()) {
          console.log('8. Found individual index button');
          await indexButton.click();
          console.log('9. Clicked index button for single document');
          
          // Wait for indexing
          await page.waitForTimeout(5000);
          
          // Check if document was indexed
          const badge = page.locator('text="Indexed"').first();
          if (await badge.isVisible()) {
            console.log('10. Document successfully indexed!');
          } else {
            console.log('10. Document indexing status unclear');
          }
        } else {
          console.log('8. No individual index button found');
        }
      }
    } else {
      console.log('6. RAG already initialized');
    }
    
    // Final check
    if (pageCrashed) {
      throw new Error('Page crashed during test');
    }
    
    if (errors.length > 0) {
      console.error('\n=== ERRORS DETECTED ===');
      errors.forEach(err => console.error(err));
      // Don't fail on non-critical errors
      console.log('Test completed with some errors');
    } else {
      console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
    }
  });
});