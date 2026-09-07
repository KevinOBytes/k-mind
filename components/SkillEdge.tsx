import React, { useState } from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react';

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
          stroke: selected ? '#3b82f6' : '#94a3b8',
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease',
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
              className="text-[10px] font-bold bg-white text-slate-800 border border-blue-400 rounded-md px-1.5 py-0.5 shadow-md outline-none max-w-[120px]"
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
              className="text-[10px] font-bold bg-white/95 text-slate-600 border border-slate-200 hover:border-blue-400 px-1.5 py-0.5 rounded-md shadow-sm transition flex items-center gap-1 cursor-pointer select-none"
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
              className="text-[9px] font-bold bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-1.5 py-0.5 rounded shadow-sm cursor-pointer transition opacity-80 hover:opacity-100"
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
