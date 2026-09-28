import React, { useEffect, useMemo, useState } from 'react';
import { getStrategicBlocks } from '../api';

const DEPT = {
  Civil: { bar: 'bg-blue-500', label: 'CE' },
  TRD: { bar: 'bg-amber-500', label: 'TRD' },
  'S&T': { bar: 'bg-emerald-500', label: 'S&T' },
};
const SHADOW_BAR = 'bg-gradient-to-r from-purple-500 to-fuchsia-500 ring-1 ring-purple-300/60';

function Chip({ children, className = 'border-slate-700 bg-slate-900 text-slate-300' }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

export default function GanttChart({ horizon = 'weekly' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getStrategicBlocks(horizon)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [horizon]);

  const blocks = useMemo(() => data?.blocks ?? [], [data]);

  const { rows, span, ticks } = useMemo(() => {
    const maxEnd = blocks.length ? Math.max(...blocks.map((b) => b.end_hour)) : 24;
    const spanHours = Math.max(Math.ceil(maxEnd / 12) * 12, 24);
    const tickList = Array.from({ length: 7 }, (_, i) => Math.round((spanHours * i) / 6));
    const bySection = {};
    blocks.forEach((b) => {
      if (!bySection[b.section_id]) bySection[b.section_id] = [];
      bySection[b.section_id].push(b);
    });
    const rowList = Object.keys(bySection).sort().map((id) => ({ id, blocks: bySection[id] }));
    return { rows: rowList, span: spanHours, ticks: tickList };
  }, [blocks]);

  if (loading) return <div className="h-[300px] animate-pulse rounded-lg bg-slate-900/60" />;
  if (error) return <p className="py-10 text-center text-sm text-red-400">Could not load the schedule. Is the backend running?</p>;
  if (blocks.length === 0) return <p className="py-10 text-center text-sm text-slate-500">No blocks scheduled.</p>;

  const shadowCount = blocks.filter((b) => b.is_shadow_block).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip>{blocks.length} blocks</Chip>
        <Chip className="border-purple-800 bg-purple-950/60 text-purple-300">{shadowCount} shadow blocks</Chip>
        {data?.tasks_planned != null && (
          <Chip>{data.tasks_planned}/{data.tasks_total} tasks planned</Chip>
        )}
      </div>

      {/* hour axis */}
      <div className="flex">
        <div className="w-32 shrink-0" />
        <div className="relative mr-4 h-5 flex-1">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute -translate-x-1/2 text-[10px] text-slate-500"
              style={{ left: `${(t / span) * 100}%` }}
            >
              {t}h
            </span>
          ))}
        </div>
      </div>

      {/* one row per section */}
      {rows.map((row) => (
        <div key={row.id} className="flex items-center border-t border-slate-800/70 py-1.5">
          <div className="w-32 shrink-0 pr-3">
            <p className="font-mono text-xs text-slate-200">{row.id}</p>
            <p className="text-[10px] text-slate-500">
              {row.blocks.reduce((n, b) => n + b.task_ids.length, 0)} task(s)
            </p>
          </div>

          <div className="relative mr-4 h-9 flex-1 rounded-md bg-slate-950/60">
            {ticks.map((t) => (
              <div key={t} className="absolute inset-y-0 w-px bg-slate-800/80" style={{ left: `${(t / span) * 100}%` }} />
            ))}

            {row.blocks.map((b, i) => {
              const left = (b.start_hour / span) * 100;
              const width = Math.max(((b.end_hour - b.start_hour) / span) * 100, 3);
              const cls = b.is_shadow_block ? SHADOW_BAR : (DEPT[b.departments[0]]?.bar ?? 'bg-slate-500');
              const text = b.departments.map((d) => DEPT[d]?.label ?? d).join('+');
              return (
                <div
                  key={i}
                  onMouseEnter={() => setHovered(b)}
                  onMouseLeave={() => setHovered(null)}
                  className={`absolute bottom-1 top-1 flex cursor-pointer items-center justify-center overflow-hidden rounded px-1 text-[10px] font-semibold text-white shadow-md transition hover:brightness-125 ${cls}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  <span className="truncate">{text}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* hover details */}
      <div className="mt-4 min-h-[44px] rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-xs">
        {hovered ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-300">
            <span className="font-mono text-slate-100">{hovered.section_id}</span>
            <span>{hovered.departments.join(' + ')}</span>
            <span>Hour {hovered.start_hour} – {hovered.end_hour}</span>
            <span>{hovered.task_ids.length} task(s)</span>
            <span>Priority sum {Number(hovered.priority_sum).toFixed(1)}</span>
            {hovered.is_shadow_block && <span className="font-medium text-purple-400">Shadow block</span>}
          </div>
        ) : (
          <span className="text-slate-500">Hover a block for details</span>
        )}
      </div>

      {/* legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
        {[
          { label: 'Civil (CE)', color: 'bg-blue-500' },
          { label: 'Traction (TRD)', color: 'bg-amber-500' },
          { label: 'Signalling (S&T)', color: 'bg-emerald-500' },
          { label: 'Shadow block (2+ depts)', color: 'bg-purple-500' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className={`h-2.5 w-2.5 rounded-sm ${item.color}`} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}