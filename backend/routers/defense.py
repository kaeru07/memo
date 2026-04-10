"""
防御アクション — 適用・取消
"""
from uuid import UUID
from fastapi import APIRouter, HTTPException
from models.lab_models import DefenseAction, ApplyDefenseRequest, DefenseActionStatus

router = APIRouter()

_actions: dict[UUID, DefenseAction] = {}


@router.get("/sessions/{session_id}/defense", response_model=list[DefenseAction])
async def list_actions(session_id: UUID):
    return [a for a in _actions.values() if a.session_id == session_id]


@router.post("/sessions/{session_id}/defense", response_model=DefenseAction, status_code=201)
async def apply_action(session_id: UUID, req: ApplyDefenseRequest):
    action = DefenseAction(
        session_id=session_id,
        type=req.type,
        target_node_id=req.target_node_id,
        params=req.params,
    )
    _actions[action.id] = action
    # [将来実装] defense_engine.apply(action) を呼び出す
    return action


@router.post("/sessions/{session_id}/defense/{action_id}/revert", response_model=DefenseAction)
async def revert_action(session_id: UUID, action_id: UUID):
    action = _actions.get(action_id)
    if not action or action.session_id != session_id:
        raise HTTPException(404, "Action not found")
    from datetime import datetime
    action.status = DefenseActionStatus.reverted
    action.reverted_at = datetime.utcnow()
    # [将来実装] defense_engine.revert(action) を呼び出す
    return action
