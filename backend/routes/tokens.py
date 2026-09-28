"""
STAGE 4C / 4F - Digital Possession Token + human override endpoints.

In-memory store for the prototype (swap for the DB models in production -
BlockSchedule.token_status and OverrideLog are already defined in models.py
for that next step).

Also implements Stage 4F's escalation rule: if a human defers a
safety-critical task (IMR / KAVACH / OHE) past its 72-hour hard deadline,
the system must automatically escalate to the next authority level rather
than let it silently sit deferred forever.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timedelta

router = APIRouter()

_tokens = {}         # block_id -> current status string
_override_log = []   # audit trail, newest appended at the end
_deferred_critical = {}  # block_id -> {"deferred_at": iso string, "reason": str}

ESCALATION_HOURS = 72


class TokenAction(BaseModel):
    block_id: int
    user_name: str
    action: str            # "approved" | "rejected" | "deferred" | "escalated"
    reason: str = ""
    is_critical: bool = False   # true if this block contains an IMR/KAVACH/OHE task


@router.post("/tokens/action")
def token_action(payload: TokenAction):
    entry = {
        "block_id": payload.block_id,
        "user_name": payload.user_name,
        "action": payload.action,
        "reason": payload.reason,
        "timestamp": datetime.utcnow().isoformat(),
    }
    _override_log.append(entry)
    _tokens[payload.block_id] = payload.action

    if payload.action == "deferred" and payload.is_critical:
        _deferred_critical[payload.block_id] = {
            "deferred_at": datetime.utcnow().isoformat(),
            "reason": payload.reason,
        }
    elif payload.block_id in _deferred_critical:
        # any other action on this block (approved/rejected/re-deferred by
        # a non-critical path) clears the pending escalation timer
        _deferred_critical.pop(payload.block_id, None)

    return {"status": "recorded", "entry": entry}


@router.get("/tokens/audit-log")
def audit_log():
    return {"log": list(reversed(_override_log))}


@router.get("/tokens/status/{block_id}")
def token_status(block_id: int):
    return {"block_id": block_id, "status": _tokens.get(block_id, "pending")}


@router.get("/tokens/check-escalations")
def check_escalations(demo_threshold_seconds: int = None):
    """
    Stage 4F auto-escalation. Called on a poll interval by the frontend
    (same pattern as /alerts/live). Scans every block that was deferred
    while carrying a critical defect, and if the deferral has now
    exceeded the 72-hour hard deadline, automatically writes an
    "escalated" entry to the audit log - no human action required to
    trigger the escalation itself, only to resolve it afterward.

    demo_threshold_seconds: optional override so you can demo this
    without waiting 72 real hours - e.g. pass 10 to escalate anything
    deferred more than 10 seconds ago. Omit it for the real 72h behavior.
    """
    threshold = (
        timedelta(seconds=demo_threshold_seconds)
        if demo_threshold_seconds is not None
        else timedelta(hours=ESCALATION_HOURS)
    )

    newly_escalated = []
    now = datetime.utcnow()

    for block_id, info in list(_deferred_critical.items()):
        deferred_at = datetime.fromisoformat(info["deferred_at"])
        if now - deferred_at >= threshold:
            entry = {
                "block_id": block_id,
                "user_name": "SYSTEM (auto-escalation)",
                "action": "escalated",
                "reason": (
                    f"Critical task deferred beyond the {ESCALATION_HOURS}-hour hard "
                    f"deadline (original defer reason: '{info['reason']}'). "
                    "Auto-escalated to Divisional Railway Manager."
                ),
                "timestamp": now.isoformat(),
            }
            _override_log.append(entry)
            _tokens[block_id] = "escalated"
            newly_escalated.append(entry)
            _deferred_critical.pop(block_id, None)

    return {
        "newly_escalated": newly_escalated,
        "still_pending_escalation": len(_deferred_critical),
    }

@router.get("/tokens/debug")
def debug_state():
    return {
        "deferred_critical": _deferred_critical,
        "statuses": _tokens,
        "log_entries": len(_override_log),
    }