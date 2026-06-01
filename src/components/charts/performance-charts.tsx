"use client";

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getSubjectColor } from "@/lib/subjects";

type WeeklyPoint = { week: string; hours: number };
type SubjectPoint = { subject: string; score: number };
type EssayPoint = { date: string; score: number };
type EvolutionPoint = { label: string } & Record<string, string | number | null>;

export function WeeklyHoursChart({ data }: { data: WeeklyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="week" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <Tooltip />
        <Line type="monotone" dataKey="hours" stroke="#4F46E5" strokeWidth={3} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SubjectBarChart({ data }: { data: SubjectPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis type="category" dataKey="subject" tickLine={false} axisLine={false} width={90} />
        <Tooltip />
        <Bar dataKey="score" radius={[0, 8, 8, 0]}>
          {data.map((entry) => (
            <Cell key={entry.subject} fill={getSubjectColor(entry.subject)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SubjectEvolutionChart({ data, subjects }: { data: EvolutionPoint[]; subjects: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
        <Tooltip />
        {subjects.map((subject) => (
          <Line key={subject} type="monotone" dataKey={subject} stroke={getSubjectColor(subject)} strokeWidth={3} connectNulls dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function EssayLineChart({ data }: { data: EssayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} />
        <YAxis domain={[0, 1000]} tickLine={false} axisLine={false} />
        <Tooltip />
        <Line type="monotone" dataKey="score" stroke="#22C55E" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  );
}
