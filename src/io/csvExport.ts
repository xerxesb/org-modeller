import Papa from 'papaparse';
import type { Discipline, Position } from '../types';

export function exportCSV(
  positions: Record<string, Position>,
  positionOrder: string[],
  disciplines: Record<string, Discipline>,
  disciplineOrder: string[]
): string {
  // Discipline colour header
  const colorEntries = disciplineOrder
    .map(did => disciplines[did])
    .filter(Boolean)
    .map(d => `${d.name}=${d.color}`)
    .join(';');
  const header = `# discipline-colors: ${colorEntries}\n`;

  const rows = positionOrder
    .map(id => positions[id])
    .filter(Boolean)
    .map(pos => ({
      id: pos.id,
      name: pos.name,
      title: pos.title,
      discipline: pos.disciplineId ? (disciplines[pos.disciplineId]?.name ?? '') : '',
      parent_id: pos.parentId ?? '',
      notes: pos.notes,
      x: pos.manualPos?.x ?? '',
      y: pos.manualPos?.y ?? '',
    }));

  const csv = Papa.unparse(rows, {
    columns: ['id', 'name', 'title', 'discipline', 'parent_id', 'notes', 'x', 'y'],
  });

  return header + csv;
}

export function downloadCSV(content: string, filename?: string) {
  const date = new Date().toISOString().slice(0, 10);
  const name = filename ?? `org-chart-${date}.csv`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
