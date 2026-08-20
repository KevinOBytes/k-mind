import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  // During build / check-config, dotenv may not have loaded yet, provide placeholder to avoid crashing
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/kmind';
}

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
