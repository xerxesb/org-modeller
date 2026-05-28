import { useOrgStore } from '../store/orgStore';

export function LabelInspector() {
  const selectedLabelId = useOrgStore(s => s.selectedLabelId);
  const labels = useOrgStore(s => s.labels);
  const updateLabel = useOrgStore(s => s.updateLabel);
  const deleteLabel = useOrgStore(s => s.deleteLabel);
  const selectLabel = useOrgStore(s => s.selectLabel);

  if (!selectedLabelId) return null;
  const label = labels[selectedLabelId];
  if (!label) return null;

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700 text-sm">Edit Label</h3>
        <button
          onClick={() => selectLabel(null)}
          className="text-slate-400 hover:text-slate-600 text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Text</label>
        <textarea
          value={label.text}
          onChange={e => updateLabel(selectedLabelId, { text: e.target.value })}
          rows={3}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Font size: {label.fontSize}px
        </label>
        <input
          type="range"
          min={12}
          max={72}
          value={label.fontSize}
          onChange={e => updateLabel(selectedLabelId, { fontSize: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Colour</label>
        <input
          type="color"
          value={label.color}
          onChange={e => updateLabel(selectedLabelId, { color: e.target.value })}
          className="w-full h-9 rounded cursor-pointer border border-slate-200 p-1"
        />
      </div>

      <button
        onClick={() => deleteLabel(selectedLabelId)}
        className="w-full bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg px-3 py-2 transition-colors border border-red-100"
      >
        Delete Label
      </button>
    </div>
  );
}
