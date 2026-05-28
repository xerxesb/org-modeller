import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { Label } from '../types';

interface LabelNodeData {
  label: Label;
  [key: string]: unknown;
}

export const LabelNode = memo(function LabelNode({ data, selected }: NodeProps) {
  const { label } = data as LabelNodeData;
  return (
    <div
      className={`px-3 py-1.5 rounded-lg select-none ${
        selected ? 'ring-2 ring-blue-500' : ''
      }`}
      style={{
        fontSize: `${label.fontSize}px`,
        color: label.color,
        fontWeight: 700,
        lineHeight: 1.15,
        whiteSpace: 'pre-wrap',
        cursor: 'move',
        textShadow: '0 1px 0 rgba(255,255,255,0.6)',
      }}
    >
      {label.text || <span className="italic opacity-60">Empty label</span>}
    </div>
  );
});
