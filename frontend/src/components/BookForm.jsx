import { useEffect, useState } from 'react';

const EMPTY = { title: '', author: '', category: '', isbn: '', availability_status: 'Available' };
const STATUS_OPTIONS = ['Available', 'Borrowed', 'Reserved', 'Retired'];

export default function BookForm({ initial, onSubmit, onCancel, busy }) {
  const [form, setForm]   = useState(EMPTY);
  const [errors, setErr]  = useState({});

  useEffect(() => { setForm(initial || EMPTY); setErr({}); }, [initial]);

  const validate = () => {
    const e = {};
    if (!form.title.trim())    e.title    = 'Title is required';
    if (!form.author.trim())   e.author   = 'Author is required';
    if (!form.category.trim()) e.category = 'Category is required';
    if (!form.isbn.trim())     e.isbn     = 'ISBN is required';
    return e;
  };

  const submit = (ev) => {
    ev.preventDefault();
    const e = validate();
    setErr(e);
    if (!Object.keys(e).length) onSubmit(form);
  };

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="input-label">Title</label>
          <input className="input" value={form.title} onChange={update('title')} />
          {errors.title && <p className="error-text">{errors.title}</p>}
        </div>
        <div>
          <label className="input-label">Author</label>
          <input className="input" value={form.author} onChange={update('author')} />
          {errors.author && <p className="error-text">{errors.author}</p>}
        </div>
        <div>
          <label className="input-label">Category</label>
          <input className="input" value={form.category} onChange={update('category')} placeholder="Fiction, Science…" />
          {errors.category && <p className="error-text">{errors.category}</p>}
        </div>
        <div>
          <label className="input-label">ISBN</label>
          <input className="input" value={form.isbn} onChange={update('isbn')} />
          {errors.isbn && <p className="error-text">{errors.isbn}</p>}
        </div>
        <div>
          <label className="input-label">Status</label>
          <select className="select" value={form.availability_status} onChange={update('availability_status')}>
            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
