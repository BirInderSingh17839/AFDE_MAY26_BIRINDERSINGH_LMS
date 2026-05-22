import { useEffect, useState } from 'react';
import { Bell, BellOff, CheckCheck, AlertTriangle, Info, CheckCircle2, Wallet } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Skeleton from '../components/Skeleton';
import {
  listNotifications, markNotificationRead, markAllRead,
} from '../services/api';
import { useToast } from '../contexts/ToastContext';

const CAT_META = {
  info:     { icon: Info,           tone: 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300' },
  success:  { icon: CheckCircle2,   tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' },
  warning:  { icon: AlertTriangle,  tone: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300' },
  overdue:  { icon: AlertTriangle,  tone: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300' },
  fine:     { icon: Wallet,         tone: 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-300' },
};

const timeAgo = (d) => {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function Notifications() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('all');
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try { setRows(await listNotifications()); }
    catch (e) { toast.error(e.userMessage || 'Failed to load notifications'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    try {
      await markNotificationRead(id);
      setRows((r) => r.map((n) => n.notification_id === id ? { ...n, is_read: true } : n));
    } catch (e) { toast.error(e.userMessage || 'Could not update notification'); }
  };

  const markAll = async () => {
    try {
      await markAllRead();
      setRows((r) => r.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (e) { toast.error(e.userMessage || 'Could not update notifications'); }
  };

  const filtered = tab === 'unread' ? rows.filter((n) => !n.is_read) : rows;
  const unreadCount = rows.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Your in-app alerts and updates."
        icon={Bell}
        actions={unreadCount > 0 && (
          <button onClick={markAll} className="btn btn-secondary">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      />

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {['all', 'unread'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t === 'unread' ? `Unread (${unreadCount})` : `All (${rows.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card card-body flex gap-4 items-start">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card card-body text-center py-16">
          <BellOff className="w-10 h-10 mx-auto text-slate-400" />
          <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">
            {tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">You're all caught up.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const meta = CAT_META[n.category] || CAT_META.info;
            const Icon = meta.icon;
            return (
              <div
                key={n.notification_id}
                className={`card card-body flex gap-4 items-start transition-opacity
                            ${n.is_read ? 'opacity-70' : ''}`}
              >
                <div className={`stat-icon-wrap ${meta.tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-slate-900 dark:text-white">{n.title}</h4>
                    {!n.is_read && <span className="badge badge-info badge-dot">New</span>}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{n.message}</p>
                  <div className="text-xs text-slate-400 mt-1">{timeAgo(n.created_at)}</div>
                </div>
                {!n.is_read && (
                  <button onClick={() => markRead(n.notification_id)} className="btn btn-secondary btn-sm">
                    Mark read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
