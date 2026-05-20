# FPL Draft Bench Tracker

## Project goal

A small web app that connects to the **Fantasy Premier League Draft** API (`draft.premierleague.com`) and shows, for every manager in a private mini-league, how many points they've left on their bench across the season (gameweeks 1–37, the finished gameweeks of the 2025/26 season).

The deliverable is a polished, shareable web app — not a script. League members should be able to visit a URL and see a sortable table of bench totals, plus a per-gameweek breakdown.

## Tech stack

Already scaffolded:

- **Next.js 15+** with App Router
- **TypeScript**
- **Tailwind CSS**
- **src/ directory** layout
- **Turbopack** for dev

Still to install / set up:

- **shadcn/ui** — `npx shadcn@latest init` (New York style, Slate base, CSS variables: yes), then add: `table`, `button`, `input`, `card`, `skeleton`, `sonner`, `tooltip`
- **recharts** — sparklines
- **lucide-react** — icons
- **zod** — runtime validation of FPL responses

Do **not** add: a separate backend, a database, an ORM, Redux/Zustand, tRPC, or any auth library.

## Auth model

The FPL Draft API needs authentication for some endpoints. We're not building a login flow — instead, the user provides a session cookie via env var.

`.env.local`:

```
FPL_COOKIE="<full Cookie header value from a logged-in browser>"
FPL_LEAGUE_ID="44951"
```

**Important — we've verified `/league/44951/details` returns data without a cookie**, so league metadata may be public. But the per-manager picks endpoint (`/entry/{id}/event/{gw}`) likely requires the cookie. Build the client to **always** send the cookie if it's set, and gracefully handle the case where it's missing (return a clear error from the API route).

The cookie is **server-side only**. Never expose it to the client. Never prefix the env var with `NEXT_PUBLIC_`.

## FPL Draft API — verified shapes

Base URL: `https://draft.premierleague.com/api`

### `GET /league/{league_id}/details` — verified

Returns league info, entries, all match results, and standings. The fields we care about:

```ts
type LeagueDetailsResponse = {
  league: {
    id: number;
    name: string; // e.g. "London Draft Super League II"
    start_event: number; // 1
    stop_event: number; // 38
  };
  league_entries: Array<{
    entry_id: number; // ← USE THIS for /entry/{id}/event/{gw}. Example: 333563
    id: number; // league_entry id, used in matches[]. Example: 333153. DIFFERENT FROM entry_id.
    entry_name: string; // Team name, e.g. "Bunch of draft punts"
    player_first_name: string;
    player_last_name: string;
    short_name: string; // e.g. "MD"
  }>;
  matches: Array<{
    event: number; // gameweek
    finished: boolean; // ← use this to find latest finished GW
    started: boolean;
    league_entry_1: number; // these are league_entry.id (NOT entry_id)
    league_entry_2: number;
    league_entry_1_points: number;
    league_entry_2_points: number;
  }>;
  standings: Array<{ league_entry: number; rank: number; total: number }>;
};
```

**Critical**: `league_entries[i].entry_id` and `league_entries[i].id` are different. `entry_id` is the global FPL team ID (used in URLs like `/entry/333563/event/5`). `id` is the league-scoped entry id (used in `matches[]`). Don't conflate them.

**Latest finished GW** = `max(matches.filter(m => m.finished).map(m => m.event))`. For this league as of writing it's 37 (GW 38 is not yet finished).

### `GET /entry/{entry_id}/event/{gw}` — needs verification

Expected to return a manager's squad for that gameweek. Hit this in the spike to confirm shape. Expected fields:

```ts
type EntryEventResponse = {
  picks: Array<{
    element: number; // player ID (cross-ref with /event/{gw}/live)
    position: number; // 1–15; positions 12–15 are the bench
    is_captain: boolean;
    multiplier: number;
  }>;
  entry_history: { points: number };
};
```

If the shape differs, update this doc before proceeding.

### `GET /event/{gw}/live` — needs verification

