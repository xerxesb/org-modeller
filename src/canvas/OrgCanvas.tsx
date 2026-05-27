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
import { useReparentDrag } from './useReparentDrag';

const nodeTypes = { positionNode: PositionNode };

export function OrgCanvas() {
  const positions = useOrgStore(s => s.positions);
  const positionOrder = useOrgStore(s => s.positionOrder);
  const disciplines = useOrgStore(s => s.disciplines);
  const selectedId = useOrgStore(s => s.selectedId);
  const selectPosition = useOrgStore(s => s.selectPosition);

  const { onNodeDragStart, onNodeDrag, onNodeDragStop } = useReparentDrag();

  const layoutMap = useMemo(
    () => computeLayout(positions, positionOrder),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(Object.fromEntries(
      Object.entries(positions).map(([id, p]) => [id, { parentId: p.parentId }])
    )), positionOrder.join(',')]
  );

  const { nodes, edges } = useMemo(
    () => buildFlowElements(positions, positionOrder, layoutMap, disciplines),
    [positions, positionOrder, layoutMap, disciplines]
  );

  const selectedNodes = useMemo(
    () => nodes.map(n => ({ ...n, selected: n.id === selectedId })),
    [nodes, selectedId]
  );

  const onNodeClick = useCallback((_: unknown, node: { id: string }) => {
    selectPosition(node.id);
  }, [selectPosition]);

  const onPaneClick = useCallback(() => {
    selectPosition(null);
  }, [selectPosition]);

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
          const pos = positions[n.id];
          const disc = pos?.disciplineId ? disciplines[pos.disciplineId] : null;
          return disc?.color ?? '#94a3b8';
        }}
        maskColor="rgba(241,245,249,0.8)"
      />
    </ReactFlow>
  );
}
