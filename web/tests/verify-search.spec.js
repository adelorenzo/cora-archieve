import { test, expect } from '@playwright/test';

test.describe('Web Search Verification', () => {
  test('verify search works with fallback instances', async ({ page }) => {
    // Go to app
    await page.goto('http://localhost:8000');
    await page.waitForLoadState('networkidle');
    
    // Select Hermes model for function calling support
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Find and select Hermes model
    const modelSelector = page.locator('select').first();
    const options = await modelSelector.locator('option').allTextContents();
    console.log('Available models:', options);
    
    // Select Hermes if available
    const hermesOption = options.find(opt => opt.includes('Hermes'));
    if (hermesOption) {
      await modelSelector.selectOption({ label: hermesOption });
      console.log(`Selected model: ${hermesOption}`);
    } else {
      console.log('Warning: Hermes model not found, using default');
    }
    
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(2000);
    
    // Test 1: Simple query that should trigger search
    console.log('\nTest 1: Weather query');
    await page.fill('textarea', 'What is the weather in Paris right now?');
    await page.click('button[type="submit"]');
    
    // Wait for any response
    await page.waitForTimeout(5000);
    
    // Check response
    const response1 = await page.locator('.message-content').last().textContent();
    console.log('Weather response:', response1.substring(0, 200));
    
    // Test 2: News query
    console.log('\nTest 2: News query');
    await page.fill('textarea', 'What are the latest tech news today?');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(5000);
    
    const response2 = await page.locator('.message-content').last().textContent();
    console.log('News response:', response2.substring(0, 200));
    
    // Test 3: Factual query (should NOT search)
    console.log('\nTest 3: Math query (no search needed)');
    await page.fill('textarea', 'What is 10 times 10?');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    
    const response3 = await page.locator('.message-content').last().textContent();
    console.log('Math response:', response3);
    
    // Summary
    console.log('\n=== Summary ===');
    console.log('Weather query included search?', response1.includes('[SEARCH:') || response1.includes('📌'));
    console.log('News query included search?', response2.includes('[SEARCH:') || response2.includes('📌'));
    console.log('Math query included search?', response3.includes('[SEARCH:') || response3.includes('📌'));
  });
});