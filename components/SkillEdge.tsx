import React, { useState } from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react';
import { CanvasTheme } from './SkillNode';

export const SkillEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [localLabel, setLocalLabel] = useState((data?.label as string) || '');

  const theme: CanvasTheme = (data?.theme as CanvasTheme) || 'light';

  const strokeColors: Record<CanvasTheme, { normal: string; selected: string }> = {
    light: { normal: '#94a3b8', selected: '#2563eb' },
    dark: { normal: '#475569', selected: '#60a5fa' },
    neon: { normal: '#0891b2', selected: '#f43f5e' },
    sepia: { normal: '#9c836c', selected: '#78350f' },
  };

  const badgeStyles: Record<CanvasTheme, string> = {
    light: 'bg-white/95 text-slate-600 border-slate-200 hover:border-blue-400',
    dark: 'bg-slate-900/95 text-slate-300 border-slate-700 hover:border-blue-400',
    neon: 'bg-gray-950/95 text-cyan-300 border-cyan-800 hover:border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]',
    sepia: 'bg-[#fffdfa]/95 text-[#4a3b2c] border-[#ded3be] hover:border-[#b08968]',
  };

  const currentStroke = selected
    ? strokeColors[theme]?.selected || strokeColors.light.selected
    : strokeColors[theme]?.normal || strokeColors.light.normal;

  const currentBadgeClass = badgeStyles[theme] || badgeStyles.light;

  const handleFinishEdit = () => {
    setIsEditing(false);
    if (typeof data?.onUpdateEdgeLabel === 'function') {
      (data.onUpdateEdgeLabel as (edgeId: string, nextLabel: string) => void)(id, localLabel.trim());
    }
  };

  const hasLabel = Boolean(data?.label || localLabel);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3.5 : 2.5,
          stroke: currentStroke,
          transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan z-10"
        >
          {isEditing && !data?.readOnly ? (
            <input
              type="text"
              value={localLabel}
              onChange={(e) => setLocalLabel(e.target.value)}
              onBlur={handleFinishEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFinishEdit();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              placeholder="e.g. requires, leads to"
              autoFocus
              className="text-[10px] font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-blue-400 rounded-md px-1.5 py-0.5 shadow-md outline-none max-w-[120px]"
              onClick={(e) => e.stopPropagation()}
            />
          ) : hasLabel ? (
            <div
              onDoubleClick={(e) => {
                if (!data?.readOnly) {
                  e.stopPropagation();
                  setIsEditing(true);
                }
              }}
              className={`text-[10px] font-bold border px-1.5 py-0.5 rounded-md shadow-sm transition flex items-center gap-1 cursor-pointer select-none ${currentBadgeClass}`}
              title="Double-click to edit relationship label"
            >
              <span>{(data?.label as string) || localLabel}</span>
            </div>
          ) : selected && !data?.readOnly ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="text-[9px] font-bold bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 hover:bg-blue-50 px-1.5 py-0.5 rounded shadow-sm cursor-pointer transition opacity-80 hover:opacity-100"
              title="Add relationship label"
            >
              + Label
            </button>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
