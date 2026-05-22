import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import Protected from './components/Protected';
import AppShell from './components/AppShell';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import Borrowers from './pages/Borrowers';
import Transactions from './pages/Transactions';
import SearchPage from './pages/Search';
import Fines from './pages/Fines';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import EtlPage from './pages/Etl';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<Protected><AppShell /></Protected>}>
              <Route path="/"             element={<Dashboard />} />
              <Route path="/books"        element={<Books />} />
              <Route path="/borrowers"    element={<Protected roles={['admin', 'librarian']}><Borrowers /></Protected>} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/search"       element={<SearchPage />} />
              <Route path="/fines"        element={<Fines />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/etl"          element={<Protected roles={['admin', 'librarian']}><EtlPage /></Protected>} />
              <Route path="/reports"      element={<Protected roles={['admin', 'librarian']}><Reports /></Protected>} />
              <Route path="/users"        element={<Protected roles={['admin']}><Users /></Protected>} />
              <Route path="/settings"     element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
