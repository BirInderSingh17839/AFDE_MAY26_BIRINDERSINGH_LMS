import { useState } from 'react';
import { searchBooks } from '../services/api';
import { useToast } from '../components/Toast';

export default function Search() {
  const [q, setQ] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const run = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (title) params.title = title;
      if (author) params.author = author;
      if (category) params.category = category;
      const data = await searchBooks(params);
      setResults(data);
      setSearched(true);
    } catch (err) {
      show('Search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setQ(''); setTitle(''); setAuthor(''); setCategory('');
    setResults([]); setSearched(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Search Books</div>
          <div className="page-subtitle">Find books by keyword or filter by specific fields.</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <form onSubmit={run}>
          <div className="search-bar" style={{ boxShadow: 'none', border: '1px solid var(--border)' }}>
            <span className="icon">🔍</span>
            <input placeholder="Keyword search across title, author, category, ISBN..." value={q} onChange={e => setQ(e.target.value)} />
          </div>

          <div className="form-grid mt-4">
            <div className="form-row">
              <label>Title</label>
              <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Filter by title" />
            </div>
            <div className="form-row">
              <label>Author</label>
              <input className="input" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Filter by author" />
            </div>
            <div className="form-row">
              <label>Category</label>
              <input className="input" value={category} onChange={e => setCategory(e.target.value)} placeholder="Filter by category" />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button type="submit" className="btn btn-primary">🔎 Search</button>
            <button type="button" className="btn btn-ghost" onClick={reset}>Reset</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-title">Results {searched && `(${results.length})`}</div>
        {loading ? (
          <div className="empty"><div className="emoji">⏳</div>Searching...</div>
        ) : !searched ? (
          <div className="empty"><div className="emoji">📖</div>Enter a search term above to find books.</div>
        ) : results.length === 0 ? (
          <div className="empty"><div className="emoji">🤔</div>No books matched your query.</div>
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
                </tr>
              </thead>
              <tbody>
                {results.map(b => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
