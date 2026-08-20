'use server';

import { db, mindmaps, nodes, edges } from '@/db';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export async function getSessionUserOrRedirect() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }
  return session.user;
}

export async function getMindmaps() {
  const user = await getSessionUserOrRedirect();
  const userId = user.id as string;
  return db
    .select()
    .from(mindmaps)
    .where(eq(mindmaps.userId, userId))
    .orderBy(desc(mindmaps.updatedAt));
}

export async function getMindmap(id: string) {
  const user = await getSessionUserOrRedirect();
  const userId = user.id as string;
  const [map] = await db
    .select()
    .from(mindmaps)
    .where(and(eq(mindmaps.id, id), eq(mindmaps.userId, userId)))
    .limit(1);
  return map || null;
}

export async function createMindmap(title: string, description?: string, templateType?: string) {
  const user = await getSessionUserOrRedirect();
  const userId = user.id as string;
  const mapId = uuidv4();

  await db.insert(mindmaps).values({
    id: mapId,
    userId: userId,
    title,
    description: description || '',
  });

  // Seed nodes and edges if template type is specified
  if (templateType === 'frontend') {
    const defaultNodes = [
      { id: '1', label: 'Frontend Developer', x: 250, y: 150, color: '#2563eb' },
      { id: '2', label: 'HTML & CSS', x: 100, y: 300, color: '#16a34a' },
      { id: '3', label: 'JavaScript', x: 250, y: 300, color: '#16a34a' },
      { id: '4', label: 'React.js', x: 400, y: 300, color: '#16a34a' },
      { id: '5', label: 'Responsive Design', x: 100, y: 450, color: '#ca8a04' },
      { id: '6', label: 'TypeScript', x: 250, y: 450, color: '#ca8a04' },
      { id: '7', label: 'Next.js Router', x: 400, y: 450, color: '#ca8a04' },
    ];

    const defaultEdges = [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e1-3', source: '1', target: '3' },
      { id: 'e1-4', source: '1', target: '4' },
      { id: 'e2-5', source: '2', target: '5' },
      { id: 'e3-6', source: '3', target: '6' },
      { id: 'e4-7', source: '4', target: '7' },
      { id: 'e6-7', source: '6', target: '7' }, // Multi-linked prerequisite!
    ];

    for (const node of defaultNodes) {
      await db.insert(nodes).values({
        id: `${mapId}-${node.id}`,
        mindmapId: mapId,
        label: node.label,
        xPos: node.x,
        yPos: node.y,
        color: node.color,
      });
    }

    for (const edge of defaultEdges) {
      await db.insert(edges).values({
        id: `${mapId}-${edge.id}`,
        mindmapId: mapId,
        sourceNodeId: `${mapId}-${edge.source}`,
        targetNodeId: `${mapId}-${edge.target}`,
      });
    }
  } else {
    // Seed at least one central hub node for empty map
    await db.insert(nodes).values({
      id: `${mapId}-root`,
      mindmapId: mapId,
      label: title,
      xPos: 250,
      yPos: 150,
      color: '#2563eb',
    });
  }

  revalidatePath('/dashboard');
  return mapId;
}

export async function deleteMindmap(id: string) {
  const user = await getSessionUserOrRedirect();
  const userId = user.id as string;
  await db
    .delete(mindmaps)
    .where(and(eq(mindmaps.id, id), eq(mindmaps.userId, userId)));

  revalidatePath('/dashboard');
}

export async function renameMindmap(id: string, title: string) {
  const user = await getSessionUserOrRedirect();
  const userId = user.id as string;
  await db
    .update(mindmaps)
    .set({ title, updatedAt: new Date() })
    .where(and(eq(mindmaps.id, id), eq(mindmaps.userId, userId)));

  revalidatePath('/dashboard');
  revalidatePath(`/map/${id}`);
}
