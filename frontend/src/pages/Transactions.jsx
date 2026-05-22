import { useEffect, useState } from 'react';
import { Repeat, ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import {
  listBooks, listBorrowers, listTransactions, borrowBook, returnBook,
} from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

export default function Transactions() {
  const [txns, setTxns]   = useState([]);
  const [books, setBooks] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [issueOpen, setIssueOpen] = useState(false);
  const [busy, setBusy]           = useState(false);
  const [form, setForm]           = useState({ book_id: '', borrower_id: '', loan_days: 14 });
  const [statusFilter, setStatusFilter] = useState('');
  const toast = useToast();
  const { hasRole } = useAuth();
  const canIssue = hasRole('admin', 'librarian');

  const load = async () => {
    setLoading(true);
    try {
      const [t, b, br] = await Promise.all([
        listTransactions(),
        canIssue ? listBooks() : Promise.resolve([]),
        canIssue ? listBorrowers() : Promise.resolve([]),
      ]);
      setTxns(t); setBooks(b); setBorrowers(br);
    } catch (e) {
      toast.error(e.userMessage || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [canIssue]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleIssue = async (ev) => {
    ev.preventDefault();
    if (!form.book_id || !form.borrower_id) {
      toast.warning('Pick a book and a borrower');
      return;
    }
    setBusy(true);
    try {
      await borrowBook(Number(form.book_id), Number(form.borrower_id), Number(form.loan_days));
      toast.success('Book issued');
      setIssueOpen(false);
      setForm({ book_id: '', borrower_id: '', loan_days: 14 });
      load();
    } catch (e) {
      toast.error(e.userMessage || 'Could not issue book');
    } finally {
      setBusy(false);
    }
  };

  const handleReturn = async (txn) => {
    if (!confirm(`Confirm return of "${txn.book_title}" by ${txn.borrower_name}?`)) return;
    try {
      const res = await returnBook(txn.transaction_id);
      if (res.fine_amount > 0) toast.warning(`Returned — fine of ${res.fine_amount} applied (${res.fine_amount} overdue).`);
      else toast.success('Book returned');
      load();
    } catch (e) {
      toast.error(e.userMessage || 'Could not return book');
    }
  };

  const statusOf = (t) => {
    if (t.return_date) return 'returned';
    if (t.is_overdue)  return 'overdue';
    return 'active';
  };
  const filtered = statusFilter ? txns.filter((t) => statusOf(t) === statusFilter) : txns;

  const columns = [
    { key: 'transaction_id', label: 'ID' },
    { key: 'book_title', label: 'Book',
      render: (t) => <span className="font-medium text-slate-900 dark:text-white">{t.book_title || `#${t.book_id}`}</span> },
    { key: 'borrower_name', label: 'Borrower' },
    { key: 'borrow_date', label: 'Borrowed',
      render: (t) => new Date(t.borrow_date).toLocaleDateString(),
      exportFn: (t) => new Date(t.borrow_date).toLocaleString() },
    { key: 'due_date', label: 'Due',
      render: (t) => t.due_date ? new Date(t.due_date).toLocaleDateString() : '—',
      exportFn: (t) => t.due_date ? new Date(t.due_date).toLocaleString() : '' },
    { key: 'return_date', label: 'Returned',
      render: (t) => t.return_date ? new Date(t.return_date).toLocaleDateString() : '—',
      exportFn: (t) => t.return_date ? new Date(t.return_date).toLocaleString() : '' },
    { key: 'fine_amount', label: 'Fine',
      render: (t) => t.fine_amount > 0 ? <span className="text-rose-600 font-semibold">{t.fine_amount}</span> : '—' },
    { key: 'status', label: 'Status', sortable: false, exportFn: (t) => statusOf(t),
      render: (t) =>
        t.return_date
          ? <span className="badge badge-success badge-dot">Returned</span>
          : t.is_overdue
            ? <span className="badge badge-danger badge-dot">Overdue</span>
            : <span className="badge badge-warning badge-dot">Active</span> },
    ...(canIssue ? [{
      key: '_actions', label: 'Action', sortable: false, exportFn: () => '',
      render: (t) => (
        t.return_date
          ? <span className="text-xs text-slate-400">Done</span>
          : <button className="btn btn-secondary btn-sm" onClick={() => handleReturn(t)}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Return
            </button>
      ),
    }] : []),
  ];

  const availableBooks = books.filter((b) => b.availability_status === 'Available');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Issue & Return"
        subtitle="Lending activity and overdue tracking."
        icon={Repeat}
        actions={canIssue && (
          <button onClick={() => setIssueOpen(true)} className="btn btn-primary">
            <ArrowLeftRight className="w-4 h-4" /> Issue a Book
          </button>
        )}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        exportName="transactions"
        searchKeys={['book_title', 'borrower_name']}
        filters={
          <select className="select max-w-[160px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="overdue">Overdue</option>
            <option value="returned">Returned</option>
          </select>
        }
        empty="No transactions yet."
      />

      <Modal open={issueOpen} onClose={() => setIssueOpen(false)} title="Issue a book">
        <form onSubmit={handleIssue} className="space-y-4">
          <div>
            <label className="input-label">Book</label>
            <select className="select" value={form.book_id} onChange={(e) => setForm({ ...form, book_id: e.target.value })}>
              <option value="">— Choose a book —</option>
              {availableBooks.map((b) => (
                <option key={b.book_id} value={b.book_id}>{b.title} — {b.author}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">{availableBooks.length} book(s) available</p>
          </div>
          <div>
            <label className="input-label">Borrower</label>
            <select className="select" value={form.borrower_id} onChange={(e) => setForm({ ...form, borrower_id: e.target.value })}>
              <option value="">— Choose a borrower —</option>
              {borrowers.map((b) => (
                <option key={b.borrower_id} value={b.borrower_id}>{b.borrower_name} ({b.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Loan period (days)</label>
            <input
              type="number" min={1} max={90} className="input"
              value={form.loan_days}
              onChange={(e) => setForm({ ...form, loan_days: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setIssueOpen(false)}>Cancel</button>
            <button type="submit" disabled={busy} className="btn btn-primary">{busy ? 'Issuing…' : 'Issue book'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
