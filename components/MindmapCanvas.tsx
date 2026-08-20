'use client';

/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/purity */

import React, { useState, useCallback, useEffect, useTransition } from 'react';
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Panel,
  BackgroundVariant,
  OnConnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { SkillNode } from './SkillNode';
import { SkillEdge } from './SkillEdge';
import { saveMapData } from '@/app/actions/nodes-edges';
import { renameMindmap } from '@/app/actions/mindmaps';
import { exportJson, ReactFlowNode, ReactFlowEdge } from '@/lib/adapters/json';
import { generateOpml, parseOpml } from '@/lib/adapters/opml';
import { generateFreeMind, parseFreeMind } from '@/lib/adapters/freemind';
import * as d3 from 'd3-hierarchy';
import { v4 as uuidv4 } from 'uuid';

const nodeTypes = {
  skill: SkillNode,
};

const edgeTypes = {
  skill: SkillEdge,
};

export interface CanvasNodeInput {
  id: string;
  label: string;
  description: string | null;
  xPos: number;
  yPos: number;
  color: string | null;
  metadata: unknown;
}

export interface CanvasEdgeInput {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
}

interface MindmapCanvasProps {
  mapId: string;
  initialTitle: string;
  initialNodes: CanvasNodeInput[];
  initialEdges: CanvasEdgeInput[];
}

interface AISuggestion {
  label: string;
  description: string;
}

