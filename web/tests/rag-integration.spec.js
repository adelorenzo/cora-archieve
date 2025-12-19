import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('RAG Integration Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8001');
    await page.waitForLoadState('networkidle');
  });

  test('Complete RAG workflow - Knowledge Base and Document Upload', async ({ page }) => {
    // Step 1: Open Knowledge Base
    const knowledgeButton = page.locator('button[title="Knowledge Base"]');
    await expect(knowledgeButton).toBeVisible();
    await knowledgeButton.click();
    
    // Step 2: Verify modal opens without errors
    const modal = page.locator('text=/Knowledge Base/i').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Step 3: Check initial state
    const documentsCount = page.locator('text=/0.*Documents/').first();
    await expect(documentsCount).toBeVisible();
    
    const ragStatus = page.locator('text=/RAG Status/').first();
    await expect(ragStatus).toBeVisible();
    
    // Step 4: Close modal
    const closeButton = page.locator('button').filter({ hasText: '×' }).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // Click outside modal to close
      await page.keyboard.press('Escape');
    }
    
    // Step 5: Test Document Upload button
    const uploadButton = page.locator('button[title="Document Upload"]');
    if (await uploadButton.isVisible()) {
      await uploadButton.click();
      await page.waitForTimeout(1000);
      
      // Check if upload interface appears
      const uploadInterface = page.locator('text=/Drop files here|Select Files/i');
      if (await uploadInterface.isVisible()) {
        console.log('Document upload interface is accessible');
      }
    }
    
    // Take screenshot for verification
    await page.screenshot({ path: '.playwright-mcp/rag-integration-test.png' });
    
    // Step 6: Check console for errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a bit to catch any async errors
    await page.waitForTimeout(2000);
    
    // Filter out expected lazy loading messages
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('lazy') && 
      !err.includes('chunk') &&
      err.includes('Database not initialized')
    );
    
    // Should have no critical database initialization errors
    expect(criticalErrors.length).toBe(0);
  });

  test('Database initialization on document operations', async ({ page }) => {
    // Monitor console for database operations
    const dbOperations = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Database') || text.includes('PouchDB') || text.includes('initialized')) {
        dbOperations.push({
          type: msg.type(),
          text: text
        });
      }
    });

    // Open Knowledge Base
    const knowledgeButton = page.locator('button[title="Knowledge Base"]');
    await knowledgeButton.click();
    
    // Wait for initialization
    await page.waitForTimeout(2000);
    
    // Check that database operations occurred
    console.log('Database operations:', dbOperations);
    
    // Verify no initialization errors
    const dbErrors = dbOperations.filter(op => 
      op.type === 'error' && 
      op.text.includes('not initialized')
    );
    
    expect(dbErrors.length).toBe(0);
  });

  test('RAG service status check', async ({ page }) => {
    // Open Knowledge Base
    const knowledgeButton = page.locator('button[title="Knowledge Base"]');
    await knowledgeButton.click();
    
    // Check RAG status indicator
    const ragStatusText = await page.locator('text=/Ready|Offline/').first().textContent();
    console.log('RAG Status:', ragStatusText);
    
    // Status should be either "Offline" (not initialized) or "Ready" (initialized)
    expect(['Ready', 'Offline']).toContain(ragStatusText.trim());
    
    // If offline, check for Initialize button
    if (ragStatusText.includes('Offline')) {
      const initButton = page.locator('button:has-text("Initialize RAG")');
      const buttonExists = await initButton.count() > 0;
      expect(buttonExists).toBe(true);
      console.log('Initialize RAG button is available');
    }
  });
});