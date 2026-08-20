# Production Mindmap Builder Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Build a fully featured, production-ready, test-covered, secure mindmap builder app with a marketing site (including login/register) and high-quality graphics.

**Architecture:** Consolidation of frontend canvas and marketing routes in Next.js App Router, using Auth.js for authentication, Drizzle ORM to interface with PostgreSQL database, and Redis for caching LLM node recommendations.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS, React Flow v12 (`@xyflow/react`), Auth.js v5 (NextAuth), Drizzle ORM, Vitest, Redis, PostgreSQL, Nginx, Docker.

---

### Task 1: Setup Drizzle ORM and Database Schema

**Files:**
- Create: `db/schema.ts`
- Create: `db/index.ts`
- Create: `drizzle.config.ts`
- Modify: `package.json`
- Test: `tests/db.test.ts`

**Step 1: Install database dependencies and configure drizzle**
Install `drizzle-orm` and `pg`, along with `drizzle-kit` dev dependency. Set up schema with table schemas for users, sessions, mindmaps, nodes, and edges.

**Step 2: Write database connection interface**
Create pg database client connection module.

**Step 3: Add database test verification**
Verify database connection schema and generated queries.

**Step 4: Commit**
Commit Drizzle schema setup.

---

### Task 2: Configure NextAuth (Auth.js) and Credentials signup

**Files:**
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `auth.ts`
- Create: `middleware.ts`
- Create: `app/api/auth/register/route.ts`
- Test: `tests/auth.test.ts`

**Step 1: Setup Auth.js authentication config**
Implement Auth.js initialization using CredentialsProvider (email and password hashing via bcryptjs).

**Step 2: Create Register route**
Implement user account registration route hashing password and storing details in the DB.

**Step 3: Secure route middleware**
Setup middleware to intercept and secure routes under dashboard or map paths.

**Step 4: Verify authentication operations**
Test endpoints for registration and login behaviors.

**Step 5: Commit**
Commit NextAuth configuration.

---

### Task 3: Public Marketing Site and Authentication Forms

**Files:**
- Create: `app/(marketing)/layout.tsx`
- Create: `app/(marketing)/page.tsx`
- Create: `app/(marketing)/login/page.tsx`
- Create: `app/(marketing)/register/page.tsx`
- Create: `public/logo.png`
- Create: `public/hero.png`

**Step 1: Generate logo and hero assets**
Use the `generate_image` tool to design a high-quality vector-styled logo and a layout showcase graphic.

**Step 2: Build marketing layout and landing page**
Create public pages showing product details, grids, and CTA buttons.

**Step 3: Implement Login and Register client forms**
Create interactive auth forms handling submit logic and state checks.

**Step 4: Commit**
Commit marketing UI changes.

---

### Task 4: User Dashboard & Template Manager

**Files:**
- Create: `app/(app)/layout.tsx`
- Create: `app/(app)/dashboard/page.tsx`
- Create: `app/actions/mindmaps.ts`

**Step 1: Implement app dashboard layout**
Verify session status and display side-nav containing map listings and user profiles.

**Step 2: Add dashboard management actions**
Implement server actions to create, duplicate, rename, and delete mindmaps.

**Step 3: Create template engine**
Add standard map starters (e.g. Frontend developer roadmap).

**Step 4: Commit**
Commit User Dashboard.

---

### Task 5: Interactive Graph Canvas Editor Workspace

**Files:**
- Create: `app/(app)/map/[id]/page.tsx`
- Create: `components/MindmapCanvas.tsx`
- Create: `components/SkillNode.tsx`
- Create: `components/SkillEdge.tsx`
- Create: `components/CanvasControls.tsx`
- Create: `app/actions/nodes-edges.ts`

**Step 1: Build the React Flow Canvas component**
Integrate `@xyflow/react` viewport wrapper supporting infinite pan/zoom.

**Step 2: Create custom SkillNode and SkillEdge components**
Implement custom nodes with hex color pickers, progress badges, and description tooltip popovers.

**Step 3: Implement Auto-Layout engine**
Integrate Dagre layout engine to arrange DAG nodes cleanly.

**Step 4: Hook debounced autosave action**
Perform server actions updating nodes and edges positions on coordinate drift.

**Step 5: Commit**
Commit Editor Canvas workspace.

---

### Task 6: Serialization Adapters (JSON, OPML, FreeMind)

**Files:**
- Create: `lib/adapters/json.ts`
- Create: `lib/adapters/opml.ts`
- Create: `lib/adapters/freemind.ts`
- Test: `tests/adapters.test.ts`

**Step 1: Implement Graph-to-Tree serialization adapters**
Write the serializers replicating multi-parent nodes under subtrees to output standard hierarchical formats (OPML, FreeMind XML).

**Step 2: Add Vitest unit tests**
Test serialization and deserialization of sample maps, asserting lossless layout transitions.

**Step 3: Add canvas export tools**
Implement PNG/SVG download handles.

**Step 4: Commit**
Commit serialization adapters.

---

### Task 7: AI Skill Copilot Panel & Redis Configuration

**Files:**
- Create: `app/api/ai/suggest/route.ts`
- Create: `lib/redis.ts`
- Create: `components/AIRecommendationPanel.tsx`

**Step 1: Write suggestion prompt compiler**
Call Google Gemini API compiling context matrices matching brother, child, and parent skills.

**Step 2: Implement Redis caching & rate-limiting middleware**
Cache requests to minimize API cost; rate limit IP addresses.

**Step 3: Create sidebar recommendation drawer**
Render suggest preview pills with single-click Promotion drawing connections instantly on the canvas.

**Step 4: Commit**
Commit AI Copilot features.
