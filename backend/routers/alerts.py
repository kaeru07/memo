"""
アラート取得・Acknowledge
"""
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, HTTPException
from models.lab_models import Alert

router = APIRouter()

_alerts: dict[UUID, Alert] = {}


@router.get("/sessions/{session_id}/alerts", response_model=list[Alert])
async def list_alerts(session_id: UUID):
    return [a for a in _alerts.values() if a.session_id == session_id]


@router.post("/sessions/{session_id}/alerts/{alert_id}/ack", response_model=Alert)
async def acknowledge_alert(session_id: UUID, alert_id: UUID):
    alert = _alerts.get(alert_id)
    if not alert or alert.session_id != session_id:
        raise HTTPException(404, "Alert not found")
    alert.acknowledged = True
    alert.acknowledged_at = datetime.utcnow()
    return alert
