import type { Node, Edge } from '@xyflow/react';
import type { Position } from '../types';

export const NODE_WIDTH = 240;
export const NODE_HEIGHT = 90;
const COL_SPACING = 40;    // horizontal gap between sibling subtrees
const RANK_SPACING = 80;   // vertical gap parent → children area
const ROW_SPACING = 24;    // vertical gap between grid rows
const ROOT_SPACING = 80;   // horizontal gap between disconnected roots
const MARGIN = 40;         // outer margin

const WRAP_THRESHOLD = 2;  // > this children → grid-wrap them
const GRID_COLS = 2;

interface SubtreeLayout {
  positions: Map<string, { x: number; y: number }>;
  width: number;
  height: number;
}

function layoutSubtree(
  id: string,
  childrenMap: Map<string, string[]>
): SubtreeLayout {
  const children = childrenMap.get(id) ?? [];

  if (children.length === 0) {
    const positions = new Map<string, { x: number; y: number }>();
    positions.set(id, { x: 0, y: 0 });
    return { positions, width: NODE_WIDTH, height: NODE_HEIGHT };
  }

  const childLayouts = children.map(cid => layoutSubtree(cid, childrenMap));
  const positions = new Map<string, { x: number; y: number }>();
  const childAreaTopY = NODE_HEIGHT + RANK_SPACING;

  if (children.length <= WRAP_THRESHOLD) {
    // Single row
    let xCursor = 0;
    let maxH = 0;
    for (const child of childLayouts) {
      for (const [nid, p] of child.positions) {
        positions.set(nid, { x: p.x + xCursor, y: p.y + childAreaTopY });
      }
      xCursor += child.width + COL_SPACING;
      maxH = Math.max(maxH, child.height);
    }
    const rowWidth = xCursor - COL_SPACING;
    const totalWidth = Math.max(rowWidth, NODE_WIDTH);
    const totalHeight = childAreaTopY + maxH;

    // Centre root above its children row
    const rootX = (totalWidth - NODE_WIDTH) / 2;
    positions.set(id, { x: rootX, y: 0 });
    return { positions, width: totalWidth, height: totalHeight };
  }

  // > WRAP_THRESHOLD → 2-column grid
  const numRows = Math.ceil(childLayouts.length / GRID_COLS);

  // Column widths = max subtree width within that column
  const colWidths = new Array(GRID_COLS).fill(0);
  for (let i = 0; i < childLayouts.length; i++) {
    const c = i % GRID_COLS;
    colWidths[c] = Math.max(colWidths[c], childLayouts[i].width);
  }

  // Row heights = max subtree height within that row
  const rowHeights = new Array(numRows).fill(0);
  for (let i = 0; i < childLayouts.length; i++) {
    const r = Math.floor(i / GRID_COLS);
    rowHeights[r] = Math.max(rowHeights[r], childLayouts[i].height);
  }

  // Column starting x positions
  const colOffsets = [0];
  for (let c = 1; c < GRID_COLS; c++) {
    colOffsets.push(colOffsets[c - 1] + colWidths[c - 1] + COL_SPACING);
  }

  let yCursor = childAreaTopY;
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const idx = r * GRID_COLS + c;
      if (idx >= childLayouts.length) continue;
      const child = childLayouts[idx];
      // Centre subtree horizontally within its column
      const centerOffset = (colWidths[c] - child.width) / 2;
      for (const [nid, p] of child.positions) {
        positions.set(nid, {
          x: p.x + colOffsets[c] + centerOffset,
          y: p.y + yCursor,
        });
      }
    }
    yCursor += rowHeights[r] + ROW_SPACING;
  }

  const gridWidth = colOffsets[GRID_COLS - 1] + colWidths[GRID_COLS - 1];
  const totalWidth = Math.max(gridWidth, NODE_WIDTH);
  const totalHeight = yCursor - ROW_SPACING;

  const rootX = (totalWidth - NODE_WIDTH) / 2;
  positions.set(id, { x: rootX, y: 0 });

  return { positions, width: totalWidth, height: totalHeight };
}

export function computeLayout(
  positions: Record<string, Position>,
  positionOrder: string[]
): Map<string, { x: number; y: number }> {
  // Build children map (in stable positionOrder)
  const childrenMap = new Map<string, string[]>();
  const roots: string[] = [];
  for (const id of positionOrder) {
    const pos = positions[id];
    if (!pos) continue;
    if (pos.parentId && positions[pos.parentId]) {
      if (!childrenMap.has(pos.parentId)) childrenMap.set(pos.parentId, []);
      childrenMap.get(pos.parentId)!.push(id);
    } else {
      roots.push(id);
    }
  }

  const result = new Map<string, { x: number; y: number }>();
  let xOffset = MARGIN;

  for (const root of roots) {
    const layout = layoutSubtree(root, childrenMap);
    for (const [id, p] of layout.positions) {
      result.set(id, { x: p.x + xOffset, y: p.y + MARGIN });
    }
    xOffset += layout.width + ROOT_SPACING;
  }

  return result;
}

export function buildFlowElements(
  positions: Record<string, Position>,
  positionOrder: string[],
  layoutMap: Map<string, { x: number; y: number }>,
  disciplines: Record<string, import('../types').Discipline>,
  labels: Record<string, import('../types').Label> = {},
  labelOrder: string[] = []
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Labels rendered first so they sit beneath position nodes in z-order
  for (const id of labelOrder) {
    const label = labels[id];
    if (!label) continue;
    nodes.push({
      id,
      type: 'labelNode',
      position: label.pos,
      data: { label },
      draggable: true,
      selectable: true,
      // No fixed width/height — label sizes to its content
    });
  }

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
