import { LoadingAnnouncement, Skeleton } from "@/components/skeleton";

/** Shown instantly on every worker-page navigation while the server renders the real page. */
export default function WorkerLoading() {
  return (
    <div className="flex flex-col gap-6">
      <LoadingAnnouncement />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-56" />
      </div>
      <Skeleton className="h-48 w-full rounded-worker" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full rounded-worker" />
        <Skeleton className="h-20 w-full rounded-worker" />
        <Skeleton className="h-20 w-full rounded-worker" />
      </div>
    </div>
  );
}
