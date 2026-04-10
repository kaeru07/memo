"""
WebSocket ハブ — セッション単位でブロードキャスト
"""
from uuid import UUID
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

# session_id -> 接続中 WebSocket のセット
_connections: dict[str, set[WebSocket]] = {}


@router.websocket("/lab/{session_id}")
async def lab_ws(websocket: WebSocket, session_id: str):
    await websocket.accept()
    _connections.setdefault(session_id, set()).add(websocket)
    try:
        while True:
            # クライアントからのメッセージを受信（ping など）
            await websocket.receive_text()
    except WebSocketDisconnect:
        _connections[session_id].discard(websocket)


async def broadcast(session_id: UUID, message: dict) -> None:
    """サービス層から呼び出すブロードキャスト関数"""
    dead: set[WebSocket] = set()
    for ws in _connections.get(str(session_id), set()):
        try:
            await ws.send_json(message)
        except Exception:
            dead.add(ws)
    _connections.get(str(session_id), set()).difference_update(dead)
