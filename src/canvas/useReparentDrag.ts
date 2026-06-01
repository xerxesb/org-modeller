import { useCallback, useRef, useState } from 'react';
import type { OnNodeDrag, Node } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import { useOrgStore } from '../store/orgStore';
import { buildChildrenMap, descendants } from '../utils/graph';
import { NODE_WIDTH, NODE_HEIGHT } from '../layout/dagreLayout';

export interface DragOutline {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useReparentDrag(subtreeMoveMode: boolean) {
  const { getIntersectingNodes, setNodes, getNodes } = useReactFlow();
  const store = useOrgStore();
  const descendantSetRef = useRef<Set<string>>(new Set());
  const draggedIdRef = useRef<string | null>(null);
  // Original positions of dragged node + all descendants/group members at drag start
  const origPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const isMultiDragRef = useRef(false);
  const multiDragIdsRef = useRef<string[]>([]);
  const [dragOutline, setDragOutline] = useState<DragOutline | null>(null);

  const computeOutline = (ids: string[], origins: Map<string, { x: number; y: number }>, dx: number, dy: number): DragOutline | null => {
    if (ids.length < 2) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const id of ids) {
      const o = origins.get(id);
      if (!o) continue;
      const x = o.x + dx;
      const y = o.y + dy;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + NODE_WIDTH);
      maxY = Math.max(maxY, y + NODE_HEIGHT);
    }
    if (!Number.isFinite(minX)) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  };

  const onNodeDragStart: OnNodeDrag<Node> = useCallback((_evt, node) => {
    // Labels are simple — no reparent / subtree / group logic
    if (node.type === 'labelNode') {
      draggedIdRef.current = node.id;
      descendantSetRef.current = new Set();
      origPositionsRef.current = new Map();
      isMultiDragRef.current = false;
      multiDragIdsRef.current = [];
      return;
    }

    draggedIdRef.current = node.id;
    const childrenMap = buildChildrenMap(store.positions);
    descendantSetRef.current = descendants(node.id, childrenMap);

    // Group drag: only when the grabbed node is part of a 2+ multi-selection
    const multi = store.multiSelectedIds;
    if (multi.length >= 2 && multi.includes(node.id)) {
      isMultiDragRef.current = true;
      multiDragIdsRef.current = [...multi];
      const originals = new Map<string, { x: number; y: number }>();
      for (const n of getNodes()) {
        if (multi.includes(n.id)) {
          originals.set(n.id, { x: n.position.x, y: n.position.y });
        }
      }
      origPositionsRef.current = originals;
      setDragOutline(computeOutline(multi, originals, 0, 0));
      return;
    }

    isMultiDragRef.current = false;
    multiDragIdsRef.current = [];

    if (subtreeMoveMode) {
      const originals = new Map<string, { x: number; y: number }>();
      originals.set(node.id, { x: node.position.x, y: node.position.y });
      for (const n of getNodes()) {
        if (descendantSetRef.current.has(n.id)) {
          originals.set(n.id, { x: n.position.x, y: n.position.y });
        }
      }
      origPositionsRef.current = originals;
    }
  }, [store.positions, store.multiSelectedIds, subtreeMoveMode, getNodes]);

  const onNodeDrag: OnNodeDrag<Node> = useCallback((_evt, node) => {
    if (!draggedIdRef.current) return;
    if (node.type === 'labelNode') return;

    const dragged = draggedIdRef.current;
    const descSet = descendantSetRef.current;

    // Group drag: move all multi-selected nodes by the same delta as the grabbed node
    if (isMultiDragRef.current) {
      const ids = multiDragIdsRef.current;
      const orig = origPositionsRef.current.get(dragged);
      if (orig) {
        const dx = node.position.x - orig.x;
        const dy = node.position.y - orig.y;
        const idSet = new Set(ids);
        setNodes(ns => ns.map(n => {
          if (n.id === dragged || !idSet.has(n.id)) return n;
          const o = origPositionsRef.current.get(n.id);
          if (!o) return n;
          return { ...n, position: { x: o.x + dx, y: o.y + dy } };
        }));
        setDragOutline(computeOutline(ids, origPositionsRef.current, dx, dy));
      }
      // Skip reparent feedback when dragging a group
      return;
    }

    // Subtree visual: shift descendants by same delta as dragged node
    if (subtreeMoveMode && origPositionsRef.current.size > 0) {
      const orig = origPositionsRef.current.get(dragged);
      if (orig) {
        const dx = node.position.x - orig.x;
        const dy = node.position.y - orig.y;
        setNodes(ns => ns.map(n => {
          if (!descSet.has(n.id)) return n;
          const o = origPositionsRef.current.get(n.id);
          if (!o) return n;
          return { ...n, position: { x: o.x + dx, y: o.y + dy } };
        }));
      }
    }

    // Reparent drop-target feedback
    const intersecting = getIntersectingNodes(node, true);
    const validTarget = intersecting.find(n => n.id !== dragged && !descSet.has(n.id));
    const invalidTarget = intersecting.find(n => n.id !== dragged && descSet.has(n.id));

    document.querySelectorAll('.react-flow__node').forEach(el => {
      el.classList.remove('reparent-valid', 'reparent-invalid');
    });
    if (validTarget) {
      document.querySelector(`.react-flow__node[data-id="${validTarget.id}"]`)?.classList.add('reparent-valid');
    } else if (invalidTarget) {
      document.querySelector(`.react-flow__node[data-id="${invalidTarget.id}"]`)?.classList.add('reparent-invalid');
    }
  }, [getIntersectingNodes, setNodes, subtreeMoveMode]);

  const onNodeDragStop: OnNodeDrag<Node> = useCallback((_evt, node) => {
    const dragged = draggedIdRef.current;
    if (!dragged) return;

    if (node.type === 'labelNode') {
      store.setLabelPos(dragged, { x: node.position.x, y: node.position.y });
      draggedIdRef.current = null;
      return;
    }

    // Group drag: save manualPos for every multi-selected node and skip reparent
    if (isMultiDragRef.current) {
      const ids = multiDragIdsRef.current;
      const orig = origPositionsRef.current.get(dragged);
      if (orig) {
        const dx = node.position.x - orig.x;
        const dy = node.position.y - orig.y;
        for (const id of ids) {
          const o = origPositionsRef.current.get(id);
          if (o) store.setManualPos(id, { x: o.x + dx, y: o.y + dy });
        }
      }
      isMultiDragRef.current = false;
      multiDragIdsRef.current = [];
      draggedIdRef.current = null;
      descendantSetRef.current = new Set();
      origPositionsRef.current = new Map();
      setDragOutline(null);
      return;
    }

    const descSet = descendantSetRef.current;
    const intersecting = getIntersectingNodes(node, true);

    document.querySelectorAll('.reparent-valid, .reparent-invalid').forEach(el => {
      el.classList.remove('reparent-valid', 'reparent-invalid');
    });

    const validTarget = intersecting
      .filter(n => n.id !== dragged && !descSet.has(n.id))
      .sort((a, b) => {
        const cx = node.position.x + (node.measured?.width ?? NODE_WIDTH) / 2;
        const cy = node.position.y + (node.measured?.height ?? NODE_HEIGHT) / 2;
        const dx1 = (a.position.x + (a.measured?.width ?? NODE_WIDTH) / 2) - cx;
        const dy1 = (a.position.y + (a.measured?.height ?? NODE_HEIGHT) / 2) - cy;
        const dx2 = (b.position.x + (b.measured?.width ?? NODE_WIDTH) / 2) - cx;
        const dy2 = (b.position.y + (b.measured?.height ?? NODE_HEIGHT) / 2) - cy;
        return (dx1 * dx1 + dy1 * dy1) - (dx2 * dx2 + dy2 * dy2);
      })[0];

    const currentPos = store.positions[dragged];
    if (!currentPos) {
      draggedIdRef.current = null;
      descendantSetRef.current = new Set();
      origPositionsRef.current = new Map();
      return;
    }

    if (validTarget) {
      if (validTarget.id !== currentPos.parentId) {
        store.reparentPosition(dragged, validTarget.id);
        if (subtreeMoveMode) {
          for (const descId of descSet) {
            store.setManualPos(descId, null);
          }
        }
      }
    } else {
      const invalidTarget = intersecting.find(n => n.id !== dragged && descSet.has(n.id));
      if (!invalidTarget) {
        store.setManualPos(dragged, { x: node.position.x, y: node.position.y });

        if (subtreeMoveMode) {
          const orig = origPositionsRef.current.get(dragged);
          if (orig) {
            const dx = node.position.x - orig.x;
            const dy = node.position.y - orig.y;
            for (const descId of descSet) {
              const o = origPositionsRef.current.get(descId);
              if (o) store.setManualPos(descId, { x: o.x + dx, y: o.y + dy });
            }
          }
        }
      }
    }

    draggedIdRef.current = null;
    descendantSetRef.current = new Set();
    origPositionsRef.current = new Map();
  }, [getIntersectingNodes, store, subtreeMoveMode]);

  return { onNodeDragStart, onNodeDrag, onNodeDragStop, dragOutline };
}
