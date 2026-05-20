const BASE = "https://draft.premierleague.com/api";

const COOKIE = process.env.FPL_COOKIE ?? "";
const LEAGUE_ID = process.env.FPL_LEAGUE_ID ?? "44951";

const TARGET_ENTRY_ID = 333563;
const TARGET_GW = 5;

function headers(): Record<string, string> {
  return COOKIE ? { Cookie: COOKIE } : {};
}

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  if (!res.ok) {
    throw new Error(`GET ${path} → ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function main() {
  // Step 1: League details
  console.log(`\n=== /league/${LEAGUE_ID}/details ===`);
  const details = await get(`/league/${LEAGUE_ID}/details`);
  const entries: Array<{
    entry_id: number;
    id: number;
    entry_name: string;
    player_first_name: string;
    player_last_name: string;
  }> = details.league_entries;

  console.log(`League: ${details.league.name}`);
  console.log(`Entries (${entries.length}):`);
  for (const e of entries) {
    console.log(`  entry_id=${e.entry_id}  id=${e.id}  "${e.entry_name}"  ${e.player_first_name} ${e.player_last_name}`);
  }

  const finishedGws: number[] = Array.from(
    new Set(
      (details.matches as Array<{ event: number; finished: boolean }>)
        .filter((m) => m.finished)
        .map((m) => m.event)
    )
  ).sort((a, b) => a - b);
  console.log(`\nFinished GWs: ${finishedGws.join(", ")}`);
  console.log(`Latest finished GW: ${finishedGws[finishedGws.length - 1]}`);

  // Step 2: Picks for one manager × one GW
  console.log(`\n=== /entry/${TARGET_ENTRY_ID}/event/${TARGET_GW} (raw) ===`);
  const picksData = await get(`/entry/${TARGET_ENTRY_ID}/event/${TARGET_GW}`);
  console.log(JSON.stringify(picksData, null, 2));

  // Step 3: Live data for that GW
  console.log(`\n=== /event/${TARGET_GW}/live (confirmed structure) ===`);
  const liveRaw = await get(`/event/${TARGET_GW}/live`);

  // Confirmed: data is under liveRaw.elements keyed by player ID string
  const elements: Record<string, { stats: { total_points: number } }> = liveRaw.elements;

  // Show sample for one player
  const sampleId = Object.keys(elements)[0];
  console.log(`Sample player "${sampleId}":`, JSON.stringify(elements[sampleId], null, 2));

  // Step 4: Compute bench points
  console.log(`\n=== Bench points: entry ${TARGET_ENTRY_ID}, GW ${TARGET_GW} ===`);
  const picks: Array<{ element: number; position: number; multiplier: number }> =
    picksData.picks;
  const benchPicks = picks.filter((p) => p.position >= 12 && p.position <= 15);

  let total = 0;

  for (const pick of benchPicks) {
    const id = String(pick.element);
    const pts: number = elements[id]?.stats?.total_points ?? 0;
    console.log(`  - Player ID ${pick.element} (pos ${pick.position}): ${pts} points`);
    total += pts;
  }

  const target = entries.find((e) => e.entry_id === TARGET_ENTRY_ID);
  const managerName = target
    ? `${target.player_first_name} ${target.player_last_name}`
    : "Unknown";
  const teamName = target?.entry_name ?? "Unknown";

  console.log(`\nManager: ${managerName} (${teamName})`);
  console.log(`GW ${TARGET_GW} bench total: ${total}`);
}

main().catch((err) => {
  console.error("\nSpike failed:", err.message);
  process.exit(1);
});
