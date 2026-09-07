import React, { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';

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
  links?: ResourceLink[];
  tasks?: TaskItem[];
  tags?: string[];
  isSearchMatch?: boolean;
  onToggleCollapse?: (id: string) => void;
  onUpdateLabel?: (id: string, newLabel: string) => void;
  onToggleTask?: (nodeId: string, taskId: string) => void;
  readOnly?: boolean;
}, 'skill'>;

export const SkillNode = memo(({ id, data, selected }: NodeProps<SkillNodeData>) => {
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

  // Card size and typography scaling based on visual hierarchy
  const cardStyles = isRoot
    ? 'w-72 px-5 py-4 rounded-2xl border-2 shadow-xl bg-gradient-to-br from-white via-indigo-50/20 to-slate-50'
    : isBranch
    ? 'w-64 px-4 py-3 rounded-xl border-2 shadow-md bg-white'
    : 'w-56 px-3.5 py-2.5 rounded-lg border shadow-sm bg-white';

  const titleStyles = isRoot
    ? 'font-black text-base tracking-tight text-slate-900 mt-1.5'
    : isBranch
    ? 'font-bold text-sm text-slate-900 mt-1'
    : 'font-semibold text-xs text-slate-800 mt-0.5';

  const completedTasks = data.tasks ? data.tasks.filter((t) => t.done).length : 0;
  const totalTasks = data.tasks ? data.tasks.length : 0;

  return (
    <div
      className={`${cardStyles} text-slate-800 transition-all duration-200 relative ${
        isSearchMatch ? 'ring-4 ring-amber-400 ring-offset-2 animate-pulse border-amber-500' : ''
      } ${
        selected
          ? 'ring-4 ring-blue-400 ring-opacity-50 border-blue-500 scale-105 z-20'
          : isRoot
          ? 'border-indigo-400'
          : 'border-slate-200'
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
        className="w-3 h-3 bg-slate-400 border-2 border-white rounded-full -top-1.5"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="s-bottom"
        className="w-3 h-3 bg-slate-400 border-2 border-white rounded-full -bottom-1.5"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="t-left"
        className="w-3 h-3 bg-slate-400 border-2 border-white rounded-full -left-1.5"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="s-right"
        className="w-3 h-3 bg-slate-400 border-2 border-white rounded-full -right-1.5"
      />

      <div className="flex flex-col gap-1">
        {/* Node Category & Status Badge */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            {isRoot ? '👑 Central Topic' : isBranch ? '🌿 Core Branch' : '📌 Sub-Topic'}
          </span>
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 flex items-center gap-1 flex-shrink-0"
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
            className={`${titleStyles} border border-blue-400 rounded px-1.5 py-0.5 outline-none w-full bg-blue-50/50`}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h4
            className={`${titleStyles} truncate ${
              data.readOnly ? '' : 'cursor-text select-none hover:text-blue-600'
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
          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
            {data.description}
          </p>
        )}

        {/* Tags */}
        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {data.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Checklist / Tasks summary */}
        {data.tasks && data.tasks.length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-100 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                  className={`text-[11px] flex items-center gap-1.5 px-1 py-0.5 rounded transition ${
                    data.readOnly ? '' : 'cursor-pointer hover:bg-slate-50'
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
                      task.done ? 'line-through text-slate-400 font-normal' : 'text-slate-700 font-medium'
                    }`}
                  >
                    {task.text}
                  </span>
                </div>
              ))}
              {data.tasks.length > 3 && (
                <p className="text-[10px] text-slate-400 font-medium italic">
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
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded transition"
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
          className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-white border border-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-800 transition cursor-pointer z-10"
          title={data.collapsed ? 'Expand branch' : 'Collapse branch'}
        >
          {data.collapsed ? '＋' : '－'}
        </button>
      )}
    </div>
  );
});

SkillNode.displayName = 'SkillNode';
