export default function WardrobeLoading() {
  return (
    <div aria-busy="true" aria-label="Chargement de la garde-robe">
      <div className="mb-6 h-11 w-32 animate-pulse bg-muted" />
      <div className="mb-6 h-11 w-full animate-pulse bg-muted" />
      <div className="grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <div className="aspect-[3/4] w-full animate-pulse bg-muted" />
            <div className="h-3 w-2/3 animate-pulse bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
