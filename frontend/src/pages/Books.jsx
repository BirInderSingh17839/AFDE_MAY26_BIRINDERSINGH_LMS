import { useEffect, useState } from 'react';
import { listBooks, createBook, updateBook, deleteBook } from '../services/api';
import Modal from '../components/Modal';
import BookForm from '../components/BookForm';
import { useToast } from '../components/Toast';

export default function Books() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const { show } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const data = await listBooks();
      setBooks(data);
    } catch (e) {
      show('Failed to load books', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (form) => {
    try {
      if (editing) {
        await updateBook(editing.book_id, form);
        show('Book updated');
      } else {
        await createBook(form);
        show('Book added');
      }
      setOpenForm(false);
      setEditing(null);
      load();
    } catch (e) {
      show(e?.response?.data?.detail || 'Save failed', 'error');
    }
  };

  const onDelete = async (b) => {
    if (!confirm(`Delete "${b.title}"?`)) return;
    try {
      await deleteBook(b.book_id);
      show('Book deleted');
      load();
    } catch (e) {
      show(e?.response?.data?.detail || 'Delete failed', 'error');
    }
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
          <div className="page-title">Books</div>
          <div className="page-subtitle">Add, edit, and manage the library catalog.</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setOpenForm(true); }}>
          ＋ Add Book
        </button>
      </div>

      <div className="search-bar mt-2" style={{ marginBottom: 18 }}>
        <span className="icon">🔍</span>
        <input placeholder="Filter by title, author, category, or ISBN..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <div className="card">
        {loading ? (
          <div className="empty"><div className="emoji">⏳</div>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="empty"><div className="emoji">📚</div>No books found. Add your first book above.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
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
                    <td>{b.book_id}</td>
                    <td><strong>{b.title}</strong></td>
                    <td>{b.author}</td>
                    <td><span className="badge badge-info">{b.category}</span></td>
                    <td className="text-muted">{b.isbn}</td>
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

      <Modal open={openForm} title={editing ? 'Edit Book' : 'Add Book'} onClose={() => { setOpenForm(false); setEditing(null); }}>
        <BookForm initial={editing} onSubmit={onSubmit} onCancel={() => { setOpenForm(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}
