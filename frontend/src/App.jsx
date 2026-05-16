import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import Borrowers from './pages/Borrowers';
import Transactions from './pages/Transactions';
import Search from './pages/Search';
import { ToastProvider } from './components/Toast';

export default function App() {
  return (
    <ToastProvider>
      <div className="app-shell">
        <Sidebar />
        <main className="main">
          <Routes>
            <Route path="/"             element={<Dashboard />} />
            <Route path="/books"        element={<Books />} />
            <Route path="/borrowers"    element={<Borrowers />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/search"       element={<Search />} />
            <Route path="*"             element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}
