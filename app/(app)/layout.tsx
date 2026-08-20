import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';
import { getMindmaps } from '../actions/mindmaps';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const userMaps = await getMindmaps().catch(() => []);

  const handleLogout = async () => {
    'use server';
    await signOut({ redirectTo: '/login' });
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-2">
          <Image 
            src="/logo.jpg" 
            alt="k-mind logo" 
            width={28} 
            height={28} 
            className="rounded"
          />
          <Link href="/dashboard" className="font-bold text-lg text-white hover:text-blue-400 transition">
            k-mind Workspace
          </Link>
        </div>

        {/* Sidebar Nav */}
        <div className="flex-grow overflow-y-auto px-4 py-6 space-y-8">
          <div>
            <h3 className="px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Navigation
            </h3>
            <div className="mt-2 space-y-1">
              <Link 
                href="/dashboard" 
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition"
              >
                📊 Dashboard
              </Link>
            </div>
          </div>

          <div>
            <h3 className="px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Recent Mind Maps
            </h3>
            <div className="mt-2 space-y-1">
              {userMaps.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-500 italic">No saved maps yet</p>
              ) : (
                userMaps.slice(0, 8).map((map) => (
                  <Link
                    key={map.id}
                    href={`/map/${map.id}`}
                    className="block px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg truncate transition"
                  >
                    🧠 {map.title}
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar User Footer */}
        <div className="p-4 border-t border-slate-800 flex flex-col gap-2 bg-slate-950">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm text-white">
              {session.user.name ? session.user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">{session.user.name || 'User'}</p>
              <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
            </div>
          </div>
          <form action={handleLogout}>
            <button 
              type="submit" 
              className="mt-2 w-full text-center bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-300 text-xs font-medium py-2 rounded-lg transition"
            >
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
