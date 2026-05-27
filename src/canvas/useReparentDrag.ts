import { useCallback, useRef } from 'react';
import type { OnNodeDrag, Node } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import { useOrgStore } from '../store/orgStore';
import { buildChildrenMap, descendants } from '../utils/graph';

export function useReparentDrag() {
  const { getIntersectingNodes } = useReactFlow();
  const store = useOrgStore();
  const descendantSetRef = useRef<Set<string>>(new Set());
  const draggedIdRef = useRef<string | null>(null);

  const onNodeDragStart: OnNodeDrag<Node> = useCallback((_evt, node) => {
    draggedIdRef.current = node.id;
    const childrenMap = buildChildrenMap(store.positions);
    descendantSetRef.current = descendants(node.id, childrenMap);
  }, [store.positions]);

  const onNodeDrag: OnNodeDrag<Node> = useCallback((_evt, node) => {
    if (!draggedIdRef.current) return;
    const dragged = draggedIdRef.current;
    const descSet = descendantSetRef.current;

    const intersecting = getIntersectingNodes(node, true);
    const validTarget = intersecting.find(
      n => n.id !== dragged && !descSet.has(n.id)
    );
    const invalidTarget = intersecting.find(
      n => n.id !== dragged && descSet.has(n.id)
    );

    // Update DOM classes for visual feedback
    document.querySelectorAll('.react-flow__node').forEach(el => {
      el.classList.remove('reparent-valid', 'reparent-invalid');
    });

    if (validTarget) {
      const el = document.querySelector(`.react-flow__node[data-id="${validTarget.id}"]`);
      el?.classList.add('reparent-valid');
    } else if (invalidTarget) {
      const el = document.querySelector(`.react-flow__node[data-id="${invalidTarget.id}"]`);
      el?.classList.add('reparent-invalid');
    }
  }, [getIntersectingNodes]);

  const onNodeDragStop: OnNodeDrag<Node> = useCallback((_evt, node) => {
    const dragged = draggedIdRef.current;
    if (!dragged) return;

    const descSet = descendantSetRef.current;
    const intersecting = getIntersectingNodes(node, true);

    // Clean up visual feedback
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
      return;
    }

    if (validTarget) {
      if (validTarget.id !== currentPos.parentId) {
        store.reparentPosition(dragged, validTarget.id);
      }
    } else {
      // Check if there was an invalid target — reject the drop
      const invalidTarget = intersecting.find(n => n.id !== dragged && descSet.has(n.id));
      if (!invalidTarget) {
        // Dropped on empty canvas — save as manual position
        store.setManualPos(dragged, { x: node.position.x, y: node.position.y });
      }
      // If invalid target: do nothing (React Flow will re-render from store = snap back)
    }

    draggedIdRef.current = null;
    descendantSetRef.current = new Set();
  }, [getIntersectingNodes, store]);

  return { onNodeDragStart, onNodeDrag, onNodeDragStop };
}
