import { test, expect } from '@playwright/test';

test.describe('Component Testing Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8000');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Header Component', () => {
    test('should display Cora branding', async ({ page }) => {
      const logo = page.locator('img[alt="Cora"]').first();
      await expect(logo).toBeVisible();

      const title = page.locator('h1:has-text("Cora")');
      await expect(title).toBeVisible();

      const tagline = page.locator('text=Browser AI • Your Data Stays Here');
      await expect(tagline).toBeVisible();
    });

    test('should have all header buttons', async ({ page }) => {
      const conversationsBtn = page.locator('[aria-label="Conversations"]');
      await expect(conversationsBtn).toBeVisible();

      const exportBtn = page.locator('[aria-label="Export conversation"]');
      await expect(exportBtn).toBeVisible();

      const settingsBtn = page.locator('button[title*="Settings"]');
      await expect(settingsBtn).toBeVisible();
    });
  });

  test.describe('Model Selector Component', () => {
    test('should display current model', async ({ page }) => {
      const modelButton = page.locator('button').filter({ hasText: /Llama|Hermes|DeepSeek/ }).first();
      await expect(modelButton).toBeVisible();
    });

    test('should open model dropdown on click', async ({ page }) => {
      const modelButton = page.locator('button').filter({ hasText: /Llama|Hermes|DeepSeek/ }).first();
      await modelButton.click();

      await page.waitForTimeout(500);
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible();
    });
  });

  test.describe('Theme Switcher Component', () => {
    test('should have theme toggle buttons', async ({ page }) => {
      const themeButton = page.locator('button[aria-label*="theme"], button:has-text("Choose theme")').first();
      await expect(themeButton).toBeVisible();
    });

    test('should toggle between light and dark mode', async ({ page }) => {
      const darkModeBtn = page.locator('button:has-text("🌙")').first();

      if (await darkModeBtn.isVisible()) {
        await darkModeBtn.click();
        await page.waitForTimeout(200);

        const htmlElement = page.locator('html');
        const classList = await htmlElement.getAttribute('class');
        expect(classList).toContain('dark');
      }
    });
  });

  test.describe('Persona Selector Component', () => {
    test('should display current persona', async ({ page }) => {
      const personaButton = page.locator('button').filter({ hasText: /Assistant|Coder|Teacher|Creative|Analyst/ }).first();
      await expect(personaButton).toBeVisible();
    });

    test('should open persona dropdown on click', async ({ page }) => {
      const personaButton = page.locator('button').filter({ hasText: /Assistant|Coder|Teacher|Creative|Analyst/ }).first();
      await personaButton.click();

      await page.waitForTimeout(500);
      const customOption = page.locator('text=Add custom persona');
      await expect(customOption).toBeVisible();
    });
  });

  test.describe('Chat Interface', () => {
    test('should have message input area', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Type"]');
      await expect(textarea).toBeVisible();
    });

    test('should have send button', async ({ page }) => {
      const sendButton = page.locator('button[aria-label*="Send"], button[type="submit"]').last();
      await expect(sendButton).toBeVisible();
    });

    test('should send and receive messages', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Type"]');
      await textarea.fill('Hello, test message');

      const sendButton = page.locator('button[aria-label*="Send"], button[type="submit"]').last();
      await sendButton.click();

      await page.waitForSelector('text=Hello, test message', { timeout: 10000 });
      const userMessage = page.locator('text=Hello, test message').first();
      await expect(userMessage).toBeVisible();

      await page.waitForSelector('[role="paragraph"], .assistant-message', { timeout: 30000 });
    });

    test('should display copy buttons for messages', async ({ page }) => {
      await page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Type"]').fill('Test');
      await page.locator('button[aria-label*="Send"], button[type="submit"]').last().click();

      await page.waitForTimeout(3000);
      const copyButtons = page.locator('[aria-label*="Copy"], button:has(svg[class*="clipboard"])');
      const count = await copyButtons.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Export Dropdown Component', () => {
    test('should open export menu', async ({ page }) => {
      await page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Type"]').fill('Export test');
      await page.locator('button[aria-label*="Send"], button[type="submit"]').last().click();
      await page.waitForTimeout(2000);

      const exportButton = page.locator('[aria-label="Export conversation"]');
      await exportButton.click();

      await page.waitForTimeout(500);
      const markdownOption = page.locator('text=Export as Markdown');
      await expect(markdownOption).toBeVisible();

      const textOption = page.locator('text=Export as Plain Text');
      await expect(textOption).toBeVisible();

      const csvOption = page.locator('text=Export as CSV');
      await expect(csvOption).toBeVisible();
    });

    test('should close dropdown when clicking outside', async ({ page }) => {
      await page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Type"]').fill('Test');
      await page.locator('button[aria-label*="Send"], button[type="submit"]').last().click();
      await page.waitForTimeout(2000);

      await page.locator('[aria-label="Export conversation"]').click();
      await page.waitForTimeout(500);

      await expect(page.locator('text=Export as Markdown')).toBeVisible();

      await page.locator('body').click({ position: { x: 10, y: 10 } });
      await page.waitForTimeout(500);

      await expect(page.locator('text=Export as Markdown')).not.toBeVisible();
    });
  });

  test.describe('Status Bar Component', () => {
    test('should display runtime status', async ({ page }) => {
      const webgpuStatus = page.locator('text=WEBGPU, text=WASM').first();
      await expect(webgpuStatus).toBeVisible();
    });

    test('should show model loading progress', async ({ page }) => {
      const statusText = page.locator('text=/Ready|Loading|Detecting/');
      await expect(statusText).toBeVisible({ timeout: 30000 });
    });
  });

  test.describe('Settings Modal', () => {
    test('should open settings modal', async ({ page }) => {
      const settingsButton = page.locator('button[title*="Settings"], button:has(svg[class*="settings"])').first();
      await settingsButton.click();

      await page.waitForTimeout(500);
      const modal = page.locator('[role="dialog"], .settings-modal');
      await expect(modal).toBeVisible();
    });

    test('should have temperature control', async ({ page }) => {
      const settingsButton = page.locator('button[title*="Settings"], button:has(svg[class*="settings"])').first();
      await settingsButton.click();

      await page.waitForTimeout(500);
      const tempLabel = page.locator('text=/Temperature/i');
      await expect(tempLabel).toBeVisible();

      const slider = page.locator('input[type="range"]').first();
      await expect(slider).toBeVisible();
    });

    test('should close on X button', async ({ page }) => {
      const settingsButton = page.locator('button[title*="Settings"], button:has(svg[class*="settings"])').first();
      await settingsButton.click();

      await page.waitForTimeout(500);
      const closeButton = page.locator('[aria-label*="Close"], button:has-text("×")').first();
      await closeButton.click();

      await page.waitForTimeout(500);
      const modal = page.locator('[role="dialog"], .settings-modal');
      await expect(modal).not.toBeVisible();
    });
  });

  test.describe('Conversation Switcher', () => {
    test('should open conversation list', async ({ page }) => {
      const conversationsBtn = page.locator('[aria-label="Conversations"]');
      await conversationsBtn.click();

      await page.waitForTimeout(500);
      const newConvBtn = page.locator('text=/New Conversation/i');
      await expect(newConvBtn).toBeVisible();
    });

    test('should create new conversation', async ({ page }) => {
      const conversationsBtn = page.locator('[aria-label="Conversations"]');
      await conversationsBtn.click();

      await page.waitForTimeout(500);
      const newConvBtn = page.locator('button:has-text("New Conversation")');
      await newConvBtn.click();

      await page.waitForTimeout(500);
      const textarea = page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Type"]');
      const value = await textarea.inputValue();
      expect(value).toBe('');
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      const buttons = page.locator('button[aria-label]');
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const label = await buttons.nth(i).getAttribute('aria-label');
        expect(label).toBeTruthy();
        expect(label.length).toBeGreaterThan(0);
      }
    });

    test('should be keyboard navigable', async ({ page }) => {
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle empty message gracefully', async ({ page }) => {
      const sendButton = page.locator('button[aria-label*="Send"], button[type="submit"]').last();
      await sendButton.click();

      await page.waitForTimeout(1000);
      const errorMessage = page.locator('text=/error|Error/i');
      const errorCount = await errorMessage.count();
      expect(errorCount).toBe(0);
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt to mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      const logo = page.locator('img[alt="Cora"]').first();
      await expect(logo).toBeVisible();

      const textarea = page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Type"]');
      await expect(textarea).toBeVisible();
    });

    test('should adapt to tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);

      const header = page.locator('h1:has-text("Cora")');
      await expect(header).toBeVisible();
    });
  });
});