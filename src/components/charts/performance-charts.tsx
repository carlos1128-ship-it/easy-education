"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type WeeklyPoint = { week: string; hours: number };
type SubjectPoint = { subject: string; score: number };
type EssayPoint = { date: string; score: number };
type EvolutionPoint = { label: string } & Record<string, string | number | null>;

/* Cores do design system (variáveis CSS, valem nos dois temas). */
const GRID = "var(--border)";
const TICK = { fill: "var(--ink-muted)", fontSize: 12 };
const SERIES = ["var(--brand)", "var(--cyan)", "var(--brand-deep)", "var(--warning)", "var(--ink-muted)"];
const tooltipProps = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    boxShadow: "var(--elev-pop)",
    color: "var(--ink)",
    fontSize: 13,
  },
  labelStyle: { color: "var(--ink)", fontWeight: 500 },
  itemStyle: { color: "var(--ink)" },
  cursor: { fill: "var(--surface-muted)", stroke: "var(--border-strong)" },
};

export function WeeklyHoursChart({ data }: { data: WeeklyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis dataKey="week" tickLine={false} axisLine={false} tick={TICK} />
        <YAxis tickLine={false} axisLine={false} tick={TICK} />
        <Tooltip {...tooltipProps} />
        <Line type="monotone" dataKey="hours" stroke="var(--brand)" strokeWidth={3} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SubjectBarChart({ data }: { data: SubjectPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis type="category" dataKey="subject" tickLine={false} axisLine={false} width={90} tick={TICK} />
        <Tooltip {...tooltipProps} />
        <Bar dataKey="score" radius={[0, 8, 8, 0]} fill="var(--brand)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SubjectEvolutionChart({ data, subjects }: { data: EvolutionPoint[]; subjects: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={TICK} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={TICK} />
        <Tooltip {...tooltipProps} />
        {subjects.map((subject, index) => (
          <Line
            key={subject}
            type="monotone"
            dataKey={subject}
            stroke={SERIES[index % SERIES.length]}
            strokeDasharray={index >= SERIES.length ? "6 4" : undefined}
            strokeWidth={3}
            connectNulls
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function EssayLineChart({ data }: { data: EssayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={TICK} />
        <YAxis domain={[0, 1000]} tickLine={false} axisLine={false} tick={TICK} />
        <Tooltip {...tooltipProps} />
        <Line type="monotone" dataKey="score" stroke="var(--brand)" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  );
}
