import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';
import type { Discipline, Label, OrgState, Position } from '../types';
import { PRESET_DISCIPLINES } from './presets';
import { newId } from '../utils/ids';
import { buildChildrenMap, descendants } from '../utils/graph';
import { computeLayout, NODE_WIDTH, NODE_HEIGHT } from '../layout/dagreLayout';

export type AlignMode = 'top' | 'bottom' | 'left' | 'right' | 'hcenter' | 'vcenter';

interface OrgActions {
  // Positions
  addPosition: (parentId: string | null) => string;
  updatePosition: (id: string, patch: Partial<Omit<Position, 'id'>>) => void;
  deletePosition: (id: string, mode: 'subtree' | 'reparent') => void;
  reparentPosition: (id: string, newParentId: string | null) => void;
  setManualPos: (id: string, pos: { x: number; y: number } | null) => void;
  resetAllManualPos: () => void;
  resetSubtreeManualPos: (rootId: string) => void;

  // Disciplines
  addDiscipline: (name: string, color: string) => string;
  updateDiscipline: (id: string, patch: Partial<Omit<Discipline, 'id'>>) => void;
  deleteDiscipline: (id: string, replacementId: string | null) => void;

  // Labels
  addLabel: (pos: { x: number; y: number }) => string;
  updateLabel: (id: string, patch: Partial<Omit<Label, 'id'>>) => void;
  setLabelPos: (id: string, pos: { x: number; y: number }) => void;
  deleteLabel: (id: string) => void;

  // Selection (positions and labels are mutually exclusive)
  selectPosition: (id: string | null) => void;
  selectLabel: (id: string | null) => void;
  togglePositionMultiSelect: (id: string) => void;
  clearMultiSelect: () => void;

  // Multi-node alignment
  alignSelectedNodes: (ids: string[], mode: AlignMode) => void;

  // Bulk replace (import)
  replaceAll: (state: Pick<OrgState, 'positions' | 'disciplines' | 'labels' | 'positionOrder' | 'disciplineOrder' | 'labelOrder'>) => void;
}

const initialDisciplines: Record<string, Discipline> = {};
const initialDisciplineOrder: string[] = [];
for (const d of PRESET_DISCIPLINES) {
  initialDisciplines[d.id] = d;
  initialDisciplineOrder.push(d.id);
}

const SAMPLE_ORG = buildSampleOrg(initialDisciplines);

function buildSampleOrg(disciplines: Record<string, Discipline>) {
  const disciplineByName = Object.fromEntries(
    Object.values(disciplines).map(d => [d.name, d.id])
  );

  const positions: Record<string, Position> = {};
  const positionOrder: string[] = [];

  function add(name: string, title: string, disc: string, parentId: string | null): string {
    const id = newId('p');
    positions[id] = { id, name, title, disciplineId: disciplineByName[disc] ?? null, parentId, manualPos: null, notes: '', band: null, isNew: false };
    positionOrder.push(id);
    return id;
  }

  const ceo = add('', 'CEO', 'Leadership', null);
  const vpEng = add('', 'VP Engineering', 'Eng Mgmt', ceo);
  const vpProduct = add('', 'VP Product', 'Eng Mgmt', ceo);
  const em1 = add('', 'Engineering Manager', 'Eng Mgmt', vpEng);
  const em2 = add('', 'Engineering Manager', 'Eng Mgmt', vpEng);
  add('', 'Senior Engineer', 'Engineering', em1);
  add('', 'Engineer', 'Engineering', em1);
  add('', 'Senior Engineer', 'Engineering', em2);
  add('', 'Product Manager', 'Product', vpProduct);
  add('', 'Designer', 'Design', vpProduct);
  add('', 'Delivery Manager', 'Delivery', ceo);

  return { positions, positionOrder };
}

