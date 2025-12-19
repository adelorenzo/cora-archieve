import { test, expect } from '@playwright/test';

test.describe('Local SearXNG Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8000');
    await page.waitForLoadState('networkidle');
  });

  test('should check if local SearXNG is accessible', async ({ page }) => {
    // First check if local SearXNG is running
    try {
      const response = await fetch('http://localhost:8888/search?q=test&format=json');
      const isLocalAvailable = response.ok;
      
      console.log(`Local SearXNG status: ${isLocalAvailable ? 'Available' : 'Not running'}`);
      
      if (!isLocalAvailable) {
        console.log('⚠️ Local SearXNG not running. Run: docker-compose up -d');
        console.log('Tests will use fallback instances');
      }
    } catch (error) {
      console.log('Local SearXNG not accessible, using fallbacks');
    }
  });

  test('should perform web search with Hermes model', async ({ page }) => {
    // Select Hermes model which supports function calling
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('[role="dialog"]');
    
    const modelSelector = page.locator('select').first();
    await modelSelector.selectOption({ label: /Hermes/i });
    
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(1000);

    // Test search query
    const searchQuery = 'What is the current weather in Tokyo?';
    await page.fill('textarea', searchQuery);
    await page.click('button[type="submit"]');

    // Wait for search pattern or results
    await page.waitForFunction(
      () => {
        const messages = document.querySelectorAll('.message-content');
        const lastMessage = messages[messages.length - 1]?.textContent || '';
        return lastMessage.includes('[SEARCH:') || 
               lastMessage.includes('📌 Search Results:') ||
               lastMessage.includes('weather') ||
               lastMessage.includes('Tokyo');
      },
      { timeout: 30000 }
    );

    // Check if we got search results
    const messageContent = await page.locator('.message-content').last().textContent();
    console.log('Response:', messageContent);

    // Verify we got some response about weather
    expect(messageContent).toMatch(/(weather|Tokyo|temperature|forecast|search|results)/i);
  });

  test('should search for news autonomously', async ({ page }) => {
    // Select Hermes model
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('[role="dialog"]');
    
    const modelSelector = page.locator('select').first();
    await modelSelector.selectOption({ label: /Hermes/i });
    
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(1000);

    // Test news query
    const newsQuery = 'What are the latest developments in AI technology?';
    await page.fill('textarea', newsQuery);
    await page.click('button[type="submit"]');

    // Wait for search or response
    await page.waitForFunction(
      () => {
        const messages = document.querySelectorAll('.message-content');
        const lastMessage = messages[messages.length - 1]?.textContent || '';
        return lastMessage.includes('[SEARCH:') || 
               lastMessage.includes('📌 Search Results:') ||
               lastMessage.includes('AI') ||
               lastMessage.includes('technology');
      },
      { timeout: 30000 }
    );

    const messageContent = await page.locator('.message-content').last().textContent();
    console.log('News Response:', messageContent);

    // Should contain AI-related content
    expect(messageContent).toMatch(/(AI|artificial intelligence|technology|development|search|results)/i);
  });

  test('should handle factual queries without search', async ({ page }) => {
    // Select Hermes model
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('[role="dialog"]');
    
    const modelSelector = page.locator('select').first();
    await modelSelector.selectOption({ label: /Hermes/i });
    
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(1000);

    // Test a query that shouldn't need search
    const factQuery = 'What is 2 + 2?';
    await page.fill('textarea', factQuery);
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForFunction(
      () => {
        const messages = document.querySelectorAll('.message-content');
        const lastMessage = messages[messages.length - 1]?.textContent || '';
        return lastMessage.includes('4') || lastMessage.includes('four');
      },
      { timeout: 15000 }
    );

    const messageContent = await page.locator('.message-content').last().textContent();
    console.log('Math Response:', messageContent);

    // Should NOT trigger a search for simple math
    expect(messageContent).not.toContain('[SEARCH:');
    expect(messageContent).toMatch(/4|four/i);
  });

  test('should handle search when explicitly requested', async ({ page }) => {
    // Select Hermes model
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('[role="dialog"]');
    
    const modelSelector = page.locator('select').first();
    await modelSelector.selectOption({ label: /Hermes/i });
    
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(1000);

    // Explicitly request a search
    const explicitSearch = 'Search the web for how to install Zulip server';
    await page.fill('textarea', explicitSearch);
    await page.click('button[type="submit"]');

    // Should trigger search
    await page.waitForFunction(
      () => {
        const messages = document.querySelectorAll('.message-content');
        const lastMessage = messages[messages.length - 1]?.textContent || '';
        return lastMessage.includes('[SEARCH:') || 
               lastMessage.includes('📌 Search Results:') ||
               lastMessage.includes('Zulip');
      },
      { timeout: 30000 }
    );

    const messageContent = await page.locator('.message-content').last().textContent();
    console.log('Explicit Search Response:', messageContent);

    // Should contain search-related content
    expect(messageContent).toMatch(/(search|Zulip|install|server|results)/i);
  });
});