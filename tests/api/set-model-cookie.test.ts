import { test, expect } from '@playwright/test';

test.describe('Set Model Cookie API', () => {
  const baseUrl = 'http://localhost:3000';

  test('should set model cookie successfully', async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/set-model-cookie`, {
      data: {
        model: 'gpt-4',
      },
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result).toEqual({ success: true });
  });

  test('should return error for missing model parameter', async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/set-model-cookie`, {
      data: {},
    });

    expect(response.status()).toBe(400);
    const result = await response.json();
    expect(result).toEqual({
      error: 'Model ID is required',
    });
  });

  test('should handle invalid JSON request', async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/set-model-cookie`, {
      data: 'invalid json',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(response.status()).toBe(400);
    const result = await response.json();
    expect(result).toEqual({
      error: 'Model ID is required',
    });
  });

  test('should handle empty model string', async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/set-model-cookie`, {
      data: {
        model: '',
      },
    });

    expect(response.status()).toBe(400);
    const result = await response.json();
    expect(result).toEqual({
      error: 'Model ID is required',
    });
  });

  test('should update existing model cookie', async ({ request }) => {
    // First set initial cookie
    await request.post(`${baseUrl}/api/set-model-cookie`, {
      data: {
        model: 'gpt-3.5-turbo',
      },
    });

    // Then update it
    const response = await request.post(`${baseUrl}/api/set-model-cookie`, {
      data: {
        model: 'gpt-4',
      },
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result).toEqual({ success: true });
  });

  test('should handle special characters in model name', async ({ request }) => {
    const specialModel = 'gpt-4-turbo-preview_special';

    const response = await request.post(`${baseUrl}/api/set-model-cookie`, {
      data: {
        model: specialModel,
      },
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result).toEqual({ success: true });
  });
});
