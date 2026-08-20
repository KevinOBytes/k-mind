# Cloud-Native Migration Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Configure Neon serverless, Upstash Redis HTTP, Cloudflare R2 storage, and NextAuth Magic Link login.

**Architecture:** Use Neon WebSockets driver, Upstash REST endpoints, AWS S3 API for R2, and verification tokens schema for magic links.

**Tech Stack:** Next.js, Neon Serverless, Upstash Redis, AWS S3 SDK.

---

### Task 1: Package Dependencies Setup

**Files:**
- Modify: `package.json`

**Step 1: Edit package.json**
- Add `"@neondatabase/serverless": "^0.9.3"` under `dependencies`.
- Add `"@upstash/redis": "^1.28.4"` under `dependencies`.
- Add `"@aws-sdk/client-s3": "^3.515.0"` under `dependencies`.

**Step 2: Run npm install**
- Run: `npm install --legacy-peer-deps`

**Step 3: Commit**
- Run: `git commit -am "chore: add neon, upstash, and r2 s3 dependencies"`

---

### Task 2: Neon Serverless Driver & Schema Update

**Files:**
- Modify: `db/index.ts`
- Modify: `db/schema.ts`
- Modify: `.env.example`

**Step 1: Update db/index.ts**
- Import `neon` and `neonConfig` from `@neondatabase/serverless`.
- Configure WebSocket proxying if running locally.
- Export Drizzle client using Neon connection driver.

**Step 2: Add verificationTokens table to db/schema.ts**
- Declare `verificationTokens` table with columns: `identifier`, `token`, `expires`.

**Step 3: Commit**
- Run: `git commit -am "feat: configure Neon serverless driver and verificationTokens schema"`

---

### Task 3: Upstash Redis REST Client Integration

**Files:**
- Modify: `lib/redis.ts`

**Step 1: Rewrite lib/redis.ts**
- Import `Redis` from `@upstash/redis`.
- Export `getRedisClient` returning a configured Upstash Redis REST client initialized via `process.env.UPSTASH_REDIS_REST_URL` and `process.env.UPSTASH_REDIS_REST_TOKEN`.
- Include safe fallbacks if REST variables are missing.

**Step 2: Commit**
- Run: `git commit -am "feat: migrate Redis helper to Upstash HTTP REST client"`

---

### Task 4: Cloudflare R2 Object Storage Client

**Files:**
- Create: `lib/s3.ts`

**Step 1: Implement S3 Storage Client**
- Import `S3Client` from `@aws-sdk/client-s3`.
- Configure client with R2 Endpoint, Access Key ID, and Secret Access Key.
- Export utility functions `uploadToR2` and `getFromR2`.

**Step 2: Commit**
- Run: `git commit -am "feat: implement Cloudflare R2 object storage s3 client"`

---

### Task 5: NextAuth Passwordless Email Provider

**Files:**
- Modify: `auth.ts`

**Step 1: Configure EmailProvider**
- Import `Nodemailer` or standard NextAuth `Email` provider.
- Configure SMTP connection options using environment credentials.

**Step 2: Run Tests & Verification**
- Run: `npm run lint && npx tsc --noEmit && npm run test`

**Step 3: Commit**
- Run: `git commit -am "feat: configure NextAuth passwordless Magic Link email authentication"`
