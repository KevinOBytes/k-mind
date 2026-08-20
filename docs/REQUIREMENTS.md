# Requirements Specification: k-mind

This document outlines the functional and non-functional requirements for the `k-mind` mindmap builder application.

---

## 1. Functional Requirements

### 1.1 Canvas & Interactive Editor
- **Interactive Graph Canvas**: Users must be able to view, pan, zoom, and select nodes/edges on an infinite canvas.
- **Node Management**: Users can create, update (label, details, color, tags), position, and delete nodes.
- **Edge/Link Management**: Users can connect nodes by drawing lines (edges) between them.
- **Multi-Linking (Graph Structure)**:
  - Unlike traditional mindmaps which are strict trees (one parent per node), `k-mind` allows a node to have **multiple parents** or be connected to multiple other nodes.
  - The canvas must support directed acyclic graph (DAG) behaviors, representing skill trees and learning paths.
  - Cycle detection: The application should warn or optionally restrict the user if drawing an edge creates a loop (cycle), though configurable.
- **Auto-layout**: Ability to trigger a layout engine (e.g., d3-hierarchy or Dagre) to automatically reorganize nodes cleanly.

### 1.2 Data Portability & Storage
- **Cloud/Database Sync**: Automatical or manual saving of maps to the Postgres database.
- **Save/Load Dashboard**: A listing of all saved mindmaps with metadata (name, description, last updated, tags).
- **Import/Export Formats**:
  - **Native JSON**: Lossless format representing the full graph schema (nodes, coordinates, multi-parent edges, custom metadata).
  - **OPML (Outline Processor Markup Language)**: Hierarchical outline standard. Since OPML is strictly tree-based, the system must use a serialization adapter to convert the graph into a tree (e.g., by replicating nodes that have multiple parents or selecting a primary tree structure and adding reference notes/links for other connections).
  - **FreeMind (.mm)**: XML-based format used by FreeMind, Freeplane, etc. Similar to OPML, it requires a tree linearization strategy for multi-linked nodes.
  - **Static Image Export**: Export the canvas view as PNG or SVG.

### 1.3 AI Suggestion Engine
- **Context-Aware Suggestions**: The system must query an LLM (Gemini or OpenAI API) to suggest topics related to a selected node.
- **Suggestion Categories**:
  - **Parent Skills (Prerequisites)**: Broader concepts that should be learned before the target node.
  - **Child Skills (Sub-topics)**: Granular topics or sub-components of the target node.
  - **Sibling Skills (Brothers/Sisters)**: Skills or topics at the same level of granularity or category.
- **Interactive Suggestions UI**: Suggestions should appear in a side panel or context menu. Users can click to add them directly to the canvas as new nodes, auto-linked to the source node.
- **Caching**: AI suggestion requests must be cached in Redis based on the node's label and category to reduce API costs and latency.

---

## 2. Infrastructure & Non-Functional Requirements

### 2.1 Technology Stack
- **Frontend/Backend**: Next.js (App Router, React 19, TypeScript).
- **Interactive Canvas**: React Flow (`@xyflow/react`) or similar library supporting custom node shapes, drag handles, and multi-directed edges.
- **Database**: PostgreSQL for persistent data of maps, nodes, and edges.
- **ORM**: Drizzle ORM for schema definitions and migrations.
- **Caching/Rate-Limiting**: Redis instance.
- **Reverse Proxy**: Nginx to route and proxy external requests to the Next.js standalone runner.
- **Containerization**: Fully configured Docker Compose setup so the developer/user can start the entire stack locally with `docker compose up -d`.

### 2.2 Performance & Limits
- **Canvas Scale**: Must handle up to 500+ nodes on the canvas smoothly without noticeable rendering lag (leveraging virtualized rendering or optimized state updates).
- **AI Latency**: AI suggestions should display within 2 seconds. The system must use Server-Sent Events (SSE) or streaming for real-time feedback, or return cached Redis results instantly (under 100ms).
- **Offline Capability**: Local import/export should not require database sync or internet connection (excluding AI suggestions).

### 2.3 Security
- **Input Sanitization**: Node labels and descriptions must be sanitized to prevent XSS.
- **Rate-Limiting**: Limit AI suggestion API requests per client IP address using Redis to prevent API key abuse.
