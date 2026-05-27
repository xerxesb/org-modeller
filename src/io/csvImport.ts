import Papa from 'papaparse';
import type { Discipline, Position } from '../types';
import { newId } from '../utils/ids';

export interface ImportResult {
  positions: Record<string, Position>;
  disciplines: Record<string, Discipline>;
  positionOrder: string[];
  disciplineOrder: string[];
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
  const csvLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# discipline-colors:')) {
      Object.assign(colorMap, parseColorHeader(trimmed));
    } else if (trimmed.startsWith('#') || trimmed === '') {
      // skip
    } else {
      csvLines.push(line);
    }
  }

  const parsed = Papa.parse<Record<string, string>>(csvLines.join('\n'), {
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

    positions[id] = {
      id,
      name: row['name']?.trim() ?? '',
      title: row['title']?.trim() ?? '',
      disciplineId,
      parentId: row['parent_id']?.trim() || null,
      manualPos,
      notes: row['notes']?.trim() ?? '',
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

  return { positions, disciplines, positionOrder, disciplineOrder, warnings };
}
