export const isProductionEnvironment = process.env.NODE_ENV === 'production';

export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.PLAYWRIGHT ||
  process.env.CI_PLAYWRIGHT,
);

// Auth routes
export const loginRoute = '/login';
export const registerRoute = '/register';
export const forgotPasswordRoute = '/forgot-password';
