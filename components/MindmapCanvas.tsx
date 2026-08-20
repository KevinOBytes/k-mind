'use client';

/* eslint-disable react-hooks/set-state-in-effect */

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
import dagre from 'dagre';
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
  metadata: Record<string, unknown> | null;
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

export default function MindmapCanvas({
  mapId,
  initialTitle,
  initialNodes,
  initialEdges,
}: MindmapCanvasProps) {
  // Convert DB coordinates to React Flow node format
  const formatInitialNodes = useCallback(() => {
    return initialNodes.map((n) => ({
      id: n.id,
      type: 'skill',
      position: { x: n.xPos, y: n.yPos },
      data: {
        label: n.label,
        description: n.description || '',
        color: n.color || '#2563eb',
        status: (n.metadata?.status as 'planned' | 'in_progress' | 'completed') || 'planned',
      },
    }));
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

  // Load selected node fields into form
  useEffect(() => {
    if (selectedNode) {
      setNodeLabel(selectedNode.data.label as string || '');
      setNodeDesc(selectedNode.data.description as string || '');
      setNodeColor(selectedNode.data.color as string || '#2563eb');
      setNodeStatus((selectedNode.data.status as 'planned' | 'in_progress' | 'completed') || 'planned');
    } else {
      setNodeLabel('');
      setNodeDesc('');
      setNodeColor('#2563eb');
      setNodeStatus('planned');
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
        status: 'planned',
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

  // Auto layout using Dagre
  const applyDagreLayout = (direction: 'TB' | 'LR') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 240, height: 80 });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    setNodes((nds) =>
      nds.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - 120, // Offset half width
            y: nodeWithPosition.y - 40,  // Offset half height
          },
        };
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
        const importedNodes = result.nodes.map((n) => ({
          id: n.id,
          type: 'skill',
          position: { x: n.xPos, y: n.yPos },
          data: {
            label: n.label,
            description: n.description || '',
            color: n.color || '#2563eb',
            status: (n.metadata?.status as 'planned' | 'in_progress' | 'completed') || 'planned',
          },
        }));

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
              onClick={() => applyDagreLayout('TB')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-3 py-1.5 rounded-lg transition"
              title="Arrange nodes from Top to Bottom"
            >
              ⬇️ Vertical Layout
            </button>
            <button 
              onClick={() => applyDagreLayout('LR')}
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
        <div className="w-80 border-l border-slate-200 bg-white h-full flex flex-col p-6 shadow-xl z-20">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <h3 className="font-bold text-slate-900 text-lg">Edit Node</h3>
            <button 
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-slate-600 text-sm font-medium"
            >
              ✕ Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4">
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
                rows={4}
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
          </div>

          <div className="border-t border-slate-100 pt-4 mt-6 flex flex-col gap-2">
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
      )}
    </div>
  );
}
