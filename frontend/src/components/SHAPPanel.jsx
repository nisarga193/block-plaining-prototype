import React, { useEffect, useState } from 'react';
import { BrainCircuit } from 'lucide-react';
import { getTasks } from '../api';

function featuresFor(task) {
  const c = task.contribution_breakdown;
  return [
    { key: 'safety', label: `Safety weight (${task.defect_code})`, hint: 'Fixed weight from railway safety manuals', value: c.safety_term, bar: 'bg-red-500' },
    { key: 'density', label: 'Route density', hint: `${task.trains_per_day} trains/day on this section`, value: c.density_term, bar: 'bg-blue-500' },
    { key: 'urgency', label: 'Weibull urgency', hint: `Hazard rate + ${task.days_overdue} days overdue`, value: c.urgency_term, bar: 'bg-purple-500' },
    { key: 'weather', label: 'Weather modifier', hint: c.weather_multiplier_effect > 0 ? 'Rain forecast boost (x1.3)' : 'No rain boost this week', value: c.weather_multiplier_effect, bar: 'bg-amber-500' },
  ];
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

export default function SHAPPanel() {
  const [tasks, setTasks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    getTasks().then((d) => {
      setTasks(d.tasks || []);
      if (d.tasks && d.tasks.length) setSelectedId(d.tasks[0].id);
    }).catch(() => {});
  }, []);

  const task = tasks.find((t) => t.id === selectedId);
  if (!task) return <div className="h-[260px] animate-pulse rounded-lg bg-slate-900/60" />;

  const features = featuresFor(task);
  const total = features.reduce((s, f) => s + f.value, 0) || 1;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 ring-1 ring-purple-500/30">
            <BrainCircuit className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              Task #{task.id} · {task.defect_code} · {task.section_id}
            </p>
            <p className="text-xs text-slate-500">{task.department} department</p>
          </div>
        </div>

        <select
          value={selectedId ?? ''}
          onChange={(e) => setSelectedId(Number(e.target.value))}
          className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {tasks.slice(0, 15).map((t) => (
            <option key={t.id} value={t.id}>
              #{t.id} {t.defect_code} @ {t.section_id} (score {Number(t.priority_score).toFixed(1)})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="mb-4 flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight text-white">{Number(task.priority_score).toFixed(1)}</span>
            <span className="text-sm text-slate-500">priority score</span>
          </div>

          <div className="space-y-4">
            {features.map((f) => {
              const share = (f.value / total) * 100;
              return (
                <div key={f.key}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <div>
                      <span className="text-xs font-medium text-slate-200">{f.label}</span>
                      <span className="ml-2 text-[11px] text-slate-500">{f.hint}</span>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-slate-300">
                      +{Number(f.value).toFixed(1)} <span className="text-slate-500">({share.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div className={`h-full rounded-full ${f.bar}`} style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 content-start gap-3 lg:col-span-2">
          <Stat label="Weibull hazard" value={Number(task.weibull_hazard).toFixed(3)} />
          <Stat label="Regulatory urgency" value={Number(task.regulatory_urgency).toFixed(2)} />
          <Stat label="Days overdue" value={`${task.days_overdue} d`} />
          <Stat label="Predicted failure" value={`~${Math.round(task.predicted_days_to_failure)} d`} />
          <Stat label="Trains / day" value={task.trains_per_day} />
          <Stat label="Weather modifier" value={`x${task.weather_modifier}`} />
        </div>
      </div>
    </div>
  );
}