import { test, expect } from '@playwright/test';

test('Debug web search failure', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || text.includes('Error') || text.includes('WebSearch') || text.includes('FunctionCalling')) {
      console.log(`[${type}] ${text}`);
    }
  });

  // Navigate to debug page
  await page.goto('http://localhost:8000/test-debug-search.html');
  await page.waitForLoadState('networkidle');
  
  // Click test button
  await page.click('button');
  
  // Wait for output
  await page.waitForTimeout(5000);
  
  // Get output
  const output = await page.textContent('#output');
  console.log('Output:', output);
  
  // Take screenshot
  await page.screenshot({ 
    path: 'test-search-debug.png',
    fullPage: true 
  });
});