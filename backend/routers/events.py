"""
イベントログ取得
"""
from uuid import UUID
from fastapi import APIRouter
from models.lab_models import Event

router = APIRouter()

_events: dict[UUID, Event] = {}


@router.get("/sessions/{session_id}/events", response_model=list[Event])
async def list_events(session_id: UUID):
    return [e for e in _events.values() if e.session_id == session_id]
