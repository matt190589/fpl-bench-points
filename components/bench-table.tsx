"use client";

import { useState, useMemo } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BenchSparkline } from "./bench-sparkline";
import type { ManagerBenchSummary } from "@/lib/bench";

type SortCol = "total" | "avg" | "best";
type SortDir = "asc" | "desc";

type Props = {
  managers: ManagerBenchSummary[];
  currentGw: number;
};

function gwStats(benchByGw: ManagerBenchSummary["bench_by_gw"]) {
  if (!benchByGw.length) return { avg: 0, best: 0, bestGw: 0 };
  const best = benchByGw.reduce((top, g) => (g.points > top.points ? g : top));
  const total = benchByGw.reduce((s, g) => s + g.points, 0);
  return {
    avg: total / benchByGw.length,
    best: best.points,
    bestGw: best.gw,
  };
}

function SortIcon({ col, active, dir }: { col: SortCol; active: SortCol; dir: SortDir }) {
  if (col !== active) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
  return dir === "desc"
    ? <ArrowDown className="ml-1 h-3 w-3" />
    : <ArrowUp className="ml-1 h-3 w-3" />;
}

export function BenchTable({ managers, currentGw }: Props) {
  const [sortCol, setSortCol] = useState<SortCol>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  }

  const sorted = useMemo(() => {
    return [...managers].sort((a, b) => {
      const sa = gwStats(a.bench_by_gw);
      const sb = gwStats(b.bench_by_gw);
      let diff = 0;
      switch (sortCol) {
        case "total": diff = b.total_bench_points - a.total_bench_points; break;
        case "avg":   diff = sb.avg - sa.avg; break;
        case "best":  diff = sb.best - sa.best; break;
      }
      return sortDir === "desc" ? diff : -diff;
    });
  }, [managers, sortCol, sortDir]);

  const colHeader = (col: SortCol, label: string) => (
    <button
      onClick={() => handleSort(col)}
      className="flex items-center font-medium hover:text-foreground transition-colors"
    >
      {label}
      <SortIcon col={col} active={sortCol} dir={sortDir} />
    </button>
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10 text-center">#</TableHead>
          <TableHead>Manager</TableHead>
          <TableHead>Team</TableHead>
          <TableHead className="text-right">{colHeader("total", "Total")}</TableHead>
          <TableHead className="text-right">{colHeader("avg", "Avg/GW")}</TableHead>
          <TableHead className="text-right">{colHeader("best", "Most Points on Bench")}</TableHead>
          <TableHead className="text-right">GW</TableHead>
          <TableHead className="text-center">Season</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((m, i) => {
          const { avg, best, bestGw } = gwStats(m.bench_by_gw);
          return (
            <TableRow key={m.entry_id}>
              <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
              <TableCell className="font-medium">{m.manager_name}</TableCell>
              <TableCell className="text-muted-foreground">{m.team_name}</TableCell>
              <TableCell className="text-right font-mono font-semibold">{m.total_bench_points}</TableCell>
              <TableCell className="text-right font-mono">{avg.toFixed(1)}</TableCell>
              <TableCell className="text-right font-mono">{best}</TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">GW {bestGw}</TableCell>
              <TableCell className="text-center">
                <BenchSparkline data={m.bench_by_gw} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