export const useOrgStore = create<OrgState & OrgActions>()(
  temporal(
  persist(
    (set) => ({
      positions: SAMPLE_ORG.positions,
      disciplines: initialDisciplines,
      labels: {},
      positionOrder: SAMPLE_ORG.positionOrder,
      disciplineOrder: initialDisciplineOrder,
      labelOrder: [],
      selectedId: null,
      selectedLabelId: null,
      multiSelectedIds: [],

      addPosition: (parentId) => {
        const id = newId('p');
        const pos: Position = {
          id,
          name: '',
          title: 'New Role',
          disciplineId: null,
          parentId,
          manualPos: null,
          notes: '',
          band: null,
          isNew: false,
        };
        set(s => ({
          positions: { ...s.positions, [id]: pos },
          positionOrder: [...s.positionOrder, id],
          selectedId: id,
          selectedLabelId: null,
        }));
        return id;
      },

      updatePosition: (id, patch) => {
        set(s => ({
          positions: {
            ...s.positions,
            [id]: { ...s.positions[id], ...patch },
          },
        }));
      },

      deletePosition: (id, mode) => {
        set(s => {
          const pos = s.positions[id];
          if (!pos) return s;

          if (mode === 'subtree') {
            const toDelete = new Set<string>([id]);
            let changed = true;
            while (changed) {
              changed = false;
              for (const p of Object.values(s.positions)) {
                if (p.parentId && toDelete.has(p.parentId) && !toDelete.has(p.id)) {
                  toDelete.add(p.id);
                  changed = true;
                }
              }
            }
            const newPositions = { ...s.positions };
            const newOrder = s.positionOrder.filter(pid => !toDelete.has(pid));
            for (const pid of toDelete) delete newPositions[pid];
            return {
              positions: newPositions,
              positionOrder: newOrder,
              selectedId: s.selectedId && toDelete.has(s.selectedId) ? null : s.selectedId,
            };
          } else {
            const newPositions = { ...s.positions };
            for (const p of Object.values(newPositions)) {
              if (p.parentId === id) {
                newPositions[p.id] = { ...p, parentId: pos.parentId };
              }
            }
            delete newPositions[id];
            return {
              positions: newPositions,
              positionOrder: s.positionOrder.filter(pid => pid !== id),
              selectedId: s.selectedId === id ? null : s.selectedId,
            };
          }
        });
      },

      reparentPosition: (id, newParentId) => {
        set(s => ({
          positions: {
            ...s.positions,
            [id]: { ...s.positions[id], parentId: newParentId, manualPos: null },
          },
        }));
      },

      setManualPos: (id, pos) => {
        set(s => ({
          positions: {
            ...s.positions,
            [id]: { ...s.positions[id], manualPos: pos },
          },
        }));
      },

      resetAllManualPos: () => {
        set(s => {
          const newPositions = { ...s.positions };
          for (const id of Object.keys(newPositions)) {
            newPositions[id] = { ...newPositions[id], manualPos: null };
          }
          return { positions: newPositions };
        });
      },

      resetSubtreeManualPos: (rootId) => {
        set(s => {
          if (!s.positions[rootId]) return s;
          const childrenMap = buildChildrenMap(s.positions);
          const toReset = descendants(rootId, childrenMap);
          toReset.add(rootId);
          const newPositions = { ...s.positions };
          for (const id of toReset) {
            if (newPositions[id]) {
              newPositions[id] = { ...newPositions[id], manualPos: null };
            }
          }
          return { positions: newPositions };
        });
      },

      addDiscipline: (name, color) => {
        const id = newId('d');
        set(s => ({
          disciplines: { ...s.disciplines, [id]: { id, name, color } },
          disciplineOrder: [...s.disciplineOrder, id],
        }));
        return id;
      },

      updateDiscipline: (id, patch) => {
        set(s => ({
          disciplines: {
            ...s.disciplines,
            [id]: { ...s.disciplines[id], ...patch },
          },
        }));
      },

      deleteDiscipline: (id, replacementId) => {
        set(s => {
          const newPositions = { ...s.positions };
          for (const p of Object.values(newPositions)) {
            if (p.disciplineId === id) {
              newPositions[p.id] = { ...p, disciplineId: replacementId };
            }
          }
          const newDisciplines = { ...s.disciplines };
          delete newDisciplines[id];
          return {
            positions: newPositions,
            disciplines: newDisciplines,
            disciplineOrder: s.disciplineOrder.filter(did => did !== id),
          };
        });
      },

      addLabel: (pos) => {
        const id = newId('l');
        const label: Label = {
          id,
          text: 'Section title',
          pos,
          fontSize: 28,
          color: '#1e293b',
        };
        set(s => ({
          labels: { ...s.labels, [id]: label },
          labelOrder: [...s.labelOrder, id],
          selectedLabelId: id,
          selectedId: null,
        }));
        return id;
      },

      updateLabel: (id, patch) => {
        set(s => ({
          labels: {
            ...s.labels,
            [id]: { ...s.labels[id], ...patch },
          },
        }));
      },

      setLabelPos: (id, pos) => {
        set(s => ({
          labels: {
            ...s.labels,
            [id]: { ...s.labels[id], pos },
          },
        }));
      },

      deleteLabel: (id) => {
        set(s => {
          const newLabels = { ...s.labels };
          delete newLabels[id];
          return {
            labels: newLabels,
            labelOrder: s.labelOrder.filter(lid => lid !== id),
            selectedLabelId: s.selectedLabelId === id ? null : s.selectedLabelId,
          };
        });
      },

      selectPosition: (id) => set({ selectedId: id, selectedLabelId: null, multiSelectedIds: [] }),
      selectLabel: (id) => set({ selectedLabelId: id, selectedId: null, multiSelectedIds: [] }),

      togglePositionMultiSelect: (id) => {
        set(s => {
          if (!s.positions[id]) return s;
          let next = s.multiSelectedIds;
          // Promote current single-selected node into the set
          if (next.length === 0 && s.selectedId && s.selectedId !== id) {
            next = [s.selectedId];
          }
          next = next.includes(id) ? next.filter(i => i !== id) : [...next, id];

          if (next.length === 0) {
            return { multiSelectedIds: [], selectedId: null, selectedLabelId: null };
          }
          if (next.length === 1) {
            return { multiSelectedIds: [], selectedId: next[0], selectedLabelId: null };
          }
          return { multiSelectedIds: next, selectedId: null, selectedLabelId: null };
        });
      },

      clearMultiSelect: () => set({ multiSelectedIds: [] }),

      alignSelectedNodes: (ids, mode) => {
        set(s => {
          if (ids.length < 2) return s;
          const valid = ids.filter(id => s.positions[id]);
          if (valid.length < 2) return s;

          const layoutMap = computeLayout(s.positions, s.positionOrder);

          const items = valid.map(id => {
            const pos = s.positions[id];
            const x = pos.manualPos?.x ?? layoutMap.get(id)?.x ?? 0;
            const y = pos.manualPos?.y ?? layoutMap.get(id)?.y ?? 0;
            return { id, pos, x, y };
          });

          const ys = items.map(i => i.y);
          const xs = items.map(i => i.x);

          let targetX: number | null = null;
          let targetY: number | null = null;
          switch (mode) {
            case 'top':
              targetY = Math.min(...ys);
              break;
            case 'bottom':
              targetY = Math.max(...ys.map(y => y + NODE_HEIGHT)) - NODE_HEIGHT;
              break;
            case 'left':
              targetX = Math.min(...xs);
              break;
            case 'right':
              targetX = Math.max(...xs.map(x => x + NODE_WIDTH)) - NODE_WIDTH;
              break;
            case 'hcenter': {
              // Align vertical centres → same X for each centre
              const centres = items.map(i => i.x + NODE_WIDTH / 2);
              const avg = centres.reduce((a, b) => a + b, 0) / centres.length;
              targetX = avg - NODE_WIDTH / 2;
              break;
            }
            case 'vcenter': {
              // Align horizontal centres → same Y for each centre
              const centres = items.map(i => i.y + NODE_HEIGHT / 2);
              const avg = centres.reduce((a, b) => a + b, 0) / centres.length;
              targetY = avg - NODE_HEIGHT / 2;
              break;
            }
          }

          const newPositions = { ...s.positions };
          for (const item of items) {
            const x = targetX != null ? targetX : item.x;
            const y = targetY != null ? targetY : item.y;
            newPositions[item.id] = { ...item.pos, manualPos: { x, y } };
          }
          return { positions: newPositions };
        });
      },

      replaceAll: (state) => set({ ...state, selectedId: null, selectedLabelId: null, multiSelectedIds: [] }),
    }),
    {
      name: 'org-modeller:v1',
      partialize: (state) => {
        const { selectedId: _s, selectedLabelId: _l, multiSelectedIds: _m, ...rest } = state as OrgState & OrgActions;
        return rest;
      },
    }
  ),
  {
    partialize: (state) => ({
      positions: state.positions,
      disciplines: state.disciplines,
      labels: state.labels,
      positionOrder: state.positionOrder,
      disciplineOrder: state.disciplineOrder,
      labelOrder: state.labelOrder,
    }),
    limit: 50,
  }
));
