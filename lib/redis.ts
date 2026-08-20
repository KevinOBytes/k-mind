import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
  if (redisClient) return redisClient;

  const client = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 500, // Keep connection fast
      reconnectStrategy: (retries) => {
        // Return an Error to stop retrying connection if server is down (e.g. during test run)
        if (retries > 1) {
          return new Error('Redis connection failed');
        }
        return 100; // Retry after 100ms
      }
    }
  });

  client.on('error', (err) => {
    // Suppress logs during server check
    console.warn('Redis Client Connection Warning:', err.message);
  });

  try {
    await client.connect();
    redisClient = client;
    return redisClient;
  } catch {
    return null;
  }
}