Expected to return live/finalised player stats for the gameweek. Expected structure: keyed by player ID with a `stats.total_points` field. Verify in spike.

### Bench points calculation

For each (manager, gameweek):

1. Fetch picks: `GET /entry/{entry_id}/event/{gw}`
2. Identify bench players: `picks.filter(p => p.position >= 12 && p.position <= 15)`
3. Fetch live data for that GW (fetch once per GW, reuse across all managers)
4. For each bench pick, look up the player's `total_points` in the live data
5. Sum them

Total bench points = sum across all finished gameweeks.

## Architecture

```
src/
├── app/
│   ├── page.tsx                          # Landing: league ID input → redirect
│   ├── league/[id]/page.tsx              # Main view: table + sparklines
│   ├── api/
│   │   └── league/[id]/bench/route.ts    # Returns bench totals JSON
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                               # shadcn components
│   ├── bench-table.tsx                   # Sortable table (Client Component)
│   └── bench-sparkline.tsx               # Per-row mini chart
└── lib/
    ├── fpl.ts                            # API client. Add `import 'server-only'` at top.
    ├── bench.ts                          # Pure calculation logic, no I/O
    └── utils.ts                          # shadcn's cn() helper
```

Mark `src/lib/fpl.ts` with `import 'server-only'` so accidental client imports fail at build.

## Implementation order

Do these in order. **Stop after step 1 and show me the spike output before continuing** — we need to verify the picks and live endpoints behave as expected.

### Step 1: Spike

Create `scripts/spike.ts`, run with `npx tsx scripts/spike.ts`. It should:

