<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent Developer Guidelines

Welcome! This project utilizes a highly collaborative, subagent-driven development approach to execute features efficiently and robustly.

## Next.js 16 App Router Compliance
- Follow the rules in the `nextjs-agent-rules` block above.
- Always check the latest guides under `node_modules/next/dist/docs/` when working on Next.js code or server actions/routes.

## Subagent-Driven Development Workflow
To work on `k-mind`, delegates should be organized into specialized scopes. When planning large additions, invoke specialized subagents using the `invoke_subagent` tool:
1. **Frontend / Canvas Subagent**: Focused on `@xyflow/react` (React Flow) canvas implementation, layouts, custom nodes, custom edges, and performance optimizations.
2. **Backend & Database Subagent**: Focused on Next.js Server Actions, REST routes, Drizzle schema definition, and migrations/seeding.
3. **AI Copilot Subagent**: Focused on integration with LLM APIs, prompt tuning, Redis cache setups, and rate-limiting schemas.
4. **Data Import/Export Subagent**: Focused on serializers/deserializers for JSON, OPML, and FreeMind (.mm XML), with unit tests.

## Code Quality & Verification
- Prioritize static typing: Maintain type definitions across all DB entities and canvas events.
- Never commit a change that breaks the build. Always test using `npm run lint` and verify configurations locally before finalizing.
- Make clean, contiguous file edits. Do not overwrite whole files unless creating them or explicitly required.
