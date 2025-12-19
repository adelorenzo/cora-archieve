import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Navigate to the app
  console.log('Navigating to http://localhost:4173...');
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });

  // Wait for React app to load (with longer timeout)
  try {
    await page.waitForSelector('text=Cora', { timeout: 15000 });
  } catch (error) {
    console.log('Note: Cora text not found, continuing with basic checks...');
  }

  // Take a screenshot
  await page.screenshot({ path: 'production-test-screenshot.png', fullPage: true });
  console.log('Screenshot saved as production-test-screenshot.png');

  // Check for key UI elements
  const title = await page.title();
  console.log('Page title:', title);

  const hasCoraText = await page.locator('text=Cora').isVisible();
  console.log('Cora branding visible:', hasCoraText);

  const hasAssistantText = await page.locator('text=Assistant').isVisible();
  console.log('Assistant text visible:', hasAssistantText);

  const hasStartConversation = await page.locator('text=Start a conversation').isVisible();
  console.log('Start conversation text visible:', hasStartConversation);

  // Check for runtime detection
  const hasRuntimeText = await page.locator(':has-text("runtime")').isVisible();
  console.log('Runtime detection text visible:', hasRuntimeText);

  // Check for console errors
  console.log('\n=== JavaScript Console Errors ===');
  if (consoleErrors.length === 0) {
    console.log('✅ No console errors detected!');
  } else {
    console.log('❌ Console errors found:');
    consoleErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  // Final verification
  console.log('\n=== Final Verification ===');
  console.log(`✅ App loads successfully: ${title === 'Cora - AI Assistant'}`);
  console.log(`✅ UI elements present: ${hasCoraText && hasAssistantText && hasStartConversation}`);
  console.log(`✅ No critical errors: ${consoleErrors.length === 0}`);

  await browser.close();
})();