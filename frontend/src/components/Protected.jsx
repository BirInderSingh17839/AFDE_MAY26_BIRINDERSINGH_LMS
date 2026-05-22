import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Skeleton from './Skeleton';

/** Route guard: requires authentication and (optionally) a role. */
export default function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="space-y-3 w-64">
          <Skeleton className="h-6" />
          <Skeleton className="h-4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (roles && roles.length && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen grid place-items-center p-8 text-center">
        <div>
          <div className="text-5xl mb-3">🔒</div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Access denied</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            This page is restricted to: <strong className="capitalize">{roles.join(', ')}</strong>
          </p>
        </div>
      </div>
    );
  }
  return children;
}
