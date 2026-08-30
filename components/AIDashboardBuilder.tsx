'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { computeD3Layout } from '@/lib/layout';
import { createMindmapFromGraph } from '@/app/actions/mindmaps';

export default function AIDashboardBuilder() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch('/api/ai/generate-map', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to generate map from AI service');
        }

        // Apply D3 layout to calculate initial coordinates
        const positionedNodes = computeD3Layout(data.nodes, data.edges, 'TB');

        // Create the map in the database
        const mapId = await createMindmapFromGraph(
          data.title || 'AI Generated Map',
          `AI derived concept mapping based on input list: "${text.substring(0, 60)}..."`,
          positionedNodes,
          data.edges
        );

        router.push(`/map/${mapId}`);
        router.refresh();
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        setError(errMsg || 'An error occurred during AI generation.');
      }
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-full">
      <div>
        <span className="text-2xl mb-3 block">✨</span>
        <h3 className="text-lg font-bold text-slate-900">AI List-to-Map Builder</h3>
        <p className="text-sm text-slate-500 mt-1">
          Paste a list of skills (comma/newline separated) and let AI derive all prerequisites and visual layout.
        </p>
      </div>

      <form onSubmit={handleAiGenerate} className="mt-6 space-y-3">
        {error && (
          <div className="bg-red-50 text-red-600 text-xs p-2.5 rounded-lg border border-red-100">
            ⚠️ {error}
          </div>
        )}
        
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="E.g., HTML, CSS, JavaScript, React, Redux, Next.js, TypeScript"
          rows={3}
          required
          disabled={isPending}
          className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
        />

        <button 
          type="submit" 
          disabled={isPending || !text.trim()}
          className="w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-2 px-4 rounded-xl transition disabled:bg-indigo-300"
        >
          {isPending ? 'AI is mapping connections...' : 'Generate AI Map'}
        </button>
      </form>
    </div>
  );
}
