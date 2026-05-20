import { Suspense } from "react";
import { getLeagueDetails, getLiveData, getEntryPicks, finishedGameweeks, FPLError } from "@/lib/fpl";
import { aggregateLeague } from "@/lib/bench";
import { BenchTable } from "@/components/bench-table";
import { Skeleton } from "@/components/ui/skeleton";

async function LeagueContent({ id }: { id: string }) {
  let details;
  try {
    details = await getLeagueDetails(id);
  } catch (err) {
    const message = err instanceof FPLError ? err.message : "Failed to load league data.";
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {message}
      </div>
    );
  }

  const finishedGws = finishedGameweeks(details);
  const entries = details.league_entries;

  const [picksResults, liveResults] = await Promise.all([
    Promise.all(
      entries.flatMap((e) =>
        finishedGws.map((gw) =>
          getEntryPicks(e.entry_id, gw).then((event) => ({
            key: `${e.entry_id}:${gw}`,
            event,
          }))
        )
      )
    ),
    Promise.all(
      finishedGws.map((gw) => getLiveData(gw).then((live) => ({ gw, live })))
    ),
  ]);

  const picksByKey = new Map(picksResults.map((r) => [r.key, r.event]));
  const liveByGw = new Map(liveResults.map((r) => [r.gw, r.live]));
  const managers = aggregateLeague(entries, finishedGws, picksByKey, liveByGw);
  const currentGw = finishedGws[finishedGws.length - 1] ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{details.league.name}</h1>
          <p className="text-sm text-muted-foreground">GW 1–{currentGw} · bench points left on the pitch</p>
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">
          Updated {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      <BenchTable managers={managers} currentGw={currentGw} />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Suspense fallback={<TableSkeleton />}>
        <LeagueContent id={id} />
      </Suspense>
    </main>
  );
}
