import React from 'react';
import AlertFeed from '@/components/AlertFeed';
import PossessionToken from '@/components/PossessionToken';
import OverridePanel from '@/components/OverridePanel';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, Siren, Activity } from 'lucide-react';
import { resetAlerts } from '../api';

export default function Emergency() {
  const handleReset = async () => {
    await resetAlerts();
    window.location.reload();
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <header className="pb-4 border-b border-red-900/50 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Emergency Operations Center
          </h2>
          <p className="text-red-400/80 text-sm mt-1">MILP Rapid Solver & Auto-Fired Incidents (Stage 3F)</p>
        </div>
        <Button variant="destructive" className="gap-2 font-bold" onClick={handleReset}>
          <Siren className="w-4 h-4" /> Reset Alert Feed (Demo)
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Incidents */}
        <Card className="border-red-900/30 bg-red-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-400">
              <Activity className="w-4 h-4" /> Live Critical Alerts
            </CardTitle>
            <CardDescription>Incidents requiring immediate block allocation (e.g., 72h IMR mandate)</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertFeed />
          </CardContent>
        </Card>

        {/* Action Panel */}
        <div className="space-y-6">
          <PossessionToken />
          <OverridePanel />
        </div>
      </div>
    </div>
  );
}