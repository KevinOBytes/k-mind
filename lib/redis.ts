import { Redis as UpstashRedis } from '@upstash/redis';
import { createClient } from 'redis';

interface UnifiedRedis {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<boolean | number>;
  get(key: string): Promise<any>;
  set(key: string, value: string, options: { ex: number }): Promise<any>;
}

let unifiedClient: UnifiedRedis | null = null;

export async function getRedisClient(): Promise<UnifiedRedis | null> {
  if (unifiedClient) return unifiedClient;

  // 1. Try Upstash Redis REST (Serverless / Production)
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      const client = new UpstashRedis({ url: upstashUrl, token: upstashToken });
      unifiedClient = {
        async incr(key) { return await client.incr(key); },
        async expire(key, seconds) { return await client.expire(key, seconds); },
        async get(key) { return await client.get(key); },
        async set(key, value, options) { return await client.set(key, value, { ex: options.ex }); }
      };
      return unifiedClient;
    } catch (e) {
      console.error('Failed to initialize Upstash Redis client:', e);
    }
  }

  // 2. Try Standard TCP Redis (Local Development / Docker Compose)
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 500,
          reconnectStrategy: (retries) => {
            if (retries > 1) return new Error('Redis connection failed');
            return 100;
          }
        }
      });
      client.on('error', (err) => {
        console.warn('Redis TCP Client Connection Warning:', err.message);
      });
      await client.connect();
      
      unifiedClient = {
        async incr(key) { return await client.incr(key); },
        async expire(key, seconds) { return await client.expire(key, seconds); },
        async get(key) { return await client.get(key); },
        async set(key, value, options) {
          return await client.set(key, value, { EX: options.ex });
        }
      };
      return unifiedClient;
    } catch {
      return null;
    }
  }

  return null;
}
