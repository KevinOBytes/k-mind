import React from 'react';
import { notFound } from 'next/navigation';
import { getMindmap } from '@/app/actions/mindmaps';
import { getMapData } from '@/app/actions/nodes-edges';
import MindmapCanvas from '@/components/MindmapCanvas';

interface MapPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MapPage({ params }: MapPageProps) {
  const { id } = await params;
  const map = await getMindmap(id);

  if (!map) {
    notFound();
  }

  const { nodes, edges } = await getMapData(id);

  return (
    <MindmapCanvas
      mapId={id}
      initialTitle={map.title}
      initialIsPublic={map.isPublic}
      initialNodes={nodes}
      initialEdges={edges}
    />
  );
}
