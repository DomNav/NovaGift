import { test, expect, devices } from '@playwright/test';

// Define viewport sizes to test
const viewports = {
  desktop: { width: 1440, height: 900, label: 'Desktop (1440px)' },
  tablet: { width: 768, height: 1024, label: 'Tablet (768px)' },
  mobile: { width: 375, height: 812, label: 'Mobile (375px)' },
};

// Test pages with AppShell
const appShellPages = [
  { path: '/create', name: 'Create' },
  { path: '/fund', name: 'Fund' },
  { path: '/open', name: 'Open' },
  { path: '/settings', name: 'Settings' },
  { path: '/activity', name: 'Activity' },
];

test.describe('Responsive Layout Tests', () => {
  test.describe('Viewport Meta and Container', () => {
    test('should have correct viewport meta tag', async ({ page }) => {
      await page.goto('/');
      
      const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewportMeta).toBe('width=device-width, initial-scale=1, viewport-fit=cover');
    });

    test('should have global styles applied', async ({ page }) => {
      await page.goto('/');
      
      // Check that root element has proper height
      const rootHeight = await page.evaluate(() => {
        const root = document.getElementById('root');
        return root ? getComputedStyle(root).height : null;
      });
      
      expect(rootHeight).toBeTruthy();
      
      // Check body overflow-x is hidden
      const bodyOverflow = await page.evaluate(() => {
        return getComputedStyle(document.body).overflowX;
      });
      
      expect(bodyOverflow).toBe('hidden');
    });
  });

  test.describe('No Horizontal Scrolling', () => {
    Object.entries(viewports).forEach(([key, viewport]) => {
      test(`should have no horizontal scroll at ${viewport.label}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        for (const route of appShellPages) {
          await page.goto(route.path);
          
          // Check for horizontal scrollbar
          const hasHorizontalScroll = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
          });
          
          expect(hasHorizontalScroll, `${route.name} page has horizontal scroll at ${viewport.label}`).toBe(false);
          
          // Check that body width doesn't exceed viewport
          const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
          expect(bodyWidth).toBeLessThanOrEqual(viewport.width);
        }
      });
    });
  });

  test.describe('Mobile Navigation Drawer', () => {
    test('should show hamburger menu on mobile', async ({ page }) => {
      await page.setViewportSize(viewports.mobile);
      await page.goto('/create');
      
      // Hamburger menu should be visible
      const hamburgerButton = page.locator('button[aria-label="Open navigation"]');
      await expect(hamburgerButton).toBeVisible();
      
      // Desktop sidebar should be hidden
      const desktopSidebar = page.locator('aside.lg\\:block');
      await expect(desktopSidebar).toBeHidden();
    });

    test('should hide hamburger menu on desktop', async ({ page }) => {
      await page.setViewportSize(viewports.desktop);
      await page.goto('/create');
      
      // Hamburger menu should be hidden
      const hamburgerButton = page.locator('button[aria-label="Open navigation"]');
      await expect(hamburgerButton).toBeHidden();
      
      // Desktop sidebar should be visible
      const desktopSidebar = page.locator('aside.lg\\:block');
      await expect(desktopSidebar).toBeVisible();
    });

    test('should open and close mobile drawer', async ({ page }) => {
      await page.setViewportSize(viewports.mobile);
      await page.goto('/create');
      
      const hamburgerButton = page.locator('button[aria-label="Open navigation"]');
      const mobileDrawer = page.locator('div[role="dialog"][aria-modal="true"]');
      const drawerOverlay = page.locator('div[role="dialog"] > div.bg-black\\/40');
      
      // Initially drawer should be hidden
      await expect(mobileDrawer).toBeHidden();
      
      // Click hamburger to open drawer
      await hamburgerButton.click();
      await expect(mobileDrawer).toBeVisible();
      
      // Click overlay to close drawer
      await drawerOverlay.click();
      await expect(mobileDrawer).toBeHidden();
    });

    test('should constrain drawer width on mobile', async ({ page }) => {
      await page.setViewportSize(viewports.mobile);
      await page.goto('/create');
      
      const hamburgerButton = page.locator('button[aria-label="Open navigation"]');
      await hamburgerButton.click();
      
      const drawer = page.locator('div[role="dialog"] > div.bg-background');
      const drawerBox = await drawer.boundingBox();
      
      expect(drawerBox).toBeTruthy();
      if (drawerBox) {
        // Drawer should be 80% of viewport width or max 320px
        const expectedWidth = Math.min(viewports.mobile.width * 0.8, 320);
        expect(drawerBox.width).toBeLessThanOrEqual(expectedWidth + 1); // +1 for rounding
      }
    });
  });

  test.describe('Responsive Grid Layouts', () => {
    test('should stack grid columns on mobile', async ({ page }) => {
      await page.setViewportSize(viewports.mobile);
      await page.goto('/create');
      
      // Find the main grid container
      const gridContainer = page.locator('.grid.gap-8.lg\\:grid-cols-\\[1fr\\,380px\\]').first();
      
      if (await gridContainer.count() > 0) {
        const gridStyles = await gridContainer.evaluate(el => {
          const styles = getComputedStyle(el);
          return {
            gridTemplateColumns: styles.gridTemplateColumns,
            display: styles.display,
          };
        });
        
        expect(gridStyles.display).toBe('grid');
        // On mobile, should be single column (auto or 1fr)
        expect(gridStyles.gridTemplateColumns).toMatch(/^(auto|1fr|\d+px)$/);
      }
    });

    test('should show two columns on desktop', async ({ page }) => {
      await page.setViewportSize(viewports.desktop);
      await page.goto('/create');
      
      // Find the main grid container
      const gridContainer = page.locator('.grid.gap-8.lg\\:grid-cols-\\[1fr\\,380px\\]').first();
      
      if (await gridContainer.count() > 0) {
        const gridStyles = await gridContainer.evaluate(el => {
          const styles = getComputedStyle(el);
          return {
            gridTemplateColumns: styles.gridTemplateColumns,
            display: styles.display,
          };
        });
        
        expect(gridStyles.display).toBe('grid');
        // On desktop, should have two columns with second being 380px
        expect(gridStyles.gridTemplateColumns).toContain('380px');
      }
    });

    test('should have min-w-0 on grid children', async ({ page }) => {
      await page.setViewportSize(viewports.desktop);
      await page.goto('/fund');
      
      // Check that grid children have min-w-0 class for proper shrinking
      const gridChildren = page.locator('.min-w-0');
      const count = await gridChildren.count();
      
      // Should have at least some elements with min-w-0
      expect(count).toBeGreaterThan(0);
      
      // Verify the CSS is actually applied
      if (count > 0) {
        const minWidth = await gridChildren.first().evaluate(el => {
          return getComputedStyle(el).minWidth;
        });
        expect(minWidth).toBe('0px');
      }
    });
  });

  test.describe('Dynamic Viewport Height', () => {
    test('should use min-h-dvh instead of min-h-screen', async ({ page }) => {
      await page.setViewportSize(viewports.mobile);
      
      for (const route of appShellPages) {
        await page.goto(route.path);
        
        // Check that elements use dvh units
        const elementsWithDvh = await page.evaluate(() => {
          const allElements = document.querySelectorAll('*');
          let dvhCount = 0;
          let screenCount = 0;
          
          allElements.forEach(el => {
            const classList = Array.from(el.classList);
            if (classList.some(c => c.includes('min-h-dvh') || c.includes('h-dvh'))) {
              dvhCount++;
            }
            if (classList.some(c => c.includes('min-h-screen') || c.includes('h-screen'))) {
              screenCount++;
            }
          });
          
          return { dvhCount, screenCount };
        });
        
        // Should have dvh units and no screen units
        expect(elementsWithDvh.screenCount, `${route.name} still has h-screen classes`).toBe(0);
        expect(elementsWithDvh.dvhCount, `${route.name} should have dvh classes`).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Container Responsiveness', () => {
    test('should apply correct container padding at different breakpoints', async ({ page }) => {
      await page.goto('/create');
      
      // Test mobile padding (1rem = 16px)
      await page.setViewportSize(viewports.mobile);
      const mobilePadding = await page.locator('.container').first().evaluate(el => {
        const styles = getComputedStyle(el);
        return {
          paddingLeft: styles.paddingLeft,
          paddingRight: styles.paddingRight,
        };
      });
      expect(mobilePadding.paddingLeft).toBe('16px'); // 1rem
      expect(mobilePadding.paddingRight).toBe('16px');
      
      // Test tablet padding (1.5rem = 24px at md breakpoint)
      await page.setViewportSize(viewports.tablet);
      const tabletPadding = await page.locator('.container').first().evaluate(el => {
        const styles = getComputedStyle(el);
        return {
          paddingLeft: styles.paddingLeft,
          paddingRight: styles.paddingRight,
        };
      });
      expect(tabletPadding.paddingLeft).toBe('24px'); // 1.5rem
      expect(tabletPadding.paddingRight).toBe('24px');
      
      // Test desktop padding (2rem = 32px at lg breakpoint)
      await page.setViewportSize(viewports.desktop);
      const desktopPadding = await page.locator('.container').first().evaluate(el => {
        const styles = getComputedStyle(el);
        return {
          paddingLeft: styles.paddingLeft,
          paddingRight: styles.paddingRight,
        };
      });
      expect(desktopPadding.paddingLeft).toBe('32px'); // 2rem
      expect(desktopPadding.paddingRight).toBe('32px');
    });

    test('should center container and constrain max width', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/create');
      
      const container = page.locator('.container').first();
      const containerStyles = await container.evaluate(el => {
        const styles = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          marginLeft: styles.marginLeft,
          marginRight: styles.marginRight,
          maxWidth: styles.maxWidth,
          actualWidth: rect.width,
        };
      });
      
      // Container should be centered (auto margins)
      expect(containerStyles.marginLeft).toBe('auto');
      expect(containerStyles.marginRight).toBe('auto');
      
      // Container should not exceed 1440px (2xl breakpoint)
      expect(containerStyles.actualWidth).toBeLessThanOrEqual(1440 + 64); // +64 for padding
    });
  });

  test.describe('Real Device Emulation', () => {
    test('iPhone 12 Pro', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12 Pro'],
      });
      const page = await context.newPage();
      await page.goto('/create');
      
      // Check no horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
      
      // Check mobile menu is visible
      const hamburgerButton = page.locator('button[aria-label="Open navigation"]');
      await expect(hamburgerButton).toBeVisible();
      
      await context.close();
    });

    test('iPad', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPad'],
      });
      const page = await context.newPage();
      await page.goto('/create');
      
      // Check responsive grid on tablet
      const gridContainer = page.locator('.grid.gap-8').first();
      const exists = await gridContainer.count() > 0;
      expect(exists).toBe(true);
      
      await context.close();
    });
  });
});

test.describe('AppShell Component Integration', () => {
  test('should render AppShell on all configured pages', async ({ page }) => {
    for (const route of appShellPages) {
      await page.goto(route.path);
      
      // Check that AppShell structure is present
      const appShellContainer = page.locator('.min-h-dvh.grid');
      await expect(appShellContainer, `AppShell not found on ${route.name}`).toBeVisible();
      
      // Check main content area exists
      const mainContent = page.locator('main.min-w-0');
      await expect(mainContent, `Main content area not found on ${route.name}`).toBeVisible();
    }
  });

  test('should maintain consistent layout across navigation', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);
    
    // Navigate between pages and check layout consistency
    for (let i = 0; i < appShellPages.length - 1; i++) {
      await page.goto(appShellPages[i].path);
      const layoutBefore = await page.locator('.min-h-dvh.grid').boundingBox();
      
      await page.goto(appShellPages[i + 1].path);
      const layoutAfter = await page.locator('.min-h-dvh.grid').boundingBox();
      
      // Layout dimensions should remain consistent
      expect(layoutBefore?.width).toBe(layoutAfter?.width);
    }
  });
});