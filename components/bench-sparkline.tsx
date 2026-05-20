"use client";

import { LineChart, Line, Tooltip, ResponsiveContainer } from "recharts";

type Props = {
  data: Array<{ gw: number; points: number }>;
};

type TooltipPayload = {
  active?: boolean;
  payload?: Array<{ payload: { gw: number; points: number } }>;
};

function SparkTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload?.length) return null;
  const { gw, points } = payload[0].payload;
  return (
    <div className="rounded border bg-popover px-2 py-1 text-xs shadow-md text-popover-foreground">
      GW {gw}: {points} pts
    </div>
  );
}

export function BenchSparkline({ data }: Props) {
  return (
    <ResponsiveContainer width={120} height={36}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <Line
          type="monotone"
          dataKey="points"
          dot={false}
          strokeWidth={1.5}
          stroke="currentColor"
          className="text-primary"
        />
        <Tooltip content={<SparkTooltip />} />
      </LineChart>
    </ResponsiveContainer>
  );
}
