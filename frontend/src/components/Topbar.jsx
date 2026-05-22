import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Bell, Moon, Sun, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getUnreadCount } from '../services/api';

const initials = (n) => (n || '?').split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      try {
        const { count } = await getUnreadCount();
        if (mounted) setUnread(count);
      } catch { /* ignore */ }
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur
                       border-b border-slate-200 dark:border-slate-800
                       flex items-center px-4 sm:px-6 lg:px-8 gap-3">
      <button
        className="lg:hidden -ml-2 p-2 text-slate-600 dark:text-slate-300"
        onClick={onMenu}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1" />

      <Link
        to="/notifications"
        className="relative btn btn-icon btn-ghost"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full
                           bg-rose-500 text-[10px] font-bold text-white grid place-items-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Link>

      <button
        className="btn btn-icon btn-ghost"
        onClick={toggle}
        aria-label="Toggle theme"
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full
                     hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700
                          grid place-items-center text-white text-xs font-bold">
            {initials(user?.full_name)}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-slate-900 dark:text-white">{user?.full_name}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{user?.role}</div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute right-0 mt-2 w-56 z-40 card animate-slide-up overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.full_name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</div>
              </div>
              <Link
                to="/settings"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Profile & Settings
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50
                           dark:hover:bg-rose-900/20 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
