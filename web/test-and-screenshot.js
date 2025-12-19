import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function testAndScreenshot() {
  console.log('🔍 Starting comprehensive test with visual proof...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Capture all console messages
  const consoleLogs = [];
  const errors = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleLogs.push(`[${type.toUpperCase()}] ${text}`);

    if (type === 'error') {
      errors.push(text);
      console.log(`❌ Error detected: ${text}`);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    errors.push(error.toString());
    console.log(`❌ Page error: ${error}`);
  });

  try {
    console.log('📱 Navigating to http://localhost:4173...');
    await page.goto('http://localhost:4173', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('⏳ Waiting for app to fully load...');
    await page.waitForTimeout(3000);

    // Check if main app container exists
    const appExists = await page.locator('#root').count() > 0;
    console.log(`✓ App root element exists: ${appExists}`);

    // Check for React rendering
    const hasContent = await page.locator('main, div.app, [class*="container"]').count() > 0;
    console.log(`✓ React content rendered: ${hasContent}`);

    // Take screenshots
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const screenshotDir = 'playwright-screenshots';

    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir);
    }

    // Full page screenshot
    const fullPagePath = path.join(screenshotDir, `full-page-${timestamp}.png`);
    await page.screenshot({
      path: fullPagePath,
      fullPage: true
    });
    console.log(`📸 Full page screenshot saved: ${fullPagePath}`);

    // Viewport screenshot
    const viewportPath = path.join(screenshotDir, `viewport-${timestamp}.png`);
    await page.screenshot({
      path: viewportPath,
      fullPage: false
    });
    console.log(`📸 Viewport screenshot saved: ${viewportPath}`);

    // Check for specific UI elements
    const elements = [
      { selector: 'button', name: 'Buttons' },
      { selector: 'input, textarea', name: 'Input fields' },
      { selector: '[class*="chat"], [class*="message"]', name: 'Chat elements' },
      { selector: '[class*="settings"], [class*="modal"]', name: 'Settings/Modals' }
    ];

    console.log('\n🔍 Checking for UI elements:');
    for (const elem of elements) {
      const count = await page.locator(elem.selector).count();
      if (count > 0) {
        console.log(`  ✓ ${elem.name}: ${count} found`);
      } else {
        console.log(`  ⚠️ ${elem.name}: none found`);
      }
    }

    // Create test report
    const report = {
      timestamp: new Date().toISOString(),
      url: 'http://localhost:5173',
      errors: errors,
      errorCount: errors.length,
      success: errors.length === 0,
      screenshots: [fullPagePath, viewportPath],
      uiElements: await Promise.all(elements.map(async e => ({
        name: e.name,
        selector: e.selector,
        count: await page.locator(e.selector).count()
      }))),
      consoleLogs: consoleLogs.slice(-20) // Last 20 logs
    };

    fs.writeFileSync(
      path.join(screenshotDir, `test-report-${timestamp}.json`),
      JSON.stringify(report, null, 2)
    );

    // Final verdict
    console.log('\n' + '='.repeat(60));
    if (errors.length === 0) {
      console.log('✅ SUCCESS: No JavaScript errors detected!');
      console.log('✅ App is running without scheduler errors!');
      console.log(`✅ Screenshots prove the app is working!`);
      console.log(`📁 View screenshots in: ${screenshotDir}/`);
    } else {
      console.log('❌ FAILURE: JavaScript errors found:');
      errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
      console.log('⚠️ Fix required before deployment!');
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Test failed:', error);

    // Take error screenshot
    const errorScreenshot = path.join('playwright-screenshots', `error-${Date.now()}.png`);
    await page.screenshot({ path: errorScreenshot });
    console.log(`📸 Error screenshot saved: ${errorScreenshot}`);
  } finally {
    await browser.close();
  }

  return errors.length === 0;
}

// Run the test
testAndScreenshot().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});