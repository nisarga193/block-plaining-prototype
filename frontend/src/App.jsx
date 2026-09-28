import React, { useEffect, useState } from 'react'
import api from './api'
import Dashboard from './pages/Dashboard'
import TaskList from './pages/TaskList'
import BlockPlan from './pages/BlockPlan'
import Emergency from './pages/Emergency'
import { LayoutDashboard, ListTodo, CalendarDays, AlertTriangle, Train } from 'lucide-react'

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, component: Dashboard },
  { key: 'tasks', label: 'Task Backlog', icon: ListTodo, component: TaskList },
  { key: 'blockplan', label: 'Block Plan', icon: CalendarDays, component: BlockPlan },
  { key: 'emergency', label: 'Emergency', icon: AlertTriangle, component: Emergency },
]

function useBackendStatus() {
  const [online, setOnline] = useState(null)
  useEffect(() => {
    let cancelled = false
    const ping = () =>
      api.get('/', { timeout: 3000 })
        .then(() => { if (!cancelled) setOnline(true) })
        .catch(() => { if (!cancelled) setOnline(false) })
    ping()
    const id = setInterval(ping, 10000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])
  return online
}

export default function App() {
  const [active, setActive] = useState('dashboard')
  const online = useBackendStatus()
  const ActivePage = TABS.find((t) => t.key === active)?.component || Dashboard

  return (
    <div className="min-h-screen bg-slate-950 bg-[image:radial-gradient(ellipse_at_top,rgba(37,99,235,0.14),transparent_55%)]">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-6 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 ring-1 ring-blue-500/40">
              <Train className="h-4 w-4 text-blue-400" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">Block Planner</p>
              <p className="hidden text-[11px] text-slate-500 sm:block">Indian Railways · Nagpur Division</p>
            </div>
          </div>

          <nav className="flex items-center gap-1 rounded-lg bg-slate-900/70 p-1 ring-1 ring-slate-800">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = active === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActive(tab.key)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="relative flex h-2 w-2">
              {online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${online === false ? 'bg-red-500' : online ? 'bg-emerald-500' : 'bg-slate-500'}`} />
            </span>
            <span className="hidden sm:inline">
              {online === false ? 'Backend offline' : online ? 'Backend online' : 'Connecting…'}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <ActivePage />
      </main>
    </div>
  )
}