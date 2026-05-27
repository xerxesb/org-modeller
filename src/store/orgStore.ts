import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Discipline, OrgState, Position } from '../types';
import { PRESET_DISCIPLINES } from './presets';
import { newId } from '../utils/ids';

interface OrgActions {
  // Positions
  addPosition: (parentId: string | null) => string;
  updatePosition: (id: string, patch: Partial<Omit<Position, 'id'>>) => void;
  deletePosition: (id: string, mode: 'subtree' | 'reparent') => void;
  reparentPosition: (id: string, newParentId: string | null) => void;
  setManualPos: (id: string, pos: { x: number; y: number } | null) => void;
  resetAllManualPos: () => void;

  // Disciplines
  addDiscipline: (name: string, color: string) => string;
  updateDiscipline: (id: string, patch: Partial<Omit<Discipline, 'id'>>) => void;
  deleteDiscipline: (id: string, replacementId: string | null) => void;

  // Selection
  selectPosition: (id: string | null) => void;

  // Bulk replace (import)
  replaceAll: (state: Pick<OrgState, 'positions' | 'disciplines' | 'positionOrder' | 'disciplineOrder'>) => void;
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
    positions[id] = { id, name, title, disciplineId: disciplineByName[disc] ?? null, parentId, manualPos: null, notes: '' };
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
  persist(
    (set) => ({
      positions: SAMPLE_ORG.positions,
      disciplines: initialDisciplines,
      positionOrder: SAMPLE_ORG.positionOrder,
      disciplineOrder: initialDisciplineOrder,
      selectedId: null,

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
        };
        set(s => ({
          positions: { ...s.positions, [id]: pos },
          positionOrder: [...s.positionOrder, id],
          selectedId: id,
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
            // collect all descendants
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
            // reparent children to grandparent
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

      selectPosition: (id) => set({ selectedId: id }),

      replaceAll: (state) => set({ ...state, selectedId: null }),
    }),
    {
      name: 'org-modeller:v1',
    }
  )
);
