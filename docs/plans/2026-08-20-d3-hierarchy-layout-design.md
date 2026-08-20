# Design - D3 Hierarchy Layout Integration

We are migrating our interactive mind map layout engine from `dagre` to `d3-hierarchy`.

## Spacing & Architecture

1. **Hierarchy Definition**:
   - D3 Hierarchy expects a single root and strict tree relations (exactly one parent).
   - In multi-parent configurations, we select the first inbound edge as the primary parent relationship for layout positioning. All secondary parent edges remain fully visible in React Flow.
   - If multiple roots exist, we build a temporary virtual root parent (`__virtual_root__`) to connect all roots together for layout calculation.

2. **D3 Tree Layout Options**:
   - Node Size: `[280, 160]` (width spacing and depth spacing) to ensure nodes do not overlap.
   - Layout Directions: Support Vertical (Top-to-Bottom) and Horizontal (Left-to-Right) alignments.

## Affected Components

- [`components/MindmapCanvas.tsx`](file:///Users/kevo/Projects/k-mind/components/MindmapCanvas.tsx): Replace `dagre` calls with `d3-hierarchy` tree mapping.
- [`package.json`](file:///Users/kevo/Projects/k-mind/package.json): Replace `dagre` dependencies with `d3-hierarchy`.
