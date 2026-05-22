import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import BookForm from '../components/BookForm';
import { listBooks, createBook, updateBook, deleteBook } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

export default function Books() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);     // 'create' | { ...book }
  const [busy, setBusy]         = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter]     = useState('');
  const toast = useToast();
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin', 'librarian');

  const load = async () => {
    setLoading(true);
    try {
      const books = await listBooks();
      setRows(books);
    } catch (e) {
      toast.error(e.userMessage || 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((b) =>
    (!categoryFilter || b.category === categoryFilter) &&
    (!statusFilter || b.availability_status === statusFilter)
  ), [rows, categoryFilter, statusFilter]);

  const categories = useMemo(
    () => Array.from(new Set(rows.map((b) => b.category))).sort(),
    [rows]
  );

  const handleSubmit = async (data) => {
    setBusy(true);
    try {
      if (modal === 'create') {
        await createBook(data);
        toast.success('Book added');
      } else {
        await updateBook(modal.book_id, data);
        toast.success('Book updated');
      }
      setModal(null);
      load();
    } catch (e) {
      toast.error(e.userMessage || 'Could not save book');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (book) => {
    if (!confirm(`Delete "${book.title}"? This cannot be undone.`)) return;
    try {
      await deleteBook(book.book_id);
      toast.success('Book deleted');
      load();
    } catch (e) {
      toast.error(e.userMessage || 'Could not delete book');
    }
  };

  const statusBadge = (s) => {
    if (s === 'Available') return <span className="badge badge-success badge-dot">{s}</span>;
    if (s === 'Borrowed')  return <span className="badge badge-warning badge-dot">{s}</span>;
    return <span className="badge badge-muted">{s}</span>;
  };

  const columns = [
    { key: 'book_id', label: 'ID' },
    { key: 'title', label: 'Title', render: (b) => <span className="font-semibold text-slate-900 dark:text-white">{b.title}</span> },
    { key: 'author', label: 'Author' },
    { key: 'category', label: 'Category', render: (b) => <span className="badge badge-info">{b.category}</span> },
    { key: 'isbn', label: 'ISBN' },
    { key: 'availability_status', label: 'Status', render: (b) => statusBadge(b.availability_status) },
    ...(canEdit ? [{
      key: '_actions', label: 'Actions', sortable: false, exportFn: () => '',
      render: (b) => (
        <div className="flex items-center gap-1">
          <button className="btn btn-icon btn-ghost" onClick={() => setModal(b)} aria-label="Edit"><Pencil className="w-4 h-4" /></button>
          <button className="btn btn-icon btn-ghost text-rose-600" onClick={() => handleDelete(b)} aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Books"
        subtitle="Manage your catalog — add, edit, retire."
        icon={BookOpen}
        actions={canEdit && (
          <button onClick={() => setModal('create')} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Add Book
          </button>
        )}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        exportName="books"
        searchKeys={['title', 'author', 'category', 'isbn']}
        filters={
          <>
            <select className="select max-w-[180px]" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select className="select max-w-[150px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option>Available</option>
              <option>Borrowed</option>
              <option>Reserved</option>
              <option>Retired</option>
            </select>
          </>
        }
        empty="No books in the catalog yet."
      />

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Add a new book' : 'Edit book'}
        subtitle={modal === 'create' ? 'Fill in the details below.' : `Book ID #${modal?.book_id}`}
      >
        <BookForm
          initial={modal === 'create' ? null : modal}
          onSubmit={handleSubmit}
          onCancel={() => setModal(null)}
          busy={busy}
        />
      </Modal>
    </div>
  );
}
