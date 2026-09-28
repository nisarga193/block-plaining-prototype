"""
FastAPI entry point.
Run with:  uvicorn main:app --reload
Docs auto-available at: http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
import models  # noqa: F401 - ensures models are registered before create_all

from routes import tasks, blocks, kpis, tokens, alerts

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI-Powered Automatic Block Planning System - Prototype API")

# allow the local Vite dev server to call this API
import os

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    os.environ.get("FRONTEND_URL", "https://block-plaining-frontend.vercel.app/"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in ALLOWED_ORIGINS if o],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router, tags=["Tasks"])
app.include_router(blocks.router, tags=["Blocks"])
app.include_router(kpis.router, tags=["KPIs"])
app.include_router(tokens.router, tags=["Possession Tokens"])
app.include_router(alerts.router, tags=["Auto-Fired Emergency Alerts"])


@app.get("/")
def root():
    return {
        "message": "AI-Powered Automatic Block Planning System - Prototype API",
        "endpoints": [
            "/tasks", "/blocks/strategic", "/blocks/emergency/{task_id}",
            "/kpis", "/tokens/action", "/tokens/audit-log", "/tokens/check-escalations",
            "/alerts/live", "/alerts/reset", "/docs"
        ]
    }
