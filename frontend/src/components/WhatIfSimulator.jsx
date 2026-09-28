import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Calculator, ArrowRight } from 'lucide-react';
import { getTasks } from '../api';

/**
 * Stage 4G - recalculates client-side using the same Weibull urgency
 * logic conceptually (delay -> higher days_overdue -> higher urgency ->
 * higher priority). A production version would call a dedicated
 * /whatif backend endpoint that re-runs the real formula server-side.
 */
export default function WhatIfSimulator() {
  const [tasks, setTasks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [delayDays, setDelayDays] = useState(0);

  useEffect(() => {
    getTasks().then((d) => {
      setTasks(d.tasks || []);
      if (d.tasks && d.tasks.length) setSelectedId(d.tasks[0].id);
    });
  }, []);

  const task = tasks.find((t) => t.id === selectedId);

  if (!task) {
    return (
      <Card className="h-full border-slate-700 bg-slate-900/60">
        <CardContent className="py-8 text-center text-xs text-slate-500">
          Loading tasks...
        </CardContent>
      </Card>
    );
  }

  const newOverdue = task.days_overdue + delayDays;
  const urgencyGrowth = Math.exp(0.05 * newOverdue) - Math.exp(0.05 * task.days_overdue);
  const newScore = (task.priority_score + urgencyGrowth * 3).toFixed(1);
  const newFailureWindow = Math.max(task.predicted_days_to_failure - delayDays, 0);

  return (
    <Card className="h-full border-slate-700 bg-slate-900/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Calculator className="w-4 h-4 text-blue-400" />
          What-If Scenario Optimizer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <select
          value={selectedId}
          onChange={(e) => { setSelectedId(Number(e.target.value)); setDelayDays(0); }}
          className="w-full bg-slate-950/60 border border-slate-800 rounded text-xs px-2 py-2 text-slate-300"
        >
          {tasks.slice(0, 15).map((t) => (
            <option key={t.id} value={t.id}>#{t.id} {t.defect_code} @ {t.section_id} (score {t.priority_score})</option>
          ))}
        </select>

        <div>
          <div className="flex justify-between text-xs mb-1 text-slate-300">
            <span>Delay this task by</span>
            <span className="font-mono">{delayDays} days</span>
          </div>
          <input
            type="range" min="0" max="30" value={delayDays}
            onChange={(e) => setDelayDays(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="pt-4 border-t border-slate-800">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950/50 rounded border border-slate-800/80 p-3">
              <div className="text-[10px] text-slate-500 uppercase">Current Priority</div>
              <div className="text-lg font-bold text-slate-200">{task.priority_score}</div>
            </div>
            <div className="bg-slate-950/50 rounded border border-slate-800/80 p-3">
              <div className="text-[10px] text-slate-500 uppercase">Recalculated Priority</div>
              <div className="text-lg font-bold text-amber-400">{newScore}</div>
            </div>
          </div>

          <div className="mt-3 p-3 bg-slate-950/50 rounded border border-slate-800/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Failure Window Now</div>
              <div className="text-sm font-semibold text-slate-200 mt-0.5">{task.predicted_days_to_failure} days</div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600" />
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">After Delay</div>
              <Badge variant={newFailureWindow < 5 ? 'destructive' : 'success'} className="mt-0.5 px-1 py-0 text-[10px]">
                {newFailureWindow.toFixed(1)} days
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
