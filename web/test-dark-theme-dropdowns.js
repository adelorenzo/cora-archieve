import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:8001');
  await page.waitForTimeout(3000);
  
  console.log('Switching to dark theme...');
  // Click the sun/moon toggle to switch to dark theme
  await page.click('button[title*="dark mode"], button[title*="light mode"]');
  await page.waitForTimeout(1000);
  
  console.log('Testing Theme Dropdown in Dark Mode...');
  await page.click('button[title="Choose theme"]');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '.playwright-mcp/theme-dropdown-dark.png' });
  console.log('✓ Theme dropdown opened in dark mode');
  
  // Click outside to close
  await page.click('body', { position: { x: 10, y: 10 } });
  await page.waitForTimeout(500);
  
  console.log('Testing Persona Dropdown in Dark Mode...');
  await page.click('button:has-text("Assistant")');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '.playwright-mcp/persona-dropdown-dark.png' });
  console.log('✓ Persona dropdown opened in dark mode');
  
  // Click outside to close
  await page.click('body', { position: { x: 10, y: 10 } });
  await page.waitForTimeout(500);
  
  // Test creating a custom persona form
  console.log('Testing Persona Form in Dark Mode...');
  await page.click('button:has-text("Assistant")');
  await page.waitForTimeout(500);
  await page.click('button[title="Create custom persona"]');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.playwright-mcp/persona-form-dark.png' });
  console.log('✓ Persona form opened in dark mode');
  
  console.log('\n✅ Dark theme dropdown tests completed!');
  console.log('Check screenshots to verify text is readable:');
  console.log('  - theme-dropdown-dark.png');
  console.log('  - persona-dropdown-dark.png');
  console.log('  - persona-form-dark.png');
  
  await browser.close();
})();