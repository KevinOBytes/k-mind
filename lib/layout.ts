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

export function computeD3Layout(
  inputNodes: LayoutNodeInput[],
  inputEdges: LayoutEdgeInput[],
  direction: 'TB' | 'LR' = 'TB'
): PositionedNode[] {
  if (inputNodes.length === 0) return [];

  const nodeIds = new Set(inputNodes.map((n) => n.id));
  const targetToPrimaryParent = new Map<string, string>();
  const parentToChildren = new Map<string, string[]>();

  // Establish parent-child relationships, picking first link as primary parent to build strict D3 hierarchy
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
    // Cyclic safety: fallback first node as root if cycle detected
    roots.push(inputNodes[0]);
  }

  interface D3HierarchyNode {
    id: string;
    children?: D3HierarchyNode[];
  }

  const buildHierarchyNode = (nodeId: string, visited: Set<string>): D3HierarchyNode => {
    visited.add(nodeId);
    const childIds = parentToChildren.get(nodeId) || [];
    const childrenNodes: D3HierarchyNode[] = [];

    childIds.forEach((cid) => {
      if (!visited.has(cid)) {
        childrenNodes.push(buildHierarchyNode(cid, visited));
      }
    });

    return childrenNodes.length > 0 ? { id: nodeId, children: childrenNodes } : { id: nodeId };
  };

  const globalVisited = new Set<string>();
  let rootHierarchyData: D3HierarchyNode;

  if (roots.length === 1) {
    rootHierarchyData = buildHierarchyNode(roots[0].id, globalVisited);
  } else {
    // Single virtual root parent to bundle multiple disconnected sub-trees
    rootHierarchyData = {
      id: 'virtual-root',
      children: roots.map((r) => buildHierarchyNode(r.id, globalVisited)),
    };
  }

  // Define spacing sizes
  const siblingSpacing = 300;
  const levelSpacing = 200;

  const d3Root = d3.hierarchy<D3HierarchyNode>(rootHierarchyData);
  const treeLayout = d3.tree<D3HierarchyNode>().nodeSize([siblingSpacing, levelSpacing]);
  treeLayout(d3Root);

  // Map coordinates out of layout
  const coordsMap = new Map<string, { x: number; y: number }>();
  d3Root.descendants().forEach((d) => {
    if (d.data.id !== 'virtual-root') {
      if (direction === 'TB') {
        coordsMap.set(d.data.id, { x: d.x ?? 0, y: d.y ?? 0 });
      } else {
        coordsMap.set(d.data.id, { x: d.y ?? 0, y: d.x ?? 0 });
      }
    }
  });

  // Re-map nodes to React Flow syntax with positions
  return inputNodes.map((n) => {
    const coords = coordsMap.get(n.id) || { x: 0, y: 0 };
    return {
      id: n.id,
      type: 'skill',
      position: { x: coords.x, y: coords.y },
      data: {
        label: n.label,
        description: n.description || '',
        color: n.color || '#2563eb',
        status: (n.status as 'planned' | 'in_progress' | 'completed') || 'planned',
      },
    };
  });
}
