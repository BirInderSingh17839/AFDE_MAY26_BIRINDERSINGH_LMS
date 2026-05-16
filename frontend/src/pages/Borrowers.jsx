import { useEffect, useState } from 'react';
import { listBorrowers, createBorrower, updateBorrower, deleteBorrower } from '../services/api';
import Modal from '../components/Modal';
import BorrowerForm from '../components/BorrowerForm';
import { useToast } from '../components/Toast';

const toneFor = (i) => `tone-${(i % 5) + 1}`;
const initials = (name) => (name || '?').split(' ').map(s => s[0]).filter(Boolean).slice(0,2).join('').toUpperCase();

export default function Borrowers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const { show } = useToast();

  const load = async () => {
    setLoading(true);
    try { setRows(await listBorrowers()); }
    catch { show('Failed to load borrowers', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (form) => {
    try {
      if (editing) { await updateBorrower(editing.borrower_id, form); show('Borrower updated'); }
      else         { await createBorrower(form);                      show('Borrower added'); }
      setOpenForm(false); setEditing(null); load();
    } catch (e) { show(e?.response?.data?.detail || 'Save failed', 'error'); }
  };

  const onDelete = async (b) => {
    if (!confirm(`Delete borrower "${b.borrower_name}"?`)) return;
    try { await deleteBorrower(b.borrower_id); show('Borrower deleted'); load(); }
    catch (e) { show(e?.response?.data?.detail || 'Delete failed', 'error'); }
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
          <div className="page-title">👥 Borrowers</div>
          <div className="page-subtitle">{rows.length} registered member{rows.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setOpenForm(true); }}>
          ✨ Add Borrower
        </button>
      </div>

      <div className="search-bar" style={{ marginBottom: 20 }}>
        <span className="icon">🔍</span>
        <input placeholder="Search by name, email, or phone..." value={query} onChange={e => setQuery(e.target.value)} />
        {query && <button className="btn btn-ghost btn-sm" onClick={() => setQuery('')}>Clear</button>}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="empty"><span className="emoji">⏳</span>Loading borrowers...</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <span className="emoji">👤</span>
            <span className="title">{query ? 'No matches found' : 'No borrowers yet'}</span>
            {query ? 'Try a different search.' : 'Add your first borrower to get started.'}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.borrower_id}>
                    <td>
                      <div className="cell-flex">
                        <div className={`avatar ${toneFor(r.borrower_id)}`}>{initials(r.borrower_name)}</div>
                        <strong>{r.borrower_name}</strong>
                      </div>
                    </td>
                    <td className="text-dim">{r.email}</td>
                    <td className="text-dim">{r.phone}</td>
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

      <Modal open={openForm} title={editing ? '✏️ Edit Borrower' : '✨ Add Borrower'} onClose={() => { setOpenForm(false); setEditing(null); }}>
        <BorrowerForm initial={editing} onSubmit={onSubmit} onCancel={() => { setOpenForm(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}
