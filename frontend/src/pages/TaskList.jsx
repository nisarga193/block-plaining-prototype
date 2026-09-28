import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ListTodo, ArrowUpDown } from 'lucide-react';
import { getTasks } from '../api';

const DEPT_BADGE = { Civil: 'default', TRD: 'warning', 'S&T': 'success' };

export default function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    getTasks().then((d) => setTasks(d.tasks || []));
  }, []);

  const getScoreColor = (score) => {
    if (score >= 80) return "text-red-400 font-bold";
    if (score >= 50) return "text-amber-400 font-semibold";
    return "text-blue-400";
  };

  const sorted = [...tasks].sort((a, b) =>
    sortDesc ? b.priority_score - a.priority_score : a.priority_score - b.priority_score
  );

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <header className="flex justify-between items-end pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-blue-500" />
            Predictive Task Backlog
          </h2>
          <p className="text-slate-400 text-sm mt-1">Weibull-driven priority ranking, live from the backend</p>
        </div>
        <Button variant="outline" className="h-8 text-xs gap-1" onClick={() => setSortDesc(!sortDesc)}>
          <ArrowUpDown className="w-3 h-3" /> Sort {sortDesc ? 'Descending' : 'Ascending'}
        </Button>
      </header>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 bg-slate-900/50 uppercase border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Task ID</th>
                  <th className="px-6 py-4 font-medium">Department</th>
                  <th className="px-6 py-4 font-medium">Defect</th>
                  <th className="px-6 py-4 font-medium">Section</th>
                  <th className="px-6 py-4 font-medium">Priority Score</th>
                  <th className="px-6 py-4 font-medium">Predicted Failure</th>
                  <th className="px-6 py-4 font-medium text-right">Days Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sorted.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-300">#{task.id}</td>
                    <td className="px-6 py-4">
                      <Badge variant={DEPT_BADGE[task.department] || 'secondary'}>{task.department}</Badge>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-200">{task.defect_code}</td>
                    <td className="px-6 py-4 text-slate-400">{task.section_id}</td>
                    <td className={`px-6 py-4 font-mono ${getScoreColor(task.priority_score)}`}>
                      {task.priority_score}
                    </td>
                    <td className="px-6 py-4 text-slate-300">~{task.predicted_days_to_failure} days</td>
                    <td className="px-6 py-4 text-right text-slate-300">{task.days_overdue}d</td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500 text-xs">Loading tasks...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
