import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
              <Image 
                src="/logo.jpg" 
                alt="k-mind logo" 
                width={32} 
                height={32} 
                className="rounded-lg object-cover"
              />
              <span>k-mind</span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link href="/" className="hover:text-blue-600 transition">Home</Link>
            <a href="#features" className="hover:text-blue-600 transition">Features</a>
            <a href="#pricing" className="hover:text-blue-600 transition">Pricing</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-sm font-medium text-slate-700 hover:text-blue-600 transition"
            >
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-grow">{children}</main>
      <footer className="border-t border-slate-200 bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Image 
              src="/logo.jpg" 
              alt="k-mind logo" 
              width={24} 
              height={24} 
              className="rounded"
            />
            <span>k-mind</span>
          </div>
          <p className="text-sm">&copy; {new Date().getFullYear()} k-mind. All rights reserved. Open-standards-driven mapping.</p>
        </div>
      </footer>
    </div>
  );
}
