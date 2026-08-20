import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function MarketingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight">
            Map your mind, powered by <span className="text-blue-600">AI-driven connections</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
            The next generation mindmap builder utilizing directed acyclic graphs to represent multi-linked concepts, prerequisites, and skills with lossless export.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link 
              href="/register" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition text-base"
            >
              Build Your First Map
            </Link>
            <a 
              href="#features" 
              className="border border-slate-300 hover:bg-white text-slate-700 font-medium px-6 py-3 rounded-lg transition text-base"
            >
              Learn More
            </a>
          </div>

          <div className="mt-16 border border-slate-200 rounded-2xl overflow-hidden shadow-2xl bg-white max-w-5xl mx-auto">
            <Image 
              src="/hero.jpg" 
              alt="k-mind Workspace Mockup" 
              width={1024} 
              height={576} 
              className="w-full object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Innovative mind mapping standards
            </h2>
            <p className="mt-4 text-slate-600">
              Traditional tools lock you into single-parent trees. k-mind lets you build interconnected graphs reflecting how skills actually relate.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 border border-slate-100 rounded-2xl bg-slate-50">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg mb-6">
                🔗
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Multi-Linked Graphs</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Connect topics to multiple parents or prerequisites. Represent complicated skill nodes, learning paths, or dynamic architectures.
              </p>
            </div>

            <div className="p-8 border border-slate-100 rounded-2xl bg-slate-50">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg mb-6">
                🧠
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">AI Skill Copilot</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Get autocomplete node suggestions. Find sibling, child, or parent skills in seconds powered by Google Gemini and OpenAI integrations.
              </p>
            </div>

            <div className="p-8 border border-slate-100 rounded-2xl bg-slate-50">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg mb-6">
                💾
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Open Standards Import/Export</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Lossless portability. Export to native graph-style JSON, hierarchical OPML outline trees, or XML-based FreeMind (.mm) formats.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Pricing plans for everyone
            </h2>
            <p className="mt-4 text-slate-600">
              Start mapping for free, upgrade as your repositories and mindmaps grow.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Basic Plan</h3>
                <p className="mt-4 text-4xl font-extrabold text-slate-900">$0</p>
                <p className="mt-1 text-slate-500 text-sm">Free forever</p>
                <ul className="mt-6 space-y-4 text-slate-600 text-sm">
                  <li className="flex items-center gap-2">✓ Up to 3 active mindmaps</li>
                  <li className="flex items-center gap-2">✓ Basic React Flow canvas</li>
                  <li className="flex items-center gap-2">✓ OPML and FreeMind exports</li>
                  <li className="flex items-center gap-2 text-slate-400">✗ AI Copilot node suggestions</li>
                </ul>
              </div>
              <Link 
                href="/register" 
                className="mt-8 block w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-4 py-3 rounded-xl transition"
              >
                Sign Up for Free
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="p-8 bg-white border-2 border-blue-600 rounded-2xl shadow-md flex flex-col justify-between relative">
              <span className="absolute top-0 right-8 -translate-y-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                Popular
              </span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Pro Plan</h3>
                <p className="mt-4 text-4xl font-extrabold text-slate-900">$9</p>
                <p className="mt-1 text-slate-500 text-sm">per user / month</p>
                <ul className="mt-6 space-y-4 text-slate-600 text-sm">
                  <li className="flex items-center gap-2">✓ Unlimited mindmaps</li>
                  <li className="flex items-center gap-2">✓ Interactive DAG multi-linking</li>
                  <li className="flex items-center gap-2">✓ Full OPML/FreeMind/JSON adapters</li>
                  <li className="flex items-center gap-2">✓ AI suggestions powered by Gemini</li>
                  <li className="flex items-center gap-2">✓ Redis-cached response streaming</li>
                </ul>
              </div>
              <Link 
                href="/register" 
                className="mt-8 block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-xl transition shadow-lg hover:shadow-xl"
              >
                Get Started with Pro
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
