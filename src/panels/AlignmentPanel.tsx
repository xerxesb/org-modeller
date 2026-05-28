import { useOrgStore } from '../store/orgStore';
import type { AlignMode } from '../store/orgStore';

interface AlignButton {
  mode: AlignMode;
  label: string;
  description: string;
  icon: string;
}

const ALIGN_BUTTONS: AlignButton[] = [
  { mode: 'top',     label: 'Align tops',         description: 'Same Y for the top of each box',           icon: '⤒' },
  { mode: 'vcenter', label: 'Align middles (horiz.)', description: 'Same Y for the centre of each box',     icon: '↔' },
  { mode: 'bottom',  label: 'Align bottoms',      description: 'Same Y for the bottom of each box',         icon: '⤓' },
  { mode: 'left',    label: 'Align lefts',        description: 'Same X for the left edge of each box',      icon: '⇤' },
  { mode: 'hcenter', label: 'Align centres (vert.)', description: 'Same X for the centre of each box',     icon: '↕' },
  { mode: 'right',   label: 'Align rights',       description: 'Same X for the right edge of each box',     icon: '⇥' },
];

export function AlignmentPanel() {
  const multiSelectedIds = useOrgStore(s => s.multiSelectedIds);
  const alignSelectedNodes = useOrgStore(s => s.alignSelectedNodes);
  const clearMultiSelect = useOrgStore(s => s.clearMultiSelect);
  const positions = useOrgStore(s => s.positions);

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700 text-sm">
          Align {multiSelectedIds.length} nodes
        </h3>
        <button
          onClick={clearMultiSelect}
          title="Clear selection"
          className="text-slate-400 hover:text-slate-600 text-lg leading-none"
        >
          ×
        </button>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        Shift- or Ctrl-click nodes to add them to the selection. The alignment
        pins each selected node to a manual position.
      </p>

      <div className="grid grid-cols-3 gap-1.5">
        {ALIGN_BUTTONS.map(({ mode, label, description, icon }) => (
          <button
            key={mode}
            onClick={() => alignSelectedNodes(multiSelectedIds, mode)}
            title={description}
            className="flex flex-col items-center gap-0.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-blue-300 rounded-lg px-2 py-2 transition-colors"
          >
            <span className="text-base leading-none">{icon}</span>
            <span className="text-[10px] leading-tight text-center text-slate-500">
              {label}
            </span>
          </button>
        ))}
      </div>

      <div className="border-t border-slate-100 pt-3">
        <div className="text-xs font-medium text-slate-500 mb-1">Selected</div>
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {multiSelectedIds.map(id => {
            const pos = positions[id];
            if (!pos) return null;
            return (
              <li key={id} className="text-xs text-slate-700 truncate">
                {pos.name || <span className="italic text-slate-400">Vacant</span>}
                {pos.title && <span className="text-slate-400"> · {pos.title}</span>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
