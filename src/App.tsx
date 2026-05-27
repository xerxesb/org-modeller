import { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { OrgCanvas } from './canvas/OrgCanvas';
import { Inspector } from './panels/Inspector';
import { DisciplineManager } from './panels/DisciplineManager';
import { Toolbar } from './panels/Toolbar';
import { useOrgStore } from './store/orgStore';

function AppContent() {
  const [showDisciplines, setShowDisciplines] = useState(false);
  const selectedId = useOrgStore(s => s.selectedId);
  const positionOrder = useOrgStore(s => s.positionOrder);

  const showPanel = showDisciplines || !!selectedId;

  return (
    <div className="flex flex-col h-screen">
      <Toolbar
        onShowDisciplines={() => setShowDisciplines(v => !v)}
        showDisciplines={showDisciplines}
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
          <OrgCanvas />

          {/* Subtle footer: version + copyright */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 pointer-events-none select-none font-mono z-10">
            v{__APP_VERSION__} · © {new Date().getFullYear()} Xerxes Battiwalla
          </div>
        </div>

        {/* Side panel */}
        {showPanel && (
          <div className="w-72 bg-white border-l border-slate-200 shadow-sm overflow-y-auto shrink-0">
            {showDisciplines ? (
              <DisciplineManager />
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
