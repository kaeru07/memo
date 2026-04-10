"""
疑似攻撃・防御ラボ — Pydantic データモデル
FastAPI のリクエスト/レスポンス型 + 内部データ構造
"""
from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4
from pydantic import BaseModel, Field


# ============================================================
# Enums
# ============================================================

class NodeRole(str, Enum):
    attacker = "attacker"
    defender = "defender"
    target = "target"
    monitor = "monitor"

class NodeStatus(str, Enum):
    online = "online"
    offline = "offline"
    compromised = "compromised"
    protected = "protected"

class NodeOS(str, Enum):
    linux = "linux"
    windows = "windows"
    ios = "ios"
    android = "android"
    unknown = "unknown"

class EventType(str, Enum):
    port_scan = "port_scan"
    ping = "ping"
    tcp_connect = "tcp_connect"
    udp_packet = "udp_packet"
    http_request = "http_request"
    ssh_attempt = "ssh_attempt"
    brute_force = "brute_force"
    payload_injection = "payload_injection"
    custom = "custom"

class Protocol(str, Enum):
    tcp = "tcp"
    udp = "udp"
    icmp = "icmp"
    http = "http"
    https = "https"
    ssh = "ssh"
    dns = "dns"
    other = "other"

class Severity(str, Enum):
    info = "info"
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class AlertType(str, Enum):
    intrusion_detected = "intrusion_detected"
    port_scan_detected = "port_scan_detected"
    brute_force_detected = "brute_force_detected"
    anomalous_traffic = "anomalous_traffic"
    rule_triggered = "rule_triggered"
    custom = "custom"

class DefenseActionType(str, Enum):
    block_ip = "block_ip"
    block_port = "block_port"
    rate_limit = "rate_limit"
    firewall_rule = "firewall_rule"
    isolate_node = "isolate_node"
    honeypot_deploy = "honeypot_deploy"
    custom = "custom"

class DefenseActionStatus(str, Enum):
    pending = "pending"
    applied = "applied"
    failed = "failed"
    reverted = "reverted"

class Difficulty(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"
    expert = "expert"

class ScenarioCategory(str, Enum):
    reconnaissance = "reconnaissance"
    exploitation = "exploitation"
    persistence = "persistence"
    defense = "defense"
    forensics = "forensics"

class SessionStatus(str, Enum):
    idle = "idle"
    running = "running"
    paused = "paused"
    completed = "completed"
    failed = "failed"


# ============================================================
# Node
# ============================================================

class NetworkInterface(BaseModel):
    name: str
    ip: str
    cidr: str

class Node(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    label: str
    ip: str
    role: NodeRole
    status: NodeStatus = NodeStatus.online
    os: NodeOS = NodeOS.unknown
    interfaces: list[NetworkInterface] = []
    metadata: dict[str, Any] = {}


# ============================================================
# Event
# ============================================================

class Event(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    session_id: UUID
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    type: EventType
    protocol: Protocol
    severity: Severity
    source_node_id: UUID
    target_node_id: UUID
    source_port: int | None = None
    target_port: int | None = None
    payload: str | None = None
    tags: list[str] = []
    metadata: dict[str, Any] = {}


# ============================================================
# Alert
# ============================================================

class Alert(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    session_id: UUID
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    type: AlertType
    severity: Severity
    message: str
    related_event_ids: list[UUID] = []
    acknowledged: bool = False
    acknowledged_at: datetime | None = None
    metadata: dict[str, Any] = {}


# ============================================================
# DefenseAction
# ============================================================

class DefenseAction(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    session_id: UUID
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    type: DefenseActionType
    target_node_id: UUID
    params: dict[str, Any] = {}
    status: DefenseActionStatus = DefenseActionStatus.pending
    applied_at: datetime | None = None
    reverted_at: datetime | None = None
    effect: str | None = None
    metadata: dict[str, Any] = {}


# ============================================================
# Scenario
# ============================================================

class ScenarioStep(BaseModel):
    order: int
    title: str
    description: str
    hint: str | None = None
    success_condition: str

class ScenarioObjective(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    description: str
    completed: bool = False

class Scenario(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: str
    category: ScenarioCategory
    difficulty: Difficulty
    objectives: list[ScenarioObjective] = []
    steps: list[ScenarioStep] = []
    allowed_attack_types: list[EventType] = []
    allowed_defense_types: list[DefenseActionType] = []
    time_limit: int | None = None   # seconds
    tags: list[str] = []
    metadata: dict[str, Any] = {}


# ============================================================
# Session
# ============================================================

class SessionScore(BaseModel):
    attack_score: float = 0.0
    defense_score: float = 0.0
    total_score: float = 0.0
    objectives_completed: int = 0
    objectives_total: int = 0
    time_elapsed: int = 0   # seconds

class Session(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    scenario_id: UUID
    status: SessionStatus = SessionStatus.idle
    started_at: datetime | None = None
    ended_at: datetime | None = None
    paused_at: datetime | None = None
    nodes: list[Node] = []
    event_ids: list[UUID] = []
    alert_ids: list[UUID] = []
    defense_action_ids: list[UUID] = []
    score: SessionScore | None = None
    metadata: dict[str, Any] = {}


# ============================================================
# WebSocket メッセージ
# ============================================================

class WsMessageType(str, Enum):
    event = "event"
    alert = "alert"
    node_update = "node_update"
    defense_result = "defense_result"
    session_update = "session_update"
    ping = "ping"
    pong = "pong"

class WsMessage(BaseModel):
    type: WsMessageType
    payload: Any
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============================================================
# Request Bodies
# ============================================================

class CreateSessionRequest(BaseModel):
    scenario_id: UUID

class ApplyDefenseRequest(BaseModel):
    type: DefenseActionType
    target_node_id: UUID
    params: dict[str, Any] = {}
