export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5" role="status" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div className="h-48 animate-pulse rounded-3xl border border-border bg-surface-muted" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl border border-border bg-surface-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface-muted" />
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface-muted" />
      </div>
    </div>
  );
}
