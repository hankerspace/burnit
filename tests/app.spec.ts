import { test, expect } from '@playwright/test';

test.describe('Burn It Application', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    
    // Check that the main title is visible
    await expect(page.locator('h1')).toContainText('🔥 Burn It');
    
    // Check that project name is shown
    await expect(page.locator('text=/ Untitled Project')).toBeVisible();
    
    // Check that main sections are present
    await expect(page.getByRole('button', { name: /Assets/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Layers/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Inspector' })).toBeVisible();
    
    // Check that main canvas area is present
    await expect(page.getByRole('main')).toBeVisible();
    
    // Check that timeline controls are present
    await expect(page.locator('text=0.0s / 5.0s')).toBeVisible();
    
    // Check that export button is present
    await expect(page.getByRole('button', { name: 'Export' })).toBeVisible();
  });

  test('should show empty states correctly', async ({ page }) => {
    await page.goto('/');
    
    // Assets should show empty state
    await expect(page.locator('text=No assets yet. Add some files to get started!')).toBeVisible();
    
    // Switch to layers tab and check empty state
    await page.getByRole('button', { name: '📋 Layers' }).click();
    await expect(page.locator('text=No layers yet. Add some assets to create layers!')).toBeVisible();
    
    // Inspector should show empty state
    await expect(page.locator('text=Select a layer to edit its properties')).toBeVisible();
  });

  test('should have working timeline controls', async ({ page }) => {
    await page.goto('/');
    
    // Check play button (shows ▶)
    const playButton = page.getByRole('button', { name: '▶' });
    await expect(playButton).toBeVisible();
    
    // Check stop button  
    const stopButton = page.getByRole('button', { name: '⏹' });
    await expect(stopButton).toBeVisible();
    
    // Check speed selector
    const speedSelect = page.getByRole('combobox');
    await expect(speedSelect).toBeVisible();
    
    // Check time display
    await expect(page.locator('text=0.0s / 5.0s')).toBeVisible();
  });

  test('should open export dialog', async ({ page }) => {
    await page.goto('/');
    
    // Click export button
    await page.getByRole('button', { name: 'Export' }).click();
    
    // Check that export dialog opens
    await expect(page.locator('text=Export Project')).toBeVisible();
    
    // Check format options (format selector buttons) - use exact match to avoid conflict with "Export GIF"
    await expect(page.getByRole('button', { name: 'PNG', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'JPEG', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'GIF', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'WebM', exact: true })).toBeVisible();
    
    // Close dialog
    await page.getByRole('button', { name: 'Cancel' }).click();
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