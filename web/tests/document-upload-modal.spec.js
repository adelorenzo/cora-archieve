import { test, expect } from '@playwright/test';

test.describe('Document Upload Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8000');
    await page.waitForLoadState('networkidle');
  });

  test('should open document upload modal above chat interface', async ({ page }) => {
    // Find and click the document upload button (Upload icon)
    const uploadButton = page.locator('button[title="Manage Documents"]');
    await expect(uploadButton).toBeVisible();
    await uploadButton.click();

    // Wait for modal to appear
    await page.waitForTimeout(300);

    // Check that the modal dialog is visible
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Check modal title is visible
    const modalTitle = page.locator('text=Document Management');
    await expect(modalTitle).toBeVisible();
  });

  test('should display modal with correct z-index (above chat)', async ({ page }) => {
    // Open the upload modal
    const uploadButton = page.locator('button[title="Manage Documents"]');
    await uploadButton.click();
    await page.waitForTimeout(300);

    // Verify the modal is visible
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Verify the modal is in the viewport and visible
    const boundingBox = await modal.boundingBox();
    expect(boundingBox).toBeTruthy();
    expect(boundingBox.width).toBeGreaterThan(0);
    expect(boundingBox.height).toBeGreaterThan(0);

    // Verify modal is centered (approximately)
    const viewportSize = page.viewportSize();
    const centerX = viewportSize.width / 2;
    const centerY = viewportSize.height / 2;
    const modalCenterX = boundingBox.x + boundingBox.width / 2;
    const modalCenterY = boundingBox.y + boundingBox.height / 2;
    expect(Math.abs(modalCenterX - centerX)).toBeLessThan(50);
    expect(Math.abs(modalCenterY - centerY)).toBeLessThan(100);
  });

  test('should display upload controls inside modal', async ({ page }) => {
    // Open the upload modal
    const uploadButton = page.locator('button[title="Manage Documents"]');
    await uploadButton.click();
    await page.waitForTimeout(300);

    // Check for upload button inside modal
    const uploadFilesBtn = page.locator('button:has-text("Upload Files")');
    await expect(uploadFilesBtn).toBeVisible();

    // Check for add text button
    const addTextBtn = page.locator('button:has-text("Add Text")');
    await expect(addTextBtn).toBeVisible();

    // Check for documents count section
    const docsSection = page.locator('text=Uploaded Documents');
    await expect(docsSection).toBeVisible();
  });

  test('should close modal when clicking backdrop', async ({ page }) => {
    // Open the upload modal
    const uploadButton = page.locator('button[title="Manage Documents"]');
    await uploadButton.click();
    await page.waitForTimeout(300);

    // Verify modal is open
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Click at the corner of the viewport (on the backdrop, outside the modal)
    await page.mouse.click(10, 10);
    await page.waitForTimeout(500);

    // Verify modal is closed
    await expect(modal).not.toBeVisible();
  });

  test('should show supported file formats info', async ({ page }) => {
    // Open the upload modal
    const uploadButton = page.locator('button[title="Manage Documents"]');
    await uploadButton.click();
    await page.waitForTimeout(300);

    // Check for supported formats text
    const formatsText = page.locator('text=Supported formats');
    await expect(formatsText).toBeVisible();

    // Verify local processing notice
    const localNotice = page.locator('text=All parsing runs locally in your browser');
    await expect(localNotice).toBeVisible();
  });

  test('modal should be interactive and properly layered', async ({ page }) => {
    // Open the upload modal
    const uploadButton = page.locator('button[title="Manage Documents"]');
    await expect(uploadButton).toBeVisible();
    await uploadButton.click();
    await page.waitForTimeout(300);

    // Verify modal is visible and interactive
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Verify modal is on top by checking elementFromPoint at modal center
    const isOnTop = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return false;
      const rect = dialog.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const topElement = document.elementFromPoint(centerX, centerY);
      return dialog.contains(topElement) || dialog === topElement;
    });
    expect(isOnTop).toBe(true);

    // Try clicking the upload button inside modal (should be clickable)
    const uploadFilesBtn = page.locator('button:has-text("Upload Files")');
    await expect(uploadFilesBtn).toBeEnabled();

    // The button should be clickable (not blocked by z-index issues)
    await uploadFilesBtn.click();

    // Modal should still be visible after click (file dialog opens but modal stays)
    await expect(modal).toBeVisible();
  });
});
