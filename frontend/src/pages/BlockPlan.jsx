import React, { useState } from 'react';
import GanttChart from '@/components/GanttChart';
import ConflictHeatmap from '@/components/ConflictHeatmap';
import WhatIfSimulator from '@/components/WhatIfSimulator';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CalendarDays, Map } from 'lucide-react';

const HORIZONS = [
  { key: 'weekly', label: 'Weekly (tactical)', desc: '168-hour window, most urgent tasks' },
  { key: 'monthly', label: 'Monthly', desc: '30-day window, wider backlog' },
  { key: 'strategic', label: '26-Week RBP (strategic)', desc: 'Rolling Block Programme, full backlog' },
];

export default function BlockPlan() {
  const [horizon, setHorizon] = useState('weekly');
  const active = HORIZONS.find((h) => h.key === horizon);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <header className="pb-4 border-b border-slate-800 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-emerald-500" />
            Strategic Corridor Block Plan
          </h2>
          <p className="text-slate-400 text-sm mt-1">Multi-disciplinary shadow block integration (OR-Tools CP-SAT)</p>
        </div>
        <div className="flex gap-2">
          {HORIZONS.map((h) => (
            <Button
              key={h.key}
              variant={horizon === h.key ? 'default' : 'outline'}
              className="text-xs h-8"
              onClick={() => setHorizon(h.key)}
            >
              {h.label}
            </Button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <WhatIfSimulator />
        </div>
        <div className="xl:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Map className="w-4 h-4 text-amber-500" />
                Spatial Conflict Heatmap
              </CardTitle>
              <CardDescription>Visualizing overlapping block requests across physical sections</CardDescription>
            </CardHeader>
            <CardContent>
              <ConflictHeatmap />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Master Integrated Timetable — {active.label}</CardTitle>
          <CardDescription>{active.desc}</CardDescription>
        </CardHeader>
        <CardContent>
          <GanttChart horizon={horizon} />
        </CardContent>
      </Card>
    </div>
  );
}