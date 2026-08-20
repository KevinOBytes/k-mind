import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is missing.');
}

// Initialize Neon HTTP client (ideal for serverless runtimes like Vercel)
const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });
export type DbClient = typeof db;
export * from './schema';
