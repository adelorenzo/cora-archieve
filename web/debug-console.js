import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Collect ALL console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  // Collect JavaScript errors
  const jsErrors = [];
  page.on('pageerror', error => {
    jsErrors.push(error.message);
  });

  console.log('Navigating to http://localhost:4173...');
  await page.goto('http://localhost:4173');

  // Wait a bit for JS to execute
  await page.waitForTimeout(5000);

  console.log('\n=== JavaScript Errors ===');
  if (jsErrors.length === 0) {
    console.log('✅ No uncaught JavaScript errors');
  } else {
    jsErrors.forEach((error, index) => {
      console.log(`❌ ${index + 1}. ${error}`);
    });
  }

  console.log('\n=== Console Messages ===');
  consoleMessages.forEach((msg, index) => {
    console.log(`[${msg.type.toUpperCase()}] ${msg.text}`);
    if (msg.location && msg.location.url) {
      console.log(`    at ${msg.location.url}:${msg.location.lineNumber}:${msg.location.columnNumber}`);
    }
  });

  // Check DOM content
  const bodyContent = await page.locator('body').innerHTML();
  console.log('\n=== DOM Content Analysis ===');
  console.log('Body inner HTML length:', bodyContent.length);
  console.log('Has root div:', bodyContent.includes('id="root"'));

  const rootContent = await page.locator('#root').innerHTML();
  console.log('Root div content:', rootContent || 'EMPTY');

  await browser.close();
})();