import { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, Search as SearchIcon } from 'lucide-react';
import Skeleton from './Skeleton';

/**
 * DataTable — paginated, searchable, sortable, exportable table.
 *
 * Props:
 *   columns: [{ key, label, render?, sortable=true, exportFn? }]
 *   rows:    [object]
 *   loading: bool
 *   pageSize: number (default 10)
 *   exportName: string CSV filename without extension
 *   searchKeys: keys to search across (defaults to all column keys)
 *   filters: optional React node rendered in the toolbar
 *   empty: optional empty-state node
 */
export default function DataTable({
  columns,
  rows,
  loading = false,
  pageSize = 10,
  exportName = 'export',
  searchKeys,
  filters,
  empty,
}) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [page, setPage] = useState(1);

  const keys = useMemo(
    () => searchKeys || columns.map((c) => c.key),
    [searchKeys, columns]
  );

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) =>
      keys.some((k) => String(r?.[k] ?? '').toLowerCase().includes(needle))
    );
  }, [rows, q, keys]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const out = [...filtered];
    out.sort((a, b) => {
      const av = a?.[sort.key];
      const bv = b?.[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sort.dir === 'asc' ? av - bv : bv - av;
      }
      const r = String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? r : -r;
    });
    return out;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (k) => {
    setSort((s) => (s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' }));
  };

  const exportCsv = () => {
    const header = columns.map((c) => c.label).join(',');
    const lines = sorted.map((r) =>
      columns
        .map((c) => {
          const v = c.exportFn ? c.exportFn(r) : r?.[c.key];
          const s = v == null ? '' : String(v).replace(/"/g, '""');
          return /[",\n]/.test(s) ? `"${s}"` : s;
        })
        .join(',')
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card overflow-hidden">
      {/* Toolbar */}
      <div className="card-header flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search..."
              className="input pl-9"
            />
          </div>
          {filters}
        </div>
        <button onClick={exportCsv} className="btn btn-secondary btn-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  onClick={() => (c.sortable !== false) && toggleSort(c.key)}
                  className={c.sortable === false ? 'cursor-default' : ''}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {c.sortable !== false && (
                      sort.key !== c.key
                        ? <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
                        : sort.dir === 'asc'
                          ? <ChevronUp className="w-3.5 h-3.5" />
                          : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`s-${i}`}>
                  {columns.map((c) => (
                    <td key={c.key}><Skeleton className="h-4" /></td>
                  ))}
                </tr>
              ))
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center text-slate-500 dark:text-slate-400 py-12">
                  {empty || 'No records found.'}
                </td>
              </tr>
            ) : (
              pageRows.map((r, i) => (
                <tr key={r.id ?? r.book_id ?? r.borrower_id ?? r.transaction_id ?? r.fine_id ?? r.user_id ?? i}>
                  {columns.map((c) => (
                    <td key={c.key}>{c.render ? c.render(r) : r?.[c.key]}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && sorted.length > 0 && (
        <div className="px-6 py-3 flex items-center justify-between text-xs
                        text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
          <div>
            Showing <strong>{(safePage - 1) * pageSize + 1}</strong> –
            {' '}<strong>{Math.min(safePage * pageSize, sorted.length)}</strong>
            {' '}of <strong>{sorted.length}</strong>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="btn btn-secondary btn-sm"
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >Prev</button>
            <span className="px-2">{safePage} / {totalPages}</span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
