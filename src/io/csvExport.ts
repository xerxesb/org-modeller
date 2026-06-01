import Papa from 'papaparse';
import type { Discipline, Label, Position } from '../types';

export function exportCSV(
  positions: Record<string, Position>,
  positionOrder: string[],
  disciplines: Record<string, Discipline>,
  disciplineOrder: string[],
  labels: Record<string, Label> = {},
  labelOrder: string[] = []
): string {
  const colorEntries = disciplineOrder
    .map(did => disciplines[did])
    .filter(Boolean)
    .map(d => `${d.name}=${d.color}`)
    .join(';');
  const header = `# discipline-colors: ${colorEntries}\n`;

  const positionRows = positionOrder
    .map(id => positions[id])
    .filter(Boolean)
    .map(pos => ({
      id: pos.id,
      name: pos.name,
      title: pos.title,
      discipline: pos.disciplineId ? (disciplines[pos.disciplineId]?.name ?? '') : '',
      band: pos.band ?? '',
      is_new: pos.isNew ? 'true' : '',
      parent_id: pos.parentId ?? '',
      notes: pos.notes,
      x: pos.manualPos?.x ?? '',
      y: pos.manualPos?.y ?? '',
    }));

  const positionsCsv = Papa.unparse(positionRows, {
    columns: ['id', 'name', 'title', 'discipline', 'band', 'is_new', 'parent_id', 'notes', 'x', 'y'],
  });

  let out = header + '# section: positions\n' + positionsCsv;

  if (labelOrder.length > 0) {
    const labelRows = labelOrder
      .map(id => labels[id])
      .filter(Boolean)
      .map(l => ({
        id: l.id,
        text: l.text,
        x: l.pos.x,
        y: l.pos.y,
        size: l.fontSize,
        color: l.color,
      }));
    const labelsCsv = Papa.unparse(labelRows, {
      columns: ['id', 'text', 'x', 'y', 'size', 'color'],
    });
    out += '\n\n# section: labels\n' + labelsCsv;
  }

  return out;
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
