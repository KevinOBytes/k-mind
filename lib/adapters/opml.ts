import { ReactFlowNode, ReactFlowEdge, AdapterNode, AdapterEdge } from './json';

export function generateOpml(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): string {
  // Find nodes with no incoming edges to use as roots
  const targetIds = new Set(edges.map((e) => e.target));
  let roots = nodes.filter((n) => !targetIds.has(n.id));

  // If cyclic or no roots found, pick the first node
  if (roots.length === 0 && nodes.length > 0) {
    roots = [nodes[0]];
  }

  const visited = new Set<string>();

  const buildTreeXml = (node: ReactFlowNode, depth: number): string => {
    const indent = '  '.repeat(depth + 2);
    const label = node.data?.label || '';
    const desc = node.data?.description || '';
    const color = node.data?.color || '';
    const status = node.data?.status || 'planned';

    const cleanLabel = label.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const cleanDesc = desc.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    if (visited.has(node.id)) {
      // Re-linked node (multi-parent reference)
      return `${indent}<outline text="${cleanLabel} [Ref]" description="${cleanDesc}" color="${color}" status="${status}" isRef="true" />\n`;
    }

    visited.add(node.id);

    // Find children edges
    const childEdges = edges.filter((e) => e.source === node.id);
    const childNodes = childEdges
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter((n): n is ReactFlowNode => !!n);

    if (childNodes.length === 0) {
      return `${indent}<outline text="${cleanLabel}" description="${cleanDesc}" color="${color}" status="${status}" />\n`;
    }

    let xml = `${indent}<outline text="${cleanLabel}" description="${cleanDesc}" color="${color}" status="${status}">\n`;
    for (const child of childNodes) {
      xml += buildTreeXml(child, depth + 1);
    }
    xml += `${indent}</outline>\n`;
    return xml;
  };

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n  <head>\n    <title>k-mind Export</title>\n  </head>\n  <body>\n`;
  for (const root of roots) {
    xml += buildTreeXml(root, 0);
  }
  xml += `  </body>\n</opml>`;
  
  return xml;
}

export function parseOpml(xmlText: string): { nodes: AdapterNode[]; edges: AdapterEdge[] } {
  const nodesList: AdapterNode[] = [];
  const edgesList: AdapterEdge[] = [];
  let nodeIdCounter = 1;

  const attributeRegex = /(\w+)="([^"]*?)"/g;
  const parser = new RegExp('<outline\\s+([^>]*?)>|<\\/outline>', 'g');
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

      const id = `opml-node-${nodeIdCounter++}`;
      const depth = parentStack.length;

      const xPos = 150 + depth * 250;
      const yPos = 100 + nodesList.filter((n) => n.xPos === xPos).length * 120;

      nodesList.push({
        id,
        label: attrs.text || 'Untitled',
        description: attrs.description || '',
        xPos,
        yPos,
        color: attrs.color || '#2563eb',
        metadata: { status: attrs.status || 'planned' },
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
