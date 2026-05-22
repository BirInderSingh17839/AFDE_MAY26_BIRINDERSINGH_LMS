import { useEffect, useMemo, useState } from 'react';
import { Wallet, DollarSign, BadgeCheck, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import { listFines, payFine, waiveFine } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

export default function Fines() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatus] = useState('');
  const toast = useToast();
  const { hasRole } = useAuth();
  const isStaff = hasRole('admin', 'librarian');

  const load = async () => {
    setLoading(true);
    try { setRows(await listFines()); }
    catch (e) { toast.error(e.userMessage || 'Failed to load fines'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = statusFilter ? rows.filter((f) => f.status === statusFilter) : rows;

  const totals = useMemo(() => ({
    outstanding: rows.filter((f) => f.status === 'unpaid').reduce((s, f) => s + f.amount, 0),
    collected:   rows.filter((f) => f.status === 'paid').reduce((s, f) => s + f.amount, 0),
    waived:      rows.filter((f) => f.status === 'waived').reduce((s, f) => s + f.amount, 0),
  }), [rows]);

  const handlePay = async (f) => {
    if (!confirm(`Mark fine of ${f.amount} as paid?`)) return;
    try { await payFine(f.fine_id); toast.success('Fine marked as paid'); load(); }
    catch (e) { toast.error(e.userMessage || 'Could not pay fine'); }
  };
  const handleWaive = async (f) => {
    if (!confirm(`Waive fine of ${f.amount}?`)) return;
    try { await waiveFine(f.fine_id); toast.success('Fine waived'); load(); }
    catch (e) { toast.error(e.userMessage || 'Could not waive fine'); }
  };

  const statusBadge = (s) => {
    if (s === 'paid')   return <span className="badge badge-success badge-dot">Paid</span>;
    if (s === 'waived') return <span className="badge badge-muted">Waived</span>;
    return <span className="badge badge-danger badge-dot">Unpaid</span>;
  };

  const columns = [
    { key: 'fine_id', label: 'ID' },
    { key: 'borrower_name', label: 'Borrower',
      render: (f) => <span className="font-medium text-slate-900 dark:text-white">{f.borrower_name || `#${f.borrower_id}`}</span> },
    { key: 'book_title', label: 'Book' },
    { key: 'days_overdue', label: 'Days late' },
    { key: 'amount', label: 'Amount',
      render: (f) => <span className="font-semibold">{f.amount.toFixed(2)}</span> },
    { key: 'status', label: 'Status', sortable: false, render: (f) => statusBadge(f.status) },
    { key: 'created_at', label: 'Created',
      render: (f) => new Date(f.created_at).toLocaleDateString() },
    {
      key: '_actions', label: 'Actions', sortable: false, exportFn: () => '',
      render: (f) => (
        f.status === 'unpaid' ? (
          <div className="flex gap-1">
            <button className="btn btn-success btn-sm" onClick={() => handlePay(f)}>
              <BadgeCheck className="w-3.5 h-3.5" /> Pay
            </button>
            {isStaff && (
              <button className="btn btn-secondary btn-sm" onClick={() => handleWaive(f)}>
                <X className="w-3.5 h-3.5" /> Waive
              </button>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fine Management"
        subtitle={isStaff ? 'Track and collect overdue fines.' : 'View your fines and pay outstanding amounts.'}
        icon={Wallet}
      />

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-icon-wrap bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="stat-label mt-4">Outstanding</div>
          <div className="stat-value">{totals.outstanding.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
            <BadgeCheck className="w-5 h-5" />
          </div>
          <div className="stat-label mt-4">Collected</div>
          <div className="stat-value">{totals.collected.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <X className="w-5 h-5" />
          </div>
          <div className="stat-label mt-4">Waived</div>
          <div className="stat-value">{totals.waived.toFixed(2)}</div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        exportName="fines"
        searchKeys={['borrower_name', 'book_title']}
        filters={
          <select className="select max-w-[150px]" value={statusFilter} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="waived">Waived</option>
          </select>
        }
        empty="No fines on record."
      />
    </div>
  );
}
