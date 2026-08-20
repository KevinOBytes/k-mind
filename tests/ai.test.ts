import { expect, test, vi } from 'vitest';

// Mock Redis client to avoid network activity during unit testing
vi.mock('../../../../lib/redis', () => ({
  getRedisClient: vi.fn().mockResolvedValue(null),
}));

import { POST } from '../app/api/ai/suggest/route';

test('AI Suggest API: returns error on missing parameter', async () => {
  const request = new Request('http://localhost:3000/api/ai/suggest', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  const response = await POST(request);
  expect(response.status).toBe(400);

  const json = await response.json();
  expect(json.error).toBe('Missing label or type parameter');
});

test('AI Suggest API: returns mock recommendations when API key is missing', async () => {
  const request = new Request('http://localhost:3000/api/ai/suggest', {
    method: 'POST',
    body: JSON.stringify({ label: 'TypeScript', type: 'child' }),
  });

  // Mock process.env
  vi.stubEnv('OPENROUTER_API_KEY', 'your_openrouter_api_key_here');

  const response = await POST(request);
  expect(response.status).toBe(200);

  const json = await response.json();
  expect(json.suggestions).toBeDefined();
  expect(json.suggestions.length).toBe(3);
  expect(json.suggestions[0].label).toBe('TypeScript Basics');

  vi.unstubAllEnvs();
});
