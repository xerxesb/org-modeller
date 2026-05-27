import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { Discipline, Position as OrgPosition } from '../types';
import { useOrgStore } from '../store/orgStore';
import { buildChildrenMap, computeReportCounts } from '../utils/graph';

interface PositionNodeData {
  position: OrgPosition;
  discipline: Discipline | null;
  [key: string]: unknown;
}

export const PositionNode = memo(function PositionNode({ data, selected }: NodeProps) {
  const { position, discipline } = data as PositionNodeData;
  const positions = useOrgStore(s => s.positions);
  const childrenMap = buildChildrenMap(positions);
  const { direct, indirect } = computeReportCounts(positions, childrenMap);

  const directCount = direct.get(position.id) ?? 0;
  const indirectCount = indirect.get(position.id) ?? 0;
  const isManual = position.manualPos !== null;

  const color = discipline?.color ?? '#94a3b8';

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden w-60 ${
        selected ? 'border-blue-500 shadow-md' : 'border-slate-200'
      }`}
    >
      {/* Discipline colour band */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: color }}
      />

      <div className="px-3 py-2.5">
        {/* Name */}
        <div className="font-semibold text-slate-800 text-sm leading-tight truncate">
          {position.name || <span className="italic text-slate-400">Vacant</span>}
        </div>

        {/* Title */}
        <div className="text-xs text-slate-500 mt-0.5 leading-tight truncate">
          {position.title || <span className="italic">No role set</span>}
        </div>

        {/* Reports + discipline */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            {discipline && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium leading-none"
                style={{ backgroundColor: color }}
              >
                {discipline.name}
              </span>
            )}
          </div>
          {(directCount > 0 || indirectCount > 0) && (
            <div className="text-xs text-slate-400 shrink-0 ml-1">
              {directCount}
              {indirectCount > 0 && (
                <span className="text-slate-300"> +{indirectCount}</span>
              )}
            </div>
          )}
        </div>

        {isManual && (
          <div className="mt-1">
            <span className="text-xs text-amber-500 font-medium">● manual</span>
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-slate-300 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-slate-300 !border-0" />
    </div>
  );
});
