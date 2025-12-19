const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Capture console messages with full detail
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
    // Also log the location if available
    const location = msg.location();
    if (location.url) {
      console.log(`  at ${location.url}:${location.lineNumber}:${location.columnNumber}`);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.log('Page error:', error.message);
    console.log('Stack:', error.stack);
  });

  console.log('Opening http://localhost:4173/...');
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });

  // Wait a bit for any async errors
  await page.waitForTimeout(2000);

  // Try to evaluate in the page context to check for errors
  const pageInfo = await page.evaluate(() => {
    const errors = [];
    
    // Check if main module loaded
    const scripts = Array.from(document.querySelectorAll('script[type="module"]'));
    
    return {
      title: document.title,
      scripts: scripts.map(s => s.src || 'inline'),
      rootHTML: document.getElementById('root')?.innerHTML || 'no root',
      hasReact: typeof window.React !== 'undefined',
      hasReactDOM: typeof window.ReactDOM !== 'undefined',
      globalThis__name: typeof globalThis.__name,
      globalThis__defProp: typeof globalThis.__defProp,
      globalThis__defNormalProp: typeof globalThis.__defNormalProp,
      globalThis__publicField: typeof globalThis.__publicField,
      windowKeys: Object.keys(window).length
    };
  });

  console.log('\n=== Page Info ===');
  console.log(JSON.stringify(pageInfo, null, 2));

  // Take screenshot
  await page.screenshot({ path: 'test-console.png', fullPage: true });
  console.log('\nScreenshot saved to test-console.png');

  // Keep browser open for manual inspection
  console.log('\n Browser staying open for inspection. Press Ctrl+C to close.');
  
  // Wait indefinitely
  await new Promise(() => {});
})();
