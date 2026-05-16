import { useEffect, useState } from 'react';
import { listBooks, createBook, updateBook, deleteBook } from '../services/api';
import Modal from '../components/Modal';
import BookForm from '../components/BookForm';
import { useToast } from '../components/Toast';

const categoryColors = ['badge-info', 'badge-teal', 'badge-pink', 'badge-blue', 'badge-warning'];
const colorFor = (s) => categoryColors[(s.length || 0) % categoryColors.length];

export default function Books() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const { show } = useToast();

  const load = async () => {
    setLoading(true);
    try { setBooks(await listBooks()); }
    catch { show('Failed to load books', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (form) => {
    try {
      if (editing) { await updateBook(editing.book_id, form); show('Book updated successfully'); }
      else         { await createBook(form);                  show('Book added to catalog'); }
      setOpenForm(false); setEditing(null); load();
    } catch (e) { show(e?.response?.data?.detail || 'Save failed', 'error'); }
  };

  const onDelete = async (b) => {
    if (!confirm(`Delete "${b.title}"?`)) return;
    try { await deleteBook(b.book_id); show('Book deleted'); load(); }
    catch (e) { show(e?.response?.data?.detail || 'Delete failed', 'error'); }
  };

  const filtered = books.filter(b => {
    if (!query) return true;
    const q = query.toLowerCase();
    return [b.title, b.author, b.category, b.isbn].some(v => v?.toLowerCase().includes(q));
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📚 Books</div>
          <div className="page-subtitle">{books.length} book{books.length !== 1 ? 's' : ''} in your catalog</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setOpenForm(true); }}>
          ✨ Add New Book
        </button>
      </div>

      <div className="search-bar" style={{ marginBottom: 20 }}>
        <span className="icon">🔍</span>
        <input placeholder="Search by title, author, category, or ISBN..." value={query} onChange={e => setQuery(e.target.value)} />
        {query && <button className="btn btn-ghost btn-sm" onClick={() => setQuery('')}>Clear</button>}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="empty"><span className="emoji">⏳</span>Loading books...</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <span className="emoji">📖</span>
            <span className="title">{query ? 'No matches found' : 'Your catalog is empty'}</span>
            {query ? 'Try a different search term.' : 'Click "Add New Book" to get started.'}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Category</th>
                  <th>ISBN</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.book_id}>
                    <td><strong>{b.title}</strong></td>
                    <td>{b.author}</td>
                    <td><span className={`badge ${colorFor(b.category)}`}>{b.category}</span></td>
                    <td className="text-dim" style={{ fontSize: 12 }}>{b.isbn}</td>
                    <td>
                      {b.availability_status === 'Available'
                        ? <span className="badge badge-success">Available</span>
                        : <span className="badge badge-warning">Borrowed</span>}
                    </td>
                    <td className="text-right">
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(b); setOpenForm(true); }}>Edit</button>
                      &nbsp;
                      <button className="btn btn-danger btn-sm" onClick={() => onDelete(b)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={openForm} title={editing ? '✏️ Edit Book' : '✨ Add New Book'} onClose={() => { setOpenForm(false); setEditing(null); }}>
        <BookForm initial={editing} onSubmit={onSubmit} onCancel={() => { setOpenForm(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}
