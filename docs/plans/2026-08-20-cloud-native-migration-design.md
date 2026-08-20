# Design - Cloud-Native Migration (Neon, Upstash, R2, Cloudflare)

We are migrating our local Docker-backed mind map application to a cloud-native architecture optimized for Vercel Serverless hosting and Cloudflare edge integrations.

## 1. Database (Neon Serverless via Drizzle)
- **Driver**: Replace `pg` with `@neondatabase/serverless` for optimized WebSocket connections on Vercel.
- **Connection pooling**: Configure serverless connections in `db/index.ts`.

## 2. Cache (Upstash Redis)
- **Driver**: Install `@upstash/redis` to query Redis via HTTP REST, eliminating TCP connection fatigue in serverless functions.
- **Configuration**: Update `lib/redis.ts` to utilize the Upstash REST client.

## 3. Object Storage (Cloudflare R2)
- **SDK**: Install `@aws-sdk/client-s3`.
- **Integration**: Create `lib/s3.ts` to support reading and writing map attachments/backups to Cloudflare R2 bucket.

## 4. NextAuth Passwordless Magic Link Login
- **Database Schema**: Add `verificationTokens` table to `db/schema.ts` to store verification credentials.
- **NextAuth Provider**: Enable `EmailProvider` inside `auth.ts` using SMTP variables.
