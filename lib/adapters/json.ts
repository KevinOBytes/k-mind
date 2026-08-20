export interface ReactFlowNode {
  id: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    color?: string;
    status?: string;
  };
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
}

export interface AdapterNode {
  id: string;
  label: string;
  description?: string;
  xPos: number;
  yPos: number;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface AdapterEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
}

export function exportJson(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): string {
  const data = {
    version: '1.0.0',
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.data.label,
      description: n.data.description || '',
      xPos: n.position.x,
      yPos: n.position.y,
      color: n.data.color || '#2563eb',
      metadata: { status: n.data.status },
    })),
    edges: edges.map((e) => ({
      id: e.id,
      sourceNodeId: e.source,
      targetNodeId: e.target,
    })),
  };
  return JSON.stringify(data, null, 2);
}

export function importJson(jsonText: string): { nodes: AdapterNode[]; edges: AdapterEdge[] } {
  const parsed = JSON.parse(jsonText);
  if (!parsed.nodes || !parsed.edges) {
    throw new Error('Invalid JSON schema');
  }
  return {
    nodes: parsed.nodes as AdapterNode[],
    edges: parsed.edges as AdapterEdge[],
  };
}
