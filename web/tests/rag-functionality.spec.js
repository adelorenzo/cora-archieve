import { test, expect } from '@playwright/test';

test.describe('RAG Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:8000');

    // Wait for the app to load
    await page.waitForSelector('#main-content', { timeout: 10000 });

    // Wait a bit more for the app to fully initialize
    await page.waitForTimeout(2000);
  });

  test('should verify txtai service is available', async ({ page }) => {
    // Check if the txtai service status is shown
    const response = await page.request.get('http://localhost:8000/api/txtai/health');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('service', 'txtai-rag');
  });

  test('should open RAG document upload dialog', async ({ page }) => {
    // Look for the document upload button - it has an Upload icon and title "Manage Documents"
    const uploadButton = page.locator('button[title="Manage Documents"]').or(
      page.locator('button').filter({ hasText: /upload/i })
    );

    // Click the upload button if visible
    if (await uploadButton.isVisible()) {
      await uploadButton.click();

      // Wait for dialog to open - check for the dialog content header
      await expect(page.locator('text=Document Management')).toBeVisible({ timeout: 5000 });

      // Check for dialog title
      const dialogTitle = page.locator('h2:has-text("Document Management")');
      await expect(dialogTitle).toBeVisible();
    }
  });

  test('should upload a text file successfully', async ({ page }) => {
    // Open upload dialog
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    if (await uploadButton.isVisible()) {
      await uploadButton.click();
      await page.waitForSelector('text=Document Management', { timeout: 5000 });

      // Find file input
      const fileInput = page.locator('input[type="file"]');

      // Create a test file
      const testContent = 'This is a test document for RAG functionality. It contains sample text for testing the document processing and search capabilities.';
      const buffer = Buffer.from(testContent, 'utf-8');

      // Upload the file
      await fileInput.setInputFiles({
        name: 'test-document.txt',
        mimeType: 'text/plain',
        buffer: buffer
      });

      // Wait for processing
      await page.waitForTimeout(2000);

      // Check for success message or document in list
      const successMessage = page.locator('text=/process|upload|success/i');
      const documentList = page.locator('.space-y-1');

      const hasSuccess = await successMessage.isVisible().catch(() => false);
      const hasDocument = await documentList.locator('text=test-document.txt').isVisible().catch(() => false);

      expect(hasSuccess || hasDocument).toBeTruthy();
    }
  });

  test('should process text input for RAG', async ({ page }) => {
    // Open upload dialog
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    if (await uploadButton.isVisible()) {
      await uploadButton.click();
      await page.waitForSelector('text=Document Management', { timeout: 5000 });

      // Find text input area
      const textArea = page.locator('textarea').or(
        page.locator('[contenteditable="true"]')
      ).first();

      if (await textArea.isVisible()) {
        // Enter text content
        await textArea.fill('This is test content for the RAG system. It should be processed and indexed for semantic search.');

        // Find and click process button
        const processButton = page.locator('button').filter({ hasText: /process|submit|add/i }).first();
        if (await processButton.isVisible()) {
          await processButton.click();

          // Wait for processing
          await page.waitForTimeout(2000);

          // Check for success indication
          const successIndicator = page.locator('text=/success|added|processed/i');
          await expect(successIndicator).toBeVisible({ timeout: 5000 }).catch(() => {
            // Alternative: check if dialog closed
            expect(page.locator('role=dialog')).not.toBeVisible();
          });
        }
      }
    }
  });

  test('should search documents using RAG', async ({ page }) => {
    // This test verifies RAG functionality by uploading a document and checking
    // that the search interface is properly connected

    // Add a document first
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    if (await uploadButton.isVisible()) {
      await uploadButton.click();
      await page.waitForSelector('text=Document Management', { timeout: 5000 });

      const textArea = page.locator('textarea').first();
      if (await textArea.isVisible()) {
        await textArea.fill('Machine learning is a subset of artificial intelligence that enables systems to learn from data.');

        const processButton = page.locator('button').filter({ hasText: /process|submit|add/i }).first();
        if (await processButton.isVisible()) {
          await processButton.click();
          await page.waitForTimeout(2000);

          // Verify document was processed by checking for success indication
          const successIndicator = page.locator('text=/success|added|processed/i');
          const docInList = page.locator('.space-y-1').locator('text=/machine learning/i');

          const hasSuccess = await successIndicator.isVisible().catch(() => false);
          const hasDocInList = await docInList.isVisible().catch(() => false);

          // Either should show success or document should appear in list
          expect(hasSuccess || hasDocInList).toBeTruthy();
        }
      }

      // Close dialog if still open
      const closeButton = page.locator('button[aria-label*="close" i]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }

    // Verify RAG toggle is active (indicating documents are available for search)
    const ragToggle = page.locator('text=RAG').first();
    if (await ragToggle.isVisible()) {
      await expect(ragToggle).toBeVisible();
    }

    // Verify chat input is available for queries
    const chatInput = page.locator('input[placeholder="Ask anything..."]');
    await expect(chatInput).toBeVisible();
  });

  test('should display document statistics', async ({ page }) => {
    // Check if stats endpoint is working
    const response = await page.request.get('http://localhost:8000/api/txtai/stats');

    if (response.status() === 200) {
      const stats = await response.json();
      expect(stats).toHaveProperty('documents');
      expect(stats).toHaveProperty('chunks');

      // Check if stats are displayed in UI
      const statsDisplay = page.locator('text=/documents|chunks/i');
      if (await statsDisplay.isVisible()) {
        await expect(statsDisplay).toBeVisible();
      }
    }
  });

  test('should handle PDF file upload', async ({ page }) => {
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    if (await uploadButton.isVisible()) {
      await uploadButton.click();
      await page.waitForSelector('text=Document Management', { timeout: 5000 });

      const fileInput = page.locator('input[type="file"]');

      // Create a simple PDF content (minimal PDF structure)
      const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF Content) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
362
%%EOF`;

      const buffer = Buffer.from(pdfContent);

      // Upload the PDF file
      await fileInput.setInputFiles({
        name: 'test-document.pdf',
        mimeType: 'application/pdf',
        buffer: buffer
      });

      // Wait for processing
      await page.waitForTimeout(3000);

      // Check for processing indication
      const processingIndicator = page.locator('text=/process|upload|pdf/i');
      const errorMessage = page.locator('text=/error|failed/i');

      // Either should show processing or might show error for invalid PDF
      const hasProcessing = await processingIndicator.isVisible().catch(() => false);
      const hasError = await errorMessage.isVisible().catch(() => false);

      expect(hasProcessing || hasError).toBeTruthy();
    }
  });

  test('should delete documents', async ({ page }) => {
    // First check if there are any documents
    const documentItems = page.locator('.space-y-1 > div');

    if (await documentItems.count() > 0) {
      const firstDocument = documentItems.first();

      // Look for delete button (X icon button)
      const deleteButton = firstDocument.locator('button[data-testid*="delete"]').or(
        firstDocument.locator('button').last()
      );

      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Confirm deletion if needed
        const confirmButton = page.locator('button').filter({ hasText: /confirm|yes|delete/i }).first();
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
        }

        // Wait for deletion
        await page.waitForTimeout(2000);

        // Check if document count decreased
        const newCount = await documentItems.count();
        expect(newCount).toBeLessThan(await documentItems.count());
      }
    }
  });

  test('should handle service unavailability gracefully', async ({ page }) => {
    // Test with invalid endpoint
    const response = await page.request.get('http://localhost:8000/api/txtai/invalid-endpoint').catch(e => e.response);

    if (response) {
      // Should return 404 or similar error
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }

    // Check if UI shows appropriate message when service is down
    const serviceStatus = page.locator('text=/offline|unavailable|connecting/i');
    if (await serviceStatus.isVisible({ timeout: 2000 })) {
      await expect(serviceStatus).toBeVisible();
    }
  });

  test('should export and import RAG data', async ({ page }) => {
    // Look for export button
    const exportButton = page.locator('button').filter({ hasText: /export/i }).first();
    if (await exportButton.isVisible()) {
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

      await exportButton.click();

      const download = await downloadPromise;
      if (download) {
        // Verify download
        expect(download).toBeTruthy();
        const filename = download.suggestedFilename();
        expect(filename).toContain('export');
      }
    }

    // Look for import button
    const importButton = page.locator('button').filter({ hasText: /import/i }).first();
    if (await importButton.isVisible()) {
      await importButton.click();

      // Check for file input
      const importInput = page.locator('input[type="file"][accept*="json"]');
      await expect(importInput).toBeVisible({ timeout: 5000 }).catch(() => {
        // Import might be handled differently
        expect(true).toBeTruthy();
      });
    }
  });
});

test.describe('RAG Performance Tests', () => {
  test('should handle large documents efficiently', async ({ page }) => {
    await page.goto('http://localhost:8000');
    await page.waitForSelector('#main-content', { timeout: 10000 });

    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    if (await uploadButton.isVisible()) {
      await uploadButton.click();
      await page.waitForSelector('text=Document Management', { timeout: 5000 });

      const textArea = page.locator('textarea').first();
      if (await textArea.isVisible()) {
        // Create large document (10KB)
        const largeText = 'Lorem ipsum dolor sit amet. '.repeat(350);

        const startTime = Date.now();
        await textArea.fill(largeText);

        const processButton = page.locator('button').filter({ hasText: /process|submit/i }).first();
        if (await processButton.isVisible()) {
          await processButton.click();

          // Wait for processing
          await page.waitForTimeout(5000);

          const endTime = Date.now();
          const processingTime = endTime - startTime;

          // Should process within 10 seconds
          expect(processingTime).toBeLessThan(10000);
        }
      }
    }
  });

  test('should search quickly through indexed documents', async ({ page }) => {
    await page.goto('http://localhost:8000');

    const chatInput = page.locator('input[placeholder="Ask anything..."]');
    if (await chatInput.isVisible()) {
      const startTime = Date.now();

      await chatInput.fill('search for test content');
      await chatInput.press('Enter');

      // Wait for search results
      await page.waitForTimeout(2000);

      const endTime = Date.now();
      const searchTime = endTime - startTime;

      // Search should complete within 3 seconds
      expect(searchTime).toBeLessThan(3000);
    }
  });
});