1. Read `FPL_COOKIE` and `FPL_LEAGUE_ID` from env (use `dotenv` or Node's built-in `--env-file=.env.local`)
2. Fetch `/league/44951/details` — confirm we can extract entries
3. For ONE manager (use `entry_id: 333563`, "Bunch of draft punts") and ONE gameweek (try GW 5), fetch `/entry/333563/event/5`. **Log the raw JSON** so we can see the actual shape.
4. Fetch `/event/5/live`. **Log a sample player's entry** to confirm where `total_points` lives.
5. Compute bench points for that one manager × one gameweek and print:

   ```
   Manager: Matt Doherty (Bunch of draft punts)
   GW 5 bench:
     - Player ID X (pos 12): Y points
     - Player ID X (pos 13): Y points
     - Player ID X (pos 14): Y points
     - Player ID X (pos 15): Y points
     Total: Z
   ```

Don't build anything else until I confirm this number looks right against the FPL Draft site.

### Step 2: Library code

Once the spike is verified, factor it into `src/lib/fpl.ts` and `src/lib/bench.ts`:

- `fpl.ts`: typed functions `getLeagueDetails(leagueId)`, `getEntryPicks(entryId, gw)`, `getLiveData(gw)`. Each uses `fetch` with the cookie header. Use `zod` to validate responses — fail loudly if shapes change.
- `bench.ts`: pure functions. `calculateBenchPoints(picks, liveData) => number`. `aggregateLeague(details, picksByEntryByGw, liveByGw) => ManagerBenchSummary[]`. No `fetch`, no env access, easily testable.

### Step 3: API route

`src/app/api/league/[id]/bench/route.ts`:

- GET handler
- Fetches league details
- Determines the list of finished gameweeks from `matches`
- Fetches all picks in parallel: `Promise.all(entries.flatMap(e => finishedGWs.map(gw => getEntryPicks(e.entry_id, gw))))`
- Fetches each GW's live data **once**, cached in a `Map<number, LiveData>` for the request
- Returns:

```ts
type Response = {
  league_name: string;
  latest_finished_gw: number;
  managers: Array<{
    entry_id: number;
    manager_name: string; // first + last name
    team_name: string; // entry_name
    short_name: string;
    total_bench_points: number;
    avg_per_gw: number;
    best_gw: { gw: number; points: number };
    worst_gw: { gw: number; points: number };
    bench_by_gw: Array<{ gw: number; points: number }>;
  }>;
};
```

Use `fetch` with `next: { revalidate: 3600 }` on calls to finished-gameweek endpoints — they don't change once a GW is done.

Error handling:

- Missing `FPL_COOKIE` env → 500 with message "Server not configured: missing FPL_COOKIE"
- Upstream 401/403 → 401 with "Session expired — refresh your cookie in .env.local"
- Upstream 5xx or network failure → 502
- Zod validation failure → 502 with "Upstream API shape changed"

### Step 4: Landing page

`src/app/page.tsx`: a single input for league ID, pre-filled with `FPL_LEAGUE_ID` env (Server Component reads env, passes as default value prop to a small Client Component form). On submit, navigate to `/league/[id]`.

### Step 5: League view

`src/app/league/[id]/page.tsx`:

- Server Component that calls the bench-calculation library directly (no need to round-trip through the API route from the server)
- Renders a header with league name + "Through GW {latest_finished_gw}"
- Renders `<BenchTable>` (Client Component for sortability) with columns:
  - Rank
  - Manager (name + short_name in a subtle pill)
  - Team
  - Total bench points (default sort: desc)
  - Avg per GW
  - Best GW (e.g. "GW 14: 32 pts")
  - Worst GW
  - Sparkline (line chart of bench_by_gw, ~120px wide, no axes)
- Wrap in `<Suspense fallback={<TableSkeleton />}>`

Sparklines: small `recharts` `LineChart`, tooltip on hover showing GW and points. No axes, no grid, no legend. Just the line.

### Step 6: Polish

- "Last updated" timestamp at the top of the league view
- Copy-link button (shadcn button + `navigator.clipboard`)
- `src/app/league/[id]/opengraph-image.tsx` — generate a 1200x630 OG image showing the league name and the top "bench offender" so the link looks good when shared on WhatsApp / iMessage
- Responsive: table horizontally scrollable on mobile via `overflow-x-auto`

## Code conventions

- Strict TypeScript. No `any`.
- All FPL API calls in `src/lib/fpl.ts` — nowhere else.
- Pure logic in `src/lib/bench.ts` with no I/O.
- Server Components by default. `"use client"` only where genuinely needed (interactive table, form).
- Tailwind for styling. No CSS modules or styled-components.
- Concise comments. Names should carry the meaning.

## Decision boundaries

**Decide yourself**: file layout within the structure above, component naming, Tailwind classes, error message wording, sparkline visual styling, OG image design.

**Ask first**: changes to the data model, new dependencies beyond the list above, anything that adds a database / auth flow, or changes the API contract between route handler and UI.

## Out of scope (for now)

- Multi-user accounts / cookie-less access to other people's private leagues
- Historical seasons
- Captain points, transfer hits, chip usage
- Mobile app
- Real-time updates (page refresh is fine)

## Deployment (later)

Vercel, connected to GitHub. `FPL_COOKIE` and `FPL_LEAGUE_ID` go in Vercel project env vars, not in the repo. Get it working locally first.

## Reference: the 8 managers in league 44951

For sanity-checking during the spike — these are the current league members:

| entry_id | id     | name             | team                 |
| -------- | ------ | ---------------- | -------------------- |
| 229599   | 227763 | William Lamb     | Wirtz of Art         |
| 229674   | 227838 | Peter Grieve     | Estève Gruev         |
| 231116   | 229292 | Tom Harvey-Brown | Absolutely Fàbregas  |
| 239635   | 237939 | Michael Shaw     | Rack em and Stach em |
| 253115   | 251800 | James Kinsella   | Kinsella's Fellas    |
| 297300   | 296422 | Bill Davey       | Wanyamas in Pyjamas  |
| 314292   | 313660 | Joshua Barton    | Tiki Tanaka          |
| 333563   | 333153 | Matt Doherty     | Bunch of draft punts |

Note again: `entry_id` for API calls, `id` only appears in `matches[]`.
