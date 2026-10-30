export default function ProductLoading() {
  return (
    <div className="grid gap-8 py-8 lg:grid-cols-2" aria-busy="true">
      <div className="min-h-[22rem] animate-pulse rounded-[var(--radius)] bg-surface" />
      <div className="grid content-start gap-4">
        <div className="h-4 w-24 animate-pulse rounded bg-surface" />
        <div className="h-10 w-3/4 animate-pulse rounded bg-surface" />
        <div className="h-20 w-full animate-pulse rounded bg-surface" />
      </div>
    </div>
  );
}
