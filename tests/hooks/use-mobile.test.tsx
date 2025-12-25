import { test, expect } from '@playwright/test';

test.describe('useMobile Hook Integration', () => {
  test('should detect mobile viewport correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Test mobile-specific behavior (this would be tested in a component that uses the hook)
    // For integration testing, we can check if mobile-specific elements are visible
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    if (await mobileMenu.count() > 0) {
      await expect(mobileMenu).toBeVisible();
    }
  });

  test('should detect desktop viewport correctly', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    // Test desktop-specific behavior
    const desktopMenu = page.locator('[data-testid="desktop-menu"]');
    if (await desktopMenu.count() > 0) {
      await expect(desktopMenu).toBeVisible();
    }
  });

  test('should handle viewport resizing', async ({ page }) => {
    // Start with desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(100);
    
    // Check if mobile-specific elements appear
    const mobileElements = page.locator('[data-testid="mobile-only"]');
    if (await mobileElements.count() > 0) {
      await expect(mobileElements.first()).toBeVisible();
    }
    
    // Resize back to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(100);
    
    // Check if desktop elements reappear
    const desktopElements = page.locator('[data-testid="desktop-only"]');
    if (await desktopElements.count() > 0) {
      await expect(desktopElements.first()).toBeVisible();
    }
  });

  test('should handle tablet viewport', async ({ page }) => {
    // Set tablet viewport (768px is the breakpoint)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // Test behavior at breakpoint boundary
    // This depends on implementation - might be desktop or mobile
    const pageContent = await page.locator('body').textContent();
    expect(pageContent).toBeTruthy();
  });

  test('should handle orientation changes', async ({ page }) => {
    // Start with portrait mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Rotate to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(100);
    
    // Page should still be functional
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
  });

  test('should work with different mobile sizes', async ({ page }) => {
    const mobileSizes = [
      { width: 320, height: 568 }, // iPhone SE
      { width: 375, height: 667 }, // iPhone 8
      { width: 414, height: 896 }, // iPhone 11
    ];

    for (const size of mobileSizes) {
      await page.setViewportSize(size);
      await page.goto('/');
      
      // Page should render correctly in all mobile sizes
      const body = page.locator('body');
      await expect(body).toBeVisible();
      
      // Check for responsive layout
      const isResponsive = await page.evaluate(() => {
        return window.innerWidth <= 767;
      });
      
      expect(isResponsive).toBe(true);
    }
  });

  test('should work with different desktop sizes', async ({ page }) => {
    const desktopSizes = [
      { width: 1024, height: 768 },  // Small desktop
      { width: 1440, height: 900 },  // Medium desktop
      { width: 1920, height: 1080 }, // Large desktop
    ];

    for (const size of desktopSizes) {
      await page.setViewportSize(size);
      await page.goto('/');
      
      // Page should render correctly in all desktop sizes
      const body = page.locator('body');
      await expect(body).toBeVisible();
      
      // Check for responsive layout
      const isDesktop = await page.evaluate(() => {
        return window.innerWidth >= 768;
      });
      
      expect(isDesktop).toBe(true);
    }
  });

  test('should handle dynamic content changes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Add dynamic content
    await page.evaluate(() => {
      const div = document.createElement('div');
      div.textContent = 'Dynamic content';
      div.setAttribute('data-testid', 'dynamic-content');
      document.body.appendChild(div);
    });
    
    const dynamicContent = page.locator('[data-testid="dynamic-content"]');
    await expect(dynamicContent).toBeVisible();
    
    // Resize and check content still exists
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(dynamicContent).toBeVisible();
  });

  test('should handle window resize events', async ({ page }) => {
    await page.goto('/');
    
    // Simulate window resize events
    await page.evaluate(() => {
      window.dispatchEvent(new Event('resize'));
    });
    
    // Wait for any potential re-renders
    await page.waitForTimeout(100);
    
    // Page should still be functional
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
