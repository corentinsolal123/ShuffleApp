export default function RulesLoading() {
  return (
    <div aria-busy="true" aria-label="Chargement des règles" className="flex flex-col gap-4">
      <div className="h-11 w-32 animate-pulse bg-muted" />
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-16 w-full animate-pulse bg-muted" />
      ))}
    </div>
  );
}
