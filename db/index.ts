import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is missing.');
}

// Dynamically select the correct Drizzle driver:
// Use Neon HTTP driver for Vercel/Neon clouds, and fallback to node-postgres TCP driver for local Docker Compose/dev environments.
const isNeonCloud = databaseUrl.includes('neon.tech') || !!process.env.VERCEL;

export const db = isNeonCloud
  ? drizzleNeon(neon(databaseUrl), { schema })
  : drizzlePg(new Pool({ connectionString: databaseUrl }), { schema });

export type DbClient = typeof db;
export * from './schema';
