import { useState, useEffect } from 'react';

const empty = { borrower_name: '', email: '', phone: '' };

export default function BorrowerForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(initial ? { ...empty, ...initial } : empty);
    setErrors({});
  }, [initial]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.borrower_name.trim()) e.borrower_name = 'Name is required';
    if (!form.email.trim())          e.email = 'Email is required';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = 'Invalid email format';
    if (!form.phone.trim())          e.phone = 'Phone is required';
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
          <label>👤 Full Name</label>
          <input className="input" value={form.borrower_name} onChange={set('borrower_name')} placeholder="Jane Doe" />
          {errors.borrower_name && <div className="error-text">{errors.borrower_name}</div>}
        </div>
        <div className="form-row">
          <label>📧 Email</label>
          <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="jane@example.com" />
          {errors.email && <div className="error-text">{errors.email}</div>}
        </div>
        <div className="form-row">
          <label>📱 Phone</label>
          <input className="input" value={form.phone} onChange={set('phone')} placeholder="+91-9876500000" />
          {errors.phone && <div className="error-text">{errors.phone}</div>}
        </div>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">💾 Save Borrower</button>
      </div>
    </form>
  );
}
