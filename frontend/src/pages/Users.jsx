import { useEffect, useState } from 'react';
import { ShieldCheck, Trash2, Link2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import {
  listUsers, updateUser, deleteUser, listBorrowers, linkBorrower,
} from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const ROLE_BADGES = {
  admin:     'badge badge-danger',
  librarian: 'badge badge-info',
  student:   'badge badge-success',
};

export default function Users() {
  const [rows, setRows]       = useState([]);
  const [borrowers, setBor]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkModal, setLinkModal] = useState(null);
  const [pickBorrower, setPick]   = useState('');
  const toast = useToast();
  const { user: me } = useAuth();

  const load = async () => {
    setLoading(true);
    try {
      const [u, b] = await Promise.all([listUsers(), listBorrowers()]);
      setRows(u); setBor(b);
    } catch (e) { toast.error(e.userMessage || 'Failed to load users'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const setRole = async (u, role) => {
    if (u.user_id === me.user_id) {
      toast.warning("You can't change your own role here.");
      return;
    }
    try {
      await updateUser(u.user_id, { role });
      toast.success(`${u.username} → ${role}`);
      load();
    } catch (e) { toast.error(e.userMessage || 'Could not update user'); }
  };

  const toggleActive = async (u) => {
    if (u.user_id === me.user_id) { toast.warning("Can't disable yourself."); return; }
    try {
      await updateUser(u.user_id, { is_active: !u.is_active });
      load();
    } catch (e) { toast.error(e.userMessage || 'Could not update user'); }
  };

  const remove = async (u) => {
    if (u.user_id === me.user_id) return;
    if (!confirm(`Delete user ${u.username}?`)) return;
    try { await deleteUser(u.user_id); toast.success('User deleted'); load(); }
    catch (e) { toast.error(e.userMessage || 'Could not delete user'); }
  };

  const handleLink = async () => {
    if (!pickBorrower) return;
    try {
      await linkBorrower(linkModal.user_id, Number(pickBorrower));
      toast.success('Linked');
      setLinkModal(null); setPick('');
      load();
    } catch (e) { toast.error(e.userMessage || 'Could not link borrower'); }
  };

  const columns = [
    { key: 'user_id', label: 'ID' },
    { key: 'username', label: 'Username',
      render: (u) => <span className="font-semibold text-slate-900 dark:text-white">{u.username}</span> },
    { key: 'full_name', label: 'Full name' },
    { key: 'email', label: 'Email' },
    {
      key: 'role', label: 'Role', sortable: false,
      render: (u) => (
        <select
          className={`${ROLE_BADGES[u.role]} cursor-pointer bg-transparent border-0 focus:outline-none`}
          value={u.role}
          onChange={(e) => setRole(u, e.target.value)}
          disabled={u.user_id === me.user_id}
        >
          <option value="admin">admin</option>
          <option value="librarian">librarian</option>
          <option value="student">student</option>
        </select>
      ),
    },
    {
      key: 'is_active', label: 'Active', sortable: false,
      render: (u) => (
        <button
          onClick={() => toggleActive(u)}
          disabled={u.user_id === me.user_id}
          className={u.is_active ? 'badge badge-success badge-dot' : 'badge badge-muted'}
        >
          {u.is_active ? 'Active' : 'Disabled'}
        </button>
      ),
    },
    { key: 'borrower_id', label: 'Borrower',
      render: (u) => u.borrower_id
        ? <span className="text-xs text-slate-500">#{u.borrower_id}</span>
        : <button className="btn btn-secondary btn-sm" onClick={() => setLinkModal(u)}>
            <Link2 className="w-3.5 h-3.5" /> Link
          </button> },
    {
      key: '_actions', label: 'Actions', sortable: false, exportFn: () => '',
      render: (u) => (
        <button
          className="btn btn-icon btn-ghost text-rose-600"
          onClick={() => remove(u)}
          disabled={u.user_id === me.user_id}
          aria-label="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Users" subtitle="Admin · manage accounts and roles." icon={ShieldCheck} />
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        exportName="users"
        searchKeys={['username', 'full_name', 'email', 'role']}
        empty="No users yet."
      />

      <Modal
        open={!!linkModal}
        onClose={() => { setLinkModal(null); setPick(''); }}
        title={`Link ${linkModal?.username} to a borrower`}
        subtitle="Connects this account to a member record so they can see their own transactions and fines."
      >
        <div className="space-y-4">
          <div>
            <label className="input-label">Borrower</label>
            <select className="select" value={pickBorrower} onChange={(e) => setPick(e.target.value)}>
              <option value="">— Pick a borrower —</option>
              {borrowers.map((b) => (
                <option key={b.borrower_id} value={b.borrower_id}>{b.borrower_name} ({b.email})</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn btn-secondary" onClick={() => { setLinkModal(null); setPick(''); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleLink} disabled={!pickBorrower}>Link</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
