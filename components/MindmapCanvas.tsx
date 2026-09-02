'use client';

/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/purity */

import React, { useState, useCallback, useEffect, useTransition, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Panel,
  BackgroundVariant,
  OnConnect,
  Controls,
  MiniMap,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng } from 'html-to-image';
import { SkillNode } from './SkillNode';
import { SkillEdge } from './SkillEdge';
import { saveMapData } from '@/app/actions/nodes-edges';
import { renameMindmap, toggleMindmapPublic } from '@/app/actions/mindmaps';
import { computeD3Layout, LayoutDirection } from '@/lib/layout';
import { exportJson, ReactFlowNode, ReactFlowEdge } from '@/lib/adapters/json';
import { generateOpml, parseOpml } from '@/lib/adapters/opml';
import { generateFreeMind, parseFreeMind } from '@/lib/adapters/freemind';
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
  initialIsPublic?: boolean;
  initialNodes: CanvasNodeInput[];
  initialEdges: CanvasEdgeInput[];
  readOnly?: boolean;
}

interface AISuggestion {
  label: string;
  description: string;
}

export default function MindmapCanvas({
  mapId,
  initialTitle,
  initialIsPublic = false,
  initialNodes,
  initialEdges,
  readOnly = false,
}: MindmapCanvasProps) {
  // Convert DB coordinates to React Flow node format
  const formatInitialNodes = useCallback((): Node[] => {
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

  const formatInitialEdges = useCallback((): Edge[] => {
    return initialEdges.map((e) => ({
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      type: 'skill',
    }));
  }, [initialEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(formatInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(formatInitialEdges());
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [, startTransition] = useTransition();

  // Canvas Viewport & Minimap
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [showMiniMap, setShowMiniMap] = useState(false);

  // Undo / Redo Stack
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [future, setFuture] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const isHistoryAction = useRef(false);

  // Public Sharing States
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isShareLoading, setIsShareLoading] = useState(false);

  // Selected Node fields for sidebar form
  const [nodeLabel, setNodeLabel] = useState('');
  const [nodeDesc, setNodeDesc] = useState('');
  const [nodeColor, setNodeColor] = useState('#2563eb');
  const [nodeStatus, setNodeStatus] = useState<'planned' | 'in_progress' | 'completed'>('planned');

  // AI Copilot States
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiType, setAiType] = useState<'child' | 'parent' | 'sibling'>('child');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAutoExpanding, setAiAutoExpanding] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // AI List Importer States
  const [isAiImportOpen, setIsAiImportOpen] = useState(false);
  const [aiImportText, setAiImportText] = useState('');
  const [aiImportMode, setAiImportMode] = useState<'merge' | 'replace'>('merge');
  const [aiImportPending, setAiImportPending] = useState(false);
  const [aiImportError, setAiImportError] = useState<string | null>(null);

  // Record History State Helper
  const recordHistory = useCallback(() => {
    if (isHistoryAction.current || readOnly) return;
    setHistory((prev) => [...prev.slice(-30), { nodes, edges }]);
    setFuture([]);
  }, [nodes, edges, readOnly]);

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (history.length === 0 || readOnly) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [{ nodes, edges }, ...prev]);
    isHistoryAction.current = true;
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setTimeout(() => {
      isHistoryAction.current = false;
    }, 50);
  }, [history, nodes, edges, setNodes, setEdges, readOnly]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (future.length === 0 || readOnly) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, { nodes, edges }]);
    isHistoryAction.current = true;
    setNodes(next.nodes);
    setEdges(next.edges);
    setTimeout(() => {
      isHistoryAction.current = false;
    }, 50);
  }, [future, nodes, edges, setNodes, setEdges, readOnly]);

  // Progress Stats Summary
  const stats = useMemo(() => {
    const total = nodes.length;
    const completed = nodes.filter((n) => n.data.status === 'completed').length;
    const inProgress = nodes.filter((n) => n.data.status === 'in_progress').length;
    const planned = total - completed - inProgress;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, planned, percent };
  }, [nodes]);

  // Load selected node fields into form
  useEffect(() => {
    if (selectedNode) {
      setNodeLabel((selectedNode.data.label as string) || '');
      setNodeDesc((selectedNode.data.description as string) || '');
      setNodeColor((selectedNode.data.color as string) || '#2563eb');
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

  // Compute visible elements based on collapsed nodes state
  const { visibleNodes, visibleEdges } = useMemo(() => {
    const parentIds = new Set(edges.map((e) => e.source));
    const hydratedNodes = nodes.map((node) => {
      const hasChildren = parentIds.has(node.id);
      return {
        ...node,
        data: {
          ...node.data,
          hasChildren,
          collapsed: !!(node.data as { collapsed?: boolean })?.collapsed,
          readOnly,
          onUpdateLabel: (nodeId: string, newLabel: string) => {
            if (readOnly) return;
            recordHistory();
            setNodes((nds) =>
              nds.map((n) => {
                if (n.id === nodeId) {
                  return {
                    ...n,
                    data: { ...n.data, label: newLabel },
                  };
                }
                return n;
              })
            );
          },
          onToggleCollapse: (nodeId: string) => {
            setNodes((nds) =>
              nds.map((n) => {
                if (n.id === nodeId) {
                  return {
                    ...n,
                    data: {
                      ...n.data,
                      collapsed: !(n.data as { collapsed?: boolean })?.collapsed,
                    },
                  };
                }
                return n;
              })
            );
          },
        },
      };
    });

    const collapsedNodeIds = new Set<string>();
    hydratedNodes.forEach((n) => {
      if (n.data?.collapsed) {
        collapsedNodeIds.add(n.id);
      }
    });

    if (collapsedNodeIds.size === 0) {
      return { visibleNodes: hydratedNodes, visibleEdges: edges };
    }

    const hiddenNodeIds = new Set<string>();
    const parentToChildren = new Map<string, string[]>();

    edges.forEach((edge) => {
      const children = parentToChildren.get(edge.source) || [];
      children.push(edge.target);
      parentToChildren.set(edge.source, children);
    });

    const hideDescendants = (nodeId: string) => {
      const children = parentToChildren.get(nodeId) || [];
      children.forEach((childId) => {
        if (!hiddenNodeIds.has(childId)) {
          hiddenNodeIds.add(childId);
          hideDescendants(childId);
        }
      });
    };

    collapsedNodeIds.forEach((id) => {
      hideDescendants(id);
    });

    const visibleNodes = hydratedNodes.filter((n) => !hiddenNodeIds.has(n.id));
    const visibleEdges = edges.filter(
      (e) => !hiddenNodeIds.has(e.source) && !hiddenNodeIds.has(e.target)
    );

    return { visibleNodes, visibleEdges };
  }, [nodes, edges, setNodes, readOnly, recordHistory]);

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
      if (readOnly) return;
      recordHistory();
      const newEdge: Edge = {
        ...params,
        id: `e-${uuidv4()}`,
        type: 'skill',
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, readOnly, recordHistory]
  );

  // Auto-save logic triggers when nodes or edges change
  useEffect(() => {
    if (readOnly) return;
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
        metadata: { status: n.data.status, collapsed: n.data.collapsed },
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
  }, [nodes, edges, mapId, readOnly]);

  // Rename Map
  const handleRename = () => {
    if (!title.trim() || readOnly) return;
    setIsEditingTitle(false);
    startTransition(async () => {
      await renameMindmap(mapId, title.trim());
    });
  };

  // Add new Node
  const handleAddNode = () => {
    if (readOnly) return;
    recordHistory();
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

  // Add Child Node to currently selected node (Shortcut: Tab)
  const handleAddChildNode = useCallback(
    (parentId: string) => {
      if (readOnly) return;
      const parent = nodes.find((n) => n.id === parentId);
      if (!parent) return;

      recordHistory();
      const newId = `n-${uuidv4()}`;
      const newNode: Node = {
        id: newId,
        type: 'skill',
        position: {
          x: parent.position.x + 280,
          y: parent.position.y + (Math.random() - 0.5) * 80,
        },
        data: {
          label: 'New Sub-skill',
          description: '',
          color: (parent.data.color as string) || '#2563eb',
          status: 'planned' as const,
        },
      };

      const newEdge: Edge = {
        id: `e-${uuidv4()}`,
        source: parentId,
        target: newId,
        type: 'skill',
      };

      setNodes((nds) => nds.concat(newNode));
      setEdges((eds) => eds.concat(newEdge));
      setSelectedNode(newNode);
    },
    [nodes, setNodes, setEdges, readOnly, recordHistory]
  );

  // Add Sibling Node (Shortcut: Enter)
  const handleAddSiblingNode = useCallback(
    (nodeId: string) => {
      if (readOnly) return;
      const current = nodes.find((n) => n.id === nodeId);
      if (!current) return;

      const incomingEdge = edges.find((e) => e.target === nodeId);
      const parentId = incomingEdge?.source;

      recordHistory();
      const newId = `n-${uuidv4()}`;
      const newNode: Node = {
        id: newId,
        type: 'skill',
        position: {
          x: current.position.x,
          y: current.position.y + 120,
        },
        data: {
          label: 'New Sibling Skill',
          description: '',
          color: (current.data.color as string) || '#2563eb',
          status: 'planned' as const,
        },
      };

      setNodes((nds) => nds.concat(newNode));

      if (parentId) {
        const newEdge: Edge = {
          id: `e-${uuidv4()}`,
          source: parentId,
          target: newId,
          type: 'skill',
        };
        setEdges((eds) => eds.concat(newEdge));
      }

      setSelectedNode(newNode);
    },
    [nodes, edges, setNodes, setEdges, readOnly, recordHistory]
  );

  // Update selected Node detail
  const handleUpdateNode = () => {
    if (!selectedNode || readOnly) return;
    recordHistory();

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

    setSelectedNode((prev) =>
      prev
        ? {
            ...prev,
            data: {
              ...prev.data,
              label: nodeLabel,
              description: nodeDesc,
              color: nodeColor,
              status: nodeStatus,
            },
          }
        : null
    );
  };

  // Delete selected Node (Shortcut: Backspace / Delete)
  const handleDeleteNode = useCallback(() => {
    if (!selectedNode || readOnly) return;
    recordHistory();
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges, readOnly, recordHistory]);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Undo / Redo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Tab -> Add Child Node
      if (e.key === 'Tab' && selectedNode) {
        e.preventDefault();
        handleAddChildNode(selectedNode.id);
        return;
      }

      // Enter -> Add Sibling Node
      if (e.key === 'Enter' && selectedNode) {
        e.preventDefault();
        handleAddSiblingNode(selectedNode.id);
        return;
      }

      // Backspace / Delete -> Delete Selected Node
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedNode) {
        e.preventDefault();
        handleDeleteNode();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, handleUndo, handleRedo, handleAddChildNode, handleAddSiblingNode, handleDeleteNode]);

  // Auto layout using D3 Hierarchy with smooth camera transition
  const applyD3Layout = (direction: LayoutDirection) => {
    if (nodes.length === 0) return;
    if (!readOnly) recordHistory();

    const layoutNodes = nodes.map((n) => ({
      id: n.id,
      label: (n.data.label as string) || '',
      description: (n.data.description as string) || '',
      color: (n.data.color as string) || '#2563eb',
      status: (n.data.status as string) || 'planned',
    }));

    const layoutEdges = edges.map((e) => ({
      source: e.source,
      target: e.target,
    }));

    const positioned = computeD3Layout(layoutNodes, layoutEdges, direction);
    const coordsMap = new Map<string, { x: number; y: number }>();
    positioned.forEach((p) => {
      coordsMap.set(p.id, p.position);
    });

    setNodes((nds) =>
      nds.map((node) => {
        const coords = coordsMap.get(node.id);
        if (coords) {
          return {
            ...node,
            position: coords,
          };
        }
        return node;
      })
    );

    // Smoothly animate camera to frame the newly formatted layout
    setTimeout(() => {
      rfInstance?.fitView({ duration: 400, padding: 0.2 });
    }, 50);
  };

  // Toggle Public Access Handler
  const handleTogglePublic = async () => {
    if (readOnly) return;
    setIsShareLoading(true);
    const newPublicState = !isPublic;
    try {
      await toggleMindmapPublic(mapId, newPublicState);
      setIsPublic(newPublicState);
    } catch (err) {
      console.error('Failed to toggle public state:', err);
    } finally {
      setIsShareLoading(false);
    }
  };

  // File Download Helpers
  const handleExportJson = () => {
    const rfNodes: ReactFlowNode[] = nodes.map((n) => ({
      id: n.id,
      type: n.type || 'skill',
      position: n.position,
      data: {
        label: (n.data?.label as string) || '',
        description: (n.data?.description as string) || '',
        color: (n.data?.color as string) || '#2563eb',
        status: (n.data?.status as 'planned' | 'in_progress' | 'completed') || 'planned',
      },
    }));

    const rfEdges: ReactFlowEdge[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type || 'skill',
      sourceHandle: e.sourceHandle || null,
      targetHandle: e.targetHandle || null,
    }));

    const jsonText = exportJson(rfNodes, rfEdges);
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'mindmap'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportOpml = () => {
    const rfNodes: ReactFlowNode[] = nodes.map((n) => ({
      id: n.id,
      type: n.type || 'skill',
      position: n.position,
      data: {
        label: (n.data?.label as string) || '',
        description: (n.data?.description as string) || '',
        color: (n.data?.color as string) || '#2563eb',
        status: (n.data?.status as 'planned' | 'in_progress' | 'completed') || 'planned',
      },
    }));

    const rfEdges: ReactFlowEdge[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }));

    const opmlText = generateOpml(rfNodes, rfEdges);
    const blob = new Blob([opmlText], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'mindmap'}.opml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportFreeMind = () => {
    const rfNodes: ReactFlowNode[] = nodes.map((n) => ({
      id: n.id,
      type: n.type || 'skill',
      position: n.position,
      data: {
        label: (n.data?.label as string) || '',
        description: (n.data?.description as string) || '',
        color: (n.data?.color as string) || '#2563eb',
        status: (n.data?.status as 'planned' | 'in_progress' | 'completed') || 'planned',
      },
    }));

    const rfEdges: ReactFlowEdge[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }));

    const mmText = generateFreeMind(rfNodes, rfEdges);
    const blob = new Blob([mmText], { type: 'application/x-freemind' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'mindmap'}.mm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export high-res PNG image
  const handleExportPng = async () => {
    const element = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!element) return;

    try {
      const dataUrl = await toPng(element, {
        backgroundColor: '#f8fafc',
        pixelRatio: 2, // 2x Retina resolution
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'mindmap'}.png`;
      a.click();
    } catch (err) {
      console.error('Failed to export PNG:', err);
    }
  };

  // File Import Helpers
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>, type: 'opml' | 'freemind') => {
    const file = e.target.files?.[0];
    if (!file) return;

    recordHistory();
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      try {
        const parsed = type === 'opml' ? parseOpml(content) : parseFreeMind(content);
        const importedNodes = parsed.nodes;
        const importedEdges = parsed.edges;

        const nextNodes: Node[] = importedNodes.map((n) => {
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

        const nextEdges: Edge[] = importedEdges.map((ed) => ({
          id: ed.id,
          source: ed.sourceNodeId,
          target: ed.targetNodeId,
          type: 'skill',
        }));

        setNodes(nextNodes);
        setEdges(nextEdges);
        setSelectedNode(null);
        setTimeout(() => {
          rfInstance?.fitView({ duration: 400, padding: 0.2 });
        }, 50);
      } catch (err) {
        console.error('Failed to parse file:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // AI Suggestion API Request
  const handleGetAISuggestions = async () => {
    if (!selectedNode) return;
    setAiLoading(true);
    setAiError(null);

    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSkill: selectedNode.data.label,
          description: selectedNode.data.description,
          type: aiType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch AI suggestions.');
      }

      setAiSuggestions(data.suggestions || []);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setAiError(errMsg || 'An error occurred while contacting AI.');
    } finally {
      setAiLoading(false);
    }
  };

  // 1-Click AI Auto-Expand Branch (Sub-skills or Prerequisites)
  const handleAutoExpandBranch = async (type: 'child' | 'parent') => {
    if (!selectedNode || readOnly || aiAutoExpanding) return;
    setAiAutoExpanding(true);
    setAiError(null);

    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSkill: selectedNode.data.label,
          description: selectedNode.data.description,
          type,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch suggestions from AI service.');
      }

      const suggestions = (data.suggestions || []) as AISuggestion[];
      if (suggestions.length === 0) return;

      recordHistory();
      const newNodesList: Node[] = [];
      const newEdgesList: Edge[] = [];

      suggestions.forEach((sug, idx) => {
        const newId = `n-ai-${uuidv4().substring(0, 8)}`;
        const yOffset = (idx - (suggestions.length - 1) / 2) * 120;
        const xOffset = type === 'child' ? 320 : -320;

        const newNode: Node = {
          id: newId,
          type: 'skill',
          position: {
            x: selectedNode.position.x + xOffset,
            y: selectedNode.position.y + yOffset,
          },
          data: {
            label: sug.label,
            description: sug.description,
            color: '#7c3aed',
            status: 'planned' as const,
          },
        };

        const newEdge: Edge = {
          id: `e-${uuidv4().substring(0, 8)}`,
          source: type === 'parent' ? newId : selectedNode.id,
          target: type === 'parent' ? selectedNode.id : newId,
          type: 'skill',
        };

        newNodesList.push(newNode);
        newEdgesList.push(newEdge);
      });

      setNodes((nds) => nds.concat(newNodesList));
      setEdges((eds) => eds.concat(newEdgesList));

      setTimeout(() => {
        rfInstance?.fitView({ duration: 400, padding: 0.2 });
      }, 50);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setAiError(errMsg || 'An error occurred during auto-expansion.');
    } finally {
      setAiAutoExpanding(false);
    }
  };

  // AI List-to-Map Importer Submit Handler
  const handleAiImportSubmit = async () => {
    if (!aiImportText.trim() || aiImportPending) return;

    setAiImportPending(true);
    setAiImportError(null);

    try {
      const response = await fetch('/api/ai/generate-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiImportText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch suggestions from AI service');
      }

      interface AINode {
        id: string;
        label: string;
        description: string;
      }

      interface AIEdge {
        source: string;
        target: string;
      }

      const rawNodes = data.nodes as AINode[];
      const rawEdges = data.edges as AIEdge[];

      const positionedNodes = computeD3Layout(rawNodes, rawEdges, 'RADIAL_MINDMAP');

      recordHistory();

      if (aiImportMode === 'replace') {
        setNodes(positionedNodes);
        const nextEdges = rawEdges.map((e: AIEdge, index: number) => ({
          id: `e-${index}-${uuidv4().substring(0, 8)}`,
          source: e.source,
          target: e.target,
          type: 'skill',
        }));
        setEdges(nextEdges);
        setSelectedNode(null);
      } else {
        const mergePrefix = `ai-${uuidv4().substring(0, 8)}-`;
        const offset = selectedNode
          ? { x: selectedNode.position.x + 350, y: selectedNode.position.y }
          : { x: 100, y: 100 };

        const mergedNodes = positionedNodes.map((n) => ({
          id: `${mergePrefix}${n.id}`,
          type: n.type,
          position: {
            x: n.position.x + offset.x,
            y: n.position.y + offset.y,
          },
          data: n.data,
        }));

        const mergedEdges = rawEdges.map((e: AIEdge, index: number) => ({
          id: `e-merge-${index}-${uuidv4().substring(0, 8)}`,
          source: `${mergePrefix}${e.source}`,
          target: `${mergePrefix}${e.target}`,
          type: 'skill',
        }));

        if (selectedNode) {
          const targetIds = new Set(rawEdges.map((e: AIEdge) => e.target));
          const subGraphRoots = rawNodes.filter((n: AINode) => !targetIds.has(n.id));

          subGraphRoots.forEach((r: AINode) => {
            mergedEdges.push({
              id: `e-link-${uuidv4().substring(0, 8)}`,
              source: selectedNode.id,
              target: `${mergePrefix}${r.id}`,
              type: 'skill',
            });
          });
        }

        setNodes((nds) => nds.concat(mergedNodes));
        setEdges((eds) => eds.concat(mergedEdges));
      }

      setIsAiImportOpen(false);
      setAiImportText('');
      setAiImportError(null);

      setTimeout(() => {
        rfInstance?.fitView({ duration: 400, padding: 0.2 });
      }, 50);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setAiImportError(errMsg || 'An error occurred during AI import.');
    } finally {
      setAiImportPending(false);
    }
  };

  // Promote suggestion to node
  const handlePromoteSuggestion = (sug: AISuggestion) => {
    if (!selectedNode || readOnly) return;
    recordHistory();

    let offset = { x: 0, y: 0 };
    if (aiType === 'child') {
      offset = { x: 280, y: (Math.random() - 0.5) * 150 };
    } else if (aiType === 'parent') {
      offset = { x: -280, y: (Math.random() - 0.5) * 150 };
    } else {
      offset = { x: (Math.random() - 0.5) * 150, y: 140 };
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
        color: '#7c3aed',
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

    setAiSuggestions((prev) => prev.filter((s) => s.label !== sug.label));
  };

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/share/${mapId}` : '';

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Workspace Panel */}
      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={visibleNodes}
          edges={visibleEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onInit={setRfInstance}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          <Controls className="bg-white border border-slate-200 shadow-md rounded-xl overflow-hidden" />

          {showMiniMap && (
            <MiniMap
              className="bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden"
              nodeColor={(n) => (n.data?.color as string) || '#2563eb'}
              zoomable
              pannable
            />
          )}

          {/* Header Panel */}
          <Panel
            position="top-left"
            className="bg-white p-3 rounded-xl shadow-md border border-slate-200 flex items-center gap-3"
          >
            {isEditingTitle && !readOnly ? (
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
                className={`text-base font-bold text-slate-800 flex items-center gap-1 ${
                  readOnly ? '' : 'cursor-pointer hover:text-blue-600'
                }`}
                onClick={() => !readOnly && setIsEditingTitle(true)}
              >
                🧠 {title} {!readOnly && <span className="text-xs font-normal text-slate-400">✏️</span>}
              </h2>
            )}

            <div className="h-4 w-px bg-slate-200"></div>

            {/* Progress Summary Tracker */}
            <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
              <span className="text-xs font-bold text-slate-700">
                🎯 {stats.percent}%
              </span>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                ({stats.completed}/{stats.total} done)
              </span>
              <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${stats.percent}%` }}
                />
              </div>
            </div>

            {!readOnly && (
              <>
                <div className="h-4 w-px bg-slate-200"></div>
                <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 flex items-center gap-1">
                  {saveStatus === 'saved' && <span className="text-emerald-500">● Saved</span>}
                  {saveStatus === 'saving' && <span className="text-amber-500 animate-pulse">● Saving...</span>}
                  {saveStatus === 'error' && <span className="text-red-500">● Sync Error</span>}
                </span>

                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition flex items-center gap-1 border ${
                    isPublic
                      ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                  title="Share read-only roadmap link"
                >
                  🔗 {isPublic ? 'Shared (Public)' : 'Share'}
                </button>
              </>
            )}
          </Panel>

          {/* Action Toolbar */}
          <Panel
            position="top-right"
            className="bg-white p-2.5 rounded-xl shadow-md border border-slate-200 flex flex-wrap items-center gap-1.5 max-w-2xl"
          >
            {!readOnly && (
              <>
                <button
                  onClick={handleAddNode}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition shadow-sm"
                  title="Add new concept card (or press Tab on selected node)"
                >
                  + Add Node
                </button>

                <div className="flex gap-0.5 bg-slate-100 p-0.5 rounded-lg">
                  <button
                    onClick={handleUndo}
                    disabled={history.length === 0}
                    className="hover:bg-white disabled:opacity-30 text-slate-700 text-xs px-2 py-1 rounded transition"
                    title="Undo (Cmd+Z)"
                  >
                    ↩️
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={future.length === 0}
                    className="hover:bg-white disabled:opacity-30 text-slate-700 text-xs px-2 py-1 rounded transition"
                    title="Redo (Cmd+Shift+Z)"
                  >
                    ↪️
                  </button>
                </div>
              </>
            )}

            {/* Layout Triggers */}
            <button
              onClick={() => applyD3Layout('RADIAL_MINDMAP')}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs px-2.5 py-1.5 rounded-lg transition"
              title="Classic balanced Mind Map radiating symmetrically from center"
            >
              🧠 Mind Map
            </button>
            <button
              onClick={() => applyD3Layout('RADIAL_360')}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs px-2.5 py-1.5 rounded-lg transition"
              title="Full 360-degree circular starburst with automatic collision-free radius scaling"
            >
              🌐 Radial 360°
            </button>
            <button
              onClick={() => applyD3Layout('TB')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-2 py-1.5 rounded-lg transition"
              title="Hierarchical tree from Top to Bottom"
            >
              ⬇️ Vertical
            </button>
            <button
              onClick={() => applyD3Layout('LR')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-2 py-1.5 rounded-lg transition"
              title="Logic chart from Left to Right"
            >
              ➡️ Horizontal
            </button>

            <div className="w-px h-5 bg-slate-200 mx-0.5"></div>

            {/* Export Actions */}
            <div className="flex gap-1">
              <button
                onClick={handleExportPng}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-2 py-1.5 rounded-lg transition shadow-sm"
                title="Download high-resolution PNG image"
              >
                📸 PNG
              </button>
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

            {!readOnly && (
              <>
                <div className="w-px h-5 bg-slate-200 mx-0.5"></div>
                {/* Import Actions */}
                <button
                  onClick={() => setIsAiImportOpen(true)}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs px-2.5 py-1.5 rounded-lg transition"
                  title="Build map automatically from text list using AI"
                >
                  ✨ AI Import
                </button>
                <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2 py-1.5 rounded-lg cursor-pointer transition">
                  OPML
                  <input
                    type="file"
                    accept=".opml,.xml"
                    onChange={(e) => handleImportFile(e, 'opml')}
                    className="hidden"
                  />
                </label>
                <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2 py-1.5 rounded-lg cursor-pointer transition">
                  FreeMind
                  <input
                    type="file"
                    accept=".mm,.xml"
                    onChange={(e) => handleImportFile(e, 'freemind')}
                    className="hidden"
                  />
                </label>
              </>
            )}

            <button
              onClick={() => setShowMiniMap((prev) => !prev)}
              className={`text-xs px-2 py-1.5 rounded-lg transition ${
                showMiniMap ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="Toggle MiniMap"
            >
              🗺️
            </button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Selected Node Sidebar Form */}
      {selectedNode && !readOnly && (
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
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAddChildNode(selectedNode.id)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs py-2 rounded-lg transition"
                  title="Shortcut: Tab"
                >
                  + Sub-node (Tab)
                </button>
                <button
                  onClick={handleDeleteNode}
                  className="border border-red-200 text-red-600 hover:bg-red-50 font-medium text-xs py-2 rounded-lg transition"
                  title="Shortcut: Delete"
                >
                  Delete (Del)
                </button>
              </div>
            </div>
          </div>

          {/* 1-CLICK AI EXPANDER & SUGGESTIONS */}
          <div className="mt-6 border-t border-slate-100 pt-6">
            <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
              <span>🔮</span> AI Branch Expander
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Generate and link sub-skills or prerequisites automatically with Gemini.
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => handleAutoExpandBranch('child')}
                disabled={aiAutoExpanding}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold text-xs py-2 px-3 rounded-lg transition shadow-sm"
              >
                {aiAutoExpanding ? 'Generating...' : '✨ Auto Sub-Skills'}
              </button>
              <button
                onClick={() => handleAutoExpandBranch('parent')}
                disabled={aiAutoExpanding}
                className="bg-purple-100 hover:bg-purple-200 text-purple-700 disabled:opacity-50 font-semibold text-xs py-2 px-3 rounded-lg transition border border-purple-200"
              >
                {aiAutoExpanding ? 'Generating...' : '✨ Auto Prereqs'}
              </button>
            </div>

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
              className="w-full bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 font-medium text-xs py-2 rounded-lg transition border border-slate-200"
            >
              {aiLoading ? 'Thinking...' : 'Browse Suggestions'}
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

      {/* SHARE MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <span>🔗</span> Share Mind Map
              </h3>
              <button
                onClick={() => {
                  setIsShareModalOpen(false);
                  setShareCopied(false);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-medium"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="font-bold text-sm text-slate-800">Public Access</p>
                  <p className="text-xs text-slate-500">
                    Anyone with the link can view this roadmap without signing in.
                  </p>
                </div>
                <button
                  onClick={handleTogglePublic}
                  disabled={isShareLoading}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                    isPublic ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
                </button>
              </div>

              {isPublic ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Shareable URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 font-mono select-all"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(shareUrl);
                        setShareCopied(true);
                        setTimeout(() => setShareCopied(false), 2000);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition whitespace-nowrap"
                    >
                      {shareCopied ? '✓ Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  ⚠️ This map is currently private. Enable Public Access above to share this link.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI LIST IMPORT MODAL */}
      {isAiImportOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-1.5">
                <span>✨</span> AI List-to-Map Importer
              </h3>
              <button
                onClick={() => {
                  setIsAiImportOpen(false);
                  setAiImportText('');
                  setAiImportError(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-medium"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Paste a raw list of skills, syllabus bullets, or career milestones. Gemini will
              automatically extract hierarchy, categories, and prerequisites to build your map!
            </p>

            <textarea
              rows={6}
              value={aiImportText}
              onChange={(e) => setAiImportText(e.target.value)}
              placeholder="e.g.&#10;Frontend Engineering:&#10;- HTML/CSS: Flexbox, Grid&#10;- JavaScript: Async/Await, Promises&#10;- React: Hooks, Server Components, Next.js"
              className="w-full text-sm border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />

            <div className="mt-4 flex items-center gap-4">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={aiImportMode === 'merge'}
                  onChange={() => setAiImportMode('merge')}
                  className="text-blue-600"
                />
                Merge into Current Map
              </label>
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={aiImportMode === 'replace'}
                  onChange={() => setAiImportMode('replace')}
                  className="text-blue-600"
                />
                Replace Entire Map
              </label>
            </div>

            {aiImportError && (
              <p className="mt-3 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
                {aiImportError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsAiImportOpen(false);
                  setAiImportText('');
                  setAiImportError(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAiImportSubmit}
                disabled={aiImportPending || !aiImportText.trim()}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition shadow-sm"
              >
                {aiImportPending ? 'Building Map...' : 'Generate Map'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
