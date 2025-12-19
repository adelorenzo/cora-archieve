import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('WCAG 2.1 Accessibility Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8000');
    await page.waitForLoadState('networkidle');
    await injectAxe(page);
  });

  test('Main page accessibility', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true
      }
    });
  });

  test('Keyboard navigation', async ({ page }) => {
    // Test Tab navigation
    const focusableElements = await page.evaluate(() => {
      const elements = [];
      const focusable = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      focusable.forEach(el => {
        elements.push({
          tag: el.tagName,
          text: el.textContent?.substring(0, 30),
          ariaLabel: el.getAttribute('aria-label'),
          role: el.getAttribute('role')
        });
      });

      return elements;
    });

    console.log('Focusable elements found:', focusableElements.length);

    // Test Tab order
    for (let i = 0; i < Math.min(10, focusableElements.length); i++) {
      await page.keyboard.press('Tab');
      const activeElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName,
          text: el?.textContent?.substring(0, 30),
          ariaLabel: el?.getAttribute('aria-label')
        };
      });
      console.log(`Tab ${i + 1}:`, activeElement);
    }
  });

  test('ARIA labels and roles', async ({ page }) => {
    // Check buttons have labels
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      const title = await button.getAttribute('title');

      // Button should have either aria-label, text content, or title
      const hasAccessibleName = ariaLabel || text?.trim() || title;
      expect(hasAccessibleName, `Button ${i} missing accessible name`).toBeTruthy();
    }

    // Check images have alt text
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt, `Image ${i} missing alt text`).toBeTruthy();
    }

    // Check form inputs have labels
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');

      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const hasLabel = await label.count() > 0;
        const hasAriaLabel = ariaLabel || ariaLabelledby;
        expect(hasLabel || hasAriaLabel, `Input ${i} missing label`).toBeTruthy();
      }
    }
  });

  test('Color contrast', async ({ page }) => {
    await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });
  });

  test('Focus indicators', async ({ page }) => {
    // Check that focused elements have visible focus indicators
    const checkFocusVisible = await page.evaluate(() => {
      const button = document.querySelector('button');
      if (!button) return false;

      button.focus();
      const styles = window.getComputedStyle(button);
      const hasFocusStyle =
        styles.outline !== 'none' ||
        styles.boxShadow !== 'none' ||
        styles.border !== 'none';

      return hasFocusStyle;
    });

    expect(checkFocusVisible).toBeTruthy();
  });

  test('Landmark regions', async ({ page }) => {
    const landmarks = await page.evaluate(() => {
      const regions = [];

      // Check for main landmark
      const main = document.querySelector('main, [role="main"]');
      regions.push({ type: 'main', exists: !!main });

      // Check for navigation
      const nav = document.querySelector('nav, [role="navigation"]');
      regions.push({ type: 'navigation', exists: !!nav });

      // Check for banner/header
      const banner = document.querySelector('header, [role="banner"]');
      regions.push({ type: 'banner', exists: !!banner });

      // Check for contentinfo/footer
      const footer = document.querySelector('footer, [role="contentinfo"]');
      regions.push({ type: 'contentinfo', exists: !!footer });

      return regions;
    });

    console.log('Landmark regions:', landmarks);

    // Main region should exist
    const mainRegion = landmarks.find(l => l.type === 'main');
    expect(mainRegion?.exists, 'Missing main landmark').toBeTruthy();
  });

  test('Heading hierarchy', async ({ page }) => {
    const headings = await page.evaluate(() => {
      const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(headingElements).map(h => ({
        level: parseInt(h.tagName[1]),
        text: h.textContent?.trim()
      }));
    });

    console.log('Heading structure:', headings);

    // Check for h1
    const h1Count = headings.filter(h => h.level === 1).length;
    expect(h1Count).toBeGreaterThan(0);
    expect(h1Count).toBeLessThanOrEqual(1); // Should have exactly one h1

    // Check heading hierarchy (no skipping levels)
    for (let i = 1; i < headings.length; i++) {
      const levelDiff = headings[i].level - headings[i - 1].level;
      expect(levelDiff).toBeLessThanOrEqual(1); // Should not skip levels
    }
  });

  test('Screen reader announcements', async ({ page }) => {
    // Check for aria-live regions
    const ariaLiveRegions = await page.evaluate(() => {
      const liveRegions = document.querySelectorAll('[aria-live]');
      return Array.from(liveRegions).map(r => ({
        ariaLive: r.getAttribute('aria-live'),
        role: r.getAttribute('role'),
        text: r.textContent?.substring(0, 50)
      }));
    });

    console.log('ARIA live regions:', ariaLiveRegions);
  });

  test('Form accessibility', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible()) {
      // Check for placeholder or label
      const placeholder = await textarea.getAttribute('placeholder');
      const ariaLabel = await textarea.getAttribute('aria-label');
      const id = await textarea.getAttribute('id');

      expect(placeholder || ariaLabel || id).toBeTruthy();

      // Check for associated label if id exists
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const hasLabel = await label.count() > 0;
        console.log(`Textarea has label: ${hasLabel}`);
      }
    }
  });

  test('Error messages accessibility', async ({ page }) => {
    // Trigger an error (if possible)
    // Check for aria-invalid and aria-describedby
    const errorElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[aria-invalid="true"]');
      return Array.from(elements).map(el => ({
        tag: el.tagName,
        ariaDescribedby: el.getAttribute('aria-describedby'),
        ariaErrormessage: el.getAttribute('aria-errormessage')
      }));
    });

    console.log('Error elements:', errorElements);
  });

  test('Loading states accessibility', async ({ page }) => {
    // Check for loading indicators
    const loadingElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[aria-busy="true"], [role="status"], .loading');
      return Array.from(elements).map(el => ({
        tag: el.tagName,
        ariaBusy: el.getAttribute('aria-busy'),
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label')
      }));
    });

    console.log('Loading indicators:', loadingElements);
  });

  test('Mobile accessibility', async ({ page }) => {
    // Test at mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check touch target sizes
    const touchTargets = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, a, [role="button"]');
      const smallTargets = [];

      buttons.forEach(btn => {
        const rect = btn.getBoundingClientRect();
        if (rect.width < 44 || rect.height < 44) {
          smallTargets.push({
            text: btn.textContent?.substring(0, 20),
            width: rect.width,
            height: rect.height
          });
        }
      });

      return smallTargets;
    });

    console.log('Small touch targets:', touchTargets);
    expect(touchTargets.length).toBe(0); // No touch targets should be smaller than 44x44
  });

  test('Skip to content link', async ({ page }) => {
    // Check for skip navigation link
    const skipLink = await page.evaluate(() => {
      const link = document.querySelector('a[href="#main"], a[href="#content"], .skip-link');
      return link ? {
        text: link.textContent,
        href: link.getAttribute('href'),
        visible: window.getComputedStyle(link).display !== 'none'
      } : null;
    });

    console.log('Skip link:', skipLink);
  });

  test('Language attribute', async ({ page }) => {
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toBeTruthy();
    expect(lang).toBe('en');
  });

  test('Page title', async ({ page }) => {
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title).toContain('Cora');
  });
});