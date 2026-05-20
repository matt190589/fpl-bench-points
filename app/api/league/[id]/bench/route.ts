import { NextResponse } from "next/server";
import { getLeagueDetails, getEntryPicks, getLiveData, finishedGameweeks, FPLError } from "@/lib/fpl";
import { aggregateLeague } from "@/lib/bench";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const details = await getLeagueDetails(id);
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
        finishedGws.map((gw) =>
          getLiveData(gw).then((live) => ({ gw, live }))
        )
      ),
    ]);

    const picksByKey = new Map(picksResults.map((r) => [r.key, r.event]));
    const liveByGw = new Map(liveResults.map((r) => [r.gw, r.live]));

    const managers = aggregateLeague(entries, finishedGws, picksByKey, liveByGw);

    return NextResponse.json({
      league_name: details.league.name,
      current_gw: finishedGws[finishedGws.length - 1] ?? 0,
      managers,
    });
  } catch (err) {
    if (err instanceof FPLError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
