import { useEffect, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useOrgStore } from '../store/orgStore';
import { exportCSV, downloadCSV } from '../io/csvExport';
import { importCSV } from '../io/csvImport';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Status = { type: 'error' | 'warning' | 'success'; message: string };

export function CsvEditor({ isOpen, onClose }: Props) {
  const positions = useOrgStore(s => s.positions);
  const positionOrder = useOrgStore(s => s.positionOrder);
  const disciplines = useOrgStore(s => s.disciplines);
  const disciplineOrder = useOrgStore(s => s.disciplineOrder);
  const labels = useOrgStore(s => s.labels);
  const labelOrder = useOrgStore(s => s.labelOrder);
  const replaceAll = useOrgStore(s => s.replaceAll);

  const flowInstance = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<Status | null>(null);
  const [copiedAt, setCopiedAt] = useState(0);

  // Snapshot the current state into the textarea when the modal opens
  useEffect(() => {
    if (!isOpen) return;
    const csv = exportCSV(positions, positionOrder, disciplines, disciplineOrder, labels, labelOrder);
    setContent(csv);
    setStatus(null);
    setCopiedAt(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedAt(Date.now());
      setTimeout(() => setCopiedAt(c => (Date.now() - c >= 1500 ? 0 : c)), 1600);
    } catch (err) {
      setStatus({ type: 'error', message: `Copy failed: ${err}` });
    }
  };

  const handleDownload = () => {
    downloadCSV(content);
  };

  const handleLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setContent(reader.result as string);
      setStatus({ type: 'success', message: `Loaded ${file.name} into editor. Click Apply to update the chart.` });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleApply = () => {
    const result = importCSV(content);
    if ('error' in result) {
      setStatus({ type: 'error', message: result.error });
      return;
    }
    replaceAll(result);
    setTimeout(() => flowInstance.fitView({ padding: 0.2, duration: 400 }), 100);
    if (result.warnings.length > 0) {
      setStatus({ type: 'warning', message: `Applied with warnings: ${result.warnings.join(' | ')}` });
    } else {
      setStatus({ type: 'success', message: 'Applied — chart updated.' });
      setTimeout(() => onClose(), 600);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Edit CSV Data</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste or hand-edit CSV here, then click Apply to update the chart.
            </p>
          </div>
          <button
            onClick={onClose}
            title="Close (Esc)"
            className="text-slate-400 hover:text-slate-600 text-xl leading-none -mt-0.5"
          >
            ×
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1.5 px-5 py-2 border-b border-slate-100 flex-wrap">
          <button
            onClick={handleCopy}
            title="Copy editor content to clipboard"
            className={`text-xs font-medium rounded-lg px-3 py-1.5 transition-colors border ${
              copiedAt
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {copiedAt ? '✓ Copied' : '⧉ Copy'}
          </button>

          <button
            onClick={handleDownload}
            title="Download editor content as a .csv file"
            className="text-xs font-medium rounded-lg px-3 py-1.5 transition-colors border bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          >
            ↓ Download
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Load a .csv file into the editor"
            className="text-xs font-medium rounded-lg px-3 py-1.5 transition-colors border bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          >
            ↑ Load file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleLoadFile}
          />

          <span className="text-[11px] text-slate-400 ml-auto">
            {content.split('\n').length} lines · {content.length} chars
          </span>
        </div>

        {/* Textarea */}
        <div className="flex-1 px-5 py-3 overflow-hidden">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            spellCheck={false}
            placeholder="# discipline-colors: …
# section: positions
id,name,title,discipline,band,is_new,parent_id,notes,x,y
…"
            className="w-full h-full font-mono text-xs leading-relaxed border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none whitespace-pre overflow-auto"
          />
        </div>

        {/* Status banner */}
        {status && (
          <div
            className={`px-5 py-2 text-xs border-t ${
              status.type === 'error'
                ? 'bg-red-50 text-red-700 border-red-100'
                : status.type === 'warning'
                  ? 'bg-amber-50 text-amber-800 border-amber-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-100'
            }`}
          >
            <span className="font-semibold mr-1">
              {status.type === 'error' ? 'Error:' : status.type === 'warning' ? 'Warning:' : ''}
            </span>
            {status.message}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end items-center gap-2 border-t border-slate-200 px-5 py-3">
          <button
            onClick={onClose}
            className="text-xs font-medium rounded-lg px-4 py-2 transition-colors border bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg px-4 py-2 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
