import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { getLiveAlerts } from "../api";
import { ShieldAlert, Clock } from "lucide-react";

const DEFECT = {
  KAVACH: { label: "Kavach ATP failure", variant: "destructive", stripe: "border-l-red-500" },
  IMR: { label: "IMR rail defect", variant: "destructive", stripe: "border-l-red-500" },
  OHE: { label: "OHE critical wear", variant: "warning", stripe: "border-l-amber-500" },
};
const FALLBACK = { label: "Urgent", variant: "secondary", stripe: "border-l-slate-500" };

// Backend sends UTC timestamps without a timezone marker; treat them as UTC.
const parseUtc = (iso) => new Date(/Z|[+-]\d\d:\d\d$/.test(iso) ? iso : iso + "Z");
const fmtTime = (iso) => parseUtc(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - parseUtc(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hr ago`;
}

export default function AlertFeed() {
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const poll = () =>
      getLiveAlerts()
        .then((d) => { setAlerts(d.alerts || []); setConnected(true); })
        .catch(() => setConnected(false));
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  // safety net: one row per task
  const unique = useMemo(() => {
    const seen = new Set();
    return alerts.filter((a) => (seen.has(a.task_id) ? false : (seen.add(a.task_id), true)));
  }, [alerts]);

  const counts = useMemo(
    () => unique.reduce((acc, a) => { acc[a.defect_code] = (acc[a.defect_code] || 0) + 1; return acc; }, {}),
    [unique]
  );

  if (unique.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-slate-500">
        {connected
          ? "No incidents yet. Watching Weibull urgency and IMR / Kavach / OHE events…"
          : "Could not reach the backend at localhost:8000. Is uvicorn running?"}
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Badge variant="secondary">{unique.length} incidents</Badge>
        {Object.entries(counts).map(([code, n]) => (
          <Badge key={code} variant={(DEFECT[code] || FALLBACK).variant}>{n} {code}</Badge>
        ))}
      </div>

      <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
        {unique.map((a) => {
          const d = DEFECT[a.defect_code] || FALLBACK;
          return (
            <div
              key={a.task_id}
              className={`rounded-md border border-l-2 border-slate-800 ${d.stripe} bg-slate-950/50 p-3 transition-colors hover:bg-slate-900`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Badge variant={d.variant}>{d.label}</Badge>
                  <span className="font-mono text-[11px] text-slate-500">#{a.task_id}</span>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-[11px] text-slate-500">
                  <Clock className="h-3 w-3" />{timeAgo(a.fired_at)}
                </span>
              </div>

              <p className="mt-2 font-mono text-xs font-medium text-slate-200">{a.section_id}</p>

              {a.solved ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                  <span>{fmtTime(a.block.start_time)} → {fmtTime(a.block.end_time)}</span>
                  <span>Priority {Number(a.priority_score).toFixed(1)}</span>
                  {a.block.operational_disruption_score != null && (
                    <span>Disruption {Math.round(a.block.operational_disruption_score)}/100</span>
                  )}
                  {a.block.goods_train_caution && (
                    <Badge variant="warning" className="text-[10px]">
                      ⚠ goods-train risk {Math.round(a.block.goods_train_collision_risk * 100)}%
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-red-400">
                  <ShieldAlert className="h-3 w-3" />{a.message}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}