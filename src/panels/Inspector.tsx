import { useState } from 'react';
import { useOrgStore } from '../store/orgStore';
import { buildChildrenMap, computeReportCounts } from '../utils/graph';

export function Inspector() {
  const selectedId = useOrgStore(s => s.selectedId);
  const positions = useOrgStore(s => s.positions);
  const disciplines = useOrgStore(s => s.disciplines);
  const disciplineOrder = useOrgStore(s => s.disciplineOrder);
  const updatePosition = useOrgStore(s => s.updatePosition);
  const deletePosition = useOrgStore(s => s.deletePosition);
  const addPosition = useOrgStore(s => s.addPosition);
  const setManualPos = useOrgStore(s => s.setManualPos);
  const selectPosition = useOrgStore(s => s.selectPosition);

  const [deleteMode, setDeleteMode] = useState<'subtree' | 'reparent' | null>(null);

  if (!selectedId) {
    return (
      <div className="p-4 text-slate-400 text-sm text-center">
        Click a node to inspect it
      </div>
    );
  }

  const pos = positions[selectedId];
  if (!pos) return null;

  const childrenMap = buildChildrenMap(positions);
  const hasChildren = (childrenMap.get(selectedId) ?? []).length > 0;
  const { direct, indirect } = computeReportCounts(positions, childrenMap);

  const handleDelete = () => {
    if (hasChildren && !deleteMode) {
      setDeleteMode('subtree');
      return;
    }
    const mode = hasChildren ? deleteMode! : 'subtree';
    deletePosition(selectedId, mode);
    setDeleteMode(null);
    selectPosition(null);
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700 text-sm">Edit Position</h3>
        <button
          onClick={() => selectPosition(null)}
          className="text-slate-400 hover:text-slate-600 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Person Name</label>
        <input
          type="text"
          value={pos.name}
          onChange={e => updatePosition(selectedId, { name: e.target.value })}
          placeholder="Vacant"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Role Title</label>
        <input
          type="text"
          value={pos.title}
          onChange={e => updatePosition(selectedId, { title: e.target.value })}
          placeholder="e.g. Senior Engineer"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Discipline */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Discipline</label>
        <select
          value={pos.disciplineId ?? ''}
          onChange={e => updatePosition(selectedId, { disciplineId: e.target.value || null })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        >
          <option value="">— none —</option>
          {disciplineOrder.map(did => {
            const d = disciplines[did];
            if (!d) return null;
            return (
              <option key={did} value={did}>{d.name}</option>
            );
          })}
        </select>
      </div>

      {/* New role flag */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-500">Mark as new role</label>
        <button
          onClick={() => updatePosition(selectedId, { isNew: !pos.isNew })}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
            pos.isNew ? 'bg-emerald-400' : 'bg-slate-200'
          }`}
          role="switch"
          aria-checked={pos.isNew ?? false}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
              pos.isNew ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Band */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Band</label>
        <select
          value={pos.band ?? ''}
          onChange={e => updatePosition(selectedId, { band: e.target.value === '' ? null : parseInt(e.target.value, 10) })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        >
          <option value="">— none —</option>
          {[2, 3, 4, 5, 6].map(b => (
            <option key={b} value={b}>Band {b}</option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
        <textarea
          value={pos.notes}
          onChange={e => updatePosition(selectedId, { notes: e.target.value })}
          placeholder="Optional notes"
          rows={2}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
      </div>

      {/* Report counts */}
      <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-500 space-y-0.5">
        <div>Direct reports: <span className="font-semibold text-slate-700">{direct.get(selectedId) ?? 0}</span></div>
        <div>Indirect reports: <span className="font-semibold text-slate-700">{indirect.get(selectedId) ?? 0}</span></div>
      </div>

      {/* Manual position */}
      {pos.manualPos && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-600 font-medium">● Manually positioned</span>
          <button
            onClick={() => setManualPos(selectedId, null)}
            className="text-xs text-blue-500 hover:underline"
          >
            Reset
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => addPosition(selectedId)}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg px-3 py-2 transition-colors"
        >
          + Add Child
        </button>
      </div>

      {/* Delete */}
      {!deleteMode ? (
        <button
          onClick={handleDelete}
          className="w-full bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg px-3 py-2 transition-colors border border-red-100"
        >
          Delete Position
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-600">This position has reports. What should happen to them?</p>
          <div className="flex gap-2">
            <button
              onClick={() => { deletePosition(selectedId, 'subtree'); selectPosition(null); setDeleteMode(null); }}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg px-2 py-2 transition-colors"
            >
              Delete subtree
            </button>
            <button
              onClick={() => { deletePosition(selectedId, 'reparent'); selectPosition(null); setDeleteMode(null); }}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg px-2 py-2 transition-colors"
            >
              Move up
            </button>
          </div>
          <button
            onClick={() => setDeleteMode(null)}
            className="w-full text-xs text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
