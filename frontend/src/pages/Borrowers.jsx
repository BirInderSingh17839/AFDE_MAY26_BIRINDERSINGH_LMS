import { useEffect, useState } from 'react';
import { listBorrowers, createBorrower, updateBorrower, deleteBorrower } from '../services/api';
import Modal from '../components/Modal';
import BorrowerForm from '../components/BorrowerForm';
import { useToast } from '../components/Toast';

export default function Borrowers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const { show } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      setRows(await listBorrowers());
    } catch (e) {
      show('Failed to load borrowers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (form) => {
    try {
      if (editing) {
        await updateBorrower(editing.borrower_id, form);
        show('Borrower updated');
      } else {
        await createBorrower(form);
        show('Borrower added');
      }
      setOpenForm(false);
      setEditing(null);
      load();
    } catch (e) {
      show(e?.response?.data?.detail || 'Save failed', 'error');
    }
  };

  const onDelete = async (b) => {
    if (!confirm(`Delete borrower "${b.borrower_name}"?`)) return;
    try {
      await deleteBorrower(b.borrower_id);
      show('Borrower deleted');
      load();
    } catch (e) {
      show(e?.response?.data?.detail || 'Delete failed', 'error');
    }
  };

  const filtered = rows.filter(r => {
    if (!query) return true;
    const q = query.toLowerCase();
    return [r.borrower_name, r.email, r.phone].some(v => v?.toLowerCase().includes(q));
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Borrowers</div>
          <div className="page-subtitle">Members registered with the library.</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setOpenForm(true); }}>
          ＋ Add Borrower
        </button>
      </div>

      <div className="search-bar mt-2" style={{ marginBottom: 18 }}>
        <span className="icon">🔍</span>
        <input placeholder="Filter by name, email, or phone..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <div className="card">
        {loading ? (
          <div className="empty"><div className="emoji">⏳</div>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="empty"><div className="emoji">👥</div>No borrowers yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.borrower_id}>
                    <td>{r.borrower_id}</td>
                    <td><strong>{r.borrower_name}</strong></td>
                    <td>{r.email}</td>
                    <td>{r.phone}</td>
                    <td className="text-right">
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(r); setOpenForm(true); }}>Edit</button>
                      &nbsp;
                      <button className="btn btn-danger btn-sm" onClick={() => onDelete(r)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={openForm} title={editing ? 'Edit Borrower' : 'Add Borrower'} onClose={() => { setOpenForm(false); setEditing(null); }}>
        <BorrowerForm initial={editing} onSubmit={onSubmit} onCancel={() => { setOpenForm(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}
