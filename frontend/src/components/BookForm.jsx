import { useState, useEffect } from 'react';

const empty = { title: '', author: '', category: '', isbn: '', availability_status: 'Available' };

export default function BookForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(initial ? { ...empty, ...initial } : empty);
    setErrors({});
  }, [initial]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.title.trim())    e.title = 'Title is required';
    if (!form.author.trim())   e.author = 'Author is required';
    if (!form.category.trim()) e.category = 'Category is required';
    if (!form.isbn.trim())     e.isbn = 'ISBN is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (e) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <div className="form-row">
          <label>Title</label>
          <input className="input" value={form.title} onChange={set('title')} placeholder="Book title" />
          {errors.title && <div className="error-text">{errors.title}</div>}
        </div>
        <div className="form-row">
          <label>Author</label>
          <input className="input" value={form.author} onChange={set('author')} placeholder="Author name" />
          {errors.author && <div className="error-text">{errors.author}</div>}
        </div>
        <div className="form-row">
          <label>Category</label>
          <input className="input" value={form.category} onChange={set('category')} placeholder="e.g. Fiction" />
          {errors.category && <div className="error-text">{errors.category}</div>}
        </div>
        <div className="form-row">
          <label>ISBN</label>
          <input className="input" value={form.isbn} onChange={set('isbn')} placeholder="978-..." />
          {errors.isbn && <div className="error-text">{errors.isbn}</div>}
        </div>
        <div className="form-row">
          <label>Availability</label>
          <select className="select" value={form.availability_status} onChange={set('availability_status')}>
            <option value="Available">Available</option>
            <option value="Borrowed">Borrowed</option>
          </select>
        </div>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">Save Book</button>
      </div>
    </form>
  );
}
