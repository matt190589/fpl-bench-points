import "server-only";
import { z } from "zod";

const BASE = "https://draft.premierleague.com/api";

function buildHeaders(): Record<string, string> {
  const cookie = process.env.FPL_COOKIE;
  return cookie && cookie !== "paste-your-pl_profile-cookie-here"
    ? { Cookie: cookie }
    : {};
}

export class FPLError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

async function fplFetch(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: buildHeaders(),
    next: { revalidate: 3600 },
  });

  if (res.status === 401 || res.status === 403) {
    throw new FPLError(401, "Session expired — refresh your cookie in .env.local");
  }
  if (!res.ok) {
    throw new FPLError(502, `FPL API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ─── Schemas ────────────────────────────────────────────────────────────────

const LeagueEntrySchema = z.object({
  entry_id: z.number(),
  id: z.number(),
  entry_name: z.string(),
  player_first_name: z.string(),
  player_last_name: z.string(),
  short_name: z.string(),
});

const MatchSchema = z.object({
  event: z.number(),
  finished: z.boolean(),
  started: z.boolean(),
  league_entry_1: z.number(),
  league_entry_2: z.number(),
  league_entry_1_points: z.number(),
  league_entry_2_points: z.number(),
});

const LeagueDetailsSchema = z.object({
  league: z.object({
    id: z.number(),
    name: z.string(),
    start_event: z.number(),
    stop_event: z.number(),
  }),
  league_entries: z.array(LeagueEntrySchema),
  matches: z.array(MatchSchema),
});

const PickSchema = z.object({
  element: z.number(),
  position: z.number(),
  is_captain: z.boolean(),
  is_vice_captain: z.boolean(),
  multiplier: z.number(),
});

const EntryEventSchema = z.object({
  picks: z.array(PickSchema),
}).passthrough();

const LiveElementSchema = z.object({
  stats: z.object({
    total_points: z.number(),
  }).passthrough(),
}).passthrough();

const LiveDataSchema = z.object({
  elements: z.record(z.string(), LiveElementSchema),
});

// ─── Exported Types ──────────────────────────────────────────────────────────

export type LeagueEntry = z.infer<typeof LeagueEntrySchema>;
export type LeagueDetails = z.infer<typeof LeagueDetailsSchema>;
export type EntryEvent = z.infer<typeof EntryEventSchema>;
export type LiveData = z.infer<typeof LiveDataSchema>;

// ─── API Functions ───────────────────────────────────────────────────────────

export async function getLeagueDetails(leagueId: string): Promise<LeagueDetails> {
  const json = await fplFetch(`/league/${leagueId}/details`);
  return LeagueDetailsSchema.parse(json);
}

export async function getEntryPicks(entryId: number, gw: number): Promise<EntryEvent> {
  const json = await fplFetch(`/entry/${entryId}/event/${gw}`);
  return EntryEventSchema.parse(json);
}

export async function getLiveData(gw: number): Promise<LiveData> {
  const json = await fplFetch(`/event/${gw}/live`);
  return LiveDataSchema.parse(json);
}

export function finishedGameweeks(details: LeagueDetails): number[] {
  const gws = new Set(
    details.matches.filter((m) => m.finished).map((m) => m.event)
  );
  return Array.from(gws).sort((a, b) => a - b);
}
