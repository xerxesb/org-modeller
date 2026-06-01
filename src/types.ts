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
  band: number | null; // 2-6, null = unset
  isNew: boolean;      // highlight as a newly created role
}

export interface Label {
  id: string;
  text: string;
  pos: { x: number; y: number };
  fontSize: number;   // default 28
  color: string;      // hex
}

export interface OrgState {
  positions: Record<string, Position>;
  disciplines: Record<string, Discipline>;
  labels: Record<string, Label>;
  positionOrder: string[];
  disciplineOrder: string[];
  labelOrder: string[];
  selectedId: string | null;
  selectedLabelId: string | null;
  multiSelectedIds: string[]; // 2+ position nodes selected for bulk actions
}
