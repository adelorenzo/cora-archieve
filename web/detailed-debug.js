import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const page = await browser.newPage();

  // Track all errors with stack traces
  const allErrors = [];
  page.on('pageerror', error => {
    allErrors.push({
      type: 'pageerror',
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  });

  // Track console messages with locations
  const allConsole = [];
  page.on('console', msg => {
    allConsole.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  console.log('=== Starting detailed debug ===');
  console.log('Navigating to http://localhost:4173...');

  try {
    await page.goto('http://localhost:4173', { waitUntil: 'domcontentloaded' });
    console.log('✅ Page loaded successfully');
  } catch (error) {
    console.log('❌ Page load failed:', error.message);
  }

  // Wait for potential JS execution
  await page.waitForTimeout(3000);

  console.log('\n=== Error Analysis ===');
  if (allErrors.length === 0) {
    console.log('✅ No page errors detected');
  } else {
    allErrors.forEach((error, index) => {
      console.log(`\n❌ Error ${index + 1}:`);
      console.log(`   Type: ${error.type}`);
      console.log(`   Name: ${error.name}`);
      console.log(`   Message: ${error.message}`);
      if (error.stack) {
        console.log(`   Stack trace:`);
        console.log(error.stack.split('\n').map(line => `     ${line}`).join('\n'));
      }
    });
  }

  console.log('\n=== Console Analysis ===');
  if (allConsole.length === 0) {
    console.log('No console messages');
  } else {
    allConsole.forEach((msg, index) => {
      console.log(`[${msg.type.toUpperCase()}] ${msg.text}`);
      if (msg.location && msg.location.url) {
        console.log(`    at ${msg.location.url}:${msg.location.lineNumber}:${msg.location.columnNumber}`);
      }
    });
  }

  // Check what actually loaded
  console.log('\n=== DOM Analysis ===');
  const title = await page.title();
  const bodyHTML = await page.locator('body').innerHTML();
  const rootHTML = await page.locator('#root').innerHTML();

  console.log(`Page title: "${title}"`);
  console.log(`Body contains root div: ${bodyHTML.includes('id="root"')}`);
  console.log(`Root div content length: ${rootHTML.length}`);
  if (rootHTML.length > 0) {
    console.log(`Root content preview: ${rootHTML.substring(0, 100)}...`);
  } else {
    console.log('❌ Root div is completely empty - React not mounting');
  }

  // Check network requests
  console.log('\n=== Network Analysis ===');
  const response = await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
  console.log(`Main response status: ${response.status()}`);

  // Try to evaluate basic JS in the page
  try {
    const globalThisExists = await page.evaluate(() => typeof globalThis !== 'undefined');
    const windowExists = await page.evaluate(() => typeof window !== 'undefined');
    const reactExists = await page.evaluate(() => typeof window.React !== 'undefined');

    console.log(`globalThis available: ${globalThisExists}`);
    console.log(`window available: ${windowExists}`);
    console.log(`React available: ${reactExists}`);
  } catch (evalError) {
    console.log('❌ Could not evaluate basic JS:', evalError.message);
  }

  await page.screenshot({ path: 'detailed-debug-screenshot.png' });
  console.log('\n📸 Screenshot saved as detailed-debug-screenshot.png');

  await browser.close();
})();