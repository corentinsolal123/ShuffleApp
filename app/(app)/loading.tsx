export default function GenerateLoading() {
  return (
    <div aria-busy="true" aria-label="Chargement" className="flex flex-col gap-6">
      <div className="h-11 w-40 animate-pulse bg-muted" />
      <div className="h-14 w-full animate-pulse bg-muted" />
      <div className="h-40 w-full animate-pulse bg-muted" />
      <div className="h-16 w-full animate-pulse bg-muted" />
    </div>
  );
}
