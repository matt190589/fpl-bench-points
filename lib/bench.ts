import type { LeagueEntry, EntryEvent, LiveData } from "./fpl";

export type ManagerBenchSummary = {
  entry_id: number;
  manager_name: string;
  team_name: string;
  total_bench_points: number;
  bench_by_gw: Array<{ gw: number; points: number }>;
};

export function calculateBenchPoints(
  picks: EntryEvent["picks"],
  elements: LiveData["elements"]
): number {
  return picks
    .filter((p) => p.position >= 12 && p.position <= 15)
    .reduce(
      (sum, p) => sum + (elements[String(p.element)]?.stats?.total_points ?? 0),
      0
    );
}

export function aggregateLeague(
  entries: LeagueEntry[],
  finishedGws: number[],
  picksByKey: Map<string, EntryEvent>,
  liveByGw: Map<number, LiveData>
): ManagerBenchSummary[] {
  return entries
    .map((entry) => {
      const bench_by_gw = finishedGws.map((gw) => {
        const event = picksByKey.get(`${entry.entry_id}:${gw}`);
        const live = liveByGw.get(gw);
        const points =
          event && live
            ? calculateBenchPoints(event.picks, live.elements)
            : 0;
        return { gw, points };
      });

      return {
        entry_id: entry.entry_id,
        manager_name: `${entry.player_first_name} ${entry.player_last_name}`,
        team_name: entry.entry_name,
        total_bench_points: bench_by_gw.reduce((s, g) => s + g.points, 0),
        bench_by_gw,
      };
    })
    .sort((a, b) => b.total_bench_points - a.total_bench_points);
}
