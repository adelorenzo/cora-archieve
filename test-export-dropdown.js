const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');

  // Wait for app to load
  await page.waitForTimeout(3000);

  // Type a test message
  const textarea = await page.locator('textarea[placeholder*="Type"]');
  await textarea.fill('Test message for export');
  await textarea.press('Enter');

  // Wait for response
  await page.waitForTimeout(2000);

  // Click export button
  console.log('Clicking export button...');
  const exportButton = await page.locator('[aria-label="Export conversation"]');
  await exportButton.click();

  // Wait to see if dropdown stays open
  await page.waitForTimeout(1000);

  // Check if dropdown is visible
  const dropdown = await page.locator('text="Export as Markdown"');
  const isVisible = await dropdown.isVisible();
  console.log('Dropdown visible after click:', isVisible);

  if (isVisible) {
    console.log('SUCCESS: Dropdown stayed open!');

    // Try clicking an export option
    await dropdown.click();
    console.log('Clicked on Export as Markdown');

    await page.waitForTimeout(2000);
  } else {
    console.log('FAILED: Dropdown not visible');
  }

  // Keep browser open for manual inspection
  await page.waitForTimeout(5000);
  await browser.close();
})();