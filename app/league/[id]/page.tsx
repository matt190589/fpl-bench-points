import { Suspense } from "react";
import { getLeagueDetails, getLiveData, getEntryPicks, finishedGameweeks, FPLError } from "@/lib/fpl";
import { aggregateLeague } from "@/lib/bench";
import { BenchTable } from "@/components/bench-table";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

async function LeagueContent({ id }: { id: string }) {
  let details;
  try {
    details = await getLeagueDetails(id);
  } catch (err) {
    const message = err instanceof FPLError ? err.message : "Failed to load league data.";
    return (
      <>
        <PageHeader leagueName="League not found" subtitle="" updatedAt="" />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {message}
          </div>
        </main>
      </>
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
  const updatedAt = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <PageHeader
        leagueName={details.league.name}
        subtitle={`GW 1–${currentGw} · bench points left on the pitch`}
        updatedAt={updatedAt}
      />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <BenchTable managers={managers} currentGw={currentGw} />
      </main>
    </>
  );
}

function PageHeader({ leagueName, subtitle, updatedAt }: { leagueName: string; subtitle: string; updatedAt: string }) {
  return (
    <header className="bg-fpl-purple text-white" style={{ background: "linear-gradient(135deg, #37003c 0%, #520059 100%)" }}>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Link href="/" className="text-xs text-fpl-green hover:underline">← All leagues</Link>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{leagueName}</h1>
            {subtitle && <p className="text-sm text-white/60">{subtitle}</p>}
          </div>
          {updatedAt && (
            <p className="shrink-0 text-xs text-white/40 pt-5">Updated {updatedAt}</p>
          )}
        </div>
      </div>
    </header>
  );
}

function TableSkeleton() {
  return (
    <>
      <header className="bg-fpl-purple" style={{ background: "linear-gradient(135deg, #37003c 0%, #520059 100%)" }}>
        <div className="mx-auto max-w-5xl px-4 py-6 space-y-2">
          <Skeleton className="h-3 w-24 bg-white/20" />
          <Skeleton className="h-7 w-64 bg-white/20" />
          <Skeleton className="h-3 w-40 bg-white/20" />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="space-y-2">
          <Skeleton className="h-11 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </main>
    </>
  );
}

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<TableSkeleton />}>
        <LeagueContent id={id} />
      </Suspense>
    </div>
  );
}