export default function MindmapCanvas({
  mapId,
  initialTitle,
  initialNodes,
  initialEdges,
}: MindmapCanvasProps) {
  // Convert DB coordinates to React Flow node format
  const formatInitialNodes = useCallback(() => {
    return initialNodes.map((n) => {
      const meta = n.metadata as Record<string, unknown> | null;
      return {
        id: n.id,
        type: 'skill',
        position: { x: n.xPos, y: n.yPos },
        data: {
          label: n.label,
          description: n.description || '',
          color: n.color || '#2563eb',
          status: (meta?.status as 'planned' | 'in_progress' | 'completed') || 'planned',
        },
      };
    });
  }, [initialNodes]);

  const formatInitialEdges = useCallback(() => {
    return initialEdges.map((e) => ({
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      type: 'skill',
    }));
  }, [initialEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(formatInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(formatInitialEdges());
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [, startTransition] = useTransition();

  // Selected Node fields for sidebar form
  const [nodeLabel, setNodeLabel] = useState('');
  const [nodeDesc, setNodeDesc] = useState('');
  const [nodeColor, setNodeColor] = useState('#2563eb');
  const [nodeStatus, setNodeStatus] = useState<'planned' | 'in_progress' | 'completed'>('planned');

  // AI Copilot States
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiType, setAiType] = useState<'child' | 'parent' | 'sibling'>('child');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Load selected node fields into form
  useEffect(() => {
    if (selectedNode) {
      setNodeLabel(selectedNode.data.label as string || '');
      setNodeDesc(selectedNode.data.description as string || '');
      setNodeColor(selectedNode.data.color as string || '#2563eb');
      setNodeStatus((selectedNode.data.status as 'planned' | 'in_progress' | 'completed') || 'planned');
      setAiSuggestions([]);
      setAiError(null);
    } else {
      setNodeLabel('');
      setNodeDesc('');
      setNodeColor('#2563eb');
      setNodeStatus('planned');
      setAiSuggestions([]);
      setAiError(null);
    }
  }, [selectedNode]);

  // Node selection handler
  const onNodeClick = useCallback((_: React.MouseEvent | TouchEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Connect handler
  const onConnect: OnConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        id: `e-${uuidv4()}`,
        type: 'skill',
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Auto-save logic triggers when nodes or edges change
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (nodes.length === 0) return;
      setSaveStatus('saving');
      
      const nodesData = nodes.map((n) => ({
        id: n.id,
        label: n.data.label as string,
        description: n.data.description as string,
        xPos: n.position.x,
        yPos: n.position.y,
        color: n.data.color as string,
        metadata: { status: n.data.status },
      }));

      const edgesData = edges.map((e) => ({
        id: e.id,
        sourceNodeId: e.source,
        targetNodeId: e.target,
      }));

      startTransition(async () => {
        try {
          await saveMapData(mapId, nodesData, edgesData);
          setSaveStatus('saved');
        } catch {
          setSaveStatus('error');
        }
      });
    }, 1500); // 1.5s debounce

    return () => clearTimeout(delayDebounce);
  }, [nodes, edges, mapId]);

  // Rename Map
  const handleRename = () => {
    if (!title.trim()) return;
    setIsEditingTitle(false);
    startTransition(async () => {
      await renameMindmap(mapId, title.trim());
    });
  };

  // Add new Node
  const handleAddNode = () => {
    const id = `n-${uuidv4()}`;
    const newNode = {
      id,
      type: 'skill',
      position: {
        x: 250 + (Math.random() - 0.5) * 100,
        y: 200 + (Math.random() - 0.5) * 100,
      },
      data: {
        label: 'New Concept',
        description: 'Double click to edit details in sidebar.',
        color: '#2563eb',
        status: 'planned' as const,
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNode(newNode as unknown as Node);
  };

  // Update selected Node detail
  const handleUpdateNode = () => {
    if (!selectedNode) return;
    
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              label: nodeLabel,
              description: nodeDesc,
              color: nodeColor,
              status: nodeStatus,
            },
          };
        }
        return node;
      })
    );

    // Sync selected node layout variables so panel details mirror save values
    setSelectedNode((prev) => prev ? {
      ...prev,
      data: {
        ...prev.data,
        label: nodeLabel,
        description: nodeDesc,
        color: nodeColor,
        status: nodeStatus,
      }
    } : null);
  };

  // Delete selected Node
  const handleDeleteNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  // Auto layout using D3 Hierarchy
  const applyD3Layout = (direction: 'TB' | 'LR') => {
    if (nodes.length === 0) return;

    // 1. Identify all parents and build relationship map
    // Keep track of visited parents per node to only assign the first/primary parent (strict tree rule)
    const nodeIds = new Set(nodes.map((n) => n.id));
    const targetToPrimaryParent = new Map<string, string>();
    const parentToChildren = new Map<string, string[]>();

    edges.forEach((edge) => {
      const source = edge.source;
      const target = edge.target;
      // Ensure nodes exist and we haven't assigned a primary parent for this target node yet
      if (nodeIds.has(source) && nodeIds.has(target) && !targetToPrimaryParent.has(target)) {
        targetToPrimaryParent.set(target, source);
        const children = parentToChildren.get(source) || [];
        children.push(target);
        parentToChildren.set(source, children);
      }
    });

    // 2. Identify root nodes (nodes with no primary parent)
    const roots = nodes.filter((n) => !targetToPrimaryParent.has(n.id));
    if (roots.length === 0) return; // cyclic graph safety

    // 3. Build recursive hierarchy structure
    interface LayoutNode {
      id: string;
      children?: LayoutNode[];
    }

    const buildHierarchyNode = (nodeId: string, visited: Set<string>): LayoutNode => {
      visited.add(nodeId);
      const childIds = parentToChildren.get(nodeId) || [];
      const childrenNodes: LayoutNode[] = [];

      childIds.forEach((cid) => {
        if (!visited.has(cid)) {
          childrenNodes.push(buildHierarchyNode(cid, visited));
        }
      });

      return childrenNodes.length > 0 ? { id: nodeId, children: childrenNodes } : { id: nodeId };
    };

    const globalVisited = new Set<string>();
    let rootHierarchyData: LayoutNode;

    if (roots.length === 1) {
      rootHierarchyData = buildHierarchyNode(roots[0].id, globalVisited);
    } else {
      // Wrap multiple roots under a single virtual root
      rootHierarchyData = {
        id: 'virtual-root',
        children: roots.map((r) => buildHierarchyNode(r.id, globalVisited)),
      };
    }

    // 4. Run D3 tree layout
    const siblingSpacing = 300;
    const levelSpacing = 200;

    const d3Root = d3.hierarchy<LayoutNode>(rootHierarchyData);
    const treeLayout = d3.tree<LayoutNode>().nodeSize([siblingSpacing, levelSpacing]);
    treeLayout(d3Root);

    // 5. Build coordinates map
    const coordsMap = new Map<string, { x: number; y: number }>();
    d3Root.descendants().forEach((d) => {
      if (d.data.id !== 'virtual-root') {
        if (direction === 'TB') {
          // Vertical Layout
          coordsMap.set(d.data.id, { x: d.x ?? 0, y: d.y ?? 0 });
        } else {
          // Horizontal Layout
          coordsMap.set(d.data.id, { x: d.y ?? 0, y: d.x ?? 0 });
        }
      }
    });

    // 6. Map coordinates back to React Flow nodes state
    setNodes((nds) =>
      nds.map((node) => {
        const coords = coordsMap.get(node.id);
        if (coords) {
          return {
            ...node,
            position: {
              x: coords.x,
              y: coords.y,
            },
          };
        }
        return node;
      })
    );
  };

  // File Download Helpers
  const handleExportJson = () => {
    const jsonText = exportJson(nodes as ReactFlowNode[], edges as ReactFlowEdge[]);
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportOpml = () => {
    const opmlText = generateOpml(nodes as ReactFlowNode[], edges as ReactFlowEdge[]);
    const blob = new Blob([opmlText], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.opml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportFreeMind = () => {
    const mmText = generateFreeMind(nodes as ReactFlowNode[], edges as ReactFlowEdge[]);
    const blob = new Blob([mmText], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.mm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Local Import Handlers
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'opml' | 'freemind') => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = fileType === 'opml' ? parseOpml(text) : parseFreeMind(text);
        
        // Map back to React Flow format
        const importedNodes = result.nodes.map((n) => {
          const meta = n.metadata as Record<string, unknown> | null;
          return {
            id: n.id,
            type: 'skill',
            position: { x: n.xPos, y: n.yPos },
            data: {
              label: n.label,
              description: n.description || '',
              color: n.color || '#2563eb',
              status: (meta?.status as 'planned' | 'in_progress' | 'completed') || 'planned',
            },
          };
        });

        const importedEdges = result.edges.map((e) => ({
          id: e.id,
          source: e.sourceNodeId,
          target: e.targetNodeId,
          type: 'skill',
        }));

        setNodes(importedNodes);
        setEdges(importedEdges);
      } catch {
        alert('Failed to parse file. Make sure it is a valid format.');
      }
    };
    reader.readAsText(file);
  };

  // AI Suggestion Handler
  const handleGetAISuggestions = async () => {
    if (!selectedNode) return;
    setAiLoading(true);
    setAiError(null);
    setAiSuggestions([]);

    try {
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: selectedNode.data.label,
          type: aiType,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch suggestions');
      }
      setAiSuggestions(data.suggestions || []);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred fetching recommendations.';
      setAiError(errMsg);
    } finally {
      setAiLoading(false);
    }
  };

  // Promote suggestion to node
  const handlePromoteSuggestion = (sug: AISuggestion) => {
    if (!selectedNode) return;

    let offset = { x: 0, y: 0 };
    if (aiType === 'child') {
      offset = { x: 260, y: (Math.random() - 0.5) * 150 };
    } else if (aiType === 'parent') {
      offset = { x: -260, y: (Math.random() - 0.5) * 150 };
    } else {
      offset = { x: (Math.random() - 0.5) * 150, y: 160 };
    }

    const newId = `n-ai-${uuidv4()}`;
    const newNode = {
      id: newId,
      type: 'skill',
      position: {
        x: selectedNode.position.x + offset.x,
        y: selectedNode.position.y + offset.y,
      },
      data: {
        label: sug.label,
        description: sug.description,
        color: '#7c3aed', // Purple color representing AI generated node
        status: 'planned' as const,
      },
    };

    const newEdge = {
      id: `e-${uuidv4()}`,
      source: aiType === 'parent' ? newId : selectedNode.id,
      target: aiType === 'parent' ? selectedNode.id : newId,
      type: 'skill',
    };

    setNodes((nds) => nds.concat(newNode));
    setEdges((eds) => eds.concat(newEdge));

    // Remove from suggestions array
    setAiSuggestions((prev) => prev.filter((s) => s.label !== sug.label));
  };

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Workspace Panel */}
      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          
          {/* Header Panel */}
          <Panel position="top-left" className="bg-white p-3 rounded-xl shadow-md border border-slate-200 flex items-center gap-3">
            {isEditingTitle ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                className="text-base font-bold text-slate-800 border border-slate-300 rounded px-2 py-0.5 focus:outline-none"
                autoFocus
              />
            ) : (
              <h2 
                className="text-base font-bold text-slate-800 cursor-pointer hover:text-blue-600 flex items-center gap-1"
                onClick={() => setIsEditingTitle(true)}
              >
                🧠 {title} <span className="text-xs font-normal text-slate-400">✏️</span>
              </h2>
            )}

            <div className="h-4 w-px bg-slate-200"></div>

            <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 flex items-center gap-1">
              {saveStatus === 'saved' && <span className="text-emerald-500">● Saved</span>}
              {saveStatus === 'saving' && <span className="text-amber-500 animate-pulse">● Saving...</span>}
              {saveStatus === 'error' && <span className="text-red-500">● Sync Error</span>}
            </span>
          </Panel>

          {/* Action Toolbar */}
          <Panel position="top-right" className="bg-white p-3 rounded-xl shadow-md border border-slate-200 flex flex-wrap gap-2 max-w-lg">
            <button 
              onClick={handleAddNode}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-3 py-1.5 rounded-lg transition"
            >
              + Add Node
            </button>
            <button 
              onClick={() => applyD3Layout('TB')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-3 py-1.5 rounded-lg transition"
              title="Arrange nodes from Top to Bottom"
            >
              ⬇️ Vertical Layout
            </button>
            <button 
              onClick={() => applyD3Layout('LR')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-3 py-1.5 rounded-lg transition"
              title="Arrange nodes from Left to Right"
            >
              ➡️ Horizontal Layout
            </button>

            <div className="w-px h-6 bg-slate-200 mx-1"></div>

            {/* Export Actions */}
            <div className="flex gap-1">
              <button 
                onClick={handleExportJson}
                className="bg-slate-800 hover:bg-slate-950 text-white text-xs px-2 py-1.5 rounded-lg transition"
                title="Export JSON file"
              >
                JSON
              </button>
              <button 
                onClick={handleExportOpml}
                className="bg-slate-800 hover:bg-slate-950 text-white text-xs px-2 py-1.5 rounded-lg transition"
                title="Export OPML file"
              >
                OPML
              </button>
              <button 
                onClick={handleExportFreeMind}
                className="bg-slate-800 hover:bg-slate-950 text-white text-xs px-2 py-1.5 rounded-lg transition"
                title="Export FreeMind (.mm) file"
              >
                FreeMind
              </button>
            </div>

            {/* Import Actions */}
            <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2 py-1.5 rounded-lg cursor-pointer transition">
              Import OPML
              <input 
                type="file" 
                accept=".opml,.xml"
                onChange={(e) => handleImportFile(e, 'opml')} 
                className="hidden" 
              />
            </label>
            <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2 py-1.5 rounded-lg cursor-pointer transition">
              Import FreeMind
              <input 
                type="file" 
                accept=".mm,.xml"
                onChange={(e) => handleImportFile(e, 'freemind')} 
                className="hidden" 
              />
            </label>
          </Panel>
        </ReactFlow>
      </div>

      {/* Selected Node Sidebar Form */}
      {selectedNode && (
        <div className="w-80 border-l border-slate-200 bg-white h-full flex flex-col p-6 shadow-xl z-20 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <h3 className="font-bold text-slate-900 text-lg">Edit Node</h3>
            <button 
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-slate-600 text-sm font-medium"
            >
              ✕ Close
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Node Label
              </label>
              <input
                type="text"
                value={nodeLabel}
                onChange={(e) => setNodeLabel(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Description / Notes
              </label>
              <textarea
                value={nodeDesc}
                onChange={(e) => setNodeDesc(e.target.value)}
                rows={3}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Node Color
              </label>
              <div className="grid grid-cols-5 gap-2 mt-1">
                {['#2563eb', '#16a34a', '#ca8a04', '#7c3aed', '#dc2626'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNodeColor(c)}
                    className={`h-8 rounded-lg border-2 transition ${
                      nodeColor === c ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Progress Status
              </label>
              <select
                value={nodeStatus}
                onChange={(e) => setNodeStatus(e.target.value as 'planned' | 'in_progress' | 'completed')}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="planned">Planned (⏳)</option>
                <option value="in_progress">In Progress (🚀)</option>
                <option value="completed">Completed (✅)</option>
              </select>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleUpdateNode}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 rounded-lg transition"
              >
                Apply Changes
              </button>
              <button
                onClick={handleDeleteNode}
                className="w-full border border-red-200 text-red-600 hover:bg-red-50 font-medium text-sm py-2 rounded-lg transition"
              >
                Delete Node
              </button>
            </div>
          </div>

          {/* AI SUGGESTIONS SECTION */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <h4 className="font-bold text-slate-900 text-sm mb-3">🔮 AI Skill Copilot</h4>
            
            <div className="flex gap-1 mb-3">
              {(['child', 'sibling', 'parent'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setAiType(t)}
                  className={`flex-1 text-center py-1 text-xs font-semibold rounded-md border transition capitalize ${
                    aiType === t
                      ? 'bg-purple-100 text-purple-700 border-purple-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t === 'child' ? 'Sub-skills' : t === 'sibling' ? 'Siblings' : 'Prereqs'}
                </button>
              ))}
            </div>

            <button
              onClick={handleGetAISuggestions}
              disabled={aiLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium text-sm py-2 rounded-lg transition shadow-sm hover:shadow"
            >
              {aiLoading ? 'Thinking...' : 'Get AI Suggestions'}
            </button>

            {aiError && (
              <p className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                {aiError}
              </p>
            )}

            {aiSuggestions.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Suggestions (click + to add to map)
                </p>
                {aiSuggestions.map((sug) => (
                  <div 
                    key={sug.label} 
                    className="p-3 border border-purple-100 rounded-xl bg-purple-50/50 hover:bg-purple-50 transition flex items-start justify-between gap-2 group"
                  >
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-900">{sug.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {sug.description}
                      </p>
                    </div>
                    <button
                      onClick={() => handlePromoteSuggestion(sug)}
                      className="bg-purple-600 hover:bg-purple-700 text-white rounded-md w-6 h-6 flex items-center justify-center font-bold text-sm shadow transition flex-shrink-0"
                      title="Add to Canvas"
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
