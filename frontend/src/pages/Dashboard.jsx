import { useEffect, useState } from 'react';
import { getDashboard, listTransactions } from '../services/api';

const toneFor = (i) => `tone-${(i % 5) + 1}`;
const initials = (name) => (name || '?').split(' ').map(s => s[0]).filter(Boolean).slice(0,2).join('').toUpperCase();

export default function Dashboard() {
  const [stats, setStats]     = useState(null);
  const [recent, setRecent]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, t] = await Promise.all([getDashboard(), listTransactions()]);
        setStats(s);
        setRecent(t.slice(0, 6));
      } catch (e) {
        setError('Could not connect to the API at http://localhost:8000');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="empty"><span className="emoji">⏳</span>Loading your dashboard...</div>;
  if (error)   return <div className="empty"><span className="emoji">⚠️</span><span className="title">Connection issue</span>{error}</div>;

  const cards = [
    { label: 'Total Books',     value: stats.total_books,        icon: '📚', cls: 'primary' },
    { label: 'Available Now',   value: stats.available_books,    icon: '✅', cls: 'success' },
    { label: 'Currently Out',   value: stats.borrowed_books,     icon: '📤', cls: 'warning' },
    { label: 'Borrowers',       value: stats.total_borrowers,    icon: '👥', cls: 'accent' },
    { label: 'Transactions',    value: stats.total_transactions, icon: '📝', cls: 'info' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Welcome back 👋</div>
          <div className="page-subtitle">Here's what's happening in your library today</div>
        </div>
        <div className="text-muted" style={{ fontSize: 12 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="stats-grid">
        {cards.map(c => (
          <div key={c.label} className={`stat-card ${c.cls}`}>
            <div className="stat-icon">{c.icon}</div>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">Recent Activity</div>
        {recent.length === 0 ? (
          <div className="empty">
            <span className="emoji">📭</span>
            <span className="title">No activity yet</span>
            Borrow a book to see transactions here.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Borrower</th>
                  <th>Borrowed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((t, i) => (
                  <tr key={t.transaction_id}>
                    <td><strong>{t.book_title || `Book #${t.book_id}`}</strong></td>
                    <td>
                      <div className="cell-flex">
                        <div className={`avatar ${toneFor(t.borrower_id ?? i)}`}>{initials(t.borrower_name)}</div>
                        <span>{t.borrower_name || `Borrower #${t.borrower_id}`}</span>
                      </div>
                    </td>
                    <td className="text-dim">{new Date(t.borrow_date).toLocaleDateString()}</td>
                    <td>
                      {t.return_date
                        ? <span className="badge badge-success">Returned</span>
                        : <span className="badge badge-warning">Active</span>}
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
