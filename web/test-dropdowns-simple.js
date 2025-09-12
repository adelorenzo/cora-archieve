import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:8001');
  await page.waitForTimeout(3000);
  
  console.log('Testing Theme Dropdown...');
  // Click the palette button
  const paletteButton = await page.$('button[title="Choose theme"]');
  if (paletteButton) {
    await paletteButton.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '.playwright-mcp/theme-dropdown-portal.png' });
    console.log('✓ Theme dropdown opened');
    
    // Click outside to close
    await page.click('body', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);
  }
  
  console.log('Testing Persona Dropdown...');
  // Click on the persona selector (contains Assistant text)
  const personaButton = await page.$('button:has-text("Assistant")');
  if (personaButton) {
    await personaButton.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '.playwright-mcp/persona-dropdown-portal.png' });
    console.log('✓ Persona dropdown opened');
    
    // Click outside to close
    await page.click('body', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);
  }
  
  console.log('Testing Model Selector...');
  // Click on the model selector
  const modelButton = await page.$('button:has-text("Select Model")');
  if (modelButton) {
    await modelButton.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '.playwright-mcp/model-dropdown-portal.png' });
    console.log('✓ Model dropdown opened');
  }
  
  // Final screenshot showing all closed
  await page.click('body', { position: { x: 10, y: 10 } });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.playwright-mcp/all-dropdowns-closed.png', fullPage: true });
  
  console.log('\n✅ All dropdown portal tests completed!');
  console.log('Check the screenshots in .playwright-mcp/ to verify:');
  console.log('  - Dropdowns render correctly without glitches');
  console.log('  - Proper z-index layering (dropdowns on top)');
  console.log('  - No visual artifacts or clipping');
  
  await browser.close();
})();