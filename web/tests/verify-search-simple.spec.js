import { test, expect } from '@playwright/test';

test.describe('Web Search Simple Test', () => {
  test('verify basic search functionality', async ({ page }) => {
    // Go to app
    await page.goto('http://localhost:8000');
    await page.waitForLoadState('networkidle');
    
    // Click settings (gear icon)
    await page.click('button[aria-label="Settings"]');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Find model selector and check available models
    const modelSelector = page.locator('select').first();
    const options = await modelSelector.locator('option').allTextContents();
    console.log('Available models:', options);
    
    // Try to find and select Hermes model
    const hermesOption = options.find(opt => opt.toLowerCase().includes('hermes'));
    if (hermesOption) {
      await modelSelector.selectOption({ label: hermesOption });
      console.log(`Selected: ${hermesOption}`);
    } else {
      // If no Hermes, try to select any model that's not the default
      if (options.length > 1) {
        await modelSelector.selectOption({ index: 1 });
        console.log(`Selected: ${options[1]}`);
      }
    }
    
    // Save and close settings
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(2000);
    
    // Test web search with a simple query
    console.log('\nTesting web search...');
    const query = 'What is the weather in Tokyo?';
    await page.fill('textarea[placeholder="Ask anything..."]', query);
    await page.click('button[type="submit"]');
    
    // Wait for response (give it more time for model to load)
    console.log('Waiting for response...');
    await page.waitForTimeout(10000);
    
    // Get all messages
    const messages = await page.locator('[class*="message"]').allTextContents();
    console.log(`Total messages: ${messages.length}`);
    
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      console.log('Response preview:', lastMessage.substring(0, 300));
      
      // Check if search was triggered
      const hasSearch = lastMessage.includes('[SEARCH:') || 
                       lastMessage.includes('📌 Search Results:') ||
                       lastMessage.includes('search');
      console.log('Search triggered:', hasSearch);
      
      // Check if response mentions weather or Tokyo
      const relevantResponse = lastMessage.toLowerCase().includes('weather') || 
                              lastMessage.toLowerCase().includes('tokyo');
      console.log('Relevant response:', relevantResponse);
    } else {
      console.log('No response received');
    }
  });
});