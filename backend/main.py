"""
疑似攻撃・防御ラボ — FastAPI エントリーポイント
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import sessions, scenarios, events, alerts, defense
from ws.lab_ws import router as ws_router

app = FastAPI(title="Hack Lab API", version="0.1.0")

# WireGuard 閉域ネットワーク前提 — CORS は内部のみ許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://10.0.0.1:3000", "http://10.0.0.2:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST ルーター
app.include_router(sessions.router, prefix="/api/lab/sessions", tags=["sessions"])
app.include_router(scenarios.router, prefix="/api/lab/scenarios", tags=["scenarios"])
app.include_router(events.router, prefix="/api/lab", tags=["events"])
app.include_router(alerts.router, prefix="/api/lab", tags=["alerts"])
app.include_router(defense.router, prefix="/api/lab", tags=["defense"])

# WebSocket
app.include_router(ws_router, prefix="/ws", tags=["websocket"])


@app.get("/health")
async def health():
    return {"status": "ok"}
