"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";

interface Point {
  label: string;
  value: number;
}

/**
 * Single-series bar chart (no legend needed: the title names the series).
 * Thin bars with 4px rounded data-ends, recessive grid, hover tooltip,
 * and a table alternative for screen readers.
 */
export function BarChartCard({ title, unit, data, tableLabel }: { title: string; unit: string; data: Point[]; tableLabel: string }) {
  return (
    <Card className="p-4 md:p-5">
      <h2 className="font-display mb-4 text-lg font-extrabold">{title}</h2>
      <div className="h-56" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }} barCategoryGap="30%" accessibilityLayer={false}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              formatter={(value) => [`${value} ${unit}`, title]}
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--card-foreground)", fontWeight: 700 }}
            />
            <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{tableLabel}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>
                {d.value} {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
