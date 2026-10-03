import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="animate-fade-in" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-6 w-56" />
      <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
