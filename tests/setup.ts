import { test as base } from '@playwright/test';

// Extend base test with custom fixtures
export const test = base.extend({
  // Custom fixtures can be added here
  page: async ({ page }, use) => {
    // Set up page with default configurations
    await page.addStyleTag({
      content: `
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      `,
    });
    
    await use(page);
  },
});

export { expect } from '@playwright/test';
export type { TestFixture } from '@playwright/test';
