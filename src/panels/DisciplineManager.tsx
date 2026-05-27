import { useState } from 'react';
import { useOrgStore } from '../store/orgStore';

export function DisciplineManager() {
  const disciplines = useOrgStore(s => s.disciplines);
  const disciplineOrder = useOrgStore(s => s.disciplineOrder);
  const addDiscipline = useOrgStore(s => s.addDiscipline);
  const updateDiscipline = useOrgStore(s => s.updateDiscipline);
  const deleteDiscipline = useOrgStore(s => s.deleteDiscipline);
  const positions = useOrgStore(s => s.positions);

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#94a3b8');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replacementId, setReplacementId] = useState<string>('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    addDiscipline(newName.trim(), newColor);
    setNewName('');
    setNewColor('#94a3b8');
  };

  const usageCount = (did: string) =>
    Object.values(positions).filter(p => p.disciplineId === did).length;

  return (
    <div className="p-4 space-y-3 overflow-y-auto">
      <h3 className="font-semibold text-slate-700 text-sm">Disciplines</h3>

      <div className="space-y-1.5">
        {disciplineOrder.map(did => {
          const d = disciplines[did];
          if (!d) return null;
          const count = usageCount(did);
          return (
            <div key={did} className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1.5">
              <input
                type="color"
                value={d.color}
                onChange={e => updateDiscipline(did, { color: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                title="Change colour"
              />
              <input
                type="text"
                value={d.name}
                onChange={e => updateDiscipline(did, { name: e.target.value })}
                className="flex-1 text-sm bg-transparent border-0 focus:outline-none text-slate-700 min-w-0"
              />
              <span className="text-xs text-slate-400 shrink-0">{count}</span>
              <button
                onClick={() => {
                  if (count > 0) {
                    setDeletingId(did);
                    setReplacementId('');
                  } else {
                    deleteDiscipline(did, null);
                  }
                }}
                className="text-slate-300 hover:text-red-400 text-sm shrink-0"
                title="Delete"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation with reassignment */}
      {deletingId && disciplines[deletingId] && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
          <p className="text-xs text-red-700">
            "{disciplines[deletingId].name}" is used by {usageCount(deletingId)} positions. Reassign to:
          </p>
          <select
            value={replacementId}
            onChange={e => setReplacementId(e.target.value)}
            className="w-full text-xs border border-red-200 rounded px-2 py-1 bg-white"
          >
            <option value="">— none —</option>
            {disciplineOrder
              .filter(did => did !== deletingId)
              .map(did => (
                <option key={did} value={did}>{disciplines[did]?.name}</option>
              ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => {
                deleteDiscipline(deletingId, replacementId || null);
                setDeletingId(null);
              }}
              className="flex-1 bg-red-500 text-white text-xs rounded px-2 py-1 hover:bg-red-600"
            >
              Confirm
            </button>
            <button
              onClick={() => setDeletingId(null)}
              className="flex-1 text-xs text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add new */}
      <div className="border-t border-slate-100 pt-3 space-y-2">
        <p className="text-xs font-medium text-slate-500">Add discipline</p>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={newColor}
            onChange={e => setNewColor(e.target.value)}
            className="w-7 h-7 rounded cursor-pointer border-0 p-0 shrink-0"
          />
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Name"
            className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-0"
          />
          <button
            onClick={handleAdd}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg px-3 py-1.5 transition-colors shrink-0"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
