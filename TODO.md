# Project Roadmap & Tasks: k-mind

This document lists the implementation tasks for the `k-mind` mapping application, tracked by development phase.

---

## Phase 1: Environment & Infrastructure 🛠️
- [ ] **Docker Compose Setup**
  - [ ] Complete `Dockerfile` for standalone Next.js build.
  - [ ] Configure `docker-compose.yml` with Postgres, Redis, Nginx, and Next.js.
  - [ ] Write `nginx.conf` for reverse proxy routing.
  - [ ] Test local container builds using `docker compose config` and startup.
- [ ] **Database & ORM Configuration**
  - [ ] Install Drizzle ORM dependencies (`drizzle-orm`, `pg`, `dotenv`).
  - [ ] Write Drizzle configuration (`drizzle.config.ts`) and create db connection module.
  - [ ] Define graph schema in `db/schema.ts` (mindmaps, nodes, edges).
  - [ ] Configure db migration script (`drizzle-kit generate && drizzle-kit migrate`).

## Phase 2: Core Graph Canvas Editor 🎨
- [ ] **Canvas Integration**
  - [ ] Install React Flow (`@xyflow/react`) and layout libraries (e.g., `dagre` or `@elkjs/elk`).
  - [ ] Build baseline canvas component with zoom/pan controls.
  - [ ] Connect default nodes and edges state handlers (`onNodesChange`, `onEdgesChange`).
- [ ] **Custom Mindmap Nodes & Edges**
  - [ ] Design custom `SkillNode` component supporting:
    - Custom colors (hex picker).
    - Status badges (e.g., "Planned", "In Progress", "Completed").
    - Notes tooltip/indicator.
    - Connection handles on all sides.
  - [ ] Design custom `SkillEdge` supporting deletion button on hover.
  - [ ] Implement collision/intersection checking and connection boundary warnings.
- [ ] **Auto-Layout Engine**
  - [ ] Implement layout utility wrapper (e.g., Dagre or ELK) to calculate positions.
  - [ ] Add auto-layout buttons (Horizontal vs. Vertical) to the editor toolbar.

## Phase 3: Data Persistence & Synchronization 💾
- [ ] **API Endpoint Implementation**
  - [ ] Build endpoints for Map management:
    - `GET /api/mindmaps`: list all maps.
    - `POST /api/mindmaps`: create map metadata.
    - `GET /api/mindmaps/[id]`: fetch map metadata + nodes + edges.
    - `PUT /api/mindmaps/[id]`: save graph state (atomic upsert of all nodes & edges).
    - `DELETE /api/mindmaps/[id]`: delete map and cascading elements.
- [ ] **UI State Sync**
  - [ ] Add auto-saving feature with debounce to local storage or database API.
  - [ ] Build custom saving indicators (e.g., "Saved", "Saving...", "Sync Error").
  - [ ] Create basic Dashboard/List view (`/dashboard`) for opening/deleting maps.

## Phase 4: Import & Export Adapters 🔄
- [ ] **JSON Export & Import**
  - [ ] Write lossless serializer for JSON mapping node states and positions.
  - [ ] Build local import capability using client-side File API (`FileReader`).
- [ ] **OPML Adapter**
  - [ ] Write OPML serializer converting graph DAG into tree outline (linearizing duplicate parent nodes).
  - [ ] Build OPML parser generating node coordinate positions upon import.
- [ ] **FreeMind (.mm) Adapter**
  - [ ] Implement XML parser and generator targeting `.mm` XML standards.
- [ ] **Image Export**
  - [ ] Integrate `html-to-image` or `html2canvas` for exporting viewport as PNG/SVG.

## Phase 5: AI Suggestions Engine (Copilot) 🧠
- [ ] **LLM Integration Endpoints**
  - [ ] Set up Next.js server route `/api/ai/suggest` using Google Gen AI or OpenAI SDK.
  - [ ] Implement contextual prompt builder based on node details and surrounding nodes.
- [ ] **Caching & Rate Limiting**
  - [ ] Configure Redis client connection.
  - [ ] Write Redis middleware for endpoint caching (key: md5 prompt context, TTL 7 days).
  - [ ] Write Redis IP rate-limiting logic.
- [ ] **AI Suggestions Workspace UI**
  - [ ] Build Sidebar panel showing AI suggestions divided by Sibling, Sub-topic, and Parent categories.
  - [ ] Implement floating recommendation badges next to selected nodes.
  - [ ] Implement "Promotion" action: clicking a suggested pill adds it to the canvas with auto-calculated layout position and draws a connecting link.

## Phase 6: Final Hardening & Polish 🚀
- [ ] Configure environment variable checks (`.env` validation).
- [ ] Implement global error boundary and toast notification systems.
- [ ] Run full build pipelines inside Docker to guarantee standalone target compatibility.
- [ ] Implement performance optimizations (canvas memoization, debounce handlers).
