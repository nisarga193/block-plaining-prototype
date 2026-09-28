# AI-Powered Automatic Block Planning System (Prototype)

An AI system that turns the separate, manual maintenance-block requests of
Indian Railways' Civil, Traction Distribution (TRD) and Signal & Telecom
(S&T) departments into one coordinated, prioritized, explainable plan.

Built for the Smart India Hackathon problem statement:
"AI-Powered Automatic Block Planning to Maximize Asset Availability for
Train Operations on Indian Railways".

---

## 1. The Problem in One Minute

Three departments maintain the same track, and each one requests its own
maintenance "block" (a period when trains are stopped) through BDMS, with
no view of the others' plans or the live train schedule. The result:

- The same corridor is blocked on three separate days instead of once.
- Safety-critical defects (for example an IMR rail crack) wait in manual
  approval queues.
- Downtime is scattered, so asset availability and revenue both drop.

There is also a root cause that is easy to miss: the departments do not
share a location language. Civil uses kilometre chainage (km 342), TRD uses
mast numbers (Mast 47-B) and S&T uses point IDs (Point 12-L). No system
knows these three IDs are the same place, so it cannot spot overlapping work.

## 2. Our Solution

The system works in five stages:

| Stage | Name | What it does |
|---|---|---|
| 1 | Data Foundation | Gathers defect, timetable and weather data and maps every department's IDs to one shared `block_section_id` |
| 2 | AI Prioritization | Scores every task with Weibull reliability engineering plus safety weights |
| 3 | Optimization | Builds weekly, monthly and 26-week block plans; groups departments into "shadow blocks"; solves emergencies |
| 4 | Human Interface | Dashboard, Digital Possession Token, escalation, audit log, explainability |
| 5 | Learning Loop | Recalibrates from real outcomes (roadmap, not built yet) |

A shadow block is one block window in which several departments work the
same section at the same time. It is the main way the system reduces
downtime.

---

## 3. What Is Built vs. What Comes Next

### Working in this prototype (real logic, not mock screens)

- Weibull hazard-based priority scoring (SciPy)
- Priority formula with safety weights, route density, urgency and a weather boost
- Live 7-day rainfall forecast from Open-Meteo (free, no API key)
- CP-SAT strategic scheduler (Google OR-Tools) with a real shadow-block reward
  in the objective and a safety tiebreak order
- Three planning horizons: weekly, monthly, 26-week Rolling Block Programme
- MILP emergency solver (PuLP/CBC) with passenger trains as hard constraints
  and goods-train risk as a weighted cost
- XGBoost operational-disruption scoring inside the emergency solver
- Auto-fired emergency alerts (no button, backend decides when to fire)
- Digital Possession Token (grant / defer / reject) with a full audit log
- 72-hour auto-escalation for deferred safety-critical blocks
- Explainability panel showing each term of the priority score
- What-If simulator, conflict map, KPI dashboard

### Simulated on purpose (needs live Railway systems or paid services)

- TMS, SMMS, TDMS and COA data come from `synthetic_data.py`
- Passenger and goods train patterns are synthetic
- Field alerts (SMS/WhatsApp) only appear on screen; there is no Twilio
- All state lives in memory, so it resets when the backend restarts

### Not built yet (roadmap)

- Live integration with the CRIS systems (TMS, SMMS, TDMS, COA)
- Stage 5 learning loop: recalibrating Weibull parameters from real failures
- Crew and machine routing optimizer (Stage 3G)
- Login and role-based permissions
- Database persistence (schema is already defined in `models.py`)
- Passenger-timetable enforcement inside the long-range (CP-SAT) plan
- Real SMS/WhatsApp dispatch

---

## 4. Tech Stack

| Layer | Technology | Used for |
|---|---|---|
| Backend | FastAPI, Uvicorn | REST API, auto docs at `/docs` |
| Math / AI | SciPy | Weibull hazard function |
| Math / AI | XGBoost | Operational disruption score |
| Optimization | Google OR-Tools (CP-SAT) | Strategic scheduling |
| Optimization | PuLP + CBC | Emergency scheduling (MILP) |
| Graph | NetworkX | Spatial Harmonization graph |
| Database | SQLAlchemy + SQLite | Schema defined; not yet used by routes |
| Frontend | React 18 + Vite | Dashboard |
| Styling | Tailwind CSS v4 | Layout and theme |
| Visuals | ReactFlow | Conflict map |
| Icons / HTTP | Lucide React, Axios | Icons, API calls |
| Weather | Open-Meteo | Live rainfall forecast |

---

## 5. Project Structure

