import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Library, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function Register() {
  const [form, setForm] = useState({
    username: '', email: '', full_name: '', password: '', confirm: '',
  });
  const [errors, setErrors]   = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy]       = useState(false);
  const { register, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const validate = () => {
    const e = {};
    if (form.username.trim().length < 3) e.username = 'Username must be at least 3 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.full_name.trim())          e.full_name = 'Full name is required';
    if (form.password.length < 6)        e.password  = 'Password must be at least 6 characters';
    if (form.password !== form.confirm)  e.confirm   = 'Passwords do not match';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await register({
        username:  form.username.trim(),
        email:     form.email.trim().toLowerCase(),
        full_name: form.full_name.trim(),
        password:  form.password,
      });
      // Auto sign-in by email after successful registration.
      await login(form.email.trim().toLowerCase(), form.password);
      toast.success('Account created — welcome!');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.userMessage || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <form onSubmit={submit} className="w-full max-w-lg card card-body">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-brand-600 text-white grid place-items-center">
            <Library className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create your account</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Join LibraryOS in under a minute.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="input-label">Full name</label>
            <input className="input" value={form.full_name} onChange={update('full_name')} placeholder="Jane Doe" />
            {errors.full_name && <p className="error-text">{errors.full_name}</p>}
          </div>

          <div>
            <label className="input-label">Username</label>
            <input className="input" value={form.username} onChange={update('username')} autoComplete="username" />
            {errors.username && <p className="error-text">{errors.username}</p>}
          </div>

          <div>
            <label className="input-label">Email</label>
            <input className="input" type="email" value={form.email} onChange={update('email')} autoComplete="email" />
            {errors.email && <p className="error-text">{errors.email}</p>}
          </div>

          <div>
            <label className="input-label">Password</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                className="input pr-10"
                value={form.password}
                onChange={update('password')}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-label="Toggle password visibility"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="error-text">{errors.password}</p>}
          </div>

          <div>
            <label className="input-label">Confirm password</label>
            <input
              type={showPwd ? 'text' : 'password'}
              className="input"
              value={form.confirm}
              onChange={update('confirm')}
              autoComplete="new-password"
            />
            {errors.confirm && <p className="error-text">{errors.confirm}</p>}
          </div>
        </div>

        <button type="submit" disabled={busy} className="btn btn-primary w-full mt-6">
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-5 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
