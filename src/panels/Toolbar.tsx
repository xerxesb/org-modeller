import { useState } from 'react';
import { useStore } from 'zustand';
import { useReactFlow } from '@xyflow/react';
import { useOrgStore } from '../store/orgStore';
import { exportPNG } from '../io/pngExport';
import { CsvEditor } from './CsvEditor';

interface Props {
  onShowDisciplines: () => void;
  showDisciplines: boolean;
  subtreeMoveMode: boolean;
  onToggleSubtreeMove: () => void;
}

export function Toolbar({ onShowDisciplines, showDisciplines, subtreeMoveMode, onToggleSubtreeMove }: Props) {
  const positions = useOrgStore(s => s.positions);
  const addPosition = useOrgStore(s => s.addPosition);
  const addLabel = useOrgStore(s => s.addLabel);
  const resetAllManualPos = useOrgStore(s => s.resetAllManualPos);
  const resetSubtreeManualPos = useOrgStore(s => s.resetSubtreeManualPos);
  const selectedId = useOrgStore(s => s.selectedId);

  const [toast, setToast] = useState<{ type: 'error' | 'warning' | 'success'; message: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showCsvEditor, setShowCsvEditor] = useState(false);

  const flowInstance = useReactFlow();
  const undo = useStore(useOrgStore.temporal, s => s.undo);
  const canUndo = useStore(useOrgStore.temporal, s => s.pastStates.length > 0);

  const showToast = (type: 'error' | 'warning' | 'success', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleExportPNG = async () => {
    setExporting(true);
    try {
      await exportPNG(flowInstance);
    } catch (err) {
      showToast('error', `PNG export failed: ${err}`);
    } finally {
      setExporting(false);
    }
  };

  const handleResetLayout = () => {
    if (selectedId && positions[selectedId]) {
      resetSubtreeManualPos(selectedId);
    } else {
      resetAllManualPos();
      setTimeout(() => flowInstance.fitView({ padding: 0.2, duration: 400 }), 50);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-slate-200 shadow-sm flex-wrap">
        {/* Brand */}
        <span className="font-bold text-slate-700 text-sm mr-2">Org Modeller</span>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => addPosition(null)}
            className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
          >
            + Add Root
          </button>

          <button
            onClick={() => {
              // Place new label near the centre of current viewport
              const { x: vx, y: vy, zoom } = flowInstance.getViewport();
              const w = window.innerWidth / 2;
              const h = window.innerHeight / 2;
              const pos = { x: (w - vx) / zoom, y: (h - vy) / zoom };
              addLabel(pos);
            }}
            className="bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
          >
            + Add Label
          </button>

          <button
            onClick={onShowDisciplines}
            className={`text-xs font-medium rounded-lg px-3 py-1.5 transition-colors border ${
              showDisciplines
                ? 'bg-slate-700 text-white border-slate-700'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Disciplines
          </button>

          <button
            onClick={handleResetLayout}
            title={selectedId ? 'Reset layout for selected node and its subtree' : 'Reset layout for all nodes'}
            className="text-xs font-medium rounded-lg px-3 py-1.5 transition-colors border bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          >
            {selectedId ? '↺ Auto-layout subtree' : '↺ Auto-layout'}
          </button>

          <button
            onClick={onToggleSubtreeMove}
            title="When on, dragging a node moves its entire subtree with it"
            className={`text-xs font-medium rounded-lg px-3 py-1.5 transition-colors border ${
              subtreeMoveMode
                ? 'bg-violet-500 text-white border-violet-500'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {subtreeMoveMode ? '⛶ Subtree: on' : '⛶ Subtree: off'}
          </button>

          <button
            onClick={() => undo()}
            disabled={!canUndo}
            title="Undo last change (Ctrl+Z)"
            className="text-xs font-medium rounded-lg px-3 py-1.5 transition-colors border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ⎌ Undo
          </button>
        </div>

        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          <button
            onClick={() => setShowCsvEditor(true)}
            title="Open the CSV editor to paste, edit, copy, download or load CSV data"
            className="text-xs font-medium rounded-lg px-3 py-1.5 transition-colors border bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          >
            ✎ Edit Data
          </button>

          <button
            onClick={handleExportPNG}
            disabled={exporting}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
          >
            {exporting ? 'Exporting…' : 'Export PNG'}
          </button>

          <span className="text-[10px] text-slate-400 font-mono pl-2 hidden sm:block select-none">
            v{__APP_VERSION__} · © {new Date().getFullYear()} Xerxes Battiwalla
          </span>
        </div>
      </div>

      <CsvEditor isOpen={showCsvEditor} onClose={() => setShowCsvEditor(false)} />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 max-w-sm rounded-xl shadow-lg px-4 py-3 text-sm z-50 ${
            toast.type === 'error'
              ? 'bg-red-500 text-white'
              : toast.type === 'success'
                ? 'bg-emerald-500 text-white'
                : 'bg-amber-400 text-amber-900'
          }`}
        >
          <div className="font-semibold mb-0.5">
            {toast.type === 'error' ? 'Error' : toast.type === 'success' ? 'Done' : 'Warning'}
          </div>
          <div>{toast.message}</div>
        </div>
      )}
    </>
  );
}
