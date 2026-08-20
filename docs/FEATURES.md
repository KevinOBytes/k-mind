# Feature Catalog: k-mind

This document lists and details the core features designed for the `k-mind` mindmap builder.

---

## 1. Multi-Linked Interactive Graph Canvas
Unlike typical mindmaps that restrict layouts to parent-child tree hierarchies, `k-mind` supports rich directed graphs (DAGs). This allows concepts to map to multiple prerequisites, dependencies, or parent skills.

- **Dynamic Interactive Canvas**: Built on top of React Flow, allowing seamless panning, mouse-wheel zooming, selection, and multi-node dragging.
- **Node Editing Drawer**: Select any node to open a context drawer for editing the node's title, description (supporting Markdown), color theme, status, and custom tags.
- **Multi-Linking Connections**: Create directed links (edges) from one node to any other node. A single node can have multiple inbound (parent) links and multiple outbound (child) links.
- **Custom Connection Handles**: Visual inputs/outputs on node edges facilitating clean edge creation.
- **Auto-Layout / Graph Auto-Arrange**: Cleanly organize messy nodes at the click of a button using a graph layout algorithm (e.g. Dagre layout) with options for Left-to-Right or Top-to-Bottom mapping.

---

## 2. AI Skill Copilot (Contextual Suggestions)
Use LLMs (Gemini / OpenAI) to assist users in brainstorming and detailing complex skill/topic pathways.

- **Context-Aware Sibling Suggestions**: Recommends similar technologies or brother/sister concepts that exist at the current node's depth/hierarchy.
- **Context-Aware Sub-topic (Child) Suggestions**: Generates granular sub-tasks, frameworks, or concepts for deeper learning.
- **Context-Aware Prerequisite (Parent) Suggestions**: Brainstorms prior requirements, fundamentals, or background knowledge recommended before tackling the current concept.
- **Interactive Promotion**: Suggested skills are shown as floating preview pills. Clicking a suggestion spawns a node at a reasonable coordinate on the canvas, auto-linking it to the parent/sibling/child node instantly.

---

## 3. Data Portability & Adapters
Ensures that users can save their graphs locally or export/import them using standard mind-mapping and outline formats.

- **Direct Cloud Sync**: Persistent, authenticated schema saving to PostgreSQL.
- **Local JSON Import/Export**: Save the raw, lossless canvas layout, positions, custom metadata, and graph-structured multi-links to a single local JSON file.
- **OPML Adapter (Import/Export)**:
  - **Export**: Serializes the graph into an outline structure. Replicates nodes with multiple parents under each parent subtree, marked with reference pointers, to satisfy OPML's tree restriction.
  - **Import**: Parses OPML outlines into a canvas, automatically configuring standard node spacing.
- **FreeMind (.mm) Adapter (Import/Export)**:
  - **Export**: Formats maps into the XML-based `.mm` standard for compatibility with FreeMind, Freeplane, and XMind.
  - **Import**: Converts `.mm` XML trees into nodes and edges on the workspace canvas.
- **Canvas Screenshot Export**: Renders the active viewport or the entire graph structure directly to PNG or SVG for easy sharing.

---

## 4. Map Directory & Dashboard
- **Saved Maps Manager**: View, delete, and duplicate saved mindmaps.
- **Metadata Filters**: Filter mindmaps by tags, creation date, or search term.
- **Template Gallery**: Pre-built starter templates for standard learning paths (e.g., Frontend Developer, DevOps Engineer, Machine Learning Specialist).
