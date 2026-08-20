# D3 Hierarchy Layout Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Replace the dagre layout engine with d3-hierarchy inside the React Flow canvas component.

**Architecture:** Detect root nodes, build a single virtual root node if multiple roots exist to satisfy D3 tree requirements, traverse hierarchy on primary parent relations to generate coordinates, and map coordinates back.

**Tech Stack:** React Flow, d3-hierarchy, TypeScript.

---

### Task 1: Package Dependencies Setup

**Files:**
- Modify: `package.json:20-40`

**Step 1: Edit package.json**
- Remove `"dagre": "^0.8.5"` and `"@types/dagre": "^0.7.52"`.
- Add `"d3-hierarchy": "^3.1.2"` under `dependencies`.
- Add `"@types/d3-hierarchy": "^3.1.7"` under `devDependencies`.

**Step 2: Run npm install**
- Run: `npm install --legacy-peer-deps`

**Step 3: Commit**
- Run: `git commit -am "chore: add d3-hierarchy layout dependencies"`

---

### Task 2: Implement D3 Layout in MindmapCanvas

**Files:**
- Modify: `components/MindmapCanvas.tsx`

**Step 1: Implement D3 Tree Layout Function**
- Import `* as d3` from `d3-hierarchy`.
- Write `applyD3Layout(direction: 'TB' | 'LR')` calculating tree hierarchy:
  - Select primary parent for multi-parent nodes.
  - Wrap multi-root nodes in a temporary virtual root.
  - Run `d3.tree().nodeSize([siblingSpacing, levelSpacing])`.
  - Shift React Flow node coordinates.

**Step 2: Verify Lint and Types**
- Run: `npm run lint && npx tsc --noEmit`

**Step 3: Commit**
- Run: `git commit -am "feat: integrate d3-hierarchy tree layout engine"`
