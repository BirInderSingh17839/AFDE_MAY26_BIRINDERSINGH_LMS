import { useEffect, useState } from 'react';

const EMPTY = { borrower_name: '', email: '', phone: '' };

export default function BorrowerForm({ initial, onSubmit, onCancel, busy }) {
  const [form, setForm]  = useState(EMPTY);
  const [errors, setErr] = useState({});

  useEffect(() => { setForm(initial || EMPTY); setErr({}); }, [initial]);

  const validate = () => {
    const e = {};
    if (!form.borrower_name.trim()) e.borrower_name = 'Name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.phone.trim() || form.phone.trim().length < 5) e.phone = 'Phone is required (min 5 chars)';
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
      <div>
        <label className="input-label">Full name</label>
        <input className="input" value={form.borrower_name} onChange={update('borrower_name')} />
        {errors.borrower_name && <p className="error-text">{errors.borrower_name}</p>}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="input-label">Email</label>
          <input className="input" type="email" value={form.email} onChange={update('email')} />
          {errors.email && <p className="error-text">{errors.email}</p>}
        </div>
        <div>
          <label className="input-label">Phone</label>
          <input className="input" value={form.phone} onChange={update('phone')} />
          {errors.phone && <p className="error-text">{errors.phone}</p>}
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
