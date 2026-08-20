# OpenRouter AI Integration Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Migrate the AI suggestions endpoint from direct Gemini to the OpenRouter completions API.

**Architecture:** Use OpenRouter chat completion JSON payload with customizable model selector, parsing completions from `choices[0].message.content`.

**Tech Stack:** Next.js Server Route, OpenRouter API.

---

### Task 1: API Route and Configuration Migration

**Files:**
- Modify: `app/api/ai/suggest/route.ts`
- Modify: `.env.example`

**Step 1: Edit suggest route**
- Replace `GEMINI_API_KEY` checks with `OPENROUTER_API_KEY` checks.
- Build OpenRouter authorization header and message payloads.
- Parse `choices[0].message.content` from response.

**Step 2: Edit environment example**
- Swap `GEMINI_API_KEY` definition for `OPENROUTER_API_KEY` and add `OPENROUTER_MODEL=google/gemini-2.5-flash`.

**Step 3: Commit**
- Run: `git commit -am "feat: migrate suggestion API to OpenRouter completions"`

---

### Task 2: Verify and Update Tests

**Files:**
- Modify: `tests/ai.test.ts`

**Step 1: Update Vitest environment mocks**
- Swap `GEMINI_API_KEY` with `OPENROUTER_API_KEY` inside `tests/ai.test.ts`.

**Step 2: Run verification**
- Run: `npm run lint && npx tsc --noEmit && npm run test`

**Step 3: Commit**
- Run: `git commit -am "test: update unit tests for OpenRouter suggest API"`
