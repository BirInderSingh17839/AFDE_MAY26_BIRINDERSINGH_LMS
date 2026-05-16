import { useState } from 'react';
import { searchBooks } from '../services/api';
import { useToast } from '../components/Toast';

const categoryColors = ['badge-info', 'badge-teal', 'badge-pink', 'badge-blue', 'badge-warning'];
const colorFor = (s) => categoryColors[(s?.length || 0) % categoryColors.length];

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
      if (q)        params.q = q;
      if (title)    params.title = title;
      if (author)   params.author = author;
      if (category) params.category = category;
      setResults(await searchBooks(params));
      setSearched(true);
    } catch { show('Search failed', 'error'); }
    finally { setLoading(false); }
  };

  const reset = () => {
    setQ(''); setTitle(''); setAuthor(''); setCategory('');
    setResults([]); setSearched(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🔍 Search Books</div>
          <div className="page-subtitle">Find books by keyword or specific filters</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={run}>
          <div className="search-bar" style={{ boxShadow: 'none' }}>
            <span className="icon">🔍</span>
            <input placeholder="Keyword search: title, author, category, ISBN..." value={q} onChange={e => setQ(e.target.value)} />
          </div>

          <div className="form-grid" style={{ marginTop: 18 }}>
            <div className="form-row">
              <label>📖 Title</label>
              <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Filter by title" />
            </div>
            <div className="form-row">
              <label>✍️ Author</label>
              <input className="input" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Filter by author" />
            </div>
            <div className="form-row">
              <label>🏷️ Category</label>
              <input className="input" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Fiction" />
            </div>
          </div>

          <div className="flex gap-3" style={{ marginTop: 18 }}>
            <button type="submit" className="btn btn-primary">🔎 Search</button>
            <button type="button" className="btn btn-ghost" onClick={reset}>Reset</button>
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-title" style={{ marginBottom: 0 }}>
            Results
          </div>
          {searched && (
            <span className="badge badge-info">{results.length} found</span>
          )}
        </div>

        {loading ? (
          <div className="empty"><span className="emoji">⏳</span>Searching...</div>
        ) : !searched ? (
          <div className="empty">
            <span className="emoji">📖</span>
            <span className="title">Ready when you are</span>
            Enter a search term above to find books.
          </div>
        ) : results.length === 0 ? (
          <div className="empty">
            <span className="emoji">🤔</span>
            <span className="title">No matches</span>
            Try different keywords or fewer filters.
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
                </tr>
              </thead>
              <tbody>
                {results.map(b => (
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
