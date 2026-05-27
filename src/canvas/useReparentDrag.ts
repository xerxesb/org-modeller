import { useCallback, useRef } from 'react';
import type { OnNodeDrag, Node } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import { useOrgStore } from '../store/orgStore';
import { buildChildrenMap, descendants } from '../utils/graph';

export function useReparentDrag(subtreeMoveMode: boolean) {
  const { getIntersectingNodes, setNodes, getNodes } = useReactFlow();
  const store = useOrgStore();
  const descendantSetRef = useRef<Set<string>>(new Set());
  const draggedIdRef = useRef<string | null>(null);
  // Original positions of dragged node + all descendants at drag start
  const origPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const onNodeDragStart: OnNodeDrag<Node> = useCallback((_evt, node) => {
    draggedIdRef.current = node.id;
    const childrenMap = buildChildrenMap(store.positions);
    descendantSetRef.current = descendants(node.id, childrenMap);

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
  }, [store.positions, subtreeMoveMode, getNodes]);

  const onNodeDrag: OnNodeDrag<Node> = useCallback((_evt, node) => {
    if (!draggedIdRef.current) return;
    const dragged = draggedIdRef.current;
    const descSet = descendantSetRef.current;

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

    // Reparent drop-target feedback (only meaningful when NOT in subtree mode,
    // but we still show it so the user knows what a drop would do)
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

    const descSet = descendantSetRef.current;
    const intersecting = getIntersectingNodes(node, true);

    document.querySelectorAll('.reparent-valid, .reparent-invalid').forEach(el => {
      el.classList.remove('reparent-valid', 'reparent-invalid');
    });

    const validTarget = intersecting
      .filter(n => n.id !== dragged && !descSet.has(n.id))
      .sort((a, b) => {
        const cx = node.position.x + (node.measured?.width ?? 240) / 2;
        const cy = node.position.y + (node.measured?.height ?? 90) / 2;
        const dx1 = (a.position.x + (a.measured?.width ?? 240) / 2) - cx;
        const dy1 = (a.position.y + (a.measured?.height ?? 90) / 2) - cy;
        const dx2 = (b.position.x + (b.measured?.width ?? 240) / 2) - cx;
        const dy2 = (b.position.y + (b.measured?.height ?? 90) / 2) - cy;
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
      // Reparent: clear manualPos on dragged node so it snaps into new branch.
      // In subtree mode, also clear manualPos on all descendants so they re-layout.
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
        // Dropped on canvas — save manual position for dragged node
        store.setManualPos(dragged, { x: node.position.x, y: node.position.y });

        // In subtree mode, also save shifted positions for all descendants
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
      // Invalid target: snap back (React Flow re-renders from store)
    }

    draggedIdRef.current = null;
    descendantSetRef.current = new Set();
    origPositionsRef.current = new Map();
  }, [getIntersectingNodes, store, subtreeMoveMode]);

  return { onNodeDragStart, onNodeDrag, onNodeDragStop };
}
