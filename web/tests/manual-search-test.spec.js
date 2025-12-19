import { test, expect } from '@playwright/test';

test.describe('Manual Search Test', () => {
  test('test search with correct selectors', async ({ page }) => {
    // Go to app
    await page.goto('http://localhost:8000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for app to fully initialize
    
    // Click settings button - it's a button with Settings icon inside
    const settingsButton = page.locator('button').filter({ has: page.locator('svg.lucide-settings') });
    
    // Alternative selectors to try
    const selectors = [
      'button:has(svg.lucide-settings)',
      'button >> svg.lucide-settings >> ..',
      'button:has([class*="Settings"])',
      'button:nth-of-type(2)', // It's likely the second button in the header
    ];
    
    let clicked = false;
    for (const selector of selectors) {
      try {
        await page.click(selector, { timeout: 2000 });
        console.log(`Clicked settings with selector: ${selector}`);
        clicked = true;
        break;
      } catch (e) {
        console.log(`Failed with selector: ${selector}`);
      }
    }
    
    if (!clicked) {
      // Take screenshot to debug
      await page.screenshot({ path: 'debug-settings.png' });
      console.log('Could not find settings button. Screenshot saved to debug-settings.png');
      
      // Try to list all buttons
      const buttons = await page.locator('button').all();
      console.log(`Found ${buttons.length} buttons`);
      for (let i = 0; i < buttons.length; i++) {
        const text = await buttons[i].textContent();
        const classes = await buttons[i].getAttribute('class');
        console.log(`Button ${i}: text="${text}", classes="${classes}"`);
      }
      return;
    }
    
    // Wait for dialog
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    console.log('Settings dialog opened');
    
    // Find model selector
    const modelSelector = page.locator('select').first();
    const modelOptions = await modelSelector.locator('option').allTextContents();
    console.log('Available models:', modelOptions);
    
    // Select a Hermes model if available
    const hermesModel = modelOptions.find(m => m.toLowerCase().includes('hermes'));
    if (hermesModel) {
      await modelSelector.selectOption({ label: hermesModel });
      console.log(`Selected Hermes model: ${hermesModel}`);
    } else if (modelOptions.length > 1) {
      // Select any non-default model
      await modelSelector.selectOption({ index: 1 });
      console.log(`Selected model: ${modelOptions[1]}`);
    }
    
    // Save settings
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(3000);
    
    // Test search
    const query = 'What is the current weather in Tokyo?';
    console.log(`\nTesting query: "${query}"`);
    
    await page.fill('textarea', query);
    await page.keyboard.press('Enter');
    
    // Wait for response
    console.log('Waiting for response...');
    await page.waitForTimeout(15000);
    
    // Check for messages
    const messageContainers = page.locator('div').filter({ hasText: /weather|tokyo|search|temperature/i });
    const count = await messageContainers.count();
    console.log(`Found ${count} relevant message containers`);
    
    if (count > 0) {
      const lastMessage = await messageContainers.last().textContent();
      console.log('Last message preview:', lastMessage.substring(0, 400));
      
      // Check for search pattern
      if (lastMessage.includes('[SEARCH:')) {
        console.log('✓ Search pattern detected');
      }
      if (lastMessage.includes('📌 Search Results:')) {
        console.log('✓ Search results displayed');
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'search-test-result.png' });
    console.log('Screenshot saved to search-test-result.png');
  });
});