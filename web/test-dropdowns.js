import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:8001');
  await page.waitForTimeout(2000);
  
  console.log('Testing Theme Dropdown...');
  await page.click('button[title="Choose theme"]');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.playwright-mcp/theme-dropdown-open.png' });
  
  // Click on a theme option
  await page.click('text=Ocean');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.playwright-mcp/theme-changed-ocean.png' });
  
  console.log('Testing Persona Dropdown...');
  await page.click('text=Assistant');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.playwright-mcp/persona-dropdown-open.png' });
  
  // Click on a different persona
  await page.click('text=Developer');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.playwright-mcp/persona-changed-developer.png' });
  
  console.log('Testing Model Selector Dropdown...');
  await page.click('text=Select Model');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.playwright-mcp/model-dropdown-open.png' });
  
  // Test click outside to close
  await page.click('body', { position: { x: 10, y: 10 } });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '.playwright-mcp/dropdowns-closed.png' });
  
  console.log('All dropdown tests completed successfully!');
  console.log('Screenshots saved in .playwright-mcp/ directory');
  
  await browser.close();
})();