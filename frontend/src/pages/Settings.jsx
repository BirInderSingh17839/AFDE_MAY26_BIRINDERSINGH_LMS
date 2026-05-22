import { useState } from 'react';
import { UserCircle, Moon, Sun, Lock, Eye, EyeOff } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { authChangePwd } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();

  const [pwForm, setPw]    = useState({ old_password: '', new_password: '', confirm: '' });
  const [errors, setErr]   = useState({});
  const [showOld, setSO]   = useState(false);
  const [showNew, setSN]   = useState(false);
  const [busy, setBusy]    = useState(false);

  const submitPwd = async (e) => {
    e.preventDefault();
    const eobj = {};
    if (!pwForm.old_password) eobj.old_password = 'Required';
    if (pwForm.new_password.length < 6) eobj.new_password = 'Min 6 characters';
    if (pwForm.new_password !== pwForm.confirm) eobj.confirm = 'Passwords do not match';
    setErr(eobj);
    if (Object.keys(eobj).length) return;
    setBusy(true);
    try {
      await authChangePwd({
        old_password: pwForm.old_password,
        new_password: pwForm.new_password,
      });
      toast.success('Password updated');
      setPw({ old_password: '', new_password: '', confirm: '' });
    } catch (e) {
      toast.error(e.userMessage || 'Could not update password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Settings & Profile" subtitle="Manage your account." icon={UserCircle} />

      {/* Profile card */}
      <div className="card">
        <div className="card-header"><h3 className="card-title">Profile</h3></div>
        <div className="card-body">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-brand-700
                            text-white grid place-items-center text-xl font-bold">
              {(user?.full_name || '?').split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">{user?.full_name}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</div>
              <div className="text-xs mt-1 capitalize">
                <span className="badge badge-info">Role: {user?.role}</span>
                <span className="badge badge-muted ml-2">@{user?.username}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="card">
        <div className="card-header"><h3 className="card-title">Appearance</h3></div>
        <div className="card-body">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Choose how LibraryOS looks to you.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 sm:flex-initial flex items-center gap-3 px-4 py-3 rounded-lg border
                          ${theme === 'light'
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                            : 'border-slate-200 dark:border-slate-700'}`}
            >
              <Sun className="w-5 h-5 text-amber-500" />
              <div className="text-left">
                <div className="font-semibold text-sm">Light</div>
                <div className="text-xs text-slate-500">Bright surfaces</div>
              </div>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 sm:flex-initial flex items-center gap-3 px-4 py-3 rounded-lg border
                          ${theme === 'dark'
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                            : 'border-slate-200 dark:border-slate-700'}`}
            >
              <Moon className="w-5 h-5 text-indigo-400" />
              <div className="text-left">
                <div className="font-semibold text-sm">Dark</div>
                <div className="text-xs text-slate-500">Easy on the eyes</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Change password */}
      <form onSubmit={submitPwd} className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center gap-2"><Lock className="w-4 h-4" /> Change password</h3>
        </div>
        <div className="card-body space-y-4">
          <div>
            <label className="input-label">Current password</label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                className="input pr-10"
                value={pwForm.old_password}
                onChange={(e) => setPw({ ...pwForm, old_password: e.target.value })}
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setSO((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.old_password && <p className="error-text">{errors.old_password}</p>}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">New password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  className="input pr-10"
                  value={pwForm.new_password}
                  onChange={(e) => setPw({ ...pwForm, new_password: e.target.value })}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setSN((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.new_password && <p className="error-text">{errors.new_password}</p>}
            </div>
            <div>
              <label className="input-label">Confirm</label>
              <input
                type={showNew ? 'text' : 'password'}
                className="input"
                value={pwForm.confirm}
                onChange={(e) => setPw({ ...pwForm, confirm: e.target.value })}
                autoComplete="new-password"
              />
              {errors.confirm && <p className="error-text">{errors.confirm}</p>}
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
