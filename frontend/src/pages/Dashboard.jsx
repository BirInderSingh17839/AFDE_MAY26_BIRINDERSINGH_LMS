import { useEffect, useState } from 'react';
import {
  BookOpen, CheckCircle2, Send, AlertTriangle, Users, FileText, Wallet, PiggyBank,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import PageHeader from '../components/PageHeader';
import { StatCardSkeleton } from '../components/Skeleton';
import { getDashboard, listTransactions, getReportSummary } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const STAT_DEFS = [
  { key: 'total_books',             label: 'Total Books',      icon: BookOpen,       tone: 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300' },
  { key: 'available_books',         label: 'Available',        icon: CheckCircle2,   tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { key: 'borrowed_books',          label: 'Currently Issued', icon: Send,           tone: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300' },
  { key: 'overdue_books',           label: 'Overdue',          icon: AlertTriangle,  tone: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300' },
  { key: 'active_users',            label: 'Active Users',     icon: Users,          tone: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300' },
  { key: 'total_transactions',      label: 'Transactions',     icon: FileText,       tone: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300' },
  { key: 'total_fines_collected',   label: 'Fines Collected',  icon: PiggyBank,      tone: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300', money: true },
  { key: 'total_fines_outstanding', label: 'Fines Outstanding',icon: Wallet,         tone: 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-300', money: true },
];

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const [stats, setStats]    = useState(null);
  const [recent, setRecent]  = useState([]);
  const [report, setReport]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]        = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const promises = [getDashboard(), listTransactions({ limit: 8 })];
        if (hasRole('admin', 'librarian')) promises.push(getReportSummary());
        const [s, t, r] = await Promise.all(promises);
        setStats(s);
        setRecent(t.slice(0, 6));
        if (r) setReport(r);
      } catch (e) {
        setErr(e.userMessage || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [hasRole]);

  if (err) {
    return (
      <div className="card card-body text-center py-16">
        <AlertTriangle className="w-10 h-10 mx-auto text-rose-500" />
        <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">Couldn't load dashboard</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{err}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.full_name?.split(' ')[0] || 'there'}`}
        subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)
          : STAT_DEFS.map((s) => {
              const Icon = s.icon;
              const v = stats?.[s.key] ?? 0;
              return (
                <div key={s.key} className="stat-card">
                  <div className={`stat-icon-wrap ${s.tone}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="stat-label mt-4">{s.label}</div>
                  <div className="stat-value">
                    {s.money ? Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v}
                  </div>
                </div>
              );
            })}
      </div>

      {/* Charts (staff only) */}
      {hasRole('admin', 'librarian') && report && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Books by Category</h3>
            </div>
            <div className="card-body" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={report.by_category}
                    dataKey="count"
                    nameKey="category"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {report.by_category.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Monthly Activity</h3>
            </div>
            <div className="card-body" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={report.monthly_activity}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="borrows" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="returns" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {hasRole('admin', 'librarian') && report?.most_borrowed_books?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Most-Borrowed Books</h3>
          </div>
          <div className="card-body" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.most_borrowed_books.slice(0, 8)} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="title" tick={{ fontSize: 11 }} width={150} />
                <Tooltip />
                <Bar dataKey="borrows" fill="#2563eb" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="cursor-default">Book</th>
                <th className="cursor-default">Borrower</th>
                <th className="cursor-default">Borrowed</th>
                <th className="cursor-default">Due</th>
                <th className="cursor-default">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && !loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-500">No transactions yet.</td></tr>
              ) : recent.map((t) => (
                <tr key={t.transaction_id}>
                  <td className="font-medium text-slate-900 dark:text-white">{t.book_title || `Book #${t.book_id}`}</td>
                  <td>{t.borrower_name || `Borrower #${t.borrower_id}`}</td>
                  <td className="text-slate-500">{new Date(t.borrow_date).toLocaleDateString()}</td>
                  <td className="text-slate-500">{t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}</td>
                  <td>
                    {t.return_date
                      ? <span className="badge badge-success badge-dot">Returned</span>
                      : t.is_overdue
                        ? <span className="badge badge-danger badge-dot">Overdue</span>
                        : <span className="badge badge-warning badge-dot">Active</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
