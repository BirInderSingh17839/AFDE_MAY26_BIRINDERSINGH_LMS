import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Users, Repeat, Wallet,
  Search, Bell, BarChart3, UserCircle, ShieldCheck, X, Library, Database,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ALL_NAV = [
  { to: '/',              label: 'Dashboard',     icon: LayoutDashboard, roles: ['admin', 'librarian', 'student'] },
  { to: '/books',         label: 'Books',         icon: BookOpen,        roles: ['admin', 'librarian', 'student'] },
  { to: '/search',        label: 'Search',        icon: Search,          roles: ['admin', 'librarian', 'student'] },
  { to: '/borrowers',     label: 'Borrowers',     icon: Users,           roles: ['admin', 'librarian'] },
  { to: '/transactions',  label: 'Issue / Return',icon: Repeat,          roles: ['admin', 'librarian', 'student'] },
  { to: '/fines',         label: 'Fines',         icon: Wallet,          roles: ['admin', 'librarian', 'student'] },
  { to: '/notifications', label: 'Notifications', icon: Bell,            roles: ['admin', 'librarian', 'student'] },
  { to: '/etl',           label: 'ETL Pipeline',  icon: Database,        roles: ['admin', 'librarian'] },
  { to: '/reports',       label: 'Reports',       icon: BarChart3,       roles: ['admin', 'librarian'] },
  { to: '/users',         label: 'Users',         icon: ShieldCheck,     roles: ['admin'] },
  { to: '/settings',      label: 'Settings',      icon: UserCircle,      roles: ['admin', 'librarian', 'student'] },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { user } = useAuth();
  const role = user?.role || 'student';
  const nav = ALL_NAV.filter((n) => n.roles.includes(role));

  const content = (
    <>
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-200 dark:border-slate-800">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center shadow-sm">
          <Library className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-slate-900 dark:text-white text-sm leading-tight">LibraryOS</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">v2.0 · Modern LMS</div>
        </div>
        <button
          className="lg:hidden ml-auto p-2 -mr-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <Icon className="nav-icon" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800
                      text-[11px] text-slate-500 dark:text-slate-400">
        AFDE Capstone · Phase 2
      </div>
    </>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 w-64 z-30
                   flex-col bg-white dark:bg-slate-900 border-r
                   border-slate-200 dark:border-slate-800"
      >
        {content}
      </aside>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
          <aside className="relative w-72 max-w-[80%] bg-white dark:bg-slate-900
                            border-r border-slate-200 dark:border-slate-800
                            flex flex-col animate-slide-up">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
