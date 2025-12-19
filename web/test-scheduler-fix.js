import { chromium } from '@playwright/test';

async function testSchedulerFix() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Listen for console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Navigate to the app
  await page.goto('http://localhost:8080');

  // Wait a bit for any errors to appear
  await page.waitForTimeout(2000);

  // Check for errors
  if (errors.length > 0) {
    console.log('❌ JavaScript errors found:');
    errors.forEach(err => console.log('  -', err));
  } else {
    console.log('✅ No JavaScript errors! The scheduler fix works!');
  }

  await browser.close();
}

testSchedulerFix().catch(console.error);