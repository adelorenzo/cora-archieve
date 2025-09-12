import { test, expect } from '@playwright/test';

test.describe('Final UI Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8000');
    await page.waitForSelector('h1:has-text("Cora")', { timeout: 10000 });
  });

  test('✅ Complete UI Element Functionality', async ({ page }) => {
    console.log('=== FINAL UI VALIDATION ===\n');
    
    // 1. Model Selector
    console.log('1. MODEL SELECTOR:');
    const modelButton = page.locator('button').filter({ hasText: /Select Model|TinyStories/ }).first();
    await modelButton.click();
    await page.waitForTimeout(300);
    
    const modelDropdown = page.locator('.text-sm.font-medium.text-muted-foreground').filter({ hasText: 'Select AI Model' });
    const modelOpen = await modelDropdown.isVisible();
    console.log(`   Opens: ${modelOpen ? '✅' : '❌'}`);
    
    if (modelOpen) {
      // In WASM mode, we should see TinyStories
      const wasmModel = await page.locator('text=WASM fallback model').isVisible();
      console.log(`   Shows WASM model: ${wasmModel ? '✅' : '❌'}`);
      
      await page.click('body', { position: { x: 10, y: 10 } });
      await page.waitForTimeout(300);
      const modelClosed = !(await modelDropdown.isVisible());
      console.log(`   Closes: ${modelClosed ? '✅' : '❌'}`);
    }
    
    // 2. Persona Selector
    console.log('\n2. PERSONA SELECTOR:');
    const personaButton = page.locator('button:has-text("🤖")').first();
    await personaButton.click();
    await page.waitForTimeout(300);
    
    const personaDropdown = page.locator('text=Select Persona');
    const personaOpen = await personaDropdown.isVisible();
    console.log(`   Opens: ${personaOpen ? '✅' : '❌'}`);
    
    if (personaOpen) {
      // Check for default personas
      const assistant = await page.locator('.text-sm.font-medium').filter({ hasText: 'Assistant' }).first().isVisible();
      const creative = await page.locator('.text-sm.font-medium').filter({ hasText: 'Creative Writer' }).first().isVisible();
      console.log(`   Shows personas: ${(assistant || creative) ? '✅' : '❌'}`);
      
      await page.click('body', { position: { x: 10, y: 10 } });
      await page.waitForTimeout(300);
      const personaClosed = !(await personaDropdown.isVisible());
      console.log(`   Closes: ${personaClosed ? '✅' : '❌'}`);
    }
    
    // 3. Theme Switcher
    console.log('\n3. THEME SWITCHER:');
    const themeButton = page.locator('button[title="Choose theme"]');
    await themeButton.click();
    await page.waitForTimeout(300);
    
    const themeDropdown = page.locator('text=Choose Theme');
    const themeOpen = await themeDropdown.isVisible();
    console.log(`   Opens: ${themeOpen ? '✅' : '❌'}`);
    
    if (themeOpen) {
      // Check for theme options
      const darkTheme = await page.locator('text=Dark').isVisible();
      const lightTheme = await page.locator('text=Light').isVisible();
      console.log(`   Shows themes: ${(darkTheme || lightTheme) ? '✅' : '❌'}`);
      
      await page.click('body', { position: { x: 10, y: 10 } });
      await page.waitForTimeout(300);
      const themeClosed = !(await themeDropdown.isVisible());
      console.log(`   Closes: ${themeClosed ? '✅' : '❌'}`);
    }
    
    // 4. Document Upload
    console.log('\n4. DOCUMENT UPLOAD:');
    const uploadButton = page.locator('button[title="Document Upload"]');
    await uploadButton.click();
    await page.waitForTimeout(300);
    
    const uploadArea = page.locator('text=Upload Documents');
    const uploadOpen = await uploadArea.isVisible();
    console.log(`   Opens: ${uploadOpen ? '✅' : '❌'}`);
    
    if (uploadOpen) {
      const browseButton = page.locator('button:has-text("browse")');
      const hasBrowse = await browseButton.isVisible();
      console.log(`   Has browse button: ${hasBrowse ? '✅' : '❌'}`);
      
      // Toggle off
      await uploadButton.click();
      await page.waitForTimeout(300);
      const uploadClosed = !(await uploadArea.isVisible());
      console.log(`   Closes: ${uploadClosed ? '✅' : '❌'}`);
    }
    
    // 5. Repeatability Test
    console.log('\n5. REPEATABILITY TEST:');
    for (let i = 1; i <= 3; i++) {
      console.log(`   Round ${i}:`);
      
      // Quick test each dropdown
      await modelButton.click();
      await page.waitForTimeout(200);
      const modelWorks = await page.locator('.text-sm.font-medium.text-muted-foreground').filter({ hasText: 'Select AI Model' }).isVisible();
      await page.click('body', { position: { x: 10, y: 10 } });
      await page.waitForTimeout(200);
      
      await personaButton.click();
      await page.waitForTimeout(200);
      const personaWorks = await page.locator('text=Select Persona').isVisible();
      await page.click('body', { position: { x: 10, y: 10 } });
      await page.waitForTimeout(200);
      
      await themeButton.click();
      await page.waitForTimeout(200);
      const themeWorks = await page.locator('text=Choose Theme').isVisible();
      await page.click('body', { position: { x: 10, y: 10 } });
      await page.waitForTimeout(200);
      
      console.log(`     Model: ${modelWorks ? '✅' : '❌'} | Persona: ${personaWorks ? '✅' : '❌'} | Theme: ${themeWorks ? '✅' : '❌'}`);
    }
    
    console.log('\n=== VALIDATION COMPLETE ===');
  });
  
  test('📸 Visual Verification Screenshots', async ({ page }) => {
    // Take screenshots of each dropdown for visual verification
    
    // Model dropdown
    const modelButton = page.locator('button').filter({ hasText: /Select Model|TinyStories/ }).first();
    await modelButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '.playwright-mcp/model-dropdown-open.png', fullPage: false });
    await page.click('body', { position: { x: 10, y: 10 } });
    
    // Persona dropdown
    await page.waitForTimeout(300);
    const personaButton = page.locator('button:has-text("🤖")').first();
    await personaButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '.playwright-mcp/persona-dropdown-open.png', fullPage: false });
    await page.click('body', { position: { x: 10, y: 10 } });
    
    // Theme dropdown
    await page.waitForTimeout(300);
    const themeButton = page.locator('button[title="Choose theme"]');
    await themeButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '.playwright-mcp/theme-dropdown-open.png', fullPage: false });
    await page.click('body', { position: { x: 10, y: 10 } });
    
    // Document upload
    await page.waitForTimeout(300);
    const uploadButton = page.locator('button[title="Document Upload"]');
    await uploadButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '.playwright-mcp/document-upload-open.png', fullPage: false });
    
    console.log('Screenshots saved to .playwright-mcp/ directory');
  });
});