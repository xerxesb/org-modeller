import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';

interface DragOutlineData {
  width: number;
  height: number;
  [key: string]: unknown;
}

export const DragOutlineNode = memo(function DragOutlineNode({ data }: NodeProps) {
  const { width, height } = data as DragOutlineData;
  return (
    <div
      className="rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/30 pointer-events-none"
      style={{ width, height }}
    />
  );
});
