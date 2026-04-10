"""
セッション CRUD + ライフサイクル操作
"""
from uuid import UUID
from fastapi import APIRouter, HTTPException
from models.lab_models import Session, CreateSessionRequest, SessionStatus

router = APIRouter()

# [将来実装] in-memory or DB ストア
_sessions: dict[UUID, Session] = {}


@router.get("/", response_model=list[Session])
async def list_sessions():
    return list(_sessions.values())


@router.post("/", response_model=Session, status_code=201)
async def create_session(req: CreateSessionRequest):
    session = Session(scenario_id=req.scenario_id)
    _sessions[session.id] = session
    return session


@router.get("/{session_id}", response_model=Session)
async def get_session(session_id: UUID):
    s = _sessions.get(session_id)
    if not s:
        raise HTTPException(404, "Session not found")
    return s


@router.post("/{session_id}/start", response_model=Session)
async def start_session(session_id: UUID):
    s = _sessions.get(session_id)
    if not s:
        raise HTTPException(404, "Session not found")
    from datetime import datetime
    s.status = SessionStatus.running
    s.started_at = datetime.utcnow()
    return s


@router.post("/{session_id}/pause", response_model=Session)
async def pause_session(session_id: UUID):
    s = _sessions.get(session_id)
    if not s:
        raise HTTPException(404, "Session not found")
    from datetime import datetime
    s.status = SessionStatus.paused
    s.paused_at = datetime.utcnow()
    return s


@router.post("/{session_id}/finish", response_model=Session)
async def finish_session(session_id: UUID):
    s = _sessions.get(session_id)
    if not s:
        raise HTTPException(404, "Session not found")
    from datetime import datetime
    s.status = SessionStatus.completed
    s.ended_at = datetime.utcnow()
    return s


@router.post("/{session_id}/reset", response_model=Session)
async def reset_session(session_id: UUID):
    s = _sessions.get(session_id)
    if not s:
        raise HTTPException(404, "Session not found")
    s.status = SessionStatus.idle
    s.started_at = None
    s.ended_at = None
    s.paused_at = None
    s.event_ids = []
    s.alert_ids = []
    s.defense_action_ids = []
    s.score = None
    return s
