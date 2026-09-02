import React from 'react';
import Link from 'next/link';
import { getPublicMindmap } from '@/app/actions/mindmaps';
import MindmapCanvas from '@/components/MindmapCanvas';
import { Metadata } from 'next';

interface SharePageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getPublicMindmap(id);

  if (!data) {
    return {
      title: 'Mind Map Not Found | K-Mind',
    };
  }

  return {
    title: `${data.map.title} | K-Mind Public Roadmap`,
    description: data.map.description || `Interactive skill tree and learning roadmap for ${data.map.title}`,
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;
  const data = await getPublicMindmap(id);

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-xl text-center">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            🔒
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Map is Private or Not Found</h1>
          <p className="text-sm text-slate-500 mb-6">
            This mind map either doesn&apos;t exist or the owner has not enabled public sharing.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/login"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition"
            >
              Sign In to K-Mind
            </Link>
            <Link
              href="/"
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-sm transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50">
      {/* Top Banner for Public Viewers */}
      <div className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <Link href="/" className="font-extrabold text-blue-600 tracking-tight text-sm hover:opacity-90">
            🧠 K-Mind
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-semibold text-slate-700 truncate max-w-xs md:max-w-md">
            {data.map.title}
          </span>
          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
            Public View
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/register"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-sm transition"
          >
            Create Your Own Free Map
          </Link>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <MindmapCanvas
          mapId={id}
          initialTitle={data.map.title}
          initialNodes={data.nodes}
          initialEdges={data.edges}
          readOnly={true}
        />
      </div>
    </div>
  );
}
