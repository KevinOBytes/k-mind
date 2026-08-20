import { expect, test } from 'vitest';
import { exportJson, importJson } from '../lib/adapters/json';
import { generateOpml, parseOpml } from '../lib/adapters/opml';
import { generateFreeMind, parseFreeMind } from '../lib/adapters/freemind';

const mockNodes = [
  {
    id: 'n-1',
    label: 'Root Node',
    description: 'This is the main root concept',
    xPos: 100,
    yPos: 150,
    color: '#2563eb',
    metadata: { status: 'in_progress' },
  },
  {
    id: 'n-2',
    label: 'Child Node A',
    description: 'First subtopic',
    xPos: 350,
    yPos: 100,
    color: '#16a34a',
    metadata: { status: 'planned' },
  },
];

const mockEdges = [
  {
    id: 'e-1',
    sourceNodeId: 'n-1',
    targetNodeId: 'n-2',
  },
];

test('JSON Adapter: lossless export and import', () => {
  const rfNodes = mockNodes.map((n) => ({
    id: n.id,
    position: { x: n.xPos, y: n.yPos },
    data: { label: n.label, description: n.description, color: n.color, status: n.metadata.status },
  }));
  const rfEdges = mockEdges.map((e) => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
  }));

  const jsonText = exportJson(rfNodes, rfEdges);
  expect(jsonText).toBeDefined();

  const imported = importJson(jsonText);
  expect(imported.nodes.length).toBe(2);
  expect(imported.edges.length).toBe(1);
  expect(imported.nodes[0].label).toBe('Root Node');
  expect(imported.edges[0].sourceNodeId).toBe('n-1');
});

test('OPML Adapter: serialization and parsing', () => {
  const rfNodes = mockNodes.map((n) => ({
    id: n.id,
    position: { x: n.xPos, y: n.yPos },
    data: { label: n.label, description: n.description, color: n.color, status: n.metadata.status },
  }));
  const rfEdges = mockEdges.map((e) => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
  }));

  const opmlText = generateOpml(rfNodes, rfEdges);
  expect(opmlText).toContain('<opml version="2.0">');
  expect(opmlText).toContain('text="Root Node"');
  expect(opmlText).toContain('text="Child Node A"');

  const parsed = parseOpml(opmlText);
  expect(parsed.nodes.length).toBe(2);
  expect(parsed.edges.length).toBe(1);
  expect(parsed.nodes[0].label).toBe('Root Node');
  expect(parsed.nodes[1].label).toBe('Child Node A');
});

test('FreeMind Adapter: serialization and parsing', () => {
  const rfNodes = mockNodes.map((n) => ({
    id: n.id,
    position: { x: n.xPos, y: n.yPos },
    data: { label: n.label, description: n.description, color: n.color, status: n.metadata.status },
  }));
  const rfEdges = mockEdges.map((e) => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
  }));

  const mmText = generateFreeMind(rfNodes, rfEdges);
  expect(mmText).toContain('<map version="1.0.1">');
  expect(mmText).toContain('TEXT="Root Node"');
  expect(mmText).toContain('TEXT="Child Node A"');

  const parsed = parseFreeMind(mmText);
  expect(parsed.nodes.length).toBe(2);
  expect(parsed.edges.length).toBe(1);
  expect(parsed.nodes[0].label).toBe('Root Node');
  expect(parsed.nodes[1].label).toBe('Child Node A');
});
