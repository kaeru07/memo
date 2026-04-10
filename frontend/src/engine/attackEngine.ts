// ============================================================
// attackEngine — 疑似攻撃イベント・アラート生成ロジック
// ============================================================
import type { Event, Alert, EventType, AlertType, Protocol, Severity } from '../types/lab'

// ── 攻撃タイプ定義 ─────────────────────────────────────────
export type AttackKind =
  | 'port-scan'
  | 'ssh-attempt'
  | 'http-scan'
  | 'brute-force'
  | 'payload-injection'
  | 'tcp-connect'
  | 'ping'

interface AttackTypeSpec {
  eventType:  EventType
  alertType:  AlertType | null
  protocol:   Protocol
  severity:   Severity
  defaultPort: number
}

const ATTACK_SPECS: Record<AttackKind, AttackTypeSpec> = {
  'port-scan':         { eventType: 'port_scan',        alertType: 'port_scan_detected',   protocol: 'tcp',  severity: 'high',     defaultPort: 80 },
  'ssh-attempt':       { eventType: 'ssh_attempt',      alertType: 'brute_force_detected', protocol: 'ssh',  severity: 'critical', defaultPort: 22 },
  'brute-force':       { eventType: 'brute_force',      alertType: 'brute_force_detected', protocol: 'ssh',  severity: 'critical', defaultPort: 22 },
  'http-scan':         { eventType: 'http_request',     alertType: 'anomalous_traffic',    protocol: 'http', severity: 'medium',   defaultPort: 80 },
  'payload-injection': { eventType: 'payload_injection', alertType: 'intrusion_detected',  protocol: 'http', severity: 'critical', defaultPort: 80 },
  'tcp-connect':       { eventType: 'tcp_connect',      alertType: 'anomalous_traffic',    protocol: 'tcp',  severity: 'medium',   defaultPort: 443 },
  'ping':              { eventType: 'ping',              alertType: null,                   protocol: 'icmp', severity: 'info',     defaultPort: 0 },
}

// ── イベント生成 ──────────────────────────────────────────
export interface AttackConfig {
  kind:          AttackKind
  sessionId:     string
  sourceNodeId:  string
  targetNodeId:  string
  targetIp:      string
  targetPort?:   number
}

export function generateAttackEvent(cfg: AttackConfig): Event {
  const spec = ATTACK_SPECS[cfg.kind]
  const port  = cfg.targetPort ?? spec.defaultPort

  const payloadMap: Partial<Record<AttackKind, string>> = {
    'port-scan':         `SYN scan → ${cfg.targetIp}:1-${port}`,
    'ssh-attempt':       `user: root / pass: ****`,
    'brute-force':       `wordlist attack → ${cfg.targetIp}:${port}`,
    'http-scan':         `GET /admin HTTP/1.1`,
    'payload-injection': `' OR 1=1--`,
    'tcp-connect':       `CONNECT ${cfg.targetIp}:${port}`,
  }

  return {
    id:           `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sessionId:    cfg.sessionId,
    timestamp:    new Date().toISOString(),
    type:         spec.eventType,
    protocol:     spec.protocol,
    severity:     spec.severity,
    sourceNodeId: cfg.sourceNodeId,
    targetNodeId: cfg.targetNodeId,
    sourcePort:   Math.floor(49152 + Math.random() * 16383),
    targetPort:   port || undefined,
    payload:      payloadMap[cfg.kind],
    tags:         ['manual', cfg.kind],
    metadata:     { attackKind: cfg.kind, manual: true },
  }
}

// ── アラート生成 ──────────────────────────────────────────
export function generateAlertForEvent(event: Event, sessionId: string): Alert | null {
  // info / low は自動アラートなし
  if (event.severity === 'info' || event.severity === 'low') return null

  const alertTypeMap: Partial<Record<EventType, AlertType>> = {
    port_scan:         'port_scan_detected',
    ssh_attempt:       'brute_force_detected',
    brute_force:       'brute_force_detected',
    payload_injection: 'intrusion_detected',
    http_request:      'anomalous_traffic',
    tcp_connect:       'anomalous_traffic',
  }

  const alertType = alertTypeMap[event.type]
  if (!alertType) return null

  const msgMap: Partial<Record<EventType, string>> = {
    port_scan:         `ポートスキャンを検知: ${event.targetPort ? `ポート ${event.targetPort}` : '全ポート範囲'}`,
    ssh_attempt:       `SSHブルートフォース攻撃を検知: ポート ${event.targetPort ?? 22}`,
    brute_force:       `ブルートフォース攻撃を検知: ポート ${event.targetPort ?? 22}`,
    payload_injection: `インジェクション攻撃を検知: ${event.payload ?? 'payload'}`,
    http_request:      `不審なHTTPリクエストを検知: ポート ${event.targetPort ?? 80}`,
    tcp_connect:       `不審なTCP接続を検知: ポート ${event.targetPort ?? 0}`,
  }

  return {
    id:               `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sessionId,
    timestamp:        new Date().toISOString(),
    type:             alertType,
    severity:         event.severity,
    message:          msgMap[event.type] ?? 'セキュリティイベントを検知',
    relatedEventIds:  [event.id],
    acknowledged:     false,
    metadata:         { sourceEventType: event.type },
  }
}

