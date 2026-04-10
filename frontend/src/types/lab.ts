// ============================================================
// 疑似攻撃・防御ラボ — コアデータ型定義
// 設計方針: 将来拡張を考慮した拡張可能な型システム
// ============================================================

// ------------------------------------------------------------
// Node（ネットワーク上の端末）
// ------------------------------------------------------------
export type NodeRole = "attacker" | "defender" | "target" | "monitor";
export type NodeStatus = "online" | "offline" | "compromised" | "protected";
export type NodeOS = "linux" | "windows" | "ios" | "android" | "unknown";

export interface NetworkInterface {
  name: string;        // e.g. "wg0", "eth0"
  ip: string;
  cidr: string;
}

export interface Node {
  id: string;
  label: string;       // 表示名 e.g. "VPS (Defender)"
  ip: string;
  role: NodeRole;
  status: NodeStatus;
  os: NodeOS;
  interfaces: NetworkInterface[];
  metadata: Record<string, unknown>;  // 拡張用
}

// ------------------------------------------------------------
// Event（ネットワークイベント・通信ログ）
// ------------------------------------------------------------
export type EventType =
  | "port_scan"
  | "ping"
  | "tcp_connect"
  | "udp_packet"
  | "http_request"
  | "ssh_attempt"
  | "brute_force"
  | "payload_injection"
  | "custom";

export type Protocol = "tcp" | "udp" | "icmp" | "http" | "https" | "ssh" | "dns" | "other";
export type Severity = "info" | "low" | "medium" | "high" | "critical";

export interface Event {
  id: string;
  sessionId: string;
  timestamp: string;        // ISO 8601
  type: EventType;
  protocol: Protocol;
  severity: Severity;
  sourceNodeId: string;
  targetNodeId: string;
  sourcePort?: number;
  targetPort?: number;
  payload?: string;         // raw or summarized payload
  tags: string[];
  metadata: Record<string, unknown>;
}

// ------------------------------------------------------------
// Alert（異常検知アラート）
// ------------------------------------------------------------
export type AlertType =
  | "intrusion_detected"
  | "port_scan_detected"
  | "brute_force_detected"
  | "anomalous_traffic"
  | "rule_triggered"
  | "custom";

export interface Alert {
  id: string;
  sessionId: string;
  timestamp: string;
  type: AlertType;
  severity: Severity;
  message: string;
  relatedEventIds: string[];
  acknowledged: boolean;
  acknowledgedAt?: string;
  metadata: Record<string, unknown>;
}

// ------------------------------------------------------------
// DefenseAction（防御操作）
// ------------------------------------------------------------
export type DefenseActionType =
  | "block_ip"
  | "block_port"
  | "rate_limit"
  | "firewall_rule"
  | "isolate_node"
  | "honeypot_deploy"
  | "custom";

export type DefenseActionStatus = "pending" | "applied" | "failed" | "reverted";

export interface DefenseAction {
  id: string;
  sessionId: string;
  timestamp: string;
  type: DefenseActionType;
  targetNodeId: string;
  params: Record<string, unknown>;   // e.g. { ip: "10.0.0.2", port: 22 }
  status: DefenseActionStatus;
  appliedAt?: string;
  revertedAt?: string;
  effect?: string;                   // 人間が読める説明
  metadata: Record<string, unknown>;
}

// ------------------------------------------------------------
// Scenario（ラボシナリオ）
// ------------------------------------------------------------
export type Difficulty = "beginner" | "intermediate" | "advanced" | "expert";
export type ScenarioCategory = "reconnaissance" | "exploitation" | "persistence" | "defense" | "forensics";

export interface ScenarioStep {
  order: number;
  title: string;
  description: string;
  hint?: string;
  successCondition: string;   // 成功判定の説明
}

export interface ScenarioObjective {
  id: string;
  description: string;
  completed: boolean;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  category: ScenarioCategory;
  difficulty: Difficulty;
  objectives: ScenarioObjective[];
  steps: ScenarioStep[];
  allowedAttackTypes: EventType[];
  allowedDefenseTypes: DefenseActionType[];
  timeLimit?: number;         // 秒, nullなら無制限
  tags: string[];
  metadata: Record<string, unknown>;
}

// ------------------------------------------------------------
// Session（ラボセッション）
// ------------------------------------------------------------
export type SessionStatus = "idle" | "running" | "paused" | "completed" | "failed";

export interface SessionScore {
  attackScore: number;       // 0-100
  defenseScore: number;      // 0-100
  totalScore: number;
  objectivesCompleted: number;
  objectivesTotal: number;
  timeElapsed: number;       // 秒
}

export interface Session {
  id: string;
  scenarioId: string;
  status: SessionStatus;
  startedAt?: string;
  endedAt?: string;
  pausedAt?: string;
  nodes: Node[];             // セッション内のノードスナップショット
  eventIds: string[];        // 発生イベントの参照
  alertIds: string[];
  defenseActionIds: string[];
  score?: SessionScore;
  metadata: Record<string, unknown>;
}

// ------------------------------------------------------------
// WebSocket メッセージ型
// ------------------------------------------------------------
export type WsMessageType =
  | "event"
  | "alert"
  | "node_update"
  | "defense_result"
  | "session_update"
  | "ping"
  | "pong";

export interface WsMessage<T = unknown> {
  type: WsMessageType;
  payload: T;
  timestamp: string;
}
