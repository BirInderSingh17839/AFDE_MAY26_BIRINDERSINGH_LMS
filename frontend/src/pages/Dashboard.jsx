import { useEffect, useState } from 'react';
import { getDashboard, listTransactions } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, t] = await Promise.all([getDashboard(), listTransactions()]);
        setStats(s);
        setRecent(t.slice(0, 6));
      } catch (e) {
        setError('Could not load dashboard. Is the API running on http://localhost:8000 ?');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="empty"><div className="emoji">⏳</div>Loading dashboard...</div>;
  if (error)   return <div className="empty"><div className="emoji">⚠️</div>{error}</div>;

  const cards = [
    { label: 'Total Books',     value: stats.total_books,        icon: '📚', cls: 'primary' },
    { label: 'Available',       value: stats.available_books,    icon: '✅', cls: 'success' },
    { label: 'Borrowed',        value: stats.borrowed_books,     icon: '🔄', cls: 'warning' },
    { label: 'Borrowers',       value: stats.total_borrowers,    icon: '👥', cls: 'accent' },
    { label: 'Transactions',    value: stats.total_transactions, icon: '📝', cls: 'info' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Welcome back 👋</div>
          <div className="page-subtitle">Here's a snapshot of your library today.</div>
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
        <div className="card-title">Recent Transactions</div>
        {recent.length === 0 ? (
          <div className="empty"><div className="emoji">📭</div>No transactions yet — borrow a book to get started.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Book</th>
                  <th>Borrower</th>
                  <th>Borrowed On</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(t => (
                  <tr key={t.transaction_id}>
                    <td>{t.transaction_id}</td>
                    <td>{t.book_title || `Book #${t.book_id}`}</td>
                    <td>{t.borrower_name || `Borrower #${t.borrower_id}`}</td>
                    <td>{new Date(t.borrow_date).toLocaleString()}</td>
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