```
block-planning-prototype/
├── README.md
├── backend/
│   ├── main.py                 App entry point, routers, CORS
│   ├── database.py             SQLAlchemy setup (SQLite)
│   ├── models.py               Table definitions (not yet used by routes)
│   ├── spatial_harmony.py      Stage 1F: shared block_section_id graph
│   ├── synthetic_data.py       Stage 1: fake data, live weather, train patterns
│   ├── weibull_engine.py       Stage 2: Weibull hazard + priority score
│   ├── impact_scoring.py       Stage 2C: XGBoost disruption model
│   ├── cp_sat_solver.py        Stage 3: strategic scheduler (OR-Tools)
│   ├── milp_emergency.py       Stage 3F: emergency solver (PuLP)
│   ├── requirements.txt
│   └── routes/
│       ├── tasks.py            /tasks, /weather
│       ├── blocks.py           /blocks/strategic, /blocks/emergency
│       ├── kpis.py             /kpis
│       ├── tokens.py           token actions, audit log, escalation
│       └── alerts.py           auto-fired emergency alerts
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx, App.jsx, api.js, index.css
        ├── pages/              Dashboard, TaskList, BlockPlan, Emergency
        ├── components/         KPIDashboard, GanttChart, AlertFeed, SHAPPanel,
        │                       PossessionToken, OverridePanel,
        │                       WhatIfSimulator, ConflictHeatmap
        │   └── ui/             Card, Badge, Button
        └── lib/utils.js
```

---

## 6. Setup From Scratch

The app is two programs that must run at the same time in two terminals:
the backend (port 8000) and the frontend (port 5173).

### 6.1 Install these once

1. **Python 3.10 or newer**: https://www.python.org/downloads/
   On Windows, tick "Add Python to PATH" during install.
   Check with `python --version` (on Mac/Linux you may need `python3`).
2. **Node.js 20.19 or newer** (22 LTS recommended): https://nodejs.org/
   Check with `node --version`.
3. **VS Code** (optional): https://code.visualstudio.com/

### 6.2 Start the backend (Terminal 1)

```
cd backend
python -m venv venv
```

Activate the virtual environment. Do this in every new terminal.

```
venv\Scripts\activate          (Windows)
source venv/bin/activate       (Mac / Linux)
```

You should now see `(venv)` at the start of the line. Then:

```
pip install -r requirements.txt
uvicorn main:app --reload
```

Success looks like: `Uvicorn running on http://127.0.0.1:8000`.
Leave this terminal open.

Windows note: if activation is blocked, run this once in PowerShell:
`Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### 6.3 Start the frontend (Terminal 2)

```
cd frontend
npm install
npm run dev
```

Success looks like: `Local: http://localhost:5173/`.

### 6.4 Open the app

Go to http://localhost:5173. The top bar shows a green "Backend online" dot
when both programs are talking to each other.

### 6.5 Every day after the first setup

Backend: activate the venv, then `uvicorn main:app --reload`.
Frontend: `npm run dev`. You do not need to reinstall packages again.

---

## 7. Guided Tour (what to click)

1. **Dashboard**: KPI cards, the weekly Gantt chart (purple bars are shadow
   blocks), the priority-incident feed and the explainability card.
2. **Task Backlog**: every task ranked by priority score.
3. **Block Plan**: click Weekly, Monthly and 26-Week to switch horizon; try
   the What-If slider; look at the conflict map.
4. **Emergency**: watch incidents appear on their own; use the token card
   to grant, defer or reject a block; read the audit log.

### Testing the 72-hour escalation

1. On the Emergency tab, pick a block that shows the red
   "Contains an IMR/KAVACH/OHE task" warning.
2. Enter a name and a reason, then click **Defer**.
3. After about 15 seconds a red "SYSTEM (auto-escalation)" entry appears in
   the audit log and the status badge turns to "escalated".

The 15 seconds is a demo setting; the real deadline is 72 hours.

---

## 8. How the AI Works

### 8.1 Priority score (Stage 2)

Each task gets:

```
Priority = ( 0.5 x Safety Weight
           + 0.2 x Route Density
           + 0.3 x Combined Urgency x 10 ) x Weather Modifier
```

- **Safety Weight**: KAVACH 100, IMR 100, OHE 90, REM 70, OBS 40, ROUTINE 20
- **Route Density**: trains per day / 100, capped at 100
- **Combined Urgency** = Weibull hazard + e^(0.05 x days overdue)
- **Weibull hazard** = pdf / survival, computed with `scipy.stats.weibull_min`
  using a shape (beta) and scale (eta) per defect type
- **Weather Modifier**: 1.3 for IMR, REM and OBS when the 7-day rainfall
  forecast is above 50 mm; otherwise 1.0

Why Weibull and not a trained ML model: Railways has no clean failure history
to train on. Weibull is standard reliability engineering, needs no training
data, and every term can be explained to an officer. The parameters can be
re-fitted later once real failure events accumulate.

### 8.2 Strategic scheduling (Stage 3)

`cp_sat_solver.py` models each task as a 4-hour interval and:

- limits how many tasks run at once (crew and machine capacity)
- schedules higher-priority tasks earlier
- uses the safety order Kavach > IMR > OHE > REM > OBS > Routine as a tiebreak
- **rewards overlapping tasks from different departments in the same
  section**, which is what creates shadow blocks

