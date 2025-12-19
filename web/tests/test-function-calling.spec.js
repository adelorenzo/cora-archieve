import { test, expect } from '@playwright/test';

test.describe('Function Calling Tests', () => {
  test.setTimeout(180000); // 3 minutes for model loading

  test('Manual function calling with Hermes model', async ({ page }) => {
    console.log('Starting manual function calling test...');
    
    // Navigate to the test page
    await page.goto('http://localhost:8000/test-manual-function-calling.html');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Wait for model to initialize (check status)
    console.log('Waiting for model to load...');
    await page.waitForFunction(
      () => {
        const status = document.getElementById('status');
        return status && status.textContent === 'Ready';
      },
      { timeout: 120000 }
    );
    
    console.log('Model loaded, testing function call...');
    
    // Clear the input and enter a weather query
    await page.fill('#queryInput', 'What is the current weather in Tokyo?');
    
    // Click the test button
    await page.click('#testBtn');
    
    // Wait for response to update
    await page.waitForFunction(
      () => {
        const response = document.getElementById('response');
        return response && response.textContent !== 'Processing...' && response.textContent !== 'Waiting for test...';
      },
      { timeout: 60000 }
    );
    
    // Get the response and log
    const response = await page.textContent('#response');
    const debugLog = await page.textContent('#log');
    
    console.log('Response:', response);
    console.log('Debug log:', debugLog);
    
    // Check if manual function call was detected
    const manualCallDetected = debugLog.includes('Manual function call detected');
    const searchExecuted = debugLog.includes('Executing web search');
    const searchPattern = response.includes('[SEARCH:') || response.includes('[search:');
    
    // Take screenshot
    await page.screenshot({ 
      path: 'web/.playwright-mcp/manual-function-call-test.png',
      fullPage: true 
    });
    
    // Assertions
    if (searchPattern) {
      console.log('✓ Model outputted [SEARCH: ...] pattern');
    } else {
      console.log('✗ Model did not output [SEARCH: ...] pattern');
      console.log('Response was:', response);
    }
    
    if (manualCallDetected) {
      console.log('✓ Manual function call was detected');
    }
    
    if (searchExecuted) {
      console.log('✓ Web search was executed');
    }
    
    // At least one of these should be true for a successful test
    expect(searchPattern || manualCallDetected || searchExecuted).toBeTruthy();
  });

  test('Test with regular test page', async ({ page }) => {
    console.log('Testing with regular function calling page...');
    
    // Navigate to the original test page
    await page.goto('http://localhost:8000/test-function-calling.html');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Click Load Hermes Model button
    console.log('Loading Hermes model...');
    await page.click('#loadHermes');
    
    // Wait for model to load (check current model text)
    await page.waitForFunction(
      () => {
        const modelText = document.getElementById('currentModel');
        return modelText && modelText.textContent.includes('Hermes');
      },
      { timeout: 120000 }
    );
    
    console.log('Hermes model loaded, testing query...');
    
    // Click on a test query
    const weatherQuery = page.locator('.test-query').filter({ hasText: 'Search for the current weather' });
    await weatherQuery.click();
    
    // Wait for response
    await page.waitForFunction(
      () => {
        const response = document.getElementById('response');
        return response && response.textContent !== 'Processing...' && response.textContent.length > 10;
      },
      { timeout: 60000 }
    );
    
    // Get the response and log
    const response = await page.textContent('#response');
    const log = await page.textContent('#log');
    
    console.log('Response:', response.substring(0, 200) + '...');
    
    // Check what happened
    const errorExtracted = log.includes('Extracted text:');
    const functionCalled = log.includes('Function call detected');
    const textDetected = log.includes('Detected text-based function call');
    const searchResults = response.includes('Web Search Results');
    
    // Take screenshot
    await page.screenshot({ 
      path: 'web/.playwright-mcp/regular-test-page-result.png',
      fullPage: true 
    });
    
    console.log('Results:');
    console.log('- Error extracted:', errorExtracted);
    console.log('- Function called:', functionCalled);
    console.log('- Text pattern detected:', textDetected);
    console.log('- Search results shown:', searchResults);
    
    // We should at least get a response without error
    expect(response).not.toContain('Error extracting response');
    expect(response.length).toBeGreaterThan(10);
  });
});