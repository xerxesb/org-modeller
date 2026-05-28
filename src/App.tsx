import { useState, useEffect } from 'react';
import { useStore } from 'zustand';
import { ReactFlowProvider } from '@xyflow/react';
import { OrgCanvas } from './canvas/OrgCanvas';
import { Inspector } from './panels/Inspector';
import { LabelInspector } from './panels/LabelInspector';
import { DisciplineManager } from './panels/DisciplineManager';
import { AlignmentPanel } from './panels/AlignmentPanel';
import { Toolbar } from './panels/Toolbar';
import { useOrgStore } from './store/orgStore';

function AppContent() {
  const [showDisciplines, setShowDisciplines] = useState(false);
  const [subtreeMoveMode, setSubtreeMoveMode] = useState(false);
  const selectedId = useOrgStore(s => s.selectedId);
  const selectedLabelId = useOrgStore(s => s.selectedLabelId);
  const multiSelectedCount = useOrgStore(s => s.multiSelectedIds.length);
  const positionOrder = useOrgStore(s => s.positionOrder);
  const undo = useStore(useOrgStore.temporal, s => s.undo);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        // Don't undo while typing in an input
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo]);

  const showPanel = showDisciplines || !!selectedId || !!selectedLabelId || multiSelectedCount >= 2;

  return (
    <div className="flex flex-col h-screen">
      <Toolbar
        onShowDisciplines={() => setShowDisciplines(v => !v)}
        showDisciplines={showDisciplines}
        subtreeMoveMode={subtreeMoveMode}
        onToggleSubtreeMove={() => setSubtreeMoveMode(v => !v)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative">
          {positionOrder.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="text-center text-slate-400">
                <div className="text-4xl mb-2">🌳</div>
                <div className="font-medium">No positions yet</div>
                <div className="text-sm mt-1">Click "+ Add Root" to create your first position, or import a CSV</div>
              </div>
            </div>
          )}
          <OrgCanvas subtreeMoveMode={subtreeMoveMode} />
        </div>

        {/* Side panel */}
        {showPanel && (
          <div className="w-72 bg-white border-l border-slate-200 shadow-sm overflow-y-auto shrink-0">
            {showDisciplines ? (
              <DisciplineManager />
            ) : multiSelectedCount >= 2 ? (
              <AlignmentPanel />
            ) : selectedLabelId ? (
              <LabelInspector />
            ) : selectedId ? (
              <Inspector />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
}
