const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Opening production build...');
  await page.goto('http://localhost:4174/');

  // Wait longer for the React app to load
  await page.waitForTimeout(5000);

  // Check for errors in console
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('Console error:', msg.text());
    }
  });

  // Take a screenshot of the page
  await page.screenshot({ path: 'production-test.png', fullPage: true });
  console.log('Screenshot saved to production-test.png');

  // Try to check if the main app is visible
  try {
    const appContent = await page.locator('#root').textContent();
    if (appContent) {
      console.log('✓ App root found with content');
      console.log('Content preview:', appContent.substring(0, 200));
    }
  } catch (e) {
    console.log('✗ Could not get app content:', e.message);
  }

  // Check if there are any syntax errors
  const bodyHTML = await page.evaluate(() => document.body.innerHTML);
  if (bodyHTML.includes('Cora') || bodyHTML.includes('AI Assistant')) {
    console.log('✓ App appears to be loaded successfully!');
  } else {
    console.log('✗ App may not have loaded correctly');
  }

  if (consoleErrors.length > 0) {
    console.log('\nConsole errors found:', consoleErrors);
  } else {
    console.log('\n✓ No console errors!');
  }

  await browser.close();
})();