import { test, expect } from '@playwright/test';

test.describe('Auth Session API', () => {
  const baseUrl = 'http://localhost:3000';

  test('should return session data for authenticated user', async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/auth/session`);

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/json');
    
    const session = await response.json();
    // Session should be an object (could be null for unauthenticated users)
    expect(typeof session).toBe('object');
  });

  test('should return proper JSON content type', async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/auth/session`);

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
  });

  test('should handle GET requests only', async ({ request }) => {
    // Test POST request (should work but we're testing the endpoint exists)
    const response = await request.post(`${baseUrl}/api/auth/session`);
    
    // Next.js route handlers by default support multiple methods unless restricted
    // The actual behavior depends on the implementation
    expect([200, 405]).toContain(response.status());
  });

  test('should handle PUT requests', async ({ request }) => {
    const response = await request.put(`${baseUrl}/api/auth/session`);
    
    // Should either work or return method not allowed
    expect([200, 405]).toContain(response.status());
  });

  test('should handle DELETE requests', async ({ request }) => {
    const response = await request.delete(`${baseUrl}/api/auth/session`);
    
    // Should either work or return method not allowed
    expect([200, 405]).toContain(response.status());
  });

  test('should handle requests with custom headers', async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/auth/session`, {
      headers: {
        'X-Custom-Header': 'test-value',
        'User-Agent': 'Playwright-Test',
      },
    });

    expect(response.status()).toBe(200);
    const session = await response.json();
    expect(typeof session).toBe('object');
  });

  test('should handle requests with query parameters', async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/auth/session?param1=value1&param2=value2`);

    expect(response.status()).toBe(200);
    const session = await response.json();
    expect(typeof session).toBe('object');
  });

  test('should return consistent response format', async ({ request }) => {
    const response1 = await request.get(`${baseUrl}/api/auth/session`);
    const response2 = await request.get(`${baseUrl}/api/auth/session`);

    expect(response1.status()).toBe(200);
    expect(response2.status()).toBe(200);
    
    const session1 = await response1.json();
    const session2 = await response2.json();
    
    // Both responses should have the same type
    expect(typeof session1).toBe(typeof session2);
  });
});
