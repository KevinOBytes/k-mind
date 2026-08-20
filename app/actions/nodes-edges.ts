'use server';

import { db, nodes, edges, mindmaps } from '@/db';
import { eq, and } from 'drizzle-orm';
import { getSessionUserOrRedirect } from './mindmaps';

export interface NodeDataInput {
  id: string;
  label: string;
  description?: string;
  xPos: number;
  yPos: number;
  color?: string;
  metadata?: Record<string, unknown> | null;
}

export interface EdgeDataInput {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
  edgeType?: string;
}

export async function getMapData(mapId: string) {
  const user = await getSessionUserOrRedirect();
  
  // Verify map belongs to user
  const [map] = await db
    .select()
    .from(mindmaps)
    .where(and(eq(mindmaps.id, mapId), eq(mindmaps.userId, user.id as string)))
    .limit(1);

  if (!map) {
    throw new Error('Unauthorized or map not found');
  }

  const mapNodes = await db.select().from(nodes).where(eq(nodes.mindmapId, mapId));
  const mapEdges = await db.select().from(edges).where(eq(edges.mindmapId, mapId));

  return {
    nodes: mapNodes,
    edges: mapEdges,
  };
}

export async function saveMapData(
  mapId: string,
  nodesData: NodeDataInput[],
  edgesData: EdgeDataInput[]
) {
  const user = await getSessionUserOrRedirect();

  // Verify map belongs to user
  const [map] = await db
    .select()
    .from(mindmaps)
    .where(and(eq(mindmaps.id, mapId), eq(mindmaps.userId, user.id as string)))
    .limit(1);

  if (!map) {
    throw new Error('Unauthorized or map not found');
  }

  // Atomic transaction to clear and reload nodes and edges
  await db.transaction(async (tx) => {
    // Delete existing edges and nodes
    await tx.delete(edges).where(eq(edges.mindmapId, mapId));
    await tx.delete(nodes).where(eq(nodes.mindmapId, mapId));

    // Insert new nodes
    if (nodesData.length > 0) {
      await tx.insert(nodes).values(
        nodesData.map((n) => ({
          id: n.id,
          mindmapId: mapId,
          label: n.label,
          description: n.description || '',
          xPos: n.xPos,
          yPos: n.yPos,
          color: n.color || '#2563eb',
          metadata: n.metadata || {},
        }))
      );
    }

    // Insert new edges
    if (edgesData.length > 0) {
      await tx.insert(edges).values(
        edgesData.map((e) => ({
          id: e.id,
          mindmapId: mapId,
          sourceNodeId: e.sourceNodeId,
          targetNodeId: e.targetNodeId,
          label: e.label || '',
          edgeType: e.edgeType || 'smoothstep',
        }))
      );
    }

    // Update map updatedAt timestamp
    await tx
      .update(mindmaps)
      .set({ updatedAt: new Date() })
      .where(eq(mindmaps.id, mapId));
  });

  return { success: true };
}
