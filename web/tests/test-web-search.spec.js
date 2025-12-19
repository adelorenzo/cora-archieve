import { test, expect } from '@playwright/test';

test.describe('Web Search Service Tests', () => {
  test('Direct web search functionality', async ({ page }) => {
    console.log('Testing web search service directly...');
    
    // Navigate to test page
    await page.goto('http://localhost:8000/test-web-search.html');
    await page.waitForLoadState('networkidle');
    
    // Wait for services to load
    await page.waitForFunction(
      () => {
        const log = document.getElementById('log');
        return log && log.textContent.includes('Web search service initialized');
      },
      { timeout: 10000 }
    );
    
    console.log('Services loaded, testing search...');
    
    // Test search for weather
    await page.fill('#queryInput', 'weather in Paris today');
    await page.click('#testSearchBtn');
    
    // Wait for search to complete
    await page.waitForFunction(
      () => {
        const results = document.getElementById('results');
        return results && !results.textContent.includes('Searching...');
      },
      { timeout: 15000 }
    );
    
    // Check results
    const results = await page.textContent('#results');
    const log = await page.textContent('#log');
    
    console.log('Search results:', results.substring(0, 200));
    
    // Check for success indicators
    const hasResults = !results.includes('Error:') && results.length > 50;
    const searchCompleted = log.includes('Search completed successfully');
    
    // Take screenshot
    await page.screenshot({ 
      path: 'web/.playwright-mcp/web-search-test.png',
      fullPage: true 
    });
    
    // Assertions
    expect(hasResults).toBeTruthy();
    expect(searchCompleted).toBeTruthy();
    
    console.log('✓ Web search test passed');
  });

  test('Function call detection and execution', async ({ page }) => {
    console.log('Testing function call detection...');
    
    // Navigate to test page
    await page.goto('http://localhost:8000/test-web-search.html');
    await page.waitForLoadState('networkidle');
    
    // Wait for services to load
    await page.waitForFunction(
      () => {
        const log = document.getElementById('log');
        return log && log.textContent.includes('Web search service initialized');
      },
      { timeout: 10000 }
    );
    
    // Test function call detection
    await page.fill('#queryInput', 'current weather in Tokyo');
    await page.click('#testFunctionCallBtn');
    
    // Wait for execution
    await page.waitForFunction(
      () => {
        const results = document.getElementById('results');
        return results && !results.textContent.includes('Testing function call...');
      },
      { timeout: 15000 }
    );
    
    // Check results
    const results = await page.textContent('#results');
    const log = await page.textContent('#log');
    
    console.log('Function call results:', results.substring(0, 200));
    
    // Check for success
    const functionDetected = log.includes('Function call detected');
    const functionExecuted = log.includes('Function executed successfully') || 
                           results.includes('Function Call Detected and Executed');
    
    // Take screenshot
    await page.screenshot({ 
      path: 'web/.playwright-mcp/function-call-test.png',
      fullPage: true 
    });
    
    // Assertions
    expect(functionDetected).toBeTruthy();
    expect(functionExecuted).toBeTruthy();
    
    console.log('✓ Function call detection test passed');
  });
});