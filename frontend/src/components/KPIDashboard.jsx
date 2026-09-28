import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { ShieldCheck, Activity, Cpu, Clock } from "lucide-react";
import { getKPIs } from "../api";

const DEFS = [
  {
    key: "block_grant_ratio", short: "BGR", title: "Block Grant Ratio", icon: ShieldCheck,
    text: "text-emerald-400", bar: "bg-emerald-500", chip: "bg-emerald-500/10 ring-emerald-500/30",
    hint: "CAG baseline 60–70%", target: 90,
  },
  {
    key: "integrated_multi_department_utilization", short: "IMU", title: "Integrated Utilization", icon: Activity,
    text: "text-blue-400", bar: "bg-blue-500", chip: "bg-blue-500/10 ring-blue-500/30",
    hint: "Block time shared by 2+ departments", target: 50,
  },
  {
    key: "machine_utilization_rate", short: "η", title: "Machine Utilization", icon: Cpu,
    text: "text-amber-400", bar: "bg-amber-500", chip: "bg-amber-500/10 ring-amber-500/30",
    hint: "Scheduled hours vs crew capacity", target: null,
  },
  {
    key: "maintenance_backlog_reduction", short: "ΔΠ", title: "Backlog Cleared", icon: Clock,
    text: "text-violet-400", bar: "bg-violet-500", chip: "bg-violet-500/10 ring-violet-500/30",
    hint: "Priority-weighted backlog planned", target: null,
  },
];

const fmt = (v) => Number(v).toFixed(1).replace(/\.0$/, "");

export default function KPIDashboard() {
  const [kpis, setKpis] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getKPIs().then(setKpis).catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <Card><CardContent className="p-5 text-sm text-red-400">
        Could not load KPIs. Is the backend running on localhost:8000?
      </CardContent></Card>
    );
  }

  if (!kpis) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {DEFS.map((d) => (
          <div key={d.key} className="h-[152px] animate-pulse rounded-lg border border-slate-800 bg-slate-900/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {DEFS.map((d) => {
        const Icon = d.icon;
        const value = Number(kpis[d.key] ?? 0);
        return (
          <Card key={d.key}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{d.short}</p>
                  <p className="mt-0.5 text-sm text-slate-300">{d.title}</p>
                </div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ring-1 ${d.chip}`}>
                  <Icon className={`h-4 w-4 ${d.text}`} />
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight text-white">{fmt(value)}</span>
                <span className="text-lg text-slate-500">%</span>
              </div>

              <div className="relative mt-3 h-1.5 rounded-full bg-slate-800">
                <div className={`h-full rounded-full ${d.bar}`} style={{ width: `${Math.min(value, 100)}%` }} />
                {d.target != null && (
                  <div className="absolute -top-[3px] h-3 w-px bg-slate-300" style={{ left: `${d.target}%` }} />
                )}
              </div>

              <p className="mt-2 text-[11px] text-slate-500">
                {d.hint}{d.target != null && ` · target ${d.target}%`}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}