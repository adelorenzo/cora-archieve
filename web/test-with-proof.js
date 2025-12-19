import { chromium } from '@playwright/test';

(async () => {
  console.log('Starting Playwright test with screenshot proof...');

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  // Capture console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console error:', msg.text());
      errors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('Page error:', err.message);
    errors.push(err.message);
  });

  try {
    const url = process.argv[2] || 'http://localhost:4173';
    console.log(`Navigating to ${url}...`);
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait a bit for any lazy loading
    await page.waitForTimeout(3000);

    // Take screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `./proof-${timestamp}.png`;
    await page.screenshot({
      path: screenshotPath,
      fullPage: false
    });
    console.log(`Screenshot saved to: ${screenshotPath}`);

    // Check for the app root element
    const rootElement = await page.$('#root');
    if (rootElement) {
      console.log('✅ Root element found');

      // Check if there's actual content
      const hasContent = await page.evaluate(() => {
        const root = document.getElementById('root');
        return root && root.children.length > 0;
      });

      if (hasContent) {
        console.log('✅ App has rendered content');

        // Try to find the chat interface
        const chatFound = await page.evaluate(() => {
          const elements = document.querySelectorAll('*');
          for (let el of elements) {
            if (el.textContent && (
              el.textContent.includes('Send') ||
              el.textContent.includes('Chat') ||
              el.textContent.includes('Message') ||
              el.textContent.includes('Cora')
            )) {
              return true;
            }
          }
          return false;
        });

        if (chatFound) {
          console.log('✅ Chat interface detected');
        } else {
          console.log('⚠️ Chat interface not clearly detected');
        }
      } else {
        console.log('❌ Root element is empty - app did not render');
      }
    } else {
      console.log('❌ Root element not found');
    }

    // Report errors
    if (errors.length > 0) {
      console.log('\n❌ Console errors detected:');
      errors.forEach(err => console.log('  -', err));
      console.log('\nTHE APP IS NOT WORKING - ERRORS PRESENT');
    } else {
      console.log('\n✅ No console errors detected');
      console.log('THE APP APPEARS TO BE WORKING');
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
    process.exit(errors.length > 0 ? 1 : 0);
  }
})();