import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Library, Eye, EyeOff, Lock, Mail, ShieldCheck, Users, GraduationCap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const DEMO_ACCOUNTS = [
  { role: 'Admin',     email: 'admin@gmail.com',     icon: ShieldCheck,    tone: 'from-rose-500 to-rose-700' },
  { role: 'Librarian', email: 'librarian@gmail.com', icon: Users,          tone: 'from-brand-500 to-brand-700' },
  { role: 'User',      email: 'user@gmail.com',      icon: GraduationCap,  tone: 'from-emerald-500 to-emerald-700' },
];

export default function Login() {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [errors, setErrors]   = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy]       = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const validate = () => {
    const e = {};
    if (!form.email.trim())            e.email    = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password)                e.password = 'Password is required';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const u = await login(form.email.trim().toLowerCase(), form.password);
      toast.success(`Welcome back, ${u.full_name?.split(' ')[0] || u.email}`);
      const to = location.state?.from?.pathname || '/';
      navigate(to, { replace: true });
    } catch (err) {
      toast.error(err.userMessage || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  // Click a demo chip to fill the email; the user types the password.
  const fill = (email) => setForm((f) => ({ ...f, email }));

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50 dark:bg-slate-950">
      {/* Hero panel */}
      <div className="hidden lg:flex relative bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900
                      text-white p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-10"
             style={{ backgroundImage: 'radial-gradient(circle at 25% 30%, white 1px, transparent 1px), radial-gradient(circle at 75% 70%, white 1px, transparent 1px)', backgroundSize: '40px 40px, 60px 60px' }} />
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Library className="w-6 h-6" /> LibraryOS
          </div>
          <div className="my-auto">
            <h1 className="text-4xl font-bold leading-tight">
              Run your library like a product.
            </h1>
            <p className="mt-4 text-brand-100 max-w-md">
              Modern dashboards, real-time analytics, ETL workflows, and zero
              spreadsheets. Built for librarians, students, and admins alike.
            </p>
            <ul className="mt-8 space-y-2 text-sm text-brand-100">
              {[
                'JWT auth · role-based access',
                'CSV / Excel ETL pipeline',
                'Analytics + PDF / XLSX exports',
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-400" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="text-xs text-brand-200">AFDE Capstone · Phase 2 · 2026</div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <form onSubmit={submit} className="w-full max-w-md">
          <div className="text-center mb-8 lg:hidden">
            <div className="w-12 h-12 rounded-xl bg-brand-600 text-white grid place-items-center mx-auto">
              <Library className="w-6 h-6" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Sign in</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            Welcome back. Enter your credentials to continue.
          </p>

          <div className="mt-8 space-y-5">
            <div>
              <label className="input-label">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  type="email"
                  className="input pl-9"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="error-text">{errors.email}</p>}
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input pl-9 pr-10"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Toggle password visibility"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="error-text">{errors.password}</p>}
            </div>

            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 mt-6 text-center">
            New here?{' '}
            <Link to="/register" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
              Create an account
            </Link>
          </p>

          {/* Demo account chooser — fills email only; user types their password */}
          <div className="mt-8">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Quick sign-in (fills email)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.email}
                    type="button"
                    onClick={() => fill(a.email)}
                    className="group p-3 rounded-lg border border-slate-200 dark:border-slate-700
                               hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20
                               transition-colors text-left"
                  >
                    <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${a.tone} text-white grid place-items-center mb-2`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">{a.role}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{a.email}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
