import type { Position } from '../types';

export function buildChildrenMap(positions: Record<string, Position>): Map<string | null, string[]> {
  const map = new Map<string | null, string[]>();
  for (const pos of Object.values(positions)) {
    const parent = pos.parentId;
    if (!map.has(parent)) map.set(parent, []);
    map.get(parent)!.push(pos.id);
  }
  return map;
}

export function descendants(id: string, childrenMap: Map<string | null, string[]>): Set<string> {
  const result = new Set<string>();
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    const children = childrenMap.get(cur) ?? [];
    for (const c of children) {
      result.add(c);
      queue.push(c);
    }
  }
  return result;
}

export function computeReportCounts(
  positions: Record<string, Position>,
  childrenMap: Map<string | null, string[]>
): { direct: Map<string, number>; indirect: Map<string, number> } {
  const direct = new Map<string, number>();
  const indirect = new Map<string, number>();

  function visit(id: string): number {
    const children = childrenMap.get(id) ?? [];
    direct.set(id, children.length);
    let total = children.length;
    for (const c of children) {
      total += visit(c);
    }
    indirect.set(id, total - children.length); // indirect = total descendants - direct
    return total;
  }

  // Find roots
  for (const id of Object.keys(positions)) {
    if (!positions[id].parentId) {
      visit(id);
    }
  }

  return { direct, indirect };
}
