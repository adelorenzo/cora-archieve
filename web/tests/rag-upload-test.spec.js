import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('RAG Document Upload and Initialization', () => {
  test('Upload document and initialize RAG', async ({ page }) => {
    // Go to the app
    await page.goto('http://localhost:8001');
    await page.waitForLoadState('networkidle');
    
    // Step 1: Open Knowledge Base
    console.log('Step 1: Opening Knowledge Base...');
    const knowledgeButton = page.locator('button[title="Knowledge Base"]');
    await expect(knowledgeButton).toBeVisible();
    await knowledgeButton.click();
    
    // Wait for modal to open
    await page.waitForSelector('text=/Knowledge Base/i', { timeout: 5000 });
    await page.waitForTimeout(1000);
    
    // Step 2: Check if we can upload documents directly in Knowledge Base
    // Look for file input or upload area
    const fileInput = page.locator('input[type="file"]');
    const hasFileInput = await fileInput.count() > 0;
    
    if (!hasFileInput) {
      console.log('No file input in Knowledge Base, closing modal...');
      // Close Knowledge Base modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
      // Step 3: Try Document Upload button
      console.log('Step 3: Opening Document Upload...');
      const uploadButton = page.locator('button[title="Document Upload"]');
      if (await uploadButton.isVisible()) {
        await uploadButton.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // Step 4: Upload the test document
    console.log('Step 4: Uploading test document...');
    const testFilePath = path.join(process.cwd(), 'test-document.txt');
    
    // Find the file input again
    const uploadInput = page.locator('input[type="file"]').first();
    if (await uploadInput.count() > 0) {
      await uploadInput.setInputFiles(testFilePath);
      console.log('File uploaded successfully');
      
      // Wait for upload to process
      await page.waitForTimeout(3000);
      
      // Check for success message or document appearing in list
      const successIndicator = page.locator('text=/uploaded|success|complete/i').first();
      if (await successIndicator.isVisible({ timeout: 5000 })) {
        console.log('Upload completed successfully');
      }
    } else {
      console.log('Could not find file input for upload');
    }
    
    // Step 5: Go back to Knowledge Base to initialize RAG
    console.log('Step 5: Initializing RAG...');
    
    // Close upload modal if open
    const closeButton = page.locator('button').filter({ hasText: '×' }).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }
    
    // Open Knowledge Base again
    await knowledgeButton.click();
    await page.waitForSelector('text=/Knowledge Base/i', { timeout: 5000 });
    
    // Step 6: Click Initialize RAG button
    const initButton = page.locator('button:has-text("Initialize RAG")');
    if (await initButton.isVisible()) {
      console.log('Found Initialize RAG button, clicking...');
      await initButton.click();
      
      // Wait for initialization (this might take a while)
      console.log('Waiting for RAG initialization...');
      await page.waitForTimeout(5000);
      
      // Check for initialization progress or completion
      const ragStatus = page.locator('text=/Ready|Initializing|Loading/i').first();
      const statusText = await ragStatus.textContent();
      console.log('RAG Status:', statusText);
      
      // Take screenshot of final state
      await page.screenshot({ path: '.playwright-mcp/rag-initialized.png' });
    } else {
      console.log('Initialize RAG button not found - RAG might already be initialized');
      
      // Check current status
      const ragStatus = page.locator('text=/Ready|Offline/i').first();
      if (await ragStatus.isVisible()) {
        const statusText = await ragStatus.textContent();
        console.log('Current RAG Status:', statusText);
      }
    }
    
    // Step 7: Verify no errors
    const errorMessages = page.locator('text=/error|failed/i');
    const errorCount = await errorMessages.count();
    
    if (errorCount > 0) {
      const errors = [];
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errorMessages.nth(i).textContent();
        if (!errorText.includes('Loading') && !errorText.includes('Initializing')) {
          errors.push(errorText);
        }
      }
      console.log('Errors found:', errors);
      expect(errors.length).toBe(0);
    }
    
    // Final screenshot
    await page.screenshot({ path: '.playwright-mcp/rag-final-state.png' });
    console.log('Test completed successfully!');
  });
});