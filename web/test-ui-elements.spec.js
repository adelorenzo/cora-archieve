import { test, expect } from '@playwright/test';

test.describe('UI Elements Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8000');
    // Wait for app to load
    await page.waitForSelector('h1:has-text("Cora")', { timeout: 10000 });
  });

  test('Model Selector Dropdown', async ({ page }) => {
    console.log('Testing Model Selector...');
    
    // Find the model selector button
    const modelButton = page.locator('button:has-text("Select Model")').first();
    await expect(modelButton).toBeVisible();
    
    // Click to open dropdown
    await modelButton.click();
    await page.waitForTimeout(500); // Wait for animation
    
    // Check if dropdown is visible
    const dropdown = page.locator('text=Select AI Model');
    const isVisible = await dropdown.isVisible();
    console.log('Model dropdown visible after click:', isVisible);
    
    if (isVisible) {
      // Try to select a model
      const firstModel = page.locator('button:has-text("SmolLM2")').first();
      if (await firstModel.isVisible()) {
        await firstModel.click();
        console.log('Successfully clicked on a model');
      }
    } else {
      console.error('Model dropdown did NOT open!');
    }
    
    // Try clicking again to see if it works second time
    await page.waitForTimeout(1000);
    await modelButton.click();
    await page.waitForTimeout(500);
    const isVisibleSecondTime = await dropdown.isVisible();
    console.log('Model dropdown visible on second click:', isVisibleSecondTime);
  });

  test('Persona Selector Dropdown', async ({ page }) => {
    console.log('Testing Persona Selector...');
    
    // Find the persona selector button (with robot emoji)
    const personaButton = page.locator('button:has-text("🤖")').first();
    await expect(personaButton).toBeVisible();
    
    // Click to open dropdown
    await personaButton.click();
    await page.waitForTimeout(500);
    
    // Check if dropdown is visible
    const dropdown = page.locator('text=Select Persona');
    const isVisible = await dropdown.isVisible();
    console.log('Persona dropdown visible after click:', isVisible);
    
    // Try clicking again
    if (!isVisible) {
      console.error('Persona dropdown did NOT open!');
    }
  });

  test('Theme Switcher', async ({ page }) => {
    console.log('Testing Theme Switcher...');
    
    // Find the palette button
    const paletteButton = page.locator('button[title="Choose theme"]');
    await expect(paletteButton).toBeVisible();
    
    // Click to open dropdown
    await paletteButton.click();
    await page.waitForTimeout(500);
    
    // Check if dropdown is visible
    const dropdown = page.locator('text=Choose Theme');
    const isVisible = await dropdown.isVisible();
    console.log('Theme dropdown visible after click:', isVisible);
    
    if (!isVisible) {
      console.error('Theme dropdown did NOT open!');
    }
  });

  test('Document Upload Toggle', async ({ page }) => {
    console.log('Testing Document Upload...');
    
    // Find the upload button
    const uploadButton = page.locator('button[title="Document Upload"]');
    await expect(uploadButton).toBeVisible();
    
    // Click to toggle upload area
    await uploadButton.click();
    await page.waitForTimeout(500);
    
    // Check if upload area is visible
    const uploadArea = page.locator('text=Upload Documents');
    const isVisible = await uploadArea.isVisible();
    console.log('Upload area visible after click:', isVisible);
    
    if (isVisible) {
      // Check for the browse button
      const browseButton = page.locator('button:has-text("click to browse")');
      const hasBrowseButton = await browseButton.isVisible();
      console.log('Browse button exists:', hasBrowseButton);
    }
  });

  test('All Dropdowns Sequential Test', async ({ page }) => {
    console.log('Testing all dropdowns sequentially...');
    
    // Test each dropdown in sequence
    const tests = [
      { selector: 'button:has-text("Select Model")', name: 'Model' },
      { selector: 'button:has-text("🤖")', name: 'Persona' },
      { selector: 'button[title="Choose theme"]', name: 'Theme' }
    ];
    
    for (const testCase of tests) {
      console.log(`Testing ${testCase.name} dropdown...`);
      const button = page.locator(testCase.selector).first();
      
      if (await button.isVisible()) {
        await button.click();
        await page.waitForTimeout(500);
        
        // Take screenshot
        await page.screenshot({ 
          path: `${testCase.name.toLowerCase()}-dropdown.png`,
          fullPage: false 
        });
        
        // Click outside to close
        await page.click('body', { position: { x: 10, y: 10 } });
        await page.waitForTimeout(500);
      } else {
        console.error(`${testCase.name} button not found!`);
      }
    }
  });
});