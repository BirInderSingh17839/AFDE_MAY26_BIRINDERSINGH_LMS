import { useEffect, useRef, useState } from 'react';
import {
  Database, Upload, CheckCircle2, AlertTriangle, XCircle, FileSpreadsheet,
  RefreshCw, Camera,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import {
  uploadEtlFile, listEtlLogs, snapshotEtl,
} from '../services/api';
import { useToast } from '../contexts/ToastContext';

const ENTITIES = [
  { value: 'books',        label: 'Books',        hint: 'Columns: title, author, category, isbn, [availability_status]' },
  { value: 'borrowers',    label: 'Borrowers',    hint: 'Columns: borrower_name, email, phone' },
  { value: 'transactions', label: 'Transactions', hint: 'Columns: book_id, borrower_id, borrow_date, [due_date, return_date, fine_amount]' },
];

const STATUS_BADGE = {
  ok:      'badge badge-success badge-dot',
  partial: 'badge badge-warning badge-dot',
  error:   'badge badge-danger badge-dot',
};

export default function EtlPage() {
  const [entity, setEntity] = useState('books');
  const [file, setFile]     = useState(null);
  const [busy, setBusy]     = useState(false);
  const [result, setResult] = useState(null);
  const [logs, setLogs]     = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const fileInputRef = useRef(null);
  const toast = useToast();

  const refreshLogs = async () => {
    setLoadingLogs(true);
    try { setLogs(await listEtlLogs({ limit: 50 })); }
    catch (e) { toast.error(e.userMessage || 'Failed to load logs'); }
    finally { setLoadingLogs(false); }
  };
  useEffect(() => { refreshLogs(); }, []);

  const onDrop = (ev) => {
    ev.preventDefault();
    if (ev.dataTransfer.files?.[0]) setFile(ev.dataTransfer.files[0]);
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!file) {
      toast.warning('Pick a CSV or XLSX file first.');
      return;
    }
    setBusy(true); setResult(null);
    try {
      const res = await uploadEtlFile(entity, file);
      setResult(res);
      const log = res.log;
      if (log.status === 'ok') toast.success(`Loaded ${log.loaded} row(s).`);
      else if (log.status === 'partial') toast.warning(`Loaded ${log.loaded}, ${log.failed} failed.`);
      else toast.error(`ETL failed — see details.`);
      refreshLogs();
    } catch (e) {
      toast.error(e.userMessage || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSnapshot = async () => {
    try {
      const s = await snapshotEtl();
      toast.success(`Overdue snapshot saved (${s.overdue_count} overdue, est. fines ${s.estimated_fines.toFixed(2)}).`);
    } catch (e) {
      toast.error(e.userMessage || 'Snapshot failed');
    }
  };

  const logColumns = [
    { key: 'log_id', label: 'ID' },
    { key: 'entity', label: 'Entity', render: (l) => <span className="badge badge-info">{l.entity}</span> },
    { key: 'filename', label: 'File' },
    { key: 'extracted',  label: 'Extracted' },
    { key: 'transformed',label: 'Valid' },
    { key: 'loaded',     label: 'Loaded',
      render: (l) => <span className="font-semibold text-emerald-600">{l.loaded}</span> },
    { key: 'failed',     label: 'Failed',
      render: (l) => l.failed > 0
        ? <span className="font-semibold text-rose-600">{l.failed}</span>
        : <span className="text-slate-400">0</span> },
    { key: 'duration_ms',label: 'Duration',
      render: (l) => `${l.duration_ms} ms` },
    { key: 'status', label: 'Status', sortable: false,
      render: (l) => <span className={STATUS_BADGE[l.status] || 'badge badge-muted'}>{l.status}</span> },
    { key: 'created_at', label: 'When',
      render: (l) => new Date(l.created_at).toLocaleString() },
  ];

  const currentEntity = ENTITIES.find((e) => e.value === entity);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ETL Pipeline"
        subtitle="Upload CSV / Excel → extract → transform → load. Audit every run."
        icon={Database}
        actions={
          <button onClick={handleSnapshot} className="btn btn-secondary">
            <Camera className="w-4 h-4" /> Snapshot overdue report
          </button>
        }
      />

      <form onSubmit={submit} className="card">
        <div className="card-header"><h3 className="card-title">Upload dataset</h3></div>
        <div className="card-body grid lg:grid-cols-2 gap-6">
          <div>
            <label className="input-label">Entity</label>
            <div className="grid grid-cols-3 gap-2">
              {ENTITIES.map((e) => (
                <button
                  key={e.value}
                  type="button"
                  onClick={() => setEntity(e.value)}
                  className={`p-3 rounded-lg border text-left transition-colors
                              ${entity === e.value
                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                                : 'border-slate-200 dark:border-slate-700 hover:border-brand-300'}`}
                >
                  <FileSpreadsheet className={`w-4 h-4 mb-1 ${entity === e.value ? 'text-brand-600' : 'text-slate-400'}`} />
                  <div className="text-sm font-semibold">{e.label}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 font-mono break-words">
              {currentEntity.hint}
            </p>
          </div>

          <div>
            <label className="input-label">File (.csv / .xlsx)</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700
                         rounded-xl p-6 text-center hover:border-brand-500 cursor-pointer
                         transition-colors bg-slate-50 dark:bg-slate-900/40"
            >
              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {file ? file.name : 'Click or drag a file here'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Max 10 MB · CSV or XLSX
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <button type="submit" disabled={busy || !file} className="btn btn-primary w-full mt-3">
              {busy ? 'Running ETL…' : 'Run pipeline'}
            </button>
          </div>
        </div>
      </form>

      {/* Result of the most recent run */}
      {result && (
        <div className="card animate-slide-up">
          <div className="card-header">
            <h3 className="card-title">Last run · {result.log.entity}</h3>
            <span className={STATUS_BADGE[result.log.status]}>{result.log.status}</span>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { l: 'Extracted',  v: result.log.extracted,  tone: 'text-slate-900 dark:text-white' },
                { l: 'Valid',      v: result.log.transformed,tone: 'text-brand-600' },
                { l: 'Loaded',     v: result.log.loaded,     tone: 'text-emerald-600' },
                { l: 'Failed',     v: result.log.failed,     tone: result.log.failed > 0 ? 'text-rose-600' : 'text-slate-400' },
              ].map((s) => (
                <div key={s.l} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                  <div className="stat-label">{s.l}</div>
                  <div className={`text-2xl font-bold mt-1 ${s.tone}`}>{s.v}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Transformation log
              </div>
              <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-300">
                {result.summary_lines.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    {s.startsWith('ETL aborted') || s.startsWith('Missing')
                      ? <XCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                      : s.includes('failed validation')
                        ? <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        : <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />}
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {result.sample_failed?.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  Failed records (first {result.sample_failed.length})
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="data-table text-xs">
                    <thead>
                      <tr><th>Row</th><th>Reason</th><th>Data</th></tr>
                    </thead>
                    <tbody>
                      {result.sample_failed.map((f, i) => (
                        <tr key={i}>
                          <td>{f.row}</td>
                          <td className="text-rose-600">{f.reason}</td>
                          <td className="font-mono text-[10px] text-slate-500 truncate max-w-[400px]">
                            {JSON.stringify(f.data)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History */}
      <DataTable
        columns={logColumns}
        rows={logs}
        loading={loadingLogs}
        exportName="etl_logs"
        searchKeys={['entity', 'filename', 'status']}
        filters={
          <button onClick={refreshLogs} className="btn btn-secondary btn-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        }
        empty="No ETL runs yet — upload a file above to get started."
      />
    </div>
  );
}
