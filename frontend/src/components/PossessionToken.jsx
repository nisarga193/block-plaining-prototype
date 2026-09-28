import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FileSignature, CheckCircle2, XCircle, Clock3, ShieldAlert } from 'lucide-react';
import { getStrategicBlocks, getTasks, submitTokenAction, getTokenStatus } from '../api';

const STATUS_VARIANT = { pending: 'warning', approved: 'success', rejected: 'destructive', deferred: 'warning', escalated: 'destructive' };
const CRITICAL_DEFECTS = ['IMR', 'KAVACH', 'OHE'];

export default function PossessionToken() {
  const [blocks, setBlocks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [userName, setUserName] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('pending');

  useEffect(() => {
    getStrategicBlocks().then((d) => setBlocks(d.blocks || []));
    getTasks().then((d) => setTasks(d.tasks || []));
  }, []);

  // Keep the badge in sync with the backend so auto-escalation shows up
  useEffect(() => {
    const sync = () =>
      getTokenStatus(selectedIdx).then((d) => setStatus(d.status)).catch(() => {});
    sync();
    const timer = setInterval(sync, 5000);
    return () => clearInterval(timer);
  }, [selectedIdx]);

  const block = blocks[selectedIdx];

  // Stage 4F: a block is "critical" for escalation purposes if any task
  // inside it is an IMR / KAVACH / OHE defect - these are the ones bound
  // by the 72-hour hard deadline.
  const isCritical = block
    ? block.task_ids.some((tid) => {
        const t = tasks.find((task) => task.id === tid);
        return t && CRITICAL_DEFECTS.includes(t.defect_code);
      })
    : false;

  const act = async (action) => {
    if (!userName) { alert('Enter your name to digitally sign this token'); return; }
    if ((action === 'rejected' || action === 'deferred') && !reason) {
      alert('A reason is required to reject or defer a block');
      return;
    }
    await submitTokenAction({
      block_id: selectedIdx,
      user_name: userName,
      action,
      reason,
      is_critical: isCritical,
    });
    setStatus(action);
  };

  if (!block) {
    return (
      <Card className="border-indigo-900/50 bg-gradient-to-b from-slate-900 to-indigo-950/20">
        <CardContent className="py-8 text-center text-xs text-slate-500">
          Loading confirmed blocks from the CP-SAT schedule...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-indigo-900/50 bg-gradient-to-b from-slate-900 to-indigo-950/20">
      <CardHeader className="pb-2 border-b border-slate-800/60 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold text-indigo-400 flex items-center gap-2">
              <FileSignature className="w-5 h-5" />
              Digital Possession Token
            </CardTitle>
            <p className="text-xs text-slate-400 mt-1">Replaces the paper T/351 disconnection notice</p>
          </div>
          <select
            value={selectedIdx}
            onChange={(e) => { setSelectedIdx(Number(e.target.value)); setStatus('pending'); }}
            className="bg-slate-900 border border-slate-700 rounded text-[11px] px-2 py-1 text-slate-300"
          >
            {blocks.map((b, i) => (
              <option key={i} value={i}>{b.section_id} · {b.departments.join('+')}</option>
            ))}
          </select>
        </div>
      </CardHeader>

      <CardContent>
        {isCritical && (
          <div className="mb-4 flex items-center gap-2 text-[11px] text-red-400 bg-red-950/30 border border-red-900/40 rounded px-3 py-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            Contains an IMR/KAVACH/OHE task — deferring this block starts a 72-hour
            hard deadline. If not resolved in time, it auto-escalates to the DRM.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Section</p>
            <p className="font-mono text-sm text-slate-200">{block.section_id}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Status</p>
            <Badge variant={STATUS_VARIANT[status]} className="text-[10px] mt-0.5">{status}</Badge>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Departments</p>
            <p className="text-xs font-semibold text-slate-200">{block.departments.join(', ')}
              {block.is_shadow_block && <span className="text-purple-400"> (shadow block)</span>}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Valid Window</p>
            <p className="text-xs font-semibold text-blue-400 flex items-center gap-1">
              <Clock3 className="w-3 h-3" /> hr {block.start_hour}–{block.end_hour}
            </p>
          </div>
        </div>

        <input
          placeholder="Your name (digital signature)"
          value={userName} onChange={(e) => setUserName(e.target.value)}
          className="w-full mb-2 px-3 py-2 rounded bg-slate-950/60 text-xs border border-slate-800 text-slate-200"
        />
        <input
          placeholder="Reason (required to reject/defer)"
          value={reason} onChange={(e) => setReason(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded bg-slate-950/60 text-xs border border-slate-800 text-slate-200"
        />

        <div className="flex gap-2">
          <Button onClick={() => act('approved')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 gap-1.5 text-xs">
            <CheckCircle2 className="w-4 h-4" /> Grant
          </Button>
          <Button onClick={() => act('deferred')} className="flex-1 bg-amber-600 hover:bg-amber-500 gap-1.5 text-xs">
            <Clock3 className="w-4 h-4" /> Defer
          </Button>
          <Button onClick={() => act('rejected')} variant="destructive" className="flex-1 gap-1.5 text-xs">
            <XCircle className="w-4 h-4" /> Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
