export default function Skeleton({ className = '', style }) {
  return <div className={`skeleton ${className}`} style={style} />;
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card">
      <Skeleton className="w-11 h-11 rounded-lg" />
      <Skeleton className="w-24 h-3 mt-4" />
      <Skeleton className="w-16 h-8 mt-2" />
    </div>
  );
}
