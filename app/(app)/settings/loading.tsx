export default function SettingsLoading() {
  return (
    <div aria-busy="true" aria-label="Chargement des réglages" className="flex flex-col gap-6">
      <div className="h-11 w-32 animate-pulse bg-muted" />
      <div className="h-24 w-full animate-pulse bg-muted" />
      <div className="h-48 w-full animate-pulse bg-muted" />
    </div>
  );
}
