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
import { SkillNode, ResourceLink, TaskItem } from './SkillNode';
import { SkillEdge } from './SkillEdge';
import { saveMapData } from '@/app/actions/nodes-edges';
import { renameMindmap, toggleMindmapPublic } from '@/app/actions/mindmaps';
import { computeD3Layout, LayoutDirection } from '@/lib/layout';
import { exportJson, ReactFlowNode, ReactFlowEdge } from '@/lib/adapters/json';
import { generateOpml, parseOpml } from '@/lib/adapters/opml';
import { generateFreeMind, parseFreeMind } from '@/lib/adapters/freemind';
import { generateMarkdownOutline, parseMarkdownOutline } from '@/lib/adapters/markdown';
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
  label?: string | null;
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
      const meta = (n.metadata as Record<string, unknown> | null) || {};
      return {
        id: n.id,
        type: 'skill',
        position: { x: n.xPos, y: n.yPos },
        data: {
          label: n.label,
          description: n.description || '',
          color: n.color || '#2563eb',
          status: (meta.status as 'planned' | 'in_progress' | 'completed') || 'planned',
          tags: (meta.tags as string[]) || [],
          tasks: (meta.tasks as TaskItem[]) || [],
          links: (meta.links as ResourceLink[]) || [],
          collapsed: Boolean(meta.collapsed),
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
      label: e.label || '',
      data: { label: e.label || '' },
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

  // Quick Search & Filter (Cmd+F)
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatusFilter, setSearchStatusFilter] = useState<'all' | 'planned' | 'in_progress' | 'completed'>('all');

  // Two-Way Markdown Outline Drawer
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [outlineMarkdown, setOutlineMarkdown] = useState('');
  const [isOutlineEditing, setIsOutlineEditing] = useState(false);

  // Selected Node fields for sidebar form
  const [nodeLabel, setNodeLabel] = useState('');
  const [nodeDesc, setNodeDesc] = useState('');
  const [nodeColor, setNodeColor] = useState('#2563eb');
  const [nodeStatus, setNodeStatus] = useState<'planned' | 'in_progress' | 'completed'>('planned');
  const [nodeLinks, setNodeLinks] = useState<ResourceLink[]>([]);
  const [nodeTasks, setNodeTasks] = useState<TaskItem[]>([]);
  const [nodeTags, setNodeTags] = useState<string[]>([]);

  // Sub-inputs inside sidebar
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newTaskText, setNewTaskText] = useState('');
  const [newTagText, setNewTagText] = useState('');

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

  // Snapped target indicator
  const [snappedTargetId, setSnappedTargetId] = useState<string | null>(null);

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
      setNodeLinks((selectedNode.data.links as ResourceLink[]) || []);
      setNodeTasks((selectedNode.data.tasks as TaskItem[]) || []);
      setNodeTags((selectedNode.data.tags as string[]) || []);
      setAiSuggestions([]);
      setAiError(null);
    } else {
      setNodeLabel('');
      setNodeDesc('');
      setNodeColor('#2563eb');
      setNodeStatus('planned');
      setNodeLinks([]);
      setNodeTasks([]);
      setNodeTags([]);
      setAiSuggestions([]);
      setAiError(null);
    }
  }, [selectedNode]);

  // Compute visible elements based on collapsed nodes state & depth hierarchy
  const { visibleNodes, visibleEdges } = useMemo(() => {
    const parentIds = new Set(edges.map((e) => e.source));
    const targetToParent = new Map<string, string>();
    const parentToChildren = new Map<string, string[]>();

    edges.forEach((edge) => {
      if (!targetToParent.has(edge.target)) {
        targetToParent.set(edge.target, edge.source);
      }
      const children = parentToChildren.get(edge.source) || [];
      children.push(edge.target);
      parentToChildren.set(edge.source, children);
    });

    // Compute depth for every node
    const depths = new Map<string, number>();
    const computeDepth = (id: string, currentDepth: number, visited: Set<string>) => {
      if (visited.has(id)) return;
      visited.add(id);
      depths.set(id, currentDepth);
      const children = parentToChildren.get(id) || [];
      children.forEach((cid) => computeDepth(cid, currentDepth + 1, visited));
    };

    const rootNodes = nodes.filter((n) => !targetToParent.has(n.id));
    const visitedSet = new Set<string>();
    rootNodes.forEach((r) => computeDepth(r.id, 0, visitedSet));
    nodes.forEach((n) => {
      if (!visitedSet.has(n.id)) computeDepth(n.id, 1, visitedSet);
    });

    const isSearchActive = searchQuery.trim().length > 0;
    const q = searchQuery.toLowerCase().trim();

    const hydratedNodes = nodes.map((node) => {
      const hasChildren = parentIds.has(node.id);
      const nodeDepth = depths.get(node.id) ?? 1;
      const isRoot = nodeDepth === 0;

      const label = (node.data?.label as string) || '';
      const description = (node.data?.description as string) || '';
      const tags = (node.data?.tags as string[]) || [];

      const matchesSearch =
        isSearchActive &&
        (label.toLowerCase().includes(q) ||
          description.toLowerCase().includes(q) ||
          tags.some((t) => t.toLowerCase().includes(q)));

      return {
        ...node,
        data: {
          ...node.data,
          hasChildren,
          depth: nodeDepth,
          isRoot,
          isSearchMatch: matchesSearch,
          collapsed: Boolean(node.data?.collapsed),
          readOnly,
          onUpdateLabel: (nodeId: string, newLabel: string) => {
            if (readOnly) return;
            recordHistory();
            setNodes((nds) =>
              nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n))
            );
          },
          onToggleTask: (nodeId: string, taskId: string) => {
            if (readOnly) return;
            recordHistory();
            setNodes((nds) =>
              nds.map((n) => {
                if (n.id === nodeId) {
                  const tasks = (n.data.tasks as TaskItem[]) || [];
                  const nextTasks = tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t));
                  return { ...n, data: { ...n.data, tasks: nextTasks } };
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
                      collapsed: !n.data?.collapsed,
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
      if (n.data?.collapsed) collapsedNodeIds.add(n.id);
    });

    const hiddenNodeIds = new Set<string>();
    const hideDescendants = (nodeId: string) => {
      const children = parentToChildren.get(nodeId) || [];
      children.forEach((childId) => {
        if (!hiddenNodeIds.has(childId)) {
          hiddenNodeIds.add(childId);
          hideDescendants(childId);
        }
      });
    };

    collapsedNodeIds.forEach((id) => hideDescendants(id));

    const visibleNodes = hydratedNodes.filter((n) => !hiddenNodeIds.has(n.id));
    const visibleEdges = edges
      .filter((e) => !hiddenNodeIds.has(e.source) && !hiddenNodeIds.has(e.target))
      .map((e) => ({
        ...e,
        data: {
          ...e.data,
          readOnly,
          label: (e.data?.label as string) || (e as { label?: string }).label || '',
          onUpdateEdgeLabel: (edgeId: string, nextLabel: string) => {
            if (readOnly) return;
            recordHistory();
            setEdges((eds) =>
              eds.map((ed) =>
                ed.id === edgeId
                  ? { ...ed, label: nextLabel, data: { ...ed.data, label: nextLabel } }
                  : ed
              )
            );
          },
        },
      }));

    return { visibleNodes, visibleEdges };
  }, [nodes, edges, setNodes, setEdges, readOnly, recordHistory, searchQuery]);

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

  // Drag-to-Reparent Snapping handler
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent | MouseEvent | TouchEvent, draggedNode: Node) => {
      if (readOnly) return;

      const SNAP_DISTANCE = 90;
      let targetNode: Node | null = null;

      for (const n of nodes) {
        if (n.id === draggedNode.id) continue;
        const dx = Math.abs(n.position.x - draggedNode.position.x);
        const dy = Math.abs(n.position.y - draggedNode.position.y);
        if (dx < SNAP_DISTANCE && dy < SNAP_DISTANCE) {
          targetNode = n;
          break;
        }
      }

      if (targetNode) {
        // Cyclic safety check: ensure target is not a descendant of dragged node
        const isDescendant = (parent: string, candidate: string): boolean => {
          const directChildren = edges.filter((e) => e.source === parent).map((e) => e.target);
          if (directChildren.includes(candidate)) return true;
          return directChildren.some((child) => isDescendant(child, candidate));
        };

        if (!isDescendant(draggedNode.id, targetNode.id)) {
          recordHistory();

          // 1. Remove old incoming edge to draggedNode
          const filteredEdges = edges.filter((e) => e.target !== draggedNode.id);

          // 2. Add new edge targetNode -> draggedNode
          const newEdge: Edge = {
            id: `e-${uuidv4().substring(0, 8)}`,
            source: targetNode.id,
            target: draggedNode.id,
            type: 'skill',
          };

          // 3. Position offset
          const snappedPosition = {
            x: targetNode.position.x + 280,
            y: targetNode.position.y + 40,
          };

          setNodes((nds) =>
            nds.map((n) => (n.id === draggedNode.id ? { ...n, position: snappedPosition } : n))
          );
          setEdges([...filteredEdges, newEdge]);
          setSnappedTargetId(targetNode.id);
          setTimeout(() => setSnappedTargetId(null), 1500);
        }
      }
    },
    [nodes, edges, readOnly, recordHistory, setNodes, setEdges]
  );

  // Auto-save logic triggers when nodes or edges change
  useEffect(() => {
    if (readOnly) return;
    const delayDebounce = setTimeout(() => {
      if (nodes.length === 0) return;
      setSaveStatus('saving');

      const nodesData = nodes.map((n) => ({
        id: n.id,
        label: (n.data.label as string) || '',
        description: (n.data.description as string) || '',
        xPos: n.position.x,
        yPos: n.position.y,
        color: (n.data.color as string) || '#2563eb',
        metadata: {
          status: n.data.status,
          collapsed: n.data.collapsed,
          tags: n.data.tags,
          tasks: n.data.tasks,
          links: n.data.links,
        },
      }));

      const edgesData = edges.map((e) => ({
        id: e.id,
        sourceNodeId: e.source,
        targetNodeId: e.target,
        label: (e.data?.label as string) || (e as { label?: string }).label || undefined,
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
    const newNode: Node = {
      id,
      type: 'skill',
      position: {
        x: 250 + (Math.random() - 0.5) * 100,
        y: 200 + (Math.random() - 0.5) * 100,
      },
      data: {
        label: 'New Concept',
        description: '',
        color: '#2563eb',
        status: 'planned',
        tags: [],
        tasks: [],
        links: [],
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNode(newNode);
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
          status: 'planned',
          tags: [],
          tasks: [],
          links: [],
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
          status: 'planned',
          tags: [],
          tasks: [],
          links: [],
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
              links: nodeLinks,
              tasks: nodeTasks,
              tags: nodeTags,
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
              links: nodeLinks,
              tasks: nodeTasks,
              tags: nodeTags,
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

      // Cmd+F -> Search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
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

  // Outline Drawer Actions
  const handleOpenOutline = () => {
    const md = generateMarkdownOutline(
      nodes.map((n) => ({
        id: n.id,
        data: {
          label: (n.data.label as string) || '',
          description: (n.data.description as string) || '',
          status: (n.data.status as string) || 'planned',
          tags: (n.data.tags as string[]) || [],
        },
      })),
      edges.map((e) => ({ source: e.source, target: e.target }))
    );
    setOutlineMarkdown(md);
    setIsOutlineOpen(true);
  };

  const handleApplyOutline = () => {
    if (!outlineMarkdown.trim() || readOnly) return;
    recordHistory();

    const parsed = parseMarkdownOutline(outlineMarkdown);
    const layoutNodes = parsed.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      description: n.description,
      status: n.status,
    }));

    const positionedNodes = computeD3Layout(layoutNodes, parsed.edges, 'RADIAL_MINDMAP');

    const nextNodes: Node[] = positionedNodes.map((pn) => {
      const orig = parsed.nodes.find((o) => o.id === pn.id);
      return {
        id: pn.id,
        type: 'skill',
        position: pn.position,
        data: {
          ...pn.data,
          tags: orig?.tags || [],
          tasks: [],
          links: [],
        },
      };
    });

    const nextEdges: Edge[] = parsed.edges.map((e, idx) => ({
      id: `e-md-${idx}-${uuidv4().substring(0, 6)}`,
      source: e.source,
      target: e.target,
      type: 'skill',
    }));

    setNodes(nextNodes);
    setEdges(nextEdges);
    setIsOutlineEditing(false);
    setTimeout(() => {
      rfInstance?.fitView({ duration: 400, padding: 0.2 });
    }, 50);
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
          const meta = (n.metadata as Record<string, unknown> | null) || {};
          return {
            id: n.id,
            type: 'skill',
            position: { x: n.xPos, y: n.yPos },
            data: {
              label: n.label,
              description: n.description || '',
              color: n.color || '#2563eb',
              status: (meta.status as 'planned' | 'in_progress' | 'completed') || 'planned',
              tags: [],
              tasks: [],
              links: [],
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
            tags: [],
            tasks: [],
            links: [],
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
    const newNode: Node = {
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
        status: 'planned',
        tags: [],
        tasks: [],
        links: [],
      },
    };

    const newEdge: Edge = {
      id: `e-${uuidv4()}`,
      source: aiType === 'parent' ? newId : selectedNode.id,
      target: aiType === 'parent' ? selectedNode.id : newId,
      type: 'skill',
    };

    setNodes((nds) => nds.concat(newNode));
    setEdges((eds) => eds.concat(newEdge));

    setAiSuggestions((prev) => prev.filter((s) => s.label !== sug.label));
  };

  // Search results list
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return nodes.filter((n) => {
      const label = (n.data.label as string) || '';
      const description = (n.data.description as string) || '';
      const tags = (n.data.tags as string[]) || [];
      const status = (n.data.status as string) || 'planned';

      const matchesStatus = searchStatusFilter === 'all' || status === searchStatusFilter;
      const matchesQuery =
        label.toLowerCase().includes(q) ||
        description.toLowerCase().includes(q) ||
        tags.some((t) => t.toLowerCase().includes(q));

      return matchesStatus && matchesQuery;
    });
  }, [nodes, searchQuery, searchStatusFilter]);

  const handleFocusSearchResult = (nodeId: string) => {
    const target = nodes.find((n) => n.id === nodeId);
    if (!target) return;
    setSelectedNode(target);
    rfInstance?.fitView({ nodes: [{ id: nodeId }], duration: 500, padding: 0.5 });
  };

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/share/${mapId}` : '';

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* LEFT OUTLINE DRAWER */}
      {isOutlineOpen && (
        <div className="w-80 border-r border-slate-200 bg-white h-full flex flex-col p-4 shadow-lg z-30 animate-in slide-in-from-left duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <span>📝</span> Outline View
            </h3>
            <div className="flex items-center gap-1">
              {!readOnly && (
                <button
                  onClick={() => setIsOutlineEditing((prev) => !prev)}
                  className={`text-xs px-2 py-1 rounded font-semibold transition ${
                    isOutlineEditing ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isOutlineEditing ? 'View' : 'Edit'}
                </button>
              )}
              <button
                onClick={() => setIsOutlineOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-medium px-1.5"
              >
                ✕
              </button>
            </div>
          </div>

          {isOutlineEditing ? (
            <div className="flex-1 flex flex-col gap-2">
              <p className="text-[11px] text-slate-500">
                Edit indented Markdown. Use <code className="bg-slate-100 px-1 rounded">- [x]</code> for completed, <code className="bg-slate-100 px-1 rounded">#tags</code> for tags.
              </p>
              <textarea
                value={outlineMarkdown}
                onChange={(e) => setOutlineMarkdown(e.target.value)}
                className="flex-1 font-mono text-xs border border-slate-200 rounded-lg p-2.5 text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={handleApplyOutline}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 rounded-lg transition shadow-sm"
              >
                Apply Outline to Map
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1">
              {nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const nodeDepth = (node.data.depth as number) ?? 0;
                return (
                  <div
                    key={node.id}
                    onClick={() => handleFocusSearchResult(node.id)}
                    style={{ paddingLeft: `${Math.min(nodeDepth * 16, 64) + 8}px` }}
                    className={`py-1.5 pr-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition ${
                      isSelected ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="truncate">
                      {node.data.status === 'completed' ? '✅' : node.data.status === 'in_progress' ? '🚀' : '⏳'}{' '}
                      {(node.data.label as string) || 'Untitled'}
                    </span>
                    {node.data.depth === 0 && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 rounded font-bold">Root</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={visibleNodes}
          edges={visibleEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onNodeDragStop={handleNodeDragStop}
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

          {/* Drag Snapping Feedback Banner */}
          {snappedTargetId && (
            <Panel position="top-center" className="bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-full shadow-xl animate-bounce">
              ⚡ Reparented & Snapped to branch!
            </Panel>
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
              <span className="text-xs font-bold text-slate-700">🎯 {stats.percent}%</span>
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
            {/* Outline Button */}
            <button
              onClick={handleOpenOutline}
              className={`font-semibold text-xs px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 border ${
                isOutlineOpen ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title="Toggle Markdown Outline View"
            >
              📝 Outline
            </button>

            {/* Quick Search Button */}
            <button
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg transition font-medium flex items-center gap-1 border border-slate-200"
              title="Search and filter map (Cmd+F)"
            >
              🔍 Find
            </button>

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
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-2.5 py-1.5 rounded-lg transition"
              title="Hierarchical tree from Top to Bottom"
            >
              ⬇️ Vertical
            </button>
            <button
              onClick={() => applyD3Layout('LR')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-2.5 py-1.5 rounded-lg transition"
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

      {/* QUICK SEARCH POPOVER */}
      {isSearchOpen && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-4 z-40 animate-in fade-in zoom-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">🔍 Quick Search & Filter</h4>
            <button onClick={() => setIsSearchOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs">
              ✕
            </button>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type skill name, notes, or #tag..."
            autoFocus
            className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 mb-2"
          />

          <div className="flex gap-1 mb-3">
            {(['all', 'planned', 'in_progress', 'completed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSearchStatusFilter(s)}
                className={`flex-1 py-1 text-[11px] font-semibold rounded-md border capitalize transition ${
                  searchStatusFilter === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {s === 'all' ? 'All' : s === 'in_progress' ? 'Active' : s}
              </button>
            ))}
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1">
            {searchResults.length > 0 ? (
              searchResults.map((node) => (
                <div
                  key={node.id}
                  onClick={() => handleFocusSearchResult(node.id)}
                  className="p-2 rounded-lg border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition cursor-pointer flex items-center justify-between group"
                >
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">
                      {(node.data.label as string) || 'Untitled'}
                    </p>
                    {node.data.description ? (
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {node.data.description as string}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-medium text-slate-600 capitalize">
                    {node.data.status as string}
                  </span>
                </div>
              ))
            ) : searchQuery.trim() ? (
              <p className="text-xs text-slate-400 text-center py-4">No matching nodes found.</p>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">Start typing to search the roadmap...</p>
            )}
          </div>
        </div>
      )}

      {/* SELECTED NODE SIDEBAR FORM */}
      {selectedNode && !readOnly && (
        <div className="w-84 border-l border-slate-200 bg-white h-full flex flex-col p-6 shadow-xl z-20 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
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

            {/* TAGS SECTION */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Tags (#hashtag)
              </label>
              <div className="flex flex-wrap gap-1 mb-2">
                {nodeTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                  >
                    #{tag}
                    <button
                      onClick={() => setNodeTags((prev) => prev.filter((t) => t !== tag))}
                      className="text-slate-400 hover:text-red-500 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newTagText}
                  onChange={(e) => setNewTagText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTagText.trim()) {
                      e.preventDefault();
                      const cleanTag = newTagText.trim().replace(/^#/, '');
                      if (!nodeTags.includes(cleanTag)) setNodeTags((prev) => [...prev, cleanTag]);
                      setNewTagText('');
                    }
                  }}
                  placeholder="e.g. backend, priority"
                  className="flex-1 text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 outline-none"
                />
                <button
                  onClick={() => {
                    if (newTagText.trim()) {
                      const cleanTag = newTagText.trim().replace(/^#/, '');
                      if (!nodeTags.includes(cleanTag)) setNodeTags((prev) => [...prev, cleanTag]);
                      setNewTagText('');
                    }
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition"
                >
                  + Tag
                </button>
              </div>
            </div>

            {/* CHECKLIST / SUB-TASKS */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Sub-task Checklist
              </label>
              <div className="space-y-1.5 mb-2">
                {nodeTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-1 text-xs bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <label className="flex items-center gap-1.5 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => {
                          setNodeTasks((prev) =>
                            prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t))
                          );
                        }}
                        className="rounded text-blue-600"
                      />
                      <span className={`truncate ${task.done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {task.text}
                      </span>
                    </label>
                    <button
                      onClick={() => setNodeTasks((prev) => prev.filter((t) => t.id !== task.id))}
                      className="text-slate-400 hover:text-red-500 font-bold px-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTaskText.trim()) {
                      e.preventDefault();
                      setNodeTasks((prev) => [...prev, { id: uuidv4().substring(0, 6), text: newTaskText.trim(), done: false }]);
                      setNewTaskText('');
                    }
                  }}
                  placeholder="Add action item / exercise..."
                  className="flex-1 text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 outline-none"
                />
                <button
                  onClick={() => {
                    if (newTaskText.trim()) {
                      setNodeTasks((prev) => [...prev, { id: uuidv4().substring(0, 6), text: newTaskText.trim(), done: false }]);
                      setNewTaskText('');
                    }
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition"
                >
                  + Task
                </button>
              </div>
            </div>

            {/* RESOURCE LINKS */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Resource Links & Docs
              </label>
              <div className="space-y-1.5 mb-2">
                {nodeLinks.map((link, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-1 text-xs bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium truncate hover:underline flex items-center gap-1">
                      <span>🔗</span> {link.title || link.url}
                    </a>
                    <button
                      onClick={() => setNodeLinks((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-500 font-bold px-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  placeholder="Link Title (e.g. Official Docs)"
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 outline-none"
                />
                <div className="flex gap-1.5">
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 outline-none"
                  />
                  <button
                    onClick={() => {
                      if (newLinkUrl.trim()) {
                        setNodeLinks((prev) => [...prev, { title: newLinkTitle.trim() || 'Link', url: newLinkUrl.trim() }]);
                        setNewLinkTitle('');
                        setNewLinkUrl('');
                      }
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition"
                  >
                    + Link
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 flex flex-col gap-2 border-t border-slate-100">
              <button
                onClick={handleUpdateNode}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2 rounded-lg transition shadow-sm"
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
