import { test, expect } from '@playwright/test';

test.describe('Burn It Application', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    
    // Check that the main title is visible
    await expect(page.locator('h1')).toContainText('🔥 Burn It');
    
    // Check that project name is shown
    await expect(page.locator('text=/ Untitled Project')).toBeVisible();
    
    // Check that main sections are present
    await expect(page.locator('text=Assets')).toBeVisible();
    await expect(page.locator('text=Layers')).toBeVisible();
    await expect(page.locator('text=Inspector')).toBeVisible();
    
    // Check that canvas area is present
    await expect(page.locator('.canvas-stage')).toBeVisible();
    
    // Check that timeline is present
    await expect(page.locator('.timeline')).toBeVisible();
    
    // Check that export button is present
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
  });

  test('should show empty states correctly', async ({ page }) => {
    await page.goto('/');
    
    // Assets should show empty state
    await expect(page.locator('text=No assets yet')).toBeVisible();
    
    // Layers should show empty state
    await expect(page.locator('text=No layers yet')).toBeVisible();
    
    // Inspector should show empty state
    await expect(page.locator('text=Select a layer to edit')).toBeVisible();
  });

  test('should have working timeline controls', async ({ page }) => {
    await page.goto('/');
    
    // Check play button
    const playButton = page.locator('button:has-text("▶")');
    await expect(playButton).toBeVisible();
    
    // Check stop button  
    const stopButton = page.locator('button:has-text("⏹")');
    await expect(stopButton).toBeVisible();
    
    // Check speed selector
    const speedSelect = page.locator('select');
    await expect(speedSelect).toBeVisible();
    
    // Check time display
    await expect(page.locator('text=0.0s / 5.0s')).toBeVisible();
  });

  test('should open export dialog', async ({ page }) => {
    await page.goto('/');
    
    // Click export button
    await page.locator('button:has-text("Export")').click();
    
    // Check that export dialog opens
    await expect(page.locator('text=Export Project')).toBeVisible();
    
    // Check format options
    await expect(page.locator('button:has-text("PNG")')).toBeVisible();
    await expect(page.locator('button:has-text("JPEG")')).toBeVisible();
    await expect(page.locator('button:has-text("GIF")')).toBeVisible();
    await expect(page.locator('button:has-text("WebM")')).toBeVisible();
    
    // Close dialog
    await page.locator('button:has-text("Cancel")').click();
    await expect(page.locator('text=Export Project')).not.toBeVisible();
  });

  test('should have responsive design', async ({ page }) => {
    await page.goto('/');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Main elements should still be visible
    await expect(page.locator('h1')).toContainText('🔥 Burn It');
    await expect(page.locator('.canvas-stage')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Should still work
    await expect(page.locator('h1')).toContainText('🔥 Burn It');
    await expect(page.locator('.canvas-stage')).toBeVisible();
  });
});