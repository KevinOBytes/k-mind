import * as d3 from 'd3-hierarchy';

export interface LayoutNodeInput {
  id: string;
  label: string;
  description?: string | null;
  color?: string | null;
  status?: string | null;
}

export interface LayoutEdgeInput {
  source: string;
  target: string;
}

export interface PositionedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description: string;
    color: string;
    status: 'planned' | 'in_progress' | 'completed';
  };
}

export type LayoutDirection = 'TB' | 'LR' | 'RADIAL_MINDMAP' | 'RADIAL_360' | 'RADIAL_COMPACT' | 'RADIAL_EXPANDED';

interface HierarchyItem {
  id: string;
  children?: HierarchyItem[];
}

export function computeD3Layout(
  inputNodes: LayoutNodeInput[],
  inputEdges: LayoutEdgeInput[],
  direction: LayoutDirection = 'TB'
): PositionedNode[] {
  if (inputNodes.length === 0) return [];

  const nodeIds = new Set(inputNodes.map((n) => n.id));
  const targetToPrimaryParent = new Map<string, string>();
  const parentToChildren = new Map<string, string[]>();

  // Establish parent-child relationships (single parent per node to form valid trees)
  inputEdges.forEach((edge) => {
    const { source, target } = edge;
    if (nodeIds.has(source) && nodeIds.has(target) && !targetToPrimaryParent.has(target)) {
      targetToPrimaryParent.set(target, source);
      const children = parentToChildren.get(source) || [];
      children.push(target);
      parentToChildren.set(source, children);
    }
  });

  // Identify root nodes (nodes with no parents)
  const roots = inputNodes.filter((n) => !targetToPrimaryParent.has(n.id));
  if (roots.length === 0 && inputNodes.length > 0) {
    // Cyclic fallback: pick first node as root
    roots.push(inputNodes[0]);
  }

  const buildHierarchyItem = (nodeId: string, visited: Set<string>): HierarchyItem => {
    visited.add(nodeId);
    const childIds = parentToChildren.get(nodeId) || [];
    const childrenItems: HierarchyItem[] = [];

    childIds.forEach((cid) => {
      if (!visited.has(cid)) {
        childrenItems.push(buildHierarchyItem(cid, visited));
      }
    });

    return childrenItems.length > 0 ? { id: nodeId, children: childrenItems } : { id: nodeId };
  };

  const coordsMap = new Map<string, { x: number; y: number }>();

  // Backward compatibility alias: RADIAL_COMPACT and RADIAL_EXPANDED map to RADIAL_MINDMAP and RADIAL_360
  const normalizedDirection: LayoutDirection =
    direction === 'RADIAL_COMPACT' ? 'RADIAL_MINDMAP' :
    direction === 'RADIAL_EXPANDED' ? 'RADIAL_360' : direction;

  // -------------------------------------------------------------
  // 1. BI-DIRECTIONAL MIND MAP (RADIAL_MINDMAP)
  // Left/Right symmetric split radiating from center (0, 0)
  // -------------------------------------------------------------
  if (normalizedDirection === 'RADIAL_MINDMAP') {
    const primaryRootId = roots[0].id;
    coordsMap.set(primaryRootId, { x: 0, y: 0 });

    const visited = new Set<string>([primaryRootId]);
    const rootDirectChildren = parentToChildren.get(primaryRootId) || [];

    // If multiple roots exist, treat other roots as primary branches
    const allPrimaryBranches = [
      ...rootDirectChildren,
      ...roots.slice(1).map((r) => r.id),
    ];

    if (allPrimaryBranches.length > 0) {
      const half = Math.ceil(allPrimaryBranches.length / 2);
      const rightBranchIds = allPrimaryBranches.slice(0, half);
      const leftBranchIds = allPrimaryBranches.slice(half);

      // Helper to layout one side
      const layoutSide = (branchIds: string[], isRight: boolean) => {
        if (branchIds.length === 0) return;

        const virtualSideRoot: HierarchyItem = {
          id: isRight ? 'virtual-right' : 'virtual-left',
          children: branchIds.map((id) => buildHierarchyItem(id, visited)),
        };

        const d3SideRoot = d3.hierarchy<HierarchyItem>(virtualSideRoot);
        // Sibling vertical spacing: 110px, Level horizontal spacing: 320px
        const tree = d3.tree<HierarchyItem>().nodeSize([110, 320]);
        const pointRoot = tree(d3SideRoot);

        pointRoot.descendants().forEach((d) => {
          if (!d.data.id.startsWith('virtual-')) {
            const posX = isRight ? d.y : -d.y;
            const posY = d.x;
            coordsMap.set(d.data.id, { x: posX, y: posY });
          }
        });
      };

      layoutSide(rightBranchIds, true);
      layoutSide(leftBranchIds, false);
    }
  }

  // -------------------------------------------------------------
  // 2. RADIAL 360° (RADIAL_360)
  // True 360-degree radiating circular starburst with non-overlapping angular sectors
  // -------------------------------------------------------------
  else if (normalizedDirection === 'RADIAL_360') {
    const globalVisited = new Set<string>();
    let rootHierarchy: HierarchyItem;

    if (roots.length === 1) {
      rootHierarchy = buildHierarchyItem(roots[0].id, globalVisited);
    } else {
      rootHierarchy = {
        id: 'virtual-root',
        children: roots.map((r) => buildHierarchyItem(r.id, globalVisited)),
      };
    }

    const d3Root = d3.hierarchy<HierarchyItem>(rootHierarchy);

    // Compute leaf count for each node (for proportional angular allocation)
    d3Root.count(); // Sets d.value to number of leaves in subtree
    const totalLeaves = d3Root.value || 1;

    // Find max depth of tree
    let maxDepth = 1;
    d3Root.descendants().forEach((d) => {
      if (d.depth > maxDepth) maxDepth = d.depth;
    });

    // Dynamic radius sizing to guarantee no overlapping cards on any circle
    // Each leaf card is 240px wide. Circumference = leaves * 250px
    const minCircumferenceRadius = (totalLeaves * 250) / (2 * Math.PI);
    const baseStep = 320;
    const radiusStep = Math.max(baseStep, minCircumferenceRadius / maxDepth);

    // Recursive angular sector assignment
    const assignAngularSector = (
      node: d3.HierarchyNode<HierarchyItem>,
      startAngle: number,
      endAngle: number
    ) => {
      const midAngle = (startAngle + endAngle) / 2;
      const isVirtual = node.data.id === 'virtual-root';

      if (!isVirtual) {
        const radius = node.depth * radiusStep;
        coordsMap.set(node.data.id, {
          x: radius * Math.cos(midAngle),
          y: radius * Math.sin(midAngle),
        });
      }

      if (node.children && node.children.length > 0) {
        const totalChildValue = node.children.reduce((sum, c) => sum + (c.value || 1), 0);
        let currentAngle = startAngle;
        const totalSectorSpan = endAngle - startAngle;

        node.children.forEach((child) => {
          const childValue = child.value || 1;
          const childSpan = (childValue / totalChildValue) * totalSectorSpan;
          assignAngularSector(child, currentAngle, currentAngle + childSpan);
          currentAngle += childSpan;
        });
      }
    };

    assignAngularSector(d3Root, 0, 2 * Math.PI);

    // If single root, place root at (0, 0)
    if (roots.length === 1) {
      coordsMap.set(roots[0].id, { x: 0, y: 0 });
    }
  }

  // -------------------------------------------------------------
  // 3. VERTICAL (TB) & HORIZONTAL (LR) LAYOUTS
  // -------------------------------------------------------------
  else {
    const globalVisited = new Set<string>();
    let rootHierarchy: HierarchyItem;

    if (roots.length === 1) {
      rootHierarchy = buildHierarchyItem(roots[0].id, globalVisited);
    } else {
      rootHierarchy = {
        id: 'virtual-root',
        children: roots.map((r) => buildHierarchyItem(r.id, globalVisited)),
      };
    }

    const d3Root = d3.hierarchy<HierarchyItem>(rootHierarchy);

    if (normalizedDirection === 'LR') {
      // Sibling vertical spacing: 110px, Level horizontal spacing: 320px
      const treeLayout = d3.tree<HierarchyItem>().nodeSize([110, 320]);
      const pointRoot = treeLayout(d3Root);

      pointRoot.descendants().forEach((d) => {
        if (d.data.id !== 'virtual-root') {
          coordsMap.set(d.data.id, { x: d.y, y: d.x });
        }
      });
    } else {
      // TB (Top to Bottom): Sibling horizontal spacing: 280px, Level vertical spacing: 160px
      const treeLayout = d3.tree<HierarchyItem>().nodeSize([280, 160]);
      const pointRoot = treeLayout(d3Root);

      pointRoot.descendants().forEach((d) => {
        if (d.data.id !== 'virtual-root') {
          coordsMap.set(d.data.id, { x: d.x, y: d.y });
        }
      });
    }
  }

  // Re-map nodes to React Flow syntax with positions
  return inputNodes.map((n) => {
    const coords = coordsMap.get(n.id) || { x: 0, y: 0 };
    return {
      id: n.id,
      type: 'skill',
      position: { x: Math.round(coords.x), y: Math.round(coords.y) },
      data: {
        label: n.label,
        description: n.description || '',
        color: n.color || '#2563eb',
        status: (n.status as 'planned' | 'in_progress' | 'completed') || 'planned',
      },
    };
  });
}
