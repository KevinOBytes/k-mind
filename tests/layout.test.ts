import { expect, test } from 'vitest';
import { computeD3Layout } from '../lib/layout';

// Generate a realistic tree with 1 root, 6 categories, and 4 items per category (25 nodes total)
function createSampleTree() {
  const nodes = [{ id: 'root', label: 'Central Topic' }];
  const edges: { source: string; target: string }[] = [];

  for (let c = 1; c <= 6; c++) {
    const catId = `cat-${c}`;
    nodes.push({ id: catId, label: `Category ${c}` });
    edges.push({ source: 'root', target: catId });

    for (let i = 1; i <= 4; i++) {
      const itemId = `item-${c}-${i}`;
      nodes.push({ id: itemId, label: `Item ${c}.${i}` });
      edges.push({ source: catId, target: itemId });
    }
  }

  return { nodes, edges };
}

// Check if two rectangular nodes overlap (assuming width=240, height=80)
function checkOverlap(
  pos1: { x: number; y: number },
  pos2: { x: number; y: number },
  width = 240,
  height = 80
): boolean {
  const overlapX = Math.abs(pos1.x - pos2.x) < width;
  const overlapY = Math.abs(pos1.y - pos2.y) < height;
  return overlapX && overlapY;
}

test('Layout TB: positions root at top and children below without overlap', () => {
  const { nodes, edges } = createSampleTree();
  const positioned = computeD3Layout(nodes, edges, 'TB');

  expect(positioned.length).toBe(nodes.length);

  const rootPos = positioned.find((n) => n.id === 'root')!.position;
  const cat1Pos = positioned.find((n) => n.id === 'cat-1')!.position;
  expect(cat1Pos.y).toBeGreaterThan(rootPos.y);

  // Check no two sibling leaves or nodes have identical positions
  const posMap = new Set<string>();
  positioned.forEach((n) => {
    const key = `${Math.round(n.position.x)},${Math.round(n.position.y)}`;
    expect(posMap.has(key)).toBe(false);
    posMap.add(key);
  });
});

test('Layout LR: positions root at left and children to the right with no horizontal overlap', () => {
  const { nodes, edges } = createSampleTree();
  const positioned = computeD3Layout(nodes, edges, 'LR');

  expect(positioned.length).toBe(nodes.length);

  const rootPos = positioned.find((n) => n.id === 'root')!.position;
  const cat1Pos = positioned.find((n) => n.id === 'cat-1')!.position;
  const item11Pos = positioned.find((n) => n.id === 'item-1-1')!.position;

  // Root to child distance should be at least 260px (wider than 240px card)
  expect(cat1Pos.x - rootPos.x).toBeGreaterThanOrEqual(260);
  expect(item11Pos.x - cat1Pos.x).toBeGreaterThanOrEqual(260);
});

test('Layout RADIAL_MINDMAP: splits branches left and right around root (0, 0)', () => {
  const { nodes, edges } = createSampleTree();
  const positioned = computeD3Layout(nodes, edges, 'RADIAL_MINDMAP');

  expect(positioned.length).toBe(nodes.length);

  const rootPos = positioned.find((n) => n.id === 'root')!.position;
  expect(Math.abs(rootPos.x)).toBeLessThanOrEqual(5);
  expect(Math.abs(rootPos.y)).toBeLessThanOrEqual(5);

  // Should have nodes on both left (x < 0) and right (x > 0)
  const leftNodes = positioned.filter((n) => n.id !== 'root' && n.position.x < -100);
  const rightNodes = positioned.filter((n) => n.id !== 'root' && n.position.x > 100);
  expect(leftNodes.length).toBeGreaterThan(0);
  expect(rightNodes.length).toBeGreaterThan(0);
});

test('Layout RADIAL_360: distributes nodes in 360-degree radial sectors without stacking', () => {
  const { nodes, edges } = createSampleTree();
  const positioned = computeD3Layout(nodes, edges, 'RADIAL_360');

  expect(positioned.length).toBe(nodes.length);

  const rootPos = positioned.find((n) => n.id === 'root')!.position;
  expect(Math.abs(rootPos.x)).toBeLessThanOrEqual(5);
  expect(Math.abs(rootPos.y)).toBeLessThanOrEqual(5);

  // Count unique positions
  const posMap = new Set<string>();
  positioned.forEach((n) => {
    const key = `${Math.round(n.position.x)},${Math.round(n.position.y)}`;
    expect(posMap.has(key)).toBe(false);
    posMap.add(key);
  });

  // Verify adjacent siblings in category 1 don't overlap
  const item11 = positioned.find((n) => n.id === 'item-1-1')!.position;
  const item12 = positioned.find((n) => n.id === 'item-1-2')!.position;
  expect(checkOverlap(item11, item12)).toBe(false);
});
