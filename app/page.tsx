import { LeagueIdForm } from "@/components/league-id-form";

export default function Home() {
  const defaultLeagueId = process.env.FPL_LEAGUE_ID ?? "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-fpl-purple px-4"
      style={{ background: "linear-gradient(135deg, #37003c 0%, #520059 100%)" }}
    >
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl">⚽</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            London Draft Super League II<br />
            <span className="text-fpl-green">Bench Tracker</span>
          </h1>
          <p className="text-sm text-white">
            See how many points every manager left on the bench this season.
          </p>
        </div>
        <LeagueIdForm defaultLeagueId={defaultLeagueId} />
      </div>
    </div>
  );
}
