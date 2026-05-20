"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
      <Input
        type="text"
        inputMode="numeric"
        placeholder="League ID"
        value={leagueId}
        onChange={(e) => setLeagueId(e.target.value)}
        className="flex-1"
      />
      <Button type="submit" disabled={!leagueId.trim()}>
        Go
      </Button>
    </form>
  );
}
