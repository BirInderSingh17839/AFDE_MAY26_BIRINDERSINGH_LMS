import { useEffect, useState } from 'react';
import { listBooks, listBorrowers, listTransactions, borrowBook, returnBook } from '../services/api';
import { useToast } from '../components/Toast';

export default function Transactions() {
  const [books, setBooks] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookId, setBookId] = useState('');
  const [borrowerId, setBorrowerId] = useState('');
  const { show } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [b, bo, t] = await Promise.all([listBooks(), listBorrowers(), listTransactions()]);
      setBooks(b);
      setBorrowers(bo);
      setTxns(t);
    } catch (e) {
      show('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onBorrow = async (e) => {
    e.preventDefault();
    if (!bookId || !borrowerId) { show('Select a book and a borrower', 'error'); return; }
    try {
      await borrowBook(Number(bookId), Number(borrowerId));
      show('Book borrowed successfully');
      setBookId(''); setBorrowerId('');
      load();
    } catch (err) {
      show(err?.response?.data?.detail || 'Borrow failed', 'error');
    }
  };

  const onReturn = async (txn) => {
    try {
      await returnBook(txn.transaction_id);
      show('Book returned');
      load();
    } catch (err) {
      show(err?.response?.data?.detail || 'Return failed', 'error');
    }
  };

  const availableBooks = books.filter(b => b.availability_status === 'Available');

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Borrow / Return</div>
          <div className="page-subtitle">Lend books out and record returns.</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Borrow a Book</div>
        <form onSubmit={onBorrow}>
          <div className="form-grid">
            <div className="form-row">
              <label>Book (Available)</label>
              <select className="select" value={bookId} onChange={e => setBookId(e.target.value)}>
                <option value="">-- Select a book --</option>
                {availableBooks.map(b => (
                  <option key={b.book_id} value={b.book_id}>{b.title} — {b.author}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Borrower</label>
              <select className="select" value={borrowerId} onChange={e => setBorrowerId(e.target.value)}>
                <option value="">-- Select a borrower --</option>
                {borrowers.map(b => (
                  <option key={b.borrower_id} value={b.borrower_id}>{b.borrower_name} ({b.email})</option>
                ))}
              </select>
            </div>
            <div className="form-row" style={{ justifyContent: 'flex-end' }}>
              <label style={{ visibility: 'hidden' }}>Action</label>
              <button type="submit" className="btn btn-primary">📤 Borrow Book</button>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-title">All Transactions</div>
        {loading ? (
          <div className="empty"><div className="emoji">⏳</div>Loading...</div>
        ) : txns.length === 0 ? (
          <div className="empty"><div className="emoji">📭</div>No transactions yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Book</th>
                  <th>Borrower</th>
                  <th>Borrowed</th>
                  <th>Returned</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {txns.map(t => (
                  <tr key={t.transaction_id}>
                    <td>{t.transaction_id}</td>
                    <td><strong>{t.book_title || `Book #${t.book_id}`}</strong></td>
                    <td>{t.borrower_name || `Borrower #${t.borrower_id}`}</td>
                    <td>{new Date(t.borrow_date).toLocaleString()}</td>
                    <td>{t.return_date ? new Date(t.return_date).toLocaleString() : '—'}</td>
                    <td>
                      {t.return_date
                        ? <span className="badge badge-success">Returned</span>
                        : <span className="badge badge-warning">Active</span>}
                    </td>
                    <td className="text-right">
                      {!t.return_date && (
                        <button className="btn btn-success btn-sm" onClick={() => onReturn(t)}>↩ Return</button>
                      )}
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
