import React from 'react';
import Link from 'next/link';
import { getMindmaps, createMindmap } from '@/app/actions/mindmaps';
import { redirect } from 'next/navigation';
import AIDashboardBuilder from '@/components/AIDashboardBuilder';
import DeleteMapButton from '@/components/DeleteMapButton';

export default async function DashboardPage() {
  const maps = await getMindmaps().catch(() => []);

  // Server Action to create map
  const handleCreateMap = async (formData: FormData) => {
    'use server';
    const title = formData.get('title') as string || 'Untitled Map';
    const template = formData.get('template') as string || 'blank';
    const id = await createMindmap(title, `Created using template: ${template}`, template);
    redirect(`/map/${id}`);
  };



  return (
    <div className="flex-1 overflow-y-auto px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Mind Maps</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and design your skill networks and concepts</p>
        </div>
      </div>

      {/* Creation and Templates Section */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Start with a Template</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Blank Map Template */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div>
              <span className="text-2xl mb-3 block">📄</span>
              <h3 className="text-lg font-bold text-slate-900">Blank Map</h3>
              <p className="text-sm text-slate-500 mt-1">Start fresh with a single central concept on the canvas.</p>
            </div>
            <form action={handleCreateMap} className="mt-6">
              <input type="hidden" name="template" value="blank" />
              <input type="hidden" name="title" value="New Mind Map" />
              <button 
                type="submit" 
                className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 px-4 rounded-xl transition"
              >
                Create Blank Map
              </button>
            </form>
          </div>

          {/* Frontend Roadmap Template */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div>
              <span className="text-2xl mb-3 block">⚛️</span>
              <h3 className="text-lg font-bold text-slate-900">Frontend Developer Roadmap</h3>
              <p className="text-sm text-slate-500 mt-1">Pre-seeded with nodes for HTML/CSS, JS, React, TS, and Next.js demonstrating multi-linking.</p>
            </div>
            <form action={handleCreateMap} className="mt-6">
              <input type="hidden" name="template" value="frontend" />
              <input type="hidden" name="title" value="Frontend Developer Roadmap" />
              <button 
                type="submit" 
                className="w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm py-2 px-4 rounded-xl transition"
              >
                Launch Template
              </button>
            </form>
          </div>

          {/* Quick Custom Creation */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-2xl mb-3 block">✏️</span>
              <h3 className="text-lg font-bold text-slate-900">Custom Map</h3>
              <p className="text-sm text-slate-500 mt-1">Provide a specific title and get started immediately.</p>
            </div>
            <form action={handleCreateMap} className="mt-6 space-y-3">
              <input type="hidden" name="template" value="blank" />
              <input 
                type="text" 
                name="title" 
                placeholder="E.g., AI Research Map" 
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
              <button 
                type="submit" 
                className="w-full text-center bg-slate-800 hover:bg-slate-950 text-white font-medium text-sm py-2 px-4 rounded-xl transition"
              >
                Create Custom Map
              </button>
            </form>
          </div>

          {/* AI Skill List Importer */}
          <AIDashboardBuilder />
        </div>
      </div>

      {/* Mindmap Listing */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Saved Projects</h2>
        {maps.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 border-dashed rounded-2xl">
            <span className="text-4xl mb-2 block">🧠</span>
            <p className="text-slate-500 font-medium">No mind maps yet</p>
            <p className="text-xs text-slate-400 mt-1">Select a template above to kickstart your project.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {maps.map((map) => (
              <div 
                key={map.id} 
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between relative"
              >
                <div>
                  <h3 className="text-base font-bold text-slate-900 truncate">🧠 {map.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Updated: {new Date(map.updatedAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-3 line-clamp-2 italic">
                    {map.description || 'No description provided.'}
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between gap-2">
                  <Link 
                    href={`/map/${map.id}`} 
                    className="flex-1 text-center bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-xs py-2 px-3 rounded-lg transition"
                  >
                    Open Workspace
                  </Link>
                  <DeleteMapButton id={map.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
