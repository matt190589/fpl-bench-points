"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LeagueIdForm({ defaultLeagueId }: { defaultLeagueId: string }) {
  const router = useRouter();
  const [leagueId, setLeagueId] = useState(defaultLeagueId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = leagueId.trim();
    if (id) router.push(`/league/${id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        inputMode="numeric"
        placeholder="League ID"
        value={leagueId}
        onChange={(e) => setLeagueId(e.target.value)}
        className="flex-1 rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white outline-none focus:border-fpl-green focus:ring-2 focus:ring-fpl-green/30 transition-colors"
      />
      <button
        type="submit"
        disabled={!leagueId.trim()}
        className="rounded-lg bg-fpl-green px-5 py-2 text-sm font-bold text-white transition-opacity disabled:opacity-40 hover:opacity-90"
      >
        Go
      </button>
    </form>
  );
}
