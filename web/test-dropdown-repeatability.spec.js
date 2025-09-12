import { test, expect } from '@playwright/test';

test.describe('Dropdown Repeatability Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8000');
    await page.waitForSelector('h1:has-text("Cora")', { timeout: 10000 });
  });

  test('Model Selector - Multiple Open/Close Cycles', async ({ page }) => {
    console.log('Testing Model Selector repeatability...');
    const modelButton = page.locator('button:has-text("Select Model")').first();
    
    for (let i = 1; i <= 5; i++) {
      console.log(`\nCycle ${i}:`);
      
      // Click to open
      await modelButton.click();
      await page.waitForTimeout(300);
      
      // Check if dropdown is visible
      const dropdown = page.locator('text=Select AI Model');
      const isOpen = await dropdown.isVisible();
      console.log(`  Open attempt ${i}: ${isOpen ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      if (isOpen) {
        // Try to interact with a model option
        const modelOption = page.locator('button:has-text("SmolLM2")').first();
        const canInteract = await modelOption.isVisible();
        console.log(`  Can interact with models: ${canInteract ? '✅' : '❌'}`);
        
        // Click outside to close
        await page.click('body', { position: { x: 10, y: 10 } });
        await page.waitForTimeout(300);
        
        // Verify it closed
        const isClosed = !(await dropdown.isVisible());
        console.log(`  Close attempt ${i}: ${isClosed ? '✅ SUCCESS' : '❌ FAILED'}`);
      } else {
        console.log(`  ⚠️ Dropdown failed to open on cycle ${i}`);
      }
    }
  });

  test('Persona Selector - Multiple Open/Close Cycles', async ({ page }) => {
    console.log('Testing Persona Selector repeatability...');
    const personaButton = page.locator('button:has-text("🤖")').first();
    
    for (let i = 1; i <= 5; i++) {
      console.log(`\nCycle ${i}:`);
      
      await personaButton.click();
      await page.waitForTimeout(300);
      
      const dropdown = page.locator('text=Select Persona');
      const isOpen = await dropdown.isVisible();
      console.log(`  Open attempt ${i}: ${isOpen ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      if (isOpen) {
        await page.click('body', { position: { x: 10, y: 10 } });
        await page.waitForTimeout(300);
        
        const isClosed = !(await dropdown.isVisible());
        console.log(`  Close attempt ${i}: ${isClosed ? '✅ SUCCESS' : '❌ FAILED'}`);
      }
    }
  });

  test('Theme Switcher - Multiple Open/Close Cycles', async ({ page }) => {
    console.log('Testing Theme Switcher repeatability...');
    const themeButton = page.locator('button[title="Choose theme"]');
    
    for (let i = 1; i <= 5; i++) {
      console.log(`\nCycle ${i}:`);
      
      await themeButton.click();
      await page.waitForTimeout(300);
      
      const dropdown = page.locator('text=Choose Theme');
      const isOpen = await dropdown.isVisible();
      console.log(`  Open attempt ${i}: ${isOpen ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      if (isOpen) {
        await page.click('body', { position: { x: 10, y: 10 } });
        await page.waitForTimeout(300);
        
        const isClosed = !(await dropdown.isVisible());
        console.log(`  Close attempt ${i}: ${isClosed ? '✅ SUCCESS' : '❌ FAILED'}`);
      }
    }
  });

  test('All Dropdowns - Interleaved Testing', async ({ page }) => {
    console.log('Testing all dropdowns in interleaved pattern...\n');
    
    const modelButton = page.locator('button:has-text("Select Model")').first();
    const personaButton = page.locator('button:has-text("🤖")').first();
    const themeButton = page.locator('button[title="Choose theme"]');
    
    for (let cycle = 1; cycle <= 3; cycle++) {
      console.log(`=== Cycle ${cycle} ===`);
      
      // Test Model dropdown
      console.log('  Model dropdown:');
      await modelButton.click();
      await page.waitForTimeout(300);
      let isOpen = await page.locator('text=Select AI Model').isVisible();
      console.log(`    Open: ${isOpen ? '✅' : '❌'}`);
      await page.click('body', { position: { x: 10, y: 10 } });
      await page.waitForTimeout(300);
      
      // Test Persona dropdown
      console.log('  Persona dropdown:');
      await personaButton.click();
      await page.waitForTimeout(300);
      isOpen = await page.locator('text=Select Persona').isVisible();
      console.log(`    Open: ${isOpen ? '✅' : '❌'}`);
      await page.click('body', { position: { x: 10, y: 10 } });
      await page.waitForTimeout(300);
      
      // Test Theme dropdown
      console.log('  Theme dropdown:');
      await themeButton.click();
      await page.waitForTimeout(300);
      isOpen = await page.locator('text=Choose Theme').isVisible();
      console.log(`    Open: ${isOpen ? '✅' : '❌'}`);
      await page.click('body', { position: { x: 10, y: 10 } });
      await page.waitForTimeout(300);
    }
  });

  test('Stress Test - Rapid Clicking', async ({ page }) => {
    console.log('Stress testing with rapid clicks...\n');
    const modelButton = page.locator('button:has-text("Select Model")').first();
    
    console.log('Rapid open/close test:');
    for (let i = 1; i <= 10; i++) {
      await modelButton.click();
      await page.waitForTimeout(100); // Shorter delay
      
      const isOpen = await page.locator('text=Select AI Model').isVisible();
      console.log(`  Click ${i}: ${isOpen ? 'Open' : 'Closed'}`);
    }
    
    // Final state check
    await page.waitForTimeout(500);
    const finalState = await page.locator('text=Select AI Model').isVisible();
    console.log(`\nFinal state: ${finalState ? 'OPEN' : 'CLOSED'}`);
  });
});