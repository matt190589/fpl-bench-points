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
  if (col !== active) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
  return dir === "desc"
    ? <ArrowDown className="ml-1 h-3 w-3 text-fpl-green" />
    : <ArrowUp className="ml-1 h-3 w-3 text-fpl-green" />;
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

  const th = (col: SortCol, label: string, className = "") => (
    <TableHead className={`text-white ${className}`}>
      <button
        onClick={() => handleSort(col)}
        className={`flex items-center gap-0.5 font-semibold transition-colors ${sortCol === col ? "text-fpl-green" : ""}`}
      >
        {label}
        <SortIcon col={col} active={sortCol} dir={sortDir} />
      </button>
    </TableHead>
  );

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-sm">
      {/* horizontal scroll wrapper for mobile */}
      <div className="overflow-x-auto">
        <Table className="min-w-[680px]">
          <TableHeader>
            <TableRow className="bg-fpl-purple hover:bg-fpl-purple border-none"
              style={{ background: "linear-gradient(90deg, #37003c 0%, #520059 100%)" }}
            >
              <TableHead className="w-10 text-center text-white font-semibold">#</TableHead>
              <TableHead className="text-white font-semibold max-[540px]:hidden">Manager</TableHead>
              <TableHead className="text-white font-semibold">Team</TableHead>
              {th("total", "Total", "text-right [&>button]:ml-auto")}
              {th("avg", "Avg/GW", "text-right [&>button]:ml-auto")}
              {th("best", "Most on Bench", "text-right [&>button]:ml-auto")}
              <TableHead className="text-right text-white font-semibold">GW</TableHead>
              <TableHead className="text-center text-white font-semibold">Season</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((m, i) => {
              const { avg, best, bestGw } = gwStats(m.bench_by_gw);
              const isTop = i === 0;
              return (
                <TableRow
                  key={m.entry_id}
                  className="hover:bg-muted/40 transition-colors"
                >
                  <TableCell className="text-center text-muted-foreground font-medium">{i + 1}</TableCell>
                  <TableCell className="font-semibold max-[540px]:hidden">{m.manager_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{m.team_name}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-mono font-bold text-base ${isTop ? "text-fpl-purple" : ""}`}>
                      {m.total_bench_points}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{avg.toFixed(1)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{best}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">GW {bestGw}</TableCell>
                  <TableCell className="text-center">
                    <BenchSparkline data={m.bench_by_gw} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
