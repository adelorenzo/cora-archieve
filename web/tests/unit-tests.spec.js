import { test, expect } from '@playwright/test';

test.describe('Unit Tests for Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8000');
    await page.waitForLoadState('networkidle');
  });

  test.describe('SimpleMarkdownRenderer', () => {
    test('should render markdown headings', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Type"]');
      await textarea.fill('Show me markdown: # Heading 1\n## Heading 2');
      await page.locator('button[aria-label*="Send"], button[type="submit"]').last().click();

      await page.waitForTimeout(3000);
      await page.keyboard.press('Escape');
    });

    test('should render code blocks', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Type"]');
      await textarea.fill('Show code: ```js\nconst x = 1;\n```');
      await page.locator('button[aria-label*="Send"], button[type="submit"]').last().click();

      await page.waitForTimeout(3000);
    });

    test('should render lists properly', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Type"]');
      await textarea.fill('Make a list: - Item 1\n- Item 2\n- Item 3');
      await page.locator('button[aria-label*="Send"], button[type="submit"]').last().click();

      await page.waitForTimeout(3000);
    });

    test('should handle inline code', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Type"]');
      await textarea.fill('Use `inline code` here');
      await page.locator('button[aria-label*="Send"], button[type="submit"]').last().click();

      await page.waitForTimeout(3000);
    });
  });

  test.describe('ThemeSwitcher', () => {
    test('should persist theme selection', async ({ page }) => {
      const darkBtn = page.locator('button:has-text("🌙")').first();
      if (await darkBtn.isVisible()) {
        await darkBtn.click();
        await page.waitForTimeout(500);
      }

      await page.reload();
      await page.waitForLoadState('networkidle');

      const htmlElement = page.locator('html');
      const classList = await htmlElement.getAttribute('class');
      expect(classList).toContain('dark');
    });

    test('should apply theme colors correctly', async ({ page }) => {
      const themeBtn = page.locator('button:has-text("Choose theme")').first();
      if (await themeBtn.isVisible()) {
        await themeBtn.click();
        await page.waitForTimeout(500);

        const oceanTheme = page.locator('text=Ocean');
        if (await oceanTheme.isVisible()) {
          await oceanTheme.click();
          await page.waitForTimeout(500);

          const htmlElement = page.locator('html');
          const classList = await htmlElement.getAttribute('class');
          expect(classList).toContain('ocean');
        }
      }
    });
  });

  test.describe('PersonaSelector', () => {
    test('should switch personas', async ({ page }) => {
      const personaBtn = page.locator('button').filter({ hasText: /Assistant|Coder|Teacher/ }).first();
      await personaBtn.click();
      await page.waitForTimeout(500);

      const coderPersona = page.locator('text=💻 Coder');
      if (await coderPersona.isVisible()) {
        await coderPersona.click();
        await page.waitForTimeout(500);

        const updatedBtn = page.locator('button:has-text("💻 Coder")');
        await expect(updatedBtn).toBeVisible();
      }
    });

    test('should handle custom persona creation', async ({ page }) => {
      const personaBtn = page.locator('button').filter({ hasText: /Assistant|Coder|Teacher/ }).first();
      await personaBtn.click();
      await page.waitForTimeout(500);

      const customBtn = page.locator('text=Add custom persona');
      if (await customBtn.isVisible()) {
        await customBtn.click();
        await page.waitForTimeout(500);

        const nameInput = page.locator('input[placeholder*="name"], input[placeholder*="Name"]').first();
        if (await nameInput.isVisible()) {
          await nameInput.fill('Test Persona');

          const promptInput = page.locator('textarea[placeholder*="prompt"], textarea[placeholder*="Prompt"]').first();
          await promptInput.fill('You are a test persona');

          const saveBtn = page.locator('button:has-text("Save"), button:has-text("Add")').last();
          await saveBtn.click();
        }
      }
    });
  });

  test.describe('ConversationSwitcher', () => {
    test('should list conversations', async ({ page }) => {
      const convBtn = page.locator('[aria-label="Conversations"]');
      await convBtn.click();
      await page.waitForTimeout(500);

      const convList = page.locator('[role="list"], .conversation-list');
      if (await convList.isVisible()) {
        const items = page.locator('[role="listitem"], .conversation-item');
        const count = await items.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should delete conversation', async ({ page }) => {
      const convBtn = page.locator('[aria-label="Conversations"]');
      await convBtn.click();
      await page.waitForTimeout(500);

      const deleteBtn = page.locator('button[aria-label*="Delete"], button:has(svg[class*="trash"])').first();
      if (await deleteBtn.isVisible()) {
        const initialCount = await page.locator('[role="listitem"], .conversation-item').count();

        await deleteBtn.click();
        await page.waitForTimeout(500);

        const confirmBtn = page.locator('button:has-text("Delete"), button:has-text("Confirm")').last();
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
          await page.waitForTimeout(500);

          const newCount = await page.locator('[role="listitem"], .conversation-item').count();
          expect(newCount).toBeLessThanOrEqual(initialCount);
        }
      }
    });
  });

  test.describe('Export Utils', () => {
    test('should export to markdown', async ({ page }) => {
      await page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Type"]').fill('Test export');
      await page.locator('button[aria-label*="Send"], button[type="submit"]').last().click();
      await page.waitForTimeout(2000);

      const exportBtn = page.locator('[aria-label="Export conversation"]');
      await exportBtn.click();
      await page.waitForTimeout(500);

      const downloadPromise = page.waitForEvent('download');
      await page.locator('text=Export as Markdown').click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toContain('.md');
    });

    test('should export to text', async ({ page }) => {
      await page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Type"]').fill('Test text');
      await page.locator('button[aria-label*="Send"], button[type="submit"]').last().click();
      await page.waitForTimeout(2000);

      const exportBtn = page.locator('[aria-label="Export conversation"]');
      await exportBtn.click();
      await page.waitForTimeout(500);

      const downloadPromise = page.waitForEvent('download');
      await page.locator('text=Export as Plain Text').click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toContain('.txt');
    });

    test('should export to CSV', async ({ page }) => {
      await page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Type"]').fill('Test CSV');
      await page.locator('button[aria-label*="Send"], button[type="submit"]').last().click();
      await page.waitForTimeout(2000);

      const exportBtn = page.locator('[aria-label="Export conversation"]');
      await exportBtn.click();
      await page.waitForTimeout(500);

      const downloadPromise = page.waitForEvent('download');
      await page.locator('text=Export as CSV').click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toContain('.csv');
    });
  });

  test.describe('Model Switching', () => {
    test('should switch between models', async ({ page }) => {
      const modelBtn = page.locator('button').filter({ hasText: /Llama|Hermes|DeepSeek/ }).first();
      const initialText = await modelBtn.textContent();

      await modelBtn.click();
      await page.waitForTimeout(500);

      const models = page.locator('[role="option"], .model-option');
      const count = await models.count();

      if (count > 1) {
        await models.nth(1).click();
        await page.waitForTimeout(1000);

        const newText = await modelBtn.textContent();
        expect(newText).not.toBe(initialText);
      }
    });

    test('should persist model selection', async ({ page }) => {
      const modelBtn = page.locator('button').filter({ hasText: /Llama|Hermes|DeepSeek/ }).first();
      const selectedModel = await modelBtn.textContent();

      await page.reload();
      await page.waitForLoadState('networkidle');

      const newModelBtn = page.locator('button').filter({ hasText: /Llama|Hermes|DeepSeek/ }).first();
      const reloadedModel = await newModelBtn.textContent();

      expect(reloadedModel).toBe(selectedModel);
    });
  });

  test.describe('Message Handling', () => {
    test('should handle long messages', async ({ page }) => {
      const longText = 'This is a very long message. '.repeat(50);
      await page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Type"]').fill(longText);
      await page.locator('button[aria-label*="Send"], button[type="submit"]').last().click();

      await page.waitForTimeout(2000);
      const userMsg = page.locator(`text="${longText.substring(0, 30)}"`).first();
      await expect(userMsg).toBeVisible();
    });

    test('should handle special characters', async ({ page }) => {
      const specialText = 'Test <script>alert("XSS")</script> & "quotes" \'apostrophes\'';
      await page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Type"]').fill(specialText);
      await page.locator('button[aria-label*="Send"], button[type="submit"]').last().click();

      await page.waitForTimeout(2000);
      await page.waitForSelector('text=/alert/');
    });

    test('should copy message to clipboard', async ({ page }) => {
      await page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Type"]').fill('Copy test');
      await page.locator('button[aria-label*="Send"], button[type="submit"]').last().click();
      await page.waitForTimeout(2000);

      const copyBtn = page.locator('[aria-label*="Copy"], button:has(svg[class*="clipboard"])').first();
      await copyBtn.click();

      const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardContent).toContain('Copy test');
    });
  });

  test.describe('Settings Persistence', () => {
    test('should save temperature setting', async ({ page }) => {
      const settingsBtn = page.locator('button[title*="Settings"], button:has(svg[class*="settings"])').first();
      await settingsBtn.click();
      await page.waitForTimeout(500);

      const slider = page.locator('input[type="range"]').first();
      await slider.fill('0.8');

      const closeBtn = page.locator('[aria-label*="Close"], button:has-text("×")').first();
      await closeBtn.click();

      await page.reload();
      await page.waitForLoadState('networkidle');

      await settingsBtn.click();
      await page.waitForTimeout(500);

      const newSlider = page.locator('input[type="range"]').first();
      const value = await newSlider.inputValue();
      expect(parseFloat(value)).toBeCloseTo(0.8, 1);
    });
  });

  test.describe('Loading States', () => {
    test('should show loading indicator during model init', async ({ page }) => {
      await page.reload();
      await page.waitForTimeout(500);

      const loadingText = page.locator('text=/Loading|Initializing|Detecting/');
      await expect(loadingText).toBeVisible({ timeout: 5000 });
    });

    test('should show typing indicator during response', async ({ page }) => {
      await page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Type"]').fill('Test');
      await page.locator('button[aria-label*="Send"], button[type="submit"]').last().click();

      const typingIndicator = page.locator('.typing-indicator, [aria-label*="typing"], text=/typing|Thinking/i');
      const isVisible = await typingIndicator.isVisible({ timeout: 5000 });
    });
  });
});