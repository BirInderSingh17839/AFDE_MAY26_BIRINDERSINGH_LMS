import { useEffect, useRef, useState } from 'react';
import { Search as SearchIcon, BookOpen, Sparkles } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Skeleton from '../components/Skeleton';
import { searchBooks } from '../services/api';
import { useToast } from '../contexts/ToastContext';

export default function SearchPage() {
  const [q, setQ]            = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [filters, setFilters] = useState({ title: '', author: '', category: '' });
  const debounceRef = useRef(null);
  const toast = useToast();

  const run = async (params) => {
    setLoading(true);
    try {
      const data = await searchBooks(params);
      setResults(data);
      setSearched(true);
    } catch (e) {
      toast.error(e.userMessage || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Debounced live search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q && !filters.title && !filters.author && !filters.category) {
      setResults([]); setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      run({ q: q || undefined, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [q, filters]);

  const statusBadge = (s) => {
    if (s === 'Available') return <span className="badge badge-success badge-dot">{s}</span>;
    if (s === 'Borrowed')  return <span className="badge badge-warning badge-dot">{s}</span>;
    return <span className="badge badge-muted">{s}</span>;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Search the Catalog" subtitle="Find books by title, author, category, or ISBN." icon={SearchIcon} />

      {/* Hero search */}
      <div className="card card-body">
        <div className="relative">
          <SearchIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for a book…"
            className="w-full pl-12 pr-4 py-4 text-lg rounded-xl bg-slate-50 dark:bg-slate-800
                       border border-slate-200 dark:border-slate-700
                       focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                       text-slate-900 dark:text-white"
          />
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <input
            className="input" placeholder="Filter by title"
            value={filters.title} onChange={(e) => setFilters({ ...filters, title: e.target.value })}
          />
          <input
            className="input" placeholder="Filter by author"
            value={filters.author} onChange={(e) => setFilters({ ...filters, author: e.target.value })}
          />
          <input
            className="input" placeholder="Filter by category"
            value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          />
        </div>
      </div>

      {/* Results */}
      {!searched && !loading ? (
        <div className="card card-body text-center py-16">
          <Sparkles className="w-10 h-10 mx-auto text-brand-500" />
          <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">Start typing to search</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Try titles, authors, categories, or ISBNs.
          </p>
        </div>
      ) : loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card card-body space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="card card-body text-center py-16">
          <BookOpen className="w-10 h-10 mx-auto text-slate-400" />
          <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">No results</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Try a different keyword.</p>
        </div>
      ) : (
        <>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            <strong className="text-slate-700 dark:text-slate-300">{results.length}</strong> result(s)
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((b) => (
              <div key={b.book_id} className="card card-body hover:-translate-y-0.5 transition-transform">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{b.title}</h3>
                  {statusBadge(b.availability_status)}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{b.author}</p>
                <div className="flex items-center gap-2 mt-3 text-xs">
                  <span className="badge badge-info">{b.category}</span>
                  <span className="text-slate-500 dark:text-slate-400">ISBN {b.isbn}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
