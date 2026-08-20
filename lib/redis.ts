import { Redis } from '@upstash/redis';

let redisClient: Redis | null = null;

export async function getRedisClient() {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('Upstash Redis environment variables are missing. Running without caching capabilities.');
    return null;
  }

  try {
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch {
    return null;
  }
}
