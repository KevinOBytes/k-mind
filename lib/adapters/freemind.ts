import { ReactFlowNode, ReactFlowEdge, AdapterNode, AdapterEdge } from './json';

export function generateFreeMind(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): string {
  const targetIds = new Set(edges.map((e) => e.target));
  let roots = nodes.filter((n) => !targetIds.has(n.id));

  if (roots.length === 0 && nodes.length > 0) {
    roots = [nodes[0]];
  }

  const visited = new Set<string>();

  const buildTreeXml = (node: ReactFlowNode, depth: number): string => {
    const indent = '  '.repeat(depth + 1);
    const label = node.data?.label || '';
    const color = node.data?.color || '';

    const cleanLabel = label.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    if (visited.has(node.id)) {
      // Re-linked duplicate reference node
      return `${indent}<node ID="${node.id}-ref" TEXT="${cleanLabel} [Ref]" COLOR="${color}" />\n`;
    }

    visited.add(node.id);

    const childEdges = edges.filter((e) => e.source === node.id);
    const childNodes = childEdges
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter((n): n is ReactFlowNode => !!n);

    if (childNodes.length === 0) {
      return `${indent}<node ID="${node.id}" TEXT="${cleanLabel}" COLOR="${color}" />\n`;
    }

    let xml = `${indent}<node ID="${node.id}" TEXT="${cleanLabel}" COLOR="${color}">\n`;
    for (const child of childNodes) {
      xml += buildTreeXml(child, depth + 1);
    }
    xml += `${indent}</node>\n`;
    return xml;
  };

  let xml = `<map version="1.0.1">\n`;
  for (const root of roots) {
    xml += buildTreeXml(root, 0);
  }
  xml += `</map>`;
  
  return xml;
}

export function parseFreeMind(xmlText: string): { nodes: AdapterNode[]; edges: AdapterEdge[] } {
  const nodesList: AdapterNode[] = [];
  const edgesList: AdapterEdge[] = [];
  let nodeIdCounter = 1;

  const attributeRegex = /(\w+)="([^"]*?)"/g;
  const parser = new RegExp('<node\\s+([^>]*?)>|<\\/node>', 'g');
  let parserMatch;
  let activeParentId: string | null = null;
  const parentStack: string[] = [];

  while ((parserMatch = parser.exec(xmlText)) !== null) {
    const fullMatch = parserMatch[0];
    const attrString = parserMatch[1];

    if (fullMatch.startsWith('</')) {
      parentStack.pop();
      activeParentId = parentStack[parentStack.length - 1] || null;
    } else {
      const attrs: Record<string, string> = {};
      let attrMatch;
      while ((attrMatch = attributeRegex.exec(attrString)) !== null) {
        attrs[attrMatch[1]] = attrMatch[2];
      }

      const id = attrs.ID || `mm-node-${nodeIdCounter++}`;
      const depth = parentStack.length;

      const xPos = 150 + depth * 250;
      const yPos = 100 + nodesList.filter((n) => n.xPos === xPos).length * 120;

      nodesList.push({
        id,
        label: attrs.TEXT || 'Untitled',
        description: '',
        xPos,
        yPos,
        color: attrs.COLOR || '#2563eb',
        metadata: { status: 'planned' },
      });

      if (activeParentId) {
        edgesList.push({
          id: `e-${activeParentId}-${id}`,
          sourceNodeId: activeParentId,
          targetNodeId: id,
        });
      }

      const isSelfClosing = attrString.trim().endsWith('/');
      if (!isSelfClosing) {
        activeParentId = id;
        parentStack.push(id);
      }
    }
  }

  return {
    nodes: nodesList,
    edges: edgesList,
  };
}
