import { test, expect } from '@playwright/test';

test.describe('Simple App Access Test', () => {
  
  test('Can access the app and see basic elements', async ({ page }) => {
    console.log('Starting simple access test...');
    
    await page.goto('/');
    console.log('Navigated to app');
    
    // Take a screenshot to see what's happening
    await page.screenshot({ 
      path: './web/.playwright-mcp/simple-access.png',
      fullPage: true 
    });
    
    // Wait for page to load and look for any text content
    await page.waitForLoadState('domcontentloaded');
    
    // Get page title
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Get page content
    const bodyText = await page.locator('body').textContent();
    console.log(`Body text length: ${bodyText.length}`);
    console.log(`First 200 characters: ${bodyText.substring(0, 200)}`);
    
    // Look for the app title "Cora"
    const hasCoraTitle = bodyText.includes('Cora');
    console.log(`Has Cora title: ${hasCoraTitle}`);
    
    // Check if React app is mounted
    const rootElement = page.locator('#root');
    const rootContent = await rootElement.textContent();
    console.log(`Root element content length: ${rootContent.length}`);
    
    // Basic assertion - should have some content
    expect(rootContent.length).toBeGreaterThan(10);
  });
});