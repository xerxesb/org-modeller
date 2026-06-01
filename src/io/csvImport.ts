import Papa from 'papaparse';
import type { Discipline, Label, Position } from '../types';
import { newId } from '../utils/ids';

export interface ImportResult {
  positions: Record<string, Position>;
  disciplines: Record<string, Discipline>;
  labels: Record<string, Label>;
  positionOrder: string[];
  disciplineOrder: string[];
  labelOrder: string[];
  warnings: string[];
}

export interface ImportError {
  error: string;
}

function parseColorHeader(line: string): Record<string, string> {
  // e.g. # discipline-colors: Engineering=#3B82F6;Product=#10B981
  const match = line.match(/^#\s*discipline-colors:\s*(.+)$/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const entry of match[1].split(';')) {
    const [name, color] = entry.trim().split('=');
    if (name && color) result[name.trim()] = color.trim();
  }
  return result;
}

export function importCSV(raw: string): ImportResult | ImportError {
  const lines = raw.split('\n');
  const colorMap: Record<string, string> = {};
  const positionLines: string[] = [];
  const labelLines: string[] = [];
  let section: 'positions' | 'labels' = 'positions';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# discipline-colors:')) {
      Object.assign(colorMap, parseColorHeader(trimmed));
      continue;
    }
    if (/^#\s*section:\s*labels/i.test(trimmed)) {
      section = 'labels';
      continue;
    }
    if (/^#\s*section:\s*positions/i.test(trimmed)) {
      section = 'positions';
      continue;
    }
    if (trimmed.startsWith('#') || trimmed === '') continue;
    if (section === 'labels') {
      labelLines.push(line);
    } else {
      positionLines.push(line);
    }
  }

  const parsed = Papa.parse<Record<string, string>>(positionLines.join('\n'), {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    return { error: `CSV parse error: ${parsed.errors[0].message}` };
  }

  const warnings: string[] = [];
  const disciplines: Record<string, Discipline> = {};
  const disciplineOrder: string[] = [];
  const disciplineByName: Record<string, string> = {}; // name → id

  // Build disciplines from color map
  for (const [name, color] of Object.entries(colorMap)) {
    const id = newId('d');
    disciplines[id] = { id, name, color };
    disciplineOrder.push(id);
    disciplineByName[name] = id;
  }

  const rows = parsed.data;
  const positions: Record<string, Position> = {};
  const positionOrder: string[] = [];
  const seenIds = new Set<string>();

  // First pass — validate and collect
  const rawRows: Array<{ id: string; row: Record<string, string>; lineNum: number }> = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let id = row['id']?.trim();
    if (!id) {
      id = newId('p');
      warnings.push(`Row ${i + 2}: missing id, generated ${id}`);
    }
    if (seenIds.has(id)) {
      return { error: `Duplicate id "${id}" on row ${i + 2}` };
    }
    seenIds.add(id);
    rawRows.push({ id, row, lineNum: i + 2 });
  }

  // Second pass — build positions
  for (const { id, row } of rawRows) {
    const discName = row['discipline']?.trim() ?? '';
    let disciplineId: string | null = null;

    if (discName) {
      if (disciplineByName[discName]) {
        disciplineId = disciplineByName[discName];
      } else {
        // Create with default colour
        const newDid = newId('d');
        const color = '#94a3b8';
        disciplines[newDid] = { id: newDid, name: discName, color };
        disciplineOrder.push(newDid);
        disciplineByName[discName] = newDid;
        disciplineId = newDid;
        warnings.push(`Unknown discipline "${discName}" — created with default colour`);
      }
    }

    const xRaw = row['x']?.trim();
    const yRaw = row['y']?.trim();
    const manualPos = xRaw && yRaw
      ? { x: parseFloat(xRaw), y: parseFloat(yRaw) }
      : null;

    const bandRaw = row['band']?.trim();
    let band: number | null = null;
    if (bandRaw) {
      const parsed = parseInt(bandRaw, 10);
      if (Number.isFinite(parsed) && parsed >= 2 && parsed <= 6) {
        band = parsed;
      } else {
        warnings.push(`Row for "${id}": invalid band "${bandRaw}" (expected 2-6) — ignored`);
      }
    }

    positions[id] = {
      id,
      name: row['name']?.trim() ?? '',
      title: row['title']?.trim() ?? '',
      disciplineId,
      parentId: row['parent_id']?.trim() || null,
      manualPos,
      notes: row['notes']?.trim() ?? '',
      band,
      isNew: row['is_new']?.trim().toLowerCase() === 'true',
    };
    positionOrder.push(id);
  }

  // Validate parent refs
  for (const pos of Object.values(positions)) {
    if (pos.parentId && !positions[pos.parentId]) {
      warnings.push(`Position "${pos.id}" references unknown parent "${pos.parentId}" — treated as root`);
      pos.parentId = null;
    }
  }

  // Cycle detection
  function hasCycle(): string | null {
    const visited = new Set<string>();
    const inStack = new Set<string>();

    function dfs(id: string): string | null {
      if (inStack.has(id)) return id;
      if (visited.has(id)) return null;
      visited.add(id);
      inStack.add(id);
      const pos = positions[id];
      if (pos.parentId) {
        const result = dfs(pos.parentId);
        if (result) return result;
      }
      inStack.delete(id);
      return null;
    }

    for (const id of Object.keys(positions)) {
      const cycle = dfs(id);
      if (cycle) return cycle;
    }
    return null;
  }

  const cycleNode = hasCycle();
  if (cycleNode) {
    return { error: `Cycle detected involving position "${cycleNode}"` };
  }

  const labels: Record<string, Label> = {};
  const labelOrder: string[] = [];
  if (labelLines.length > 0) {
    const parsedLabels = Papa.parse<Record<string, string>>(labelLines.join('\n'), {
      header: true,
      skipEmptyLines: true,
    });
    if (parsedLabels.errors.length === 0) {
      for (const row of parsedLabels.data) {
        const id = row['id']?.trim() || newId('l');
        if (labels[id]) continue;
        const x = parseFloat(row['x'] ?? '');
        const y = parseFloat(row['y'] ?? '');
        const size = parseInt(row['size'] ?? '', 10);
        labels[id] = {
          id,
          text: row['text'] ?? '',
          pos: {
            x: Number.isFinite(x) ? x : 0,
            y: Number.isFinite(y) ? y : 0,
          },
          fontSize: Number.isFinite(size) ? size : 28,
          color: row['color']?.trim() || '#1e293b',
        };
        labelOrder.push(id);
      }
    } else {
      warnings.push(`Labels section parse error: ${parsedLabels.errors[0].message}`);
    }
  }

  return { positions, disciplines, labels, positionOrder, disciplineOrder, labelOrder, warnings };
}
