import React, { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';

export type CanvasTheme = 'light' | 'dark' | 'neon' | 'sepia';

export interface ResourceLink {
  title: string;
  url: string;
}

export interface TaskItem {
  id: string;
  text: string;
  done: boolean;
}

export type SkillNodeData = Node<{
  label: string;
  description?: string;
  color?: string;
  status?: 'planned' | 'in_progress' | 'completed';
  collapsed?: boolean;
  hasChildren?: boolean;
  depth?: number;
  isRoot?: boolean;
  theme?: CanvasTheme;
  links?: ResourceLink[];
  tasks?: TaskItem[];
  tags?: string[];
  isSearchMatch?: boolean;
  onToggleCollapse?: (id: string) => void;
  onUpdateLabel?: (id: string, newLabel: string) => void;
  onToggleTask?: (nodeId: string, taskId: string) => void;
  readOnly?: boolean;
}, 'skill'>;

interface ThemeClasses {
  cardRoot: string;
  cardBranch: string;
  cardLeaf: string;
  textTitleRoot: string;
  textTitleBranch: string;
  textTitleLeaf: string;
  textDesc: string;
  tag: string;
  checklistBg: string;
  checklistBorder: string;
  checklistText: string;
  checklistDone: string;
  linkBg: string;
  categoryLabel: string;
  statusBadge: string;
  collapseBtn: string;
  handleClass: string;
}

const themeStyles: Record<CanvasTheme, ThemeClasses> = {
  light: {
    cardRoot: 'bg-gradient-to-br from-white via-indigo-50/20 to-slate-50 border-indigo-400 shadow-xl',
    cardBranch: 'bg-white border-slate-200 shadow-md',
    cardLeaf: 'bg-white border-slate-200 shadow-sm',
    textTitleRoot: 'text-slate-900',
    textTitleBranch: 'text-slate-900',
    textTitleLeaf: 'text-slate-800',
    textDesc: 'text-slate-500',
    tag: 'bg-slate-100 text-slate-600',
    checklistBg: 'bg-slate-50',
    checklistBorder: 'border-slate-200',
    checklistText: 'text-slate-800',
    checklistDone: 'text-slate-400',
    linkBg: 'bg-blue-50 hover:bg-blue-100 text-blue-600',
    categoryLabel: 'text-slate-400',
    statusBadge: 'bg-slate-100 text-slate-700',
    collapseBtn: 'bg-white border-slate-200 text-slate-600 hover:text-slate-800',
    handleClass: 'bg-slate-400 border-2 border-white',
  },
  dark: {
    cardRoot: 'bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border-indigo-500/80 shadow-xl shadow-black/50',
    cardBranch: 'bg-slate-900 border-slate-700 shadow-lg shadow-black/40',
    cardLeaf: 'bg-slate-900/95 border-slate-800 shadow-md',
    textTitleRoot: 'text-white',
    textTitleBranch: 'text-slate-100',
    textTitleLeaf: 'text-slate-200',
    textDesc: 'text-slate-400',
    tag: 'bg-slate-800 text-slate-300 border border-slate-700',
    checklistBg: 'bg-slate-800/70',
    checklistBorder: 'border-slate-700',
    checklistText: 'text-slate-200',
    checklistDone: 'text-slate-500',
    linkBg: 'bg-blue-950/70 hover:bg-blue-900/80 text-blue-300 border border-blue-900',
    categoryLabel: 'text-slate-500',
    statusBadge: 'bg-slate-800 text-slate-300 border border-slate-700',
    collapseBtn: 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white',
    handleClass: 'bg-slate-600 border-2 border-slate-900',
  },
  neon: {
    cardRoot: 'bg-gradient-to-br from-gray-950 via-cyan-950/50 to-gray-950 border-cyan-400 shadow-2xl shadow-cyan-950/60',
    cardBranch: 'bg-gray-950/95 border-cyan-800/80 shadow-lg shadow-cyan-950/40',
    cardLeaf: 'bg-gray-950/90 border-cyan-900/70 shadow-md',
    textTitleRoot: 'text-cyan-300 font-black drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]',
    textTitleBranch: 'text-cyan-100 font-bold',
    textTitleLeaf: 'text-cyan-200',
    textDesc: 'text-cyan-300/70',
    tag: 'bg-cyan-950 text-cyan-300 border border-cyan-700',
    checklistBg: 'bg-gray-900/80',
    checklistBorder: 'border-cyan-900/80',
    checklistText: 'text-cyan-100',
    checklistDone: 'text-cyan-700',
    linkBg: 'bg-pink-950/70 hover:bg-pink-900/80 text-pink-300 border border-pink-800/70',
    categoryLabel: 'text-cyan-500 font-mono',
    statusBadge: 'bg-gray-900 text-cyan-300 border border-cyan-800',
    collapseBtn: 'bg-gray-900 border-cyan-700 text-cyan-400 hover:text-cyan-200 shadow-[0_0_6px_rgba(6,182,212,0.5)]',
    handleClass: 'bg-cyan-500 border-2 border-gray-950',
  },
  sepia: {
    cardRoot: 'bg-gradient-to-br from-[#fcf9f2] via-[#f7f0e1] to-[#ede3ce] border-[#b08968] shadow-lg shadow-amber-900/10',
    cardBranch: 'bg-[#fffdfa] border-[#ded3be] shadow-md',
    cardLeaf: 'bg-[#fffdfa] border-[#e7ddcb] shadow-sm',
    textTitleRoot: 'text-[#2b1e15]',
    textTitleBranch: 'text-[#3d2b1f]',
    textTitleLeaf: 'text-[#4a3b2c]',
    textDesc: 'text-[#6b584a]',
    tag: 'bg-[#ebe1ce] text-[#5e4b3c]',
    checklistBg: 'bg-[#f7f0e1]',
    checklistBorder: 'border-[#dfd3bd]',
    checklistText: 'text-[#3d2b1f]',
    checklistDone: 'text-[#9c8977]',
    linkBg: 'bg-[#ebdcc4] hover:bg-[#e2ceb0] text-[#78350f]',
    categoryLabel: 'text-[#8c7764]',
    statusBadge: 'bg-[#ebe1ce] text-[#5e4b3c] border border-[#d8cbb4]',
    collapseBtn: 'bg-[#fffdfa] border-[#ded3be] text-[#6b584a] hover:text-[#3d2b1f]',
    handleClass: 'bg-[#a3907c] border-2 border-[#f7f3ea]',
  },
};

export const SkillNode = memo(({ id, data, selected }: NodeProps<SkillNodeData>) => {
  const currentTheme = data.theme || 'light';
  const theme = themeStyles[currentTheme] || themeStyles.light;

  const color = data.color || '#2563eb';
  const status = data.status || 'planned';
  const isRoot = data.isRoot || data.depth === 0;
  const isBranch = data.depth === 1;
  const isSearchMatch = data.isSearchMatch;

  const [isEditing, setIsEditing] = useState(false);
  const [localLabel, setLocalLabel] = useState(data.label);

  useEffect(() => {
    setLocalLabel(data.label);
  }, [data.label]);

  const handleFinishEdit = () => {
    setIsEditing(false);
    if (localLabel.trim() && localLabel.trim() !== data.label) {
      data.onUpdateLabel?.(id, localLabel.trim());
    }
  };

  const statusEmojis = {
    planned: '⏳',
    in_progress: '🚀',
    completed: '✅',
  };

  const statusLabels = {
    planned: 'Planned',
    in_progress: 'In Progress',
    completed: 'Completed',
  };

  // Card size and theme classes
  const cardSize = isRoot
    ? 'w-72 px-5 py-4 rounded-2xl border-2'
    : isBranch
    ? 'w-64 px-4 py-3 rounded-xl border-2'
    : 'w-56 px-3.5 py-2.5 rounded-lg border';

  const cardThemeClass = isRoot ? theme.cardRoot : isBranch ? theme.cardBranch : theme.cardLeaf;

  const titleStyles = isRoot
    ? `font-black text-base tracking-tight mt-1.5 ${theme.textTitleRoot}`
    : isBranch
    ? `font-bold text-sm mt-1 ${theme.textTitleBranch}`
    : `font-semibold text-xs mt-0.5 ${theme.textTitleLeaf}`;

  const completedTasks = data.tasks ? data.tasks.filter((t) => t.done).length : 0;
  const totalTasks = data.tasks ? data.tasks.length : 0;

  return (
    <div
      className={`${cardSize} ${cardThemeClass} transition-all duration-200 relative ${
        isSearchMatch ? 'ring-4 ring-amber-400 ring-offset-2 animate-pulse border-amber-500 z-30' : ''
      } ${
        selected
          ? 'ring-4 ring-blue-400 ring-opacity-60 border-blue-500 scale-105 z-20'
          : ''
      }`}
      style={{
        borderLeftColor: color,
        borderLeftWidth: isRoot ? '8px' : isBranch ? '6px' : '4px',
      }}
    >
      {/* Handles on all 4 sides */}
      <Handle
        type="target"
        position={Position.Top}
        id="t-top"
        className={`w-3 h-3 rounded-full -top-1.5 ${theme.handleClass}`}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="s-bottom"
        className={`w-3 h-3 rounded-full -bottom-1.5 ${theme.handleClass}`}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="t-left"
        className={`w-3 h-3 rounded-full -left-1.5 ${theme.handleClass}`}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="s-right"
        className={`w-3 h-3 rounded-full -right-1.5 ${theme.handleClass}`}
      />

      <div className="flex flex-col gap-1">
        {/* Node Category & Status Badge */}
        <div className="flex items-center justify-between gap-1">
          <span className={`text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${theme.categoryLabel}`}>
            {isRoot ? '👑 Central Topic' : isBranch ? '🌿 Core Branch' : '📌 Sub-Topic'}
          </span>
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0 ${theme.statusBadge}`}
            title={statusLabels[status]}
          >
            {statusEmojis[status]} {statusLabels[status]}
          </span>
        </div>

        {/* Title / Inline Input */}
        {isEditing && !data.readOnly ? (
          <input
            type="text"
            value={localLabel}
            onChange={(e) => setLocalLabel(e.target.value)}
            onBlur={handleFinishEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFinishEdit();
              if (e.key === 'Escape') {
                setLocalLabel(data.label);
                setIsEditing(false);
              }
            }}
            autoFocus
            className={`${titleStyles} border border-blue-400 rounded px-1.5 py-0.5 outline-none w-full bg-blue-50/20`}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h4
            className={`${titleStyles} truncate ${
              data.readOnly ? '' : 'cursor-text select-none hover:opacity-80'
            }`}
            title={data.label}
            onDoubleClick={(e) => {
              if (!data.readOnly) {
                e.stopPropagation();
                setIsEditing(true);
              }
            }}
          >
            {data.label}
          </h4>
        )}

        {/* Description */}
        {data.description && (
          <p className={`text-xs line-clamp-2 mt-0.5 leading-relaxed ${theme.textDesc}`}>
            {data.description}
          </p>
        )}

        {/* Tags */}
        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {data.tags.map((tag) => (
              <span
                key={tag}
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${theme.tag}`}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Checklist / Tasks summary */}
        {data.tasks && data.tasks.length > 0 && (
          <div className={`mt-1.5 pt-1.5 border-t ${theme.checklistBorder} space-y-1`}>
            <div className={`flex items-center justify-between text-[10px] font-bold uppercase tracking-wider ${theme.categoryLabel}`}>
              <span>Checklist</span>
              <span>
                {completedTasks}/{totalTasks}
              </span>
            </div>
            <div className="space-y-0.5">
              {data.tasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!data.readOnly) {
                      data.onToggleTask?.(id, task.id);
                    }
                  }}
                  className={`text-[11px] flex items-center gap-1.5 px-1 py-0.5 rounded transition ${theme.checklistBg} ${
                    data.readOnly ? '' : 'cursor-pointer hover:opacity-90'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={task.done}
                    readOnly
                    className="w-3 h-3 text-blue-600 rounded cursor-pointer pointer-events-none"
                  />
                  <span
                    className={`truncate ${
                      task.done ? `line-through font-normal ${theme.checklistDone}` : `font-medium ${theme.checklistText}`
                    }`}
                  >
                    {task.text}
                  </span>
                </div>
              ))}
              {data.tasks.length > 3 && (
                <p className={`text-[10px] font-medium italic ${theme.categoryLabel}`}>
                  +{data.tasks.length - 3} more tasks in sidebar
                </p>
              )}
            </div>
          </div>
        )}

        {/* Resource Links */}
        {data.links && data.links.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {data.links.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded transition ${theme.linkBg}`}
                title={link.url}
              >
                <span>🔗</span>
                <span className="truncate max-w-[100px]">{link.title || 'Resource'}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Collapse/Expand Toggle Button */}
      {data.hasChildren && data.onToggleCollapse && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onToggleCollapse?.(id);
          }}
          className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm transition cursor-pointer z-10 border ${theme.collapseBtn}`}
          title={data.collapsed ? 'Expand branch' : 'Collapse branch'}
        >
          {data.collapsed ? '＋' : '－'}
        </button>
      )}
    </div>
  );
});

SkillNode.displayName = 'SkillNode';
