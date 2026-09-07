import { v4 as uuidv4 } from 'uuid';

export interface OutlineNode {
  id: string;
  label: string;
  description: string;
  status: 'planned' | 'in_progress' | 'completed';
  tags: string[];
  depth: number;
}

export interface OutlineEdge {
  source: string;
  target: string;
}

export interface OutlineParseResult {
  nodes: OutlineNode[];
  edges: OutlineEdge[];
}

interface GenericNode {
  id: string;
  data: {
    label?: string;
    description?: string;
    status?: string;
    tags?: string[];
  };
}

interface GenericEdge {
  source: string;
  target: string;
}

/**
 * Serializes a graph (nodes & edges) into an indented Markdown outline.
 */
export function generateMarkdownOutline(nodes: GenericNode[], edges: GenericEdge[]): string {
  if (nodes.length === 0) return '';

  const parentToChildren = new Map<string, string[]>();
  const targetToParent = new Map<string, string>();
  const nodeMap = new Map<string, GenericNode>();

  nodes.forEach((n) => nodeMap.set(n.id, n));

  edges.forEach((e) => {
    if (nodeMap.has(e.source) && nodeMap.has(e.target) && !targetToParent.has(e.target)) {
      targetToParent.set(e.target, e.source);
      const children = parentToChildren.get(e.source) || [];
      children.push(e.target);
      parentToChildren.set(e.source, children);
    }
  });

  const roots = nodes.filter((n) => !targetToParent.has(n.id));
  const visited = new Set<string>();
  const lines: string[] = [];

  const traverse = (nodeId: string, depth: number) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return;

    const label = node.data.label || 'Untitled';
    const status = node.data.status || 'planned';
    const checkmark = status === 'completed' ? '[x]' : status === 'in_progress' ? '[-]' : '[ ]';
    const tags = node.data.tags && node.data.tags.length > 0 ? ' ' + node.data.tags.map((t) => `#${t}`).join(' ') : '';
    const desc = node.data.description ? ` (${node.data.description})` : '';

    if (depth === 0) {
      lines.push(`# ${label}${desc}${tags}`);
    } else {
      const indent = '  '.repeat(depth - 1);
      lines.push(`${indent}- ${checkmark} ${label}${desc}${tags}`);
    }

    const children = parentToChildren.get(nodeId) || [];
    children.forEach((childId) => traverse(childId, depth + 1));
  };

  roots.forEach((root) => traverse(root.id, 0));

  // If there were disconnected nodes not visited
  nodes.forEach((n) => {
    if (!visited.has(n.id)) {
      traverse(n.id, 1);
    }
  });

  return lines.join('\n');
}

/**
 * Parses an indented Markdown outline into structured nodes and edges.
 */
export function parseMarkdownOutline(markdown: string): OutlineParseResult {
  const lines = markdown.split('\n').filter((l) => l.trim().length > 0);
  const nodes: OutlineNode[] = [];
  const edges: OutlineEdge[] = [];

  // Stack of parent IDs at each indentation level
  const stack: { level: number; id: string }[] = [];

  lines.forEach((line) => {
    let indentLevel = 0;
    let cleanText = line;

    if (line.startsWith('#')) {
      // Header is level 0 root
      indentLevel = 0;
      cleanText = line.replace(/^#+\s*/, '');
    } else {
      // Indented list item
      const leadingSpaces = line.search(/\S/);
      indentLevel = Math.floor(leadingSpaces / 2) + 1;
      cleanText = line.trim().replace(/^[-*+]\s*/, '');
    }

    // Parse status checkbox [x], [-], [ ]
    let status: 'planned' | 'in_progress' | 'completed' = 'planned';
    if (cleanText.startsWith('[x] ') || cleanText.startsWith('[X] ')) {
      status = 'completed';
      cleanText = cleanText.substring(4);
    } else if (cleanText.startsWith('[-] ')) {
      status = 'in_progress';
      cleanText = cleanText.substring(4);
    } else if (cleanText.startsWith('[ ] ')) {
      status = 'planned';
      cleanText = cleanText.substring(4);
    }

    // Parse inline hashtags #tag
    const tagMatches = cleanText.match(/#([\w-]+)/g);
    const tags: string[] = tagMatches ? tagMatches.map((t) => t.substring(1)) : [];
    cleanText = cleanText.replace(/#([\w-]+)/g, '').trim();

    // Parse inline description in parentheses (description)
    let description = '';
    const descMatch = cleanText.match(/\((.*?)\)$/);
    if (descMatch) {
      description = descMatch[1].trim();
      cleanText = cleanText.replace(/\((.*?)\)$/, '').trim();
    }

    const label = cleanText || 'Untitled Node';
    const id = `n-md-${uuidv4().substring(0, 8)}`;

    nodes.push({
      id,
      label,
      description,
      status,
      tags,
      depth: indentLevel,
    });

    // Find parent from stack
    while (stack.length > 0 && stack[stack.length - 1].level >= indentLevel) {
      stack.pop();
    }

    if (stack.length > 0) {
      const parent = stack[stack.length - 1];
      edges.push({
        source: parent.id,
        target: id,
      });
    }

    stack.push({ level: indentLevel, id });
  });

  return { nodes, edges };
}
