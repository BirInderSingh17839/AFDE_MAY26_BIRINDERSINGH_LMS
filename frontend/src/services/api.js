/**
 * Axios client + API helpers.
 *
 * Phase 2: JWT bearer auth. The token is persisted in localStorage and
 * automatically attached to every outbound request via an interceptor.
 */
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'lms.token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

const api = axios.create({
  baseURL,
  timeout: 30_000,
});

// Attach Authorization header on every request.
api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

// Normalise errors so the UI gets a `userMessage` string.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const detail = err?.response?.data?.detail;
    let msg;
    if (Array.isArray(detail)) {
      msg = detail.map((d) => d?.msg || JSON.stringify(d)).join('; ');
    } else if (typeof detail === 'string') {
      msg = detail;
    } else {
      msg = err?.message || 'Network error';
    }
    err.userMessage = msg;
    // Auto-clear token on 401 so the AuthContext redirects to /login.
    if (err?.response?.status === 401) setToken(null);
    return Promise.reject(err);
  }
);

// ---------- Auth ----------
export const authLogin    = (email, password) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);
export const authRegister = (payload) => api.post('/auth/register', payload).then((r) => r.data);
export const authMe       = ()        => api.get('/auth/me').then((r) => r.data);
export const authLogout   = ()        => api.post('/auth/logout').then((r) => r.data);
export const authChangePwd = (payload) => api.post('/auth/change-password', payload).then((r) => r.data);

// ---------- Books ----------
export const listBooks  = ()        => api.get('/books').then((r) => r.data);
export const getBook    = (id)      => api.get(`/books/${id}`).then((r) => r.data);
export const createBook = (payload) => api.post('/books', payload).then((r) => r.data);
export const updateBook = (id, p)   => api.put(`/books/${id}`, p).then((r) => r.data);
export const deleteBook = (id)      => api.delete(`/books/${id}`).then((r) => r.data);

// ---------- Borrowers ----------
export const listBorrowers  = ()        => api.get('/borrowers').then((r) => r.data);
export const createBorrower = (payload) => api.post('/borrowers', payload).then((r) => r.data);
export const updateBorrower = (id, p)   => api.put(`/borrowers/${id}`, p).then((r) => r.data);
export const deleteBorrower = (id)      => api.delete(`/borrowers/${id}`).then((r) => r.data);

// ---------- Users (admin) ----------
export const listUsers    = ()         => api.get('/users').then((r) => r.data);
export const updateUser   = (id, p)    => api.put(`/users/${id}`, p).then((r) => r.data);
export const deleteUser   = (id)       => api.delete(`/users/${id}`).then((r) => r.data);
export const linkBorrower = (uid, bid) => api.put(`/users/${uid}/link-borrower/${bid}`).then((r) => r.data);

// ---------- Transactions ----------
export const borrowBook = (book_id, borrower_id, loan_days) =>
  api.post('/borrow', { book_id, borrower_id, loan_days }).then((r) => r.data);
export const returnBook = (transaction_id) =>
  api.post('/return', { transaction_id }).then((r) => r.data);
export const listTransactions = (params = {}) =>
  api.get('/transactions', { params }).then((r) => r.data);

// ---------- Search & dashboard ----------
export const searchBooks  = (params) => api.get('/search', { params }).then((r) => r.data);
export const getDashboard = ()       => api.get('/dashboard').then((r) => r.data);

// ---------- Fines ----------
export const listFines = (params = {}) => api.get('/fines', { params }).then((r) => r.data);
export const payFine   = (fine_id)     => api.post('/fines/pay', { fine_id }).then((r) => r.data);
export const waiveFine = (fine_id)     => api.post(`/fines/${fine_id}/waive`).then((r) => r.data);

// ---------- Notifications ----------
export const listNotifications  = (unread_only = false) =>
  api.get('/notifications', { params: { unread_only } }).then((r) => r.data);
export const markNotificationRead = (id) => api.post(`/notifications/${id}/read`).then((r) => r.data);
export const markAllRead          = ()   => api.post('/notifications/read-all').then((r) => r.data);
export const getUnreadCount       = ()   => api.get('/notifications/unread-count').then((r) => r.data);

// ---------- Reports & exports ----------
export const getReportSummary = () => api.get('/reports/summary').then((r) => r.data);

/**
 * Downloads a report as a Blob. Uses fetch with Authorization header
 * (an <a download> won't carry the token; this opens a file save dialog).
 */
export async function downloadReport(path, filename) {
  const t = getToken();
  const res = await fetch(`${baseURL}${path}`, {
    headers: t ? { Authorization: `Bearer ${t}` } : {},
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- ETL ----------
export const uploadEtlFile = (entity, file) => {
  const form = new FormData();
  form.append('entity', entity);
  form.append('file', file);
  return api.post('/etl/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};
export const listEtlLogs = (params = {}) => api.get('/etl/logs', { params }).then((r) => r.data);
export const getEtlLog   = (id) => api.get(`/etl/logs/${id}`).then((r) => r.data);
export const snapshotEtl = ()   => api.post('/etl/snapshot').then((r) => r.data);

// ---------- Analytics ----------
export const overdueAnalysis = () => api.get('/analytics/overdue').then((r) => r.data);
export const topBooks        = (limit = 10) => api.get('/analytics/top-books', { params: { limit } }).then((r) => r.data);
export const categoriesAgg   = () => api.get('/analytics/categories').then((r) => r.data);
export const monthlyTrends   = () => api.get('/analytics/monthly-trends').then((r) => r.data);
export const activeUsers     = (limit = 10) => api.get('/analytics/active-users', { params: { limit } }).then((r) => r.data);

export default api;
