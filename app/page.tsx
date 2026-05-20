import { LeagueIdForm } from "@/components/league-id-form";

export default function Home() {
  const defaultLeagueId = process.env.FPL_LEAGUE_ID ?? "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">FPL Draft Bench Tracker</h1>
          <p className="text-muted-foreground text-sm">
            See how many points every manager left on the bench this season.
          </p>
        </div>
        <LeagueIdForm defaultLeagueId={defaultLeagueId} />
      </div>
    </div>
  );
}
