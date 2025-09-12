import { test, expect } from '@playwright/test';

test.describe('Model Visibility Tests', () => {
  test('Check model options are visible', async ({ page }) => {
    await page.goto('http://localhost:8000');
    await page.waitForSelector('h1:has-text("Cora")', { timeout: 10000 });
    
    // Click model selector
    const modelButton = page.locator('button:has-text("Select Model")').first();
    await modelButton.click();
    await page.waitForTimeout(500);
    
    // Check if dropdown opened
    const dropdown = page.locator('text=Select AI Model');
    const isOpen = await dropdown.isVisible();
    console.log('Dropdown open:', isOpen);
    
    if (isOpen) {
      // Look for any model options
      const modelOptions = page.locator('button').filter({ hasText: /SmolLM2|Qwen|Phi|TinyLlama|Gemma/ });
      const count = await modelOptions.count();
      console.log('Number of model options found:', count);
      
      // Try to find specific models
      const models = ['SmolLM2-135M', 'SmolLM2-360M', 'SmolLM2-1.7B', 'Qwen2.5-0.5B', 'Phi-3.5-mini', 'TinyLlama-1.1B'];
      
      for (const modelName of models) {
        const option = page.locator(`button:has-text("${modelName}")`);
        const exists = await option.count() > 0;
        console.log(`  ${modelName}: ${exists ? '✅ Found' : '❌ Not found'}`);
      }
      
      // Check for any text content in dropdown
      const dropdownContent = page.locator('.absolute.left-0.mt-2.w-96');
      const text = await dropdownContent.textContent();
      console.log('\nDropdown content preview:', text?.substring(0, 200));
    }
  });
});