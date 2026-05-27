export interface Discipline {
  id: string;
  name: string;
  color: string; // hex e.g. "#3B82F6"
}

export interface Position {
  id: string;
  name: string;       // person name; "" = vacant
  title: string;      // role title
  disciplineId: string | null;
  parentId: string | null; // null = root
  manualPos: { x: number; y: number } | null;
  notes: string;
}

export interface OrgState {
  positions: Record<string, Position>;
  disciplines: Record<string, Discipline>;
  positionOrder: string[];   // stable insertion order
  disciplineOrder: string[];
  selectedId: string | null;
}
