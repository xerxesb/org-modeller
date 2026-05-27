import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { Position } from '../types';

const NODE_WIDTH = 240;
const NODE_HEIGHT = 90;

export function computeLayout(
  positions: Record<string, Position>,
  positionOrder: string[]
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 80, marginx: 40, marginy: 40 });

  for (const id of positionOrder) {
    if (positions[id]) {
      g.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }
  }

  for (const id of positionOrder) {
    const pos = positions[id];
    if (pos?.parentId && positions[pos.parentId]) {
      g.setEdge(pos.parentId, id);
    }
  }

  dagre.layout(g);

  const result = new Map<string, { x: number; y: number }>();
  for (const id of positionOrder) {
    if (positions[id]) {
      const node = g.node(id);
      if (node) {
        result.set(id, { x: node.x - NODE_WIDTH / 2, y: node.y - NODE_HEIGHT / 2 });
      }
    }
  }
  return result;
}

export function buildFlowElements(
  positions: Record<string, Position>,
  positionOrder: string[],
  layoutMap: Map<string, { x: number; y: number }>,
  disciplines: Record<string, import('../types').Discipline>
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  for (const id of positionOrder) {
    const pos = positions[id];
    if (!pos) continue;

    const autoPos = layoutMap.get(id) ?? { x: 0, y: 0 };
    const finalPos = pos.manualPos ?? autoPos;

    const discipline = pos.disciplineId ? disciplines[pos.disciplineId] : null;

    nodes.push({
      id,
      type: 'positionNode',
      position: finalPos,
      data: {
        position: pos,
        discipline,
      },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });

    if (pos.parentId && positions[pos.parentId]) {
      edges.push({
        id: `e-${pos.parentId}-${id}`,
        source: pos.parentId,
        target: id,
        type: 'smoothstep',
        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
      });
    }
  }

  return { nodes, edges };
}
