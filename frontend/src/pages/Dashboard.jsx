import React from "react";
import KPIDashboard from "@/components/KPIDashboard";
import AlertFeed from "@/components/AlertFeed";
import GanttChart from "@/components/GanttChart";
import SHAPPanel from "@/components/SHAPPanel";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RefreshCw } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Central Block Scheduling Hub</h1>
            <span className="rounded-full border border-emerald-800 bg-emerald-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
              CP-SAT active
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Real-time conflict detection and synchronized shadow-block allocation across Civil, TRD and S&amp;T.
          </p>
        </div>
        <Button variant="outline" className="gap-1.5" onClick={() => window.location.reload()}>
          <RefreshCw className="h-3.5 w-3.5" /> Re-sync telemetry
        </Button>
      </div>

      <KPIDashboard />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle>Rolling Block Timetable</CardTitle>
            <CardDescription>Weekly horizon · integrated shadow blocks highlighted in purple</CardDescription>
          </CardHeader>
          <CardContent>
            <GanttChart horizon="weekly" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>Priority Incidents</CardTitle>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
            </div>
            <CardDescription>Auto-fired emergency blocks (Weibull hazard + safety triggers)</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertFeed />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Priority Score Explainability</CardTitle>
          <CardDescription>Exactly which terms of the Weibull formula drive each task's priority</CardDescription>
        </CardHeader>
        <CardContent>
          <SHAPPanel />
        </CardContent>
      </Card>
    </div>
  );
}