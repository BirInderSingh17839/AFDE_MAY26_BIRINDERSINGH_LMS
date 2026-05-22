import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import {
  BarChart3, FileText, FileSpreadsheet, FileDown, AlertTriangle,
  TrendingUp, Wallet,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Skeleton from '../components/Skeleton';
import {
  getReportSummary, overdueAnalysis, downloadReport,
} from '../services/api';
import { useToast } from '../contexts/ToastContext';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export default function Reports() {
  const [summary, setSummary]   = useState(null);
  const [overdue, setOverdue]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState(null);
  const [downloading, setDl]    = useState(null);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const [s, o] = await Promise.all([getReportSummary(), overdueAnalysis()]);
        setSummary(s); setOverdue(o);
      } catch (e) {
        setErr(e.userMessage || 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const downloads = [
    { kind: 'pdf',  label: 'Overview PDF',  icon: FileText,        path: '/reports/overview.pdf',    file: 'library_overview.pdf' },
    { kind: 'xlsx', label: 'Workbook (XLSX)', icon: FileSpreadsheet, path: '/reports/full.xlsx',      file: 'library_report.xlsx' },
    { kind: 'books', label: 'Books CSV',    icon: FileDown,        path: '/reports/books.csv',       file: 'books.csv' },
    { kind: 'txns',  label: 'Transactions CSV', icon: FileDown,    path: '/reports/transactions.csv', file: 'transactions.csv' },
    { kind: 'fines', label: 'Fines CSV',    icon: FileDown,        path: '/reports/fines.csv',       file: 'fines.csv' },
  ];

  const handleDownload = async (d) => {
    setDl(d.kind);
    try {
      await downloadReport(d.path, d.file);
      toast.success(`Downloaded ${d.file}`);
    } catch (e) {
      toast.error(e.message || 'Download failed');
    } finally {
      setDl(null);
    }
  };

  if (err) {
    return (
      <div className="card card-body text-center py-16">
        <AlertTriangle className="w-10 h-10 mx-auto text-rose-500" />
        <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">Couldn't load reports</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{err}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Cross-cuts of library activity, overdue analysis, and downloadable reports."
        icon={BarChart3}
        actions={
          <div className="flex gap-2 flex-wrap">
            {downloads.map((d) => {
              const Icon = d.icon;
              return (
                <button
                  key={d.kind}
                  onClick={() => handleDownload(d)}
                  disabled={downloading === d.kind}
                  className="btn btn-secondary btn-sm"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {downloading === d.kind ? 'Downloading…' : d.label}
                </button>
              );
            })}
          </div>
        }
      />

      {/* Overdue analytics */}
      {loading || !overdue ? (
        <Skeleton className="h-44" />
      ) : (
        <div className="card">
          <div className="card-header"><h3 className="card-title flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" /> Overdue Analysis
          </h3></div>
          <div className="card-body grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { l: 'Overdue %',           v: `${overdue.overdue_percentage.toFixed(1)}%`,           tone: 'text-rose-600',    sub: `${overdue.overdue_count} of ${overdue.total_transactions} transactions` },
              { l: 'Avg days overdue',    v: overdue.average_days_overdue.toFixed(1),                tone: 'text-amber-600',   sub: 'Across all unreturned, late items' },
              { l: 'Estimated fines',     v: overdue.estimated_fines.toFixed(2),                     tone: 'text-emerald-600', sub: 'Days × fine-per-day rate' },
              { l: 'Currently overdue',   v: overdue.overdue_count,                                  tone: 'text-slate-900 dark:text-white', sub: 'Active, past-due transactions' },
            ].map((s) => (
              <div key={s.l} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                <div className="stat-label">{s.l}</div>
                <div className={`text-3xl font-bold mt-1 tracking-tight ${s.tone}`}>{s.v}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{s.sub}</div>
              </div>
            ))}
          </div>

          {overdue.frequent_overdue_borrowers.length > 0 && (
            <div className="px-6 pb-6">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-2 mb-2">
                Frequent overdue borrowers
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={overdue.frequent_overdue_borrowers} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="borrower_name" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip />
                    <Bar dataKey="overdue_count" fill="#ef4444" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {loading || !summary ? (
        <div className="grid lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80" />)}
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="card">
              <div className="card-header"><h3 className="card-title">Books by Category</h3></div>
              <div className="card-body" style={{ height: 320 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={summary.by_category} dataKey="count" nameKey="category" outerRadius={110}>
                      {summary.by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3 className="card-title flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-500" /> Monthly Borrows & Returns
              </h3></div>
              <div className="card-body" style={{ height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={summary.monthly_activity}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="borrows" stroke="#2563eb" strokeWidth={2.5} />
                    <Line type="monotone" dataKey="returns" stroke="#10b981" strokeWidth={2.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="card">
              <div className="card-header"><h3 className="card-title">Top Borrowers</h3></div>
              <div className="card-body" style={{ height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={summary.top_borrowers} layout="vertical" margin={{ left: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="borrower_name" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip />
                    <Bar dataKey="transactions" fill="#10b981" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3 className="card-title">Most-Borrowed Books</h3></div>
              <div className="card-body" style={{ height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={summary.most_borrowed_books} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="title" tick={{ fontSize: 11 }} width={160} />
                    <Tooltip />
                    <Bar dataKey="borrows" fill="#2563eb" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