Planning horizons (`routes/blocks.py`):

| Horizon | Window | Share of ranked backlog planned |
|---|---|---|
| Weekly | 168 hours | Top 40% |
| Monthly | 720 hours | Top 75% |
| 26-week (strategic) | 4368 hours | 100% |

Safety-critical tasks (IMR, KAVACH, OHE) are always included.

### 8.3 Emergency solver (Stage 3F)

Triggers automatically for IMR, KAVACH or OHE tasks, or any non-routine task
whose combined urgency reaches 6.0. It picks the best block start in the next
48 hours by minimizing:

- waiting time
- goods-train risk (goods trains have no fixed timetable, so this is a
  probability, and windows above 30% cumulative risk get a warning badge)
- XGBoost disruption score for that time of day

Passenger trains are a hard constraint: a block can never overlap one.

### 8.4 KPIs (Stage 4)

| KPI | Meaning | Target |
|---|---|---|
| Block Grant Ratio | Share of demanded blocks that get scheduled | above 90% (CAG baseline 60-70%) |
| Integrated Utilization | Share of block time used by 2 or more departments | above 50% |
| Machine Utilization | Scheduled hours vs crew capacity | higher is better |
| Backlog Cleared | Priority-weighted share of the backlog planned | higher is better |

These are computed from synthetic data, so they show the mechanism rather than
field results.

---

## 9. API Reference

Interactive docs: http://localhost:8000/docs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/tasks` | All scored tasks plus weather |
| GET | `/tasks/{id}` | One task |
| GET | `/weather` | Current rainfall forecast and its source |
| GET | `/blocks/strategic?horizon=weekly` | CP-SAT plan (`weekly`, `monthly`, `strategic`) |
| POST | `/blocks/emergency/{task_id}` | Run the emergency solver for one task |
| GET | `/kpis` | The four KPIs |
| POST | `/tokens/action` | Grant, defer or reject a block |
| GET | `/tokens/audit-log` | Full audit trail |
| GET | `/tokens/status/{block_id}` | Current status of a block token |
| GET | `/tokens/check-escalations` | Escalate overdue critical deferrals (optional `demo_threshold_seconds`) |
| GET | `/alerts/live` | Auto-fired emergency alerts (the UI polls this every 5 s) |
| POST | `/alerts/reset` | Clear fired alerts for a fresh demo |
| GET | `/tokens/debug` | Internal escalation state (developer use) |

---

## 10. Demo Switches

Two constants control demo behaviour. Reset them after recording.

| File | Constant | Demo value | Normal value |
|---|---|---|---|
| `backend/synthetic_data.py` | `FORCE_RAINFALL_MM` | `80` (forces the rain boost) | `None` |
| `frontend/src/components/OverridePanel.jsx` | `DEMO_ESCALATION_SECONDS` | `15` | `undefined` |

Restart the backend after changing the first one, because scores are cached
in memory. Use the Emergency page "Reset Alert Feed" button, or restart the
backend, to repeat the alert demo.

---

## 11. Troubleshooting

| Problem | Fix |
|---|---|
| `python` or `pip` not found | Reinstall Python and tick "Add Python to PATH"; try `python3` |
| `npm` not found | Install Node.js |
| Blank page or a red error box | The backend is not running on port 8000 |
| "Backend offline" in the top bar | Start `uvicorn main:app --reload` |
| Requests fail in the browser | The frontend must be at exactly `http://localhost:5173` (backend CORS allows only that) |
| Port already in use | Close old terminals running the project, or restart |
| XGBoost fails to install | The app still works using a built-in fallback formula |
| Weather shows "synthetic fallback" | No internet or the API is blocked; the app still runs |
| Data disappeared | The backend restarted; all state is in memory by design |
| No bars in a chart | Hard-refresh with Ctrl+Shift+R after updating files |
| Alerts show nothing | Wait 5 seconds for the first poll, or check the backend terminal for errors |

---

## 12. Known Limitations

- All state (alerts, tokens, audit log) resets when the backend restarts.
- Horizons differ by window length and backlog share; they are not separately
  tuned solvers.
- The What-If simulator recalculates in the browser as an approximation.
- The strategic (CP-SAT) plan enforces crew capacity but does not check the
  passenger timetable; only the emergency solver does.
- The XGBoost model trains on synthetic timetable data.
- KPI values come from synthetic data.

---

## 13. Roadmap

1. Connect to the live CRIS systems (TMS, SMMS, TDMS, COA) through secure APIs
2. Persist data in a database (schema already in `models.py`)
3. Stage 5 learning loop: recalibrate Weibull parameters and retrain the
   disruption model from real outcomes
4. Crew and machine routing optimizer (Stage 3G)
5. Login, roles and permissions for token approval
6. Real SMS/WhatsApp alerts to field engineers
7. Deploy division by division, growing toward a national digital twin