import { useEffect, useState } from 'react';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import BorrowerForm from '../components/BorrowerForm';
import { listBorrowers, createBorrower, updateBorrower, deleteBorrower } from '../services/api';
import { useToast } from '../contexts/ToastContext';

const initials = (n) => (n || '?').split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
const gradients = [
  'from-brand-500 to-brand-700',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-700',
  'from-rose-500 to-fuchsia-700',
  'from-violet-500 to-indigo-700',
];

export default function Borrowers() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [busy, setBusy]       = useState(false);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try { setRows(await listBorrowers()); }
    catch (e) { toast.error(e.userMessage || 'Failed to load borrowers'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (data) => {
    setBusy(true);
    try {
      if (modal === 'create') {
        await createBorrower(data);
        toast.success('Borrower added');
      } else {
        await updateBorrower(modal.borrower_id, data);
        toast.success('Borrower updated');
      }
      setModal(null);
      load();
    } catch (e) {
      toast.error(e.userMessage || 'Could not save borrower');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (b) => {
    if (!confirm(`Delete borrower "${b.borrower_name}"? Their transactions will also be removed.`)) return;
    try {
      await deleteBorrower(b.borrower_id);
      toast.success('Borrower deleted');
      load();
    } catch (e) {
      toast.error(e.userMessage || 'Could not delete borrower');
    }
  };

  const columns = [
    { key: 'borrower_id', label: 'ID' },
    {
      key: 'borrower_name', label: 'Name',
      render: (b) => (
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradients[b.borrower_id % gradients.length]}
                          text-white grid place-items-center text-xs font-bold`}>
            {initials(b.borrower_name)}
          </div>
          <span className="font-medium text-slate-900 dark:text-white">{b.borrower_name}</span>
        </div>
      ),
    },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    {
      key: '_actions', label: 'Actions', sortable: false, exportFn: () => '',
      render: (b) => (
        <div className="flex items-center gap-1">
          <button className="btn btn-icon btn-ghost" onClick={() => setModal(b)} aria-label="Edit"><Pencil className="w-4 h-4" /></button>
          <button className="btn btn-icon btn-ghost text-rose-600" onClick={() => handleDelete(b)} aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Borrowers"
        subtitle="Manage library members."
        icon={Users}
        actions={(
          <button onClick={() => setModal('create')} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Add Borrower
          </button>
        )}
      />

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        exportName="borrowers"
        searchKeys={['borrower_name', 'email', 'phone']}
        empty="No borrowers yet."
      />

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Add a borrower' : 'Edit borrower'}
      >
        <BorrowerForm
          initial={modal === 'create' ? null : modal}
          onSubmit={handleSubmit}
          onCancel={() => setModal(null)}
          busy={busy}
        />
      </Modal>
    </div>
  );
}
