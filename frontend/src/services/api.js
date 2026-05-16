import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const api = axios.create({ baseURL, timeout: 10000 });

export const listBooks       = ()         => api.get('/books').then(r => r.data);
export const getBook         = (id)       => api.get(`/books/${id}`).then(r => r.data);
export const createBook      = (payload)  => api.post('/books', payload).then(r => r.data);
export const updateBook      = (id, p)    => api.put(`/books/${id}`, p).then(r => r.data);
export const deleteBook      = (id)       => api.delete(`/books/${id}`).then(r => r.data);

export const listBorrowers   = ()         => api.get('/borrowers').then(r => r.data);
export const createBorrower  = (payload)  => api.post('/borrowers', payload).then(r => r.data);
export const updateBorrower  = (id, p)    => api.put(`/borrowers/${id}`, p).then(r => r.data);
export const deleteBorrower  = (id)       => api.delete(`/borrowers/${id}`).then(r => r.data);

export const borrowBook      = (book_id, borrower_id) =>
  api.post('/borrow', { book_id, borrower_id }).then(r => r.data);
export const returnBook      = (transaction_id) =>
  api.post('/return', { transaction_id }).then(r => r.data);
export const listTransactions = () => api.get('/transactions').then(r => r.data);

export const searchBooks   = (params) => api.get('/search', { params }).then(r => r.data);
export const getDashboard  = ()       => api.get('/dashboard').then(r => r.data);

export default api;
