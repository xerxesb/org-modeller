import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
} from '@xyflow/react';
import { useOrgStore } from '../store/orgStore';
import { computeLayout, buildFlowElements } from '../layout/dagreLayout';
import { PositionNode } from './PositionNode';
import { LabelNode } from './LabelNode';
import { useReparentDrag } from './useReparentDrag';

const nodeTypes = { positionNode: PositionNode, labelNode: LabelNode };

interface OrgCanvasProps {
  subtreeMoveMode: boolean;
}

export function OrgCanvas({ subtreeMoveMode }: OrgCanvasProps) {
  const positions = useOrgStore(s => s.positions);
  const positionOrder = useOrgStore(s => s.positionOrder);
  const disciplines = useOrgStore(s => s.disciplines);
  const labels = useOrgStore(s => s.labels);
  const labelOrder = useOrgStore(s => s.labelOrder);
  const selectedId = useOrgStore(s => s.selectedId);
  const selectedLabelId = useOrgStore(s => s.selectedLabelId);
  const multiSelectedIds = useOrgStore(s => s.multiSelectedIds);
  const selectPosition = useOrgStore(s => s.selectPosition);
  const selectLabel = useOrgStore(s => s.selectLabel);
  const togglePositionMultiSelect = useOrgStore(s => s.togglePositionMultiSelect);

  const { onNodeDragStart, onNodeDrag, onNodeDragStop } = useReparentDrag(subtreeMoveMode);

  const layoutMap = useMemo(
    () => computeLayout(positions, positionOrder),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(Object.fromEntries(
      Object.entries(positions).map(([id, p]) => [id, { parentId: p.parentId }])
    )), positionOrder.join(',')]
  );

  const { nodes, edges } = useMemo(
    () => buildFlowElements(positions, positionOrder, layoutMap, disciplines, labels, labelOrder),
    [positions, positionOrder, layoutMap, disciplines, labels, labelOrder]
  );

  const multiSet = useMemo(() => new Set(multiSelectedIds), [multiSelectedIds]);
  const selectedNodes = useMemo(
    () => nodes.map(n => ({
      ...n,
      selected: n.id === selectedId || n.id === selectedLabelId || multiSet.has(n.id),
    })),
    [nodes, selectedId, selectedLabelId, multiSet]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: { id: string; type?: string }) => {
    if (node.type === 'labelNode') {
      selectLabel(node.id);
      return;
    }
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      togglePositionMultiSelect(node.id);
    } else {
      selectPosition(node.id);
    }
  }, [selectPosition, selectLabel, togglePositionMultiSelect]);

  const onPaneClick = useCallback(() => {
    selectPosition(null);
    selectLabel(null);
  }, [selectPosition, selectLabel]);

  return (
    <ReactFlow
      nodes={selectedNodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      onNodeDragStart={onNodeDragStart}
      onNodeDrag={onNodeDrag}
      onNodeDragStop={onNodeDragStop}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={2}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable
    >
      <Background color="#cbd5e1" gap={20} size={1} />
      <Controls />
      <MiniMap
        nodeColor={(n) => {
          if (n.type === 'labelNode') return '#cbd5e1';
          const pos = positions[n.id];
          const disc = pos?.disciplineId ? disciplines[pos.disciplineId] : null;
          return disc?.color ?? '#94a3b8';
        }}
        maskColor="rgba(241,245,249,0.8)"
      />
    </ReactFlow>
  );
}
