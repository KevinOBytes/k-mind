import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';

export type SkillNodeData = Node<{
  label: string;
  description?: string;
  color?: string;
  status?: 'planned' | 'in_progress' | 'completed';
}, 'skill'>;

export const SkillNode = memo(({ data, selected }: NodeProps<SkillNodeData>) => {
  const color = data.color || '#2563eb';
  const status = data.status || 'planned';

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

  return (
    <div 
      className={`px-4 py-3 rounded-xl border-2 bg-white text-slate-800 transition shadow-md w-60 ${
        selected ? 'ring-4 ring-blue-400 ring-opacity-50 border-blue-500 scale-105' : 'border-slate-200'
      }`}
      style={{ borderLeftColor: color, borderLeftWidth: '6px' }}
    >
      {/* Handles on all sides to allow multi-linked connections in any direction */}
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
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Skill Node
          </span>
          <span 
            className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 flex items-center gap-1"
            title={statusLabels[status]}
          >
            {statusEmojis[status]} {statusLabels[status]}
          </span>
        </div>
        
        <h4 className="font-bold text-sm truncate text-slate-900 mt-1" title={data.label}>
          {data.label}
        </h4>
        
        {data.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mt-1">
            {data.description}
          </p>
        )}
      </div>
    </div>
  );
});

SkillNode.displayName = 'SkillNode';
