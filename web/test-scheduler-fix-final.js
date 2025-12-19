#!/usr/bin/env node

import puppeteer from 'puppeteer';

async function testSchedulerFix() {
  console.log('Testing React scheduler fix...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Listen for console errors
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
        console.log('❌ Console Error:', msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', (error) => {
      errors.push(error.message);
      console.log('❌ Page Error:', error.message);
    });

    console.log('Loading app at http://localhost:4173...');
    await page.goto('http://localhost:4173', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for React to initialize
    await page.waitForTimeout(5000);

    // Check if the main React components are rendered
    const appLoaded = await page.$eval('body', (body) => {
      return body.innerHTML.includes('class') && body.innerHTML.length > 100;
    });

    console.log('App loaded successfully:', appLoaded);

    // Check for the specific "o is not a function" error
    const hasSchedulerError = errors.some(error =>
      error.includes('o is not a function') ||
      error.includes('TypeError') && error.includes('174')
    );

    if (hasSchedulerError) {
      console.log('❌ Scheduler error still present');
      console.log('Errors found:', errors);
      return false;
    } else if (errors.length > 0) {
      console.log('⚠️  Other errors found (but not scheduler error):', errors);
      return true; // Fix worked, but there might be other issues
    } else {
      console.log('✅ No scheduler errors detected! Fix successful.');
      return true;
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

testSchedulerFix().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});