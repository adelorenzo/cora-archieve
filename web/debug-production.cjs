const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Capture all console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  // Capture network errors
  page.on('requestfailed', request => {
    console.log('Request failed:', request.url(), request.failure().errorText);
  });

  console.log('Opening production build...');
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });

  // Wait for potential React mount
  await page.waitForTimeout(3000);

  // Check if React DevTools are available
  const hasReact = await page.evaluate(() => {
    return !!(window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
  });
  console.log('React detected:', hasReact);

  // Check if the root element exists and has content
  const rootInfo = await page.evaluate(() => {
    const root = document.getElementById('root');
    if (!root) return { exists: false };

    return {
      exists: true,
      hasChildren: root.children.length > 0,
      innerHTML: root.innerHTML.substring(0, 500),
      textContent: root.textContent?.substring(0, 200),
      childCount: root.children.length,
      className: root.className
    };
  });

  console.log('\n=== Root Element Info ===');
  console.log('Exists:', rootInfo.exists);
  if (rootInfo.exists) {
    console.log('Has children:', rootInfo.hasChildren);
    console.log('Child count:', rootInfo.childCount);
    console.log('Class name:', rootInfo.className || '(none)');
    console.log('Text preview:', rootInfo.textContent || '(empty)');
    if (rootInfo.innerHTML) {
      console.log('HTML preview:', rootInfo.innerHTML);
    }
  }

  // Check for global variables and functions
  const globalChecks = await page.evaluate(() => {
    return {
      hasGlobalName: typeof globalThis.__name === 'function',
      hasGlobalDefProp: typeof globalThis.__defProp === 'function',
      hasWindow: typeof window !== 'undefined',
      hasDocument: typeof document !== 'undefined',
      moduleScriptsCount: document.querySelectorAll('script[type="module"]').length,
      allScriptsCount: document.querySelectorAll('script').length,
      linkTagsCount: document.querySelectorAll('link[rel="stylesheet"]').length
    };
  });

  console.log('\n=== Global Checks ===');
  console.log('Has __name:', globalChecks.hasGlobalName);
  console.log('Has __defProp:', globalChecks.hasGlobalDefProp);
  console.log('Module scripts:', globalChecks.moduleScriptsCount);
  console.log('Total scripts:', globalChecks.allScriptsCount);
  console.log('Stylesheets:', globalChecks.linkTagsCount);

  // Check for any JavaScript errors in module loading
  const moduleErrors = await page.evaluate(() => {
    const errors = [];
    const scripts = document.querySelectorAll('script[type="module"]');
    scripts.forEach(script => {
      if (script.src) {
        // Try to check if the script loaded
        errors.push({
          src: script.src,
          async: script.async,
          defer: script.defer
        });
      }
    });
    return errors;
  });

  console.log('\n=== Module Scripts ===');
  moduleErrors.forEach(script => {
    console.log(`- ${script.src}`);
  });

  // Check body content
  const bodyInfo = await page.evaluate(() => {
    return {
      className: document.body.className,
      childCount: document.body.children.length,
      hasContent: document.body.textContent.trim().length > 0
    };
  });

  console.log('\n=== Body Info ===');
  console.log('Class:', bodyInfo.className || '(none)');
  console.log('Children:', bodyInfo.childCount);
  console.log('Has text:', bodyInfo.hasContent);

  // Try to manually check if the main module loaded
  const mainModuleCheck = await page.evaluate(() => {
    return new Promise((resolve) => {
      // Give it a moment for dynamic imports
      setTimeout(() => {
        const root = document.getElementById('root');
        resolve({
          rootContent: root ? root.innerHTML !== '' : false,
          bodyClasses: document.body.className,
          htmlClasses: document.documentElement.className
        });
      }, 2000);
    });
  });

  console.log('\n=== After Wait ===');
  console.log('Root has content:', mainModuleCheck.rootContent);
  console.log('Body classes:', mainModuleCheck.bodyClasses);
  console.log('HTML classes:', mainModuleCheck.htmlClasses);

  // Take screenshot
  await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
  console.log('\n=== Screenshot saved to debug-screenshot.png ===');

  // Final console message summary
  console.log('\n=== Console Messages Summary ===');
  const errorCount = consoleMessages.filter(m => m.type === 'error').length;
  const warnCount = consoleMessages.filter(m => m.type === 'warning').length;
  console.log(`Errors: ${errorCount}, Warnings: ${warnCount}, Total: ${consoleMessages.length}`);

  if (errorCount > 0) {
    console.log('\nErrors:');
    consoleMessages.filter(m => m.type === 'error').forEach(m => {
      console.log(`  ${m.text}`);
      if (m.location?.url) {
        console.log(`    at ${m.location.url}:${m.location.lineNumber}`);
      }
    });
  }

  await browser.close();
})();