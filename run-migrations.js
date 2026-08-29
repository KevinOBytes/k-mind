const { execSync } = require('child_process');

const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

// We run migrations during build if:
// 1. We are running in Vercel production build environment
// 2. Or a valid remote database connection is present (not pointing to local docker name 'db')
const shouldMigrate = !!process.env.VERCEL || (dbUrl && !dbUrl.includes('@db:') && !dbUrl.includes('localhost'));

if (shouldMigrate) {
  console.log("Database connection detected. Running migrations via drizzle-kit...");
  try {
    execSync('npx drizzle-kit migrate', { stdio: 'inherit' });
    console.log("✓ Database migrations completed successfully.");
  } catch (error) {
    console.error("✗ Database migration failed:", error.message);
    process.exit(1);
  }
} else {
  console.log("No remote database connection or running locally. Skipping build-time migration.");
}
