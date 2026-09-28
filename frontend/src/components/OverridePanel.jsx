import React, { useEffect, useState } from 'react'
import { getAuditLog, checkEscalations } from '../api'

// DEMO MODE: escalate critical deferrals after 15 seconds instead of 72 hours.
// Set this to undefined to get the real 72-hour rule back.
const DEMO_ESCALATION_SECONDS = 7

export default function OverridePanel() {
  const [log, setLog] = useState([])

  useEffect(() => {
    const poll = async () => {
      try { await checkEscalations(DEMO_ESCALATION_SECONDS) } catch (e) { /* backend may be down */ }
      getAuditLog().then(d => setLog(d.log)).catch(() => {})
    }
    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <p className="text-sm text-slate-300 mb-3">Human Override / Audit Log</p>
      {log.length === 0 && <p className="text-xs text-slate-500">No actions recorded yet.</p>}
      <div className="space-y-2 max-h-56 overflow-y-auto">
        {log.map((entry, i) => (
          <div
            key={i}
            className={`text-xs rounded p-2 ${
              entry.action === 'escalated'
                ? 'bg-red-950/40 border border-red-900/50'
                : 'bg-slate-900'
            }`}
          >
            <span className="font-semibold">{entry.user_name}</span> {entry.action} block #{entry.block_id}
            {entry.reason && <span className="text-slate-400"> — "{entry.reason}"</span>}
            <div className="text-slate-500">{new Date(entry.timestamp + 'Z').toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}