// ── ターミナル出力テンプレート ─────────────────────────────
export function getTerminalOutput(kind: AttackKind, targetIp: string, port: number): string[] {
  const templates: Record<AttackKind, string[]> = {
    'port-scan': [
      `Starting Nmap scan against ${targetIp}...`,
      `Scanning ports 1-${port}`,
      `Discovered open port 22/tcp   ssh`,
      `Discovered open port 80/tcp   http`,
      `Discovered open port 443/tcp  https`,
      `Nmap done: 1 IP address scanned`,
    ],
    'ssh-attempt': [
      `[*] Starting SSH brute force on ${targetIp}:${port}`,
      `[*] Trying root:password → FAILED`,
      `[*] Trying root:123456  → FAILED`,
      `[*] Trying admin:admin  → FAILED`,
      `[*] Trying root:toor    → FAILED`,
      `[!] Warning: possible lockout approaching`,
    ],
    'brute-force': [
      `[*] Brute force attack on ${targetIp}:${port}`,
      `[*] Loading wordlist (4096 entries)...`,
      `[*] Trying... root:password → FAILED`,
      `[*] Trying... root:letmein  → FAILED`,
      `[*] Trying... ubuntu:ubuntu → FAILED`,
      `[!] 3 attempts made`,
    ],
    'http-scan': [
      `GET http://${targetIp}:${port}/`,
      `HTTP/1.1 200 OK`,
      `GET http://${targetIp}:${port}/admin`,
      `HTTP/1.1 403 Forbidden`,
      `GET http://${targetIp}:${port}/.env`,
      `HTTP/1.1 404 Not Found`,
    ],
    'payload-injection': [
      `[*] Testing injection on http://${targetIp}:${port}/login`,
      `Payload: ' OR 1=1--`,
      `Response: 500 Internal Server Error`,
      `[!] Possible SQL injection detected!`,
      `Payload: <script>alert(1)</script>`,
      `Response: 200 OK (possibly reflected)`,
    ],
    'tcp-connect': [
      `Attempting TCP connect to ${targetIp}:${port}...`,
      `Connection established: ${targetIp}:${port}`,
      `Remote banner: OpenSSH_8.9p1 Ubuntu-3ubuntu0.6`,
      `Connection closed by remote host`,
    ],
    'ping': [
      `PING ${targetIp}: 56 data bytes`,
      `64 bytes from ${targetIp}: icmp_seq=0 ttl=64 time=1.23 ms`,
      `64 bytes from ${targetIp}: icmp_seq=1 ttl=64 time=1.18 ms`,
      `--- ${targetIp} ping statistics ---`,
      `3 packets transmitted, 3 received, 0% packet loss`,
    ],
  }
  return templates[kind] ?? [`Unknown attack type: ${kind}`]
}
