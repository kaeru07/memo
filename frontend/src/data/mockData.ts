import { useLabStore } from '../store/labStore'
import { useScenarioStore } from '../store/scenarioStore'
import type { Node, Event, Alert, DefenseAction, Scenario, Session } from '../types/lab'

export function initMockData() {
  const { setSession, addNode, addEvent, addAlert, addDefenseAction } = useLabStore.getState()
  const { setScenarios } = useScenarioStore.getState()

  // ── Nodes ──────────────────────────────────────────
  const vpsNode: Node = {
    id: 'node-vps-001',
    label: 'VPS (Defender)',
    ip: '10.0.0.1',
    role: 'defender',
    status: 'protected',
    os: 'linux',
    interfaces: [{ name: 'wg0', ip: '10.0.0.1', cidr: '10.0.0.0/24' }],
    metadata: { hostname: 'hack-lab-vps', cpu: '2 vCPU', ram: '4GB', uptime: '14d 3h 22m' },
  }
  const iphoneNode: Node = {
    id: 'node-iphone-001',
    label: 'iPhone (Attacker)',
    ip: '10.0.0.2',
    role: 'attacker',
    status: 'online',
    os: 'ios',
    interfaces: [{ name: 'utun0', ip: '10.0.0.2', cidr: '10.0.0.0/24' }],
    metadata: { model: 'iPhone 15 Pro', ios: '17.4', battery: '82%' },
  }
  addNode(vpsNode)
  addNode(iphoneNode)

  // ── Scenarios ──────────────────────────────────────
  const scenarios: Scenario[] = [
    {
      id: 'scenario-01',
      name: 'ポートスキャン検知と対応',
      description: '攻撃者がVPSに対してポートスキャンを実行。防御側はそれを検知し、適切に対処する方法を学ぶ基礎シナリオ。',
      category: 'reconnaissance',
      difficulty: 'beginner',
      objectives: [
        { id: 'obj-01-1', description: 'ポートスキャンを実行する', completed: false },
        { id: 'obj-01-2', description: '検知アラートに対応する（Acknowledge）', completed: false },
        { id: 'obj-01-3', description: '攻撃元IPを遮断する', completed: false },
        { id: 'obj-01-4', description: '遮断後に再スキャンして確認する', completed: false },
      ],
      steps: [
        { order: 1, title: 'スキャン実行', description: '攻撃コンソールからポートスキャンを実行', successCondition: 'port_scan イベントが発生' },
        { order: 2, title: 'アラート確認', description: '検知アラートをAcknowledgeする', successCondition: 'alert acknowledged' },
        { order: 3, title: 'IP遮断', description: '攻撃元IPをBlockする', hint: '防御操作 → Block IP', successCondition: 'block_ip applied' },
      ],
      allowedAttackTypes: ['port_scan', 'ping', 'tcp_connect'],
      allowedDefenseTypes: ['block_ip', 'block_port', 'rate_limit'],
      timeLimit: 1800,
      tags: ['reconnaissance', 'nmap', 'firewall'],
      metadata: {},
    },
    {
      id: 'scenario-02',
      name: 'SSHブルートフォース攻撃',
      description: 'SSH(22番ポート)へのブルートフォース攻撃を実行し、fail2banによる自動ブロックと手動防御を体験する中級シナリオ。',
      category: 'exploitation',
      difficulty: 'intermediate',
      objectives: [
        { id: 'obj-02-1', description: 'SSH Brute Force攻撃を10回実行', completed: false },
        { id: 'obj-02-2', description: 'fail2ban によるブロックを確認', completed: false },
        { id: 'obj-02-3', description: 'ログを分析して攻撃パターンを把握', completed: false },
        { id: 'obj-02-4', description: 'SSHポートをカスタムポートに変更', completed: false },
      ],
      steps: [
        { order: 1, title: 'Brute Force実行', description: 'SSH Brute Force攻撃を繰り返す', successCondition: 'ssh_attempt × 10以上' },
        { order: 2, title: '自動ブロック確認', description: 'fail2ban の検知アラートを確認', successCondition: 'brute_force_detected アラート' },
      ],
      allowedAttackTypes: ['ssh_attempt', 'brute_force', 'tcp_connect'],
      allowedDefenseTypes: ['block_ip', 'rate_limit', 'firewall_rule'],
      timeLimit: 2400,
      tags: ['brute-force', 'ssh', 'fail2ban'],
      metadata: {},
    },
    {
      id: 'scenario-03',
      name: 'Webアプリケーション攻撃',
      description: 'HTTP経由でSQLインジェクション・パラメータ改ざんを試み、WAFによる防御とログ分析を学ぶ上級シナリオ。',
      category: 'exploitation',
      difficulty: 'advanced',
      objectives: [
        { id: 'obj-03-1', description: 'SQLインジェクションを試みる', completed: false },
        { id: 'obj-03-2', description: 'WAFによるブロックを確認', completed: false },
        { id: 'obj-03-3', description: 'WAFルールをカスタマイズ', completed: false },
        { id: 'obj-03-4', description: '安全なリクエストとの差異を分析', completed: false },
      ],
      steps: [],
      allowedAttackTypes: ['http_request', 'payload_injection'],
      allowedDefenseTypes: ['firewall_rule', 'rate_limit', 'block_ip'],
      timeLimit: 3600,
      tags: ['web', 'sqli', 'waf', 'http'],
      metadata: {},
    },
  ]
  setScenarios(scenarios)

  // ── Session ────────────────────────────────────────
  const session: Session = {
    id: 'session-001',
    scenarioId: 'scenario-01',
    status: 'running',
    startedAt: new Date(Date.now() - 23 * 60 * 1000).toISOString(),
    nodes: [vpsNode, iphoneNode],
    eventIds: [],
    alertIds: [],
    defenseActionIds: [],
    metadata: {},
  }
  setSession(session)

  // ── Events ─────────────────────────────────────────
  const T = Date.now()
  const events: Event[] = [
    { id: 'evt-001', sessionId: 'session-001', timestamp: new Date(T - 22*60*1000).toISOString(), type: 'ping', protocol: 'icmp', severity: 'info', sourceNodeId: 'node-iphone-001', targetNodeId: 'node-vps-001', tags: ['recon'], metadata: {} },
    { id: 'evt-002', sessionId: 'session-001', timestamp: new Date(T - 21*60*1000).toISOString(), type: 'ping', protocol: 'icmp', severity: 'info', sourceNodeId: 'node-iphone-001', targetNodeId: 'node-vps-001', tags: [], metadata: {} },
    { id: 'evt-003', sessionId: 'session-001', timestamp: new Date(T - 20*60*1000).toISOString(), type: 'port_scan', protocol: 'tcp', severity: 'high', sourceNodeId: 'node-iphone-001', targetNodeId: 'node-vps-001', sourcePort: 54321, targetPort: 1, payload: 'SYN scan 1-1024', tags: ['scan', 'nmap'], metadata: { ports_scanned: '1-1024' } },
    { id: 'evt-004', sessionId: 'session-001', timestamp: new Date(T - 20*60*1000 + 500).toISOString(), type: 'port_scan', protocol: 'tcp', severity: 'high', sourceNodeId: 'node-iphone-001', targetNodeId: 'node-vps-001', sourcePort: 54322, targetPort: 22, tags: ['scan'], metadata: {} },
    { id: 'evt-005', sessionId: 'session-001', timestamp: new Date(T - 20*60*1000 + 1000).toISOString(), type: 'port_scan', protocol: 'tcp', severity: 'high', sourceNodeId: 'node-iphone-001', targetNodeId: 'node-vps-001', sourcePort: 54323, targetPort: 80, tags: ['scan'], metadata: {} },
    { id: 'evt-006', sessionId: 'session-001', timestamp: new Date(T - 20*60*1000 + 1500).toISOString(), type: 'port_scan', protocol: 'tcp', severity: 'high', sourceNodeId: 'node-iphone-001', targetNodeId: 'node-vps-001', sourcePort: 54324, targetPort: 443, tags: ['scan'], metadata: {} },
    { id: 'evt-007', sessionId: 'session-001', timestamp: new Date(T - 16*60*1000).toISOString(), type: 'tcp_connect', protocol: 'tcp', severity: 'medium', sourceNodeId: 'node-iphone-001', targetNodeId: 'node-vps-001', sourcePort: 54400, targetPort: 22, tags: ['ssh'], metadata: {} },
    { id: 'evt-008', sessionId: 'session-001', timestamp: new Date(T - 15*60*1000).toISOString(), type: 'ssh_attempt', protocol: 'ssh', severity: 'high', sourceNodeId: 'node-iphone-001', targetNodeId: 'node-vps-001', sourcePort: 54400, targetPort: 22, payload: 'user: root / pass: ****', tags: ['brute-force'], metadata: { attempt: 1 } },
    { id: 'evt-009', sessionId: 'session-001', timestamp: new Date(T - 14*60*1000 + 30*1000).toISOString(), type: 'ssh_attempt', protocol: 'ssh', severity: 'high', sourceNodeId: 'node-iphone-001', targetNodeId: 'node-vps-001', sourcePort: 54401, targetPort: 22, payload: 'user: admin / pass: ****', tags: ['brute-force'], metadata: { attempt: 2 } },
    { id: 'evt-010', sessionId: 'session-001', timestamp: new Date(T - 14*60*1000).toISOString(), type: 'ssh_attempt', protocol: 'ssh', severity: 'critical', sourceNodeId: 'node-iphone-001', targetNodeId: 'node-vps-001', sourcePort: 54402, targetPort: 22, payload: 'user: root / pass: ****', tags: ['brute-force'], metadata: { attempt: 3 } },
    { id: 'evt-011', sessionId: 'session-001', timestamp: new Date(T - 12*60*1000).toISOString(), type: 'http_request', protocol: 'http', severity: 'low', sourceNodeId: 'node-iphone-001', targetNodeId: 'node-vps-001', sourcePort: 55000, targetPort: 80, payload: 'GET / HTTP/1.1', tags: ['web'], metadata: {} },
    { id: 'evt-012', sessionId: 'session-001', timestamp: new Date(T - 11*60*1000).toISOString(), type: 'http_request', protocol: 'http', severity: 'medium', sourceNodeId: 'node-iphone-001', targetNodeId: 'node-vps-001', sourcePort: 55001, targetPort: 80, payload: 'GET /admin HTTP/1.1', tags: ['web', 'recon'], metadata: {} },
    { id: 'evt-013', sessionId: 'session-001', timestamp: new Date(T - 10*60*1000).toISOString(), type: 'payload_injection', protocol: 'http', severity: 'critical', sourceNodeId: 'node-iphone-001', targetNodeId: 'node-vps-001', sourcePort: 55002, targetPort: 80, payload: "' OR 1=1--", tags: ['sqli', 'injection'], metadata: {} },
    { id: 'evt-014', sessionId: 'session-001', timestamp: new Date(T - 9*60*1000).toISOString(), type: 'tcp_connect', protocol: 'tcp', severity: 'info', sourceNodeId: 'node-iphone-001', targetNodeId: 'node-vps-001', sourcePort: 55100, targetPort: 443, tags: [], metadata: {} },
    { id: 'evt-015', sessionId: 'session-001', timestamp: new Date(T - 8*60*1000).toISOString(), type: 'ping', protocol: 'icmp', severity: 'info', sourceNodeId: 'node-iphone-001', targetNodeId: 'node-vps-001', tags: [], metadata: {} },
    { id: 'evt-016', sessionId: 'session-001', timestamp: new Date(T - 7*60*1000).toISOString(), type: 'port_scan', protocol: 'udp', severity: 'medium', sourceNodeId: 'node-iphone-001', targetNodeId: 'node-vps-001', sourcePort: 56000, targetPort: 53, tags: ['dns', 'scan'], metadata: {} },
    { id: 'evt-017', sessionId: 'session-001', timestamp: new Date(T - 6*60*1000).toISOString(), type: 'ssh_attempt', protocol: 'ssh', severity: 'high', sourceNodeId: 'node-iphone-001', targetNodeId: 'node-vps-001', sourcePort: 56100, targetPort: 22, payload: 'user: ubuntu / pass: ****', tags: ['brute-force'], metadata: { attempt: 4 } },
    { id: 'evt-018', sessionId: 'session-001', timestamp: new Date(T - 5*60*1000).toISOString(), type: 'ssh_attempt', protocol: 'ssh', severity: 'high', sourceNodeId: 'node-iphone-001', targetNodeId: 'node-vps-001', sourcePort: 56101, targetPort: 22, payload: 'user: deploy / pass: ****', tags: ['brute-force'], metadata: { attempt: 5 } },
    { id: 'evt-019', sessionId: 'session-001', timestamp: new Date(T - 3*60*1000).toISOString(), type: 'http_request', protocol: 'http', severity: 'low', sourceNodeId: 'node-iphone-001', targetNodeId: 'node-vps-001', sourcePort: 57000, targetPort: 80, payload: 'GET /robots.txt HTTP/1.1', tags: ['recon'], metadata: {} },
    { id: 'evt-020', sessionId: 'session-001', timestamp: new Date(T - 1*60*1000).toISOString(), type: 'port_scan', protocol: 'tcp', severity: 'high', sourceNodeId: 'node-iphone-001', targetNodeId: 'node-vps-001', sourcePort: 57100, targetPort: 8080, tags: ['scan'], metadata: {} },
  ]
  events.forEach(addEvent)

  // ── Alerts ─────────────────────────────────────────
  const alerts: Alert[] = [
    {
      id: 'alert-001', sessionId: 'session-001',
      timestamp: new Date(T - 20*60*1000).toISOString(),
      type: 'port_scan_detected', severity: 'high',
      message: 'ポートスキャンを検知: 10.0.0.2 → 10.0.0.1 (TCP 1-1024)',
      relatedEventIds: ['evt-003', 'evt-004', 'evt-005', 'evt-006'],
      acknowledged: true, acknowledgedAt: new Date(T - 19*60*1000).toISOString(), metadata: {},
    },
    {
      id: 'alert-002', sessionId: 'session-001',
      timestamp: new Date(T - 14*60*1000).toISOString(),
      type: 'brute_force_detected', severity: 'critical',
      message: 'SSHブルートフォース攻撃を検知: 10.0.0.2 → 10.0.0.1:22 (5試行)',
      relatedEventIds: ['evt-008', 'evt-009', 'evt-010', 'evt-017', 'evt-018'],
      acknowledged: false, metadata: {},
    },
    {
      id: 'alert-003', sessionId: 'session-001',
      timestamp: new Date(T - 10*60*1000).toISOString(),
      type: 'intrusion_detected', severity: 'critical',
      message: "SQLインジェクション試行を検知: ペイロード [' OR 1=1--]",
      relatedEventIds: ['evt-013'],
      acknowledged: false, metadata: {},
    },
    {
      id: 'alert-004', sessionId: 'session-001',
      timestamp: new Date(T - 11*60*1000).toISOString(),
      type: 'anomalous_traffic', severity: 'medium',
      message: '異常なHTTPリクエスト: /admin へのアクセス試行 (403 Forbidden)',
      relatedEventIds: ['evt-012'],
      acknowledged: false, metadata: {},
    },
    {
      id: 'alert-005', sessionId: 'session-001',
      timestamp: new Date(T - 7*60*1000).toISOString(),
      type: 'port_scan_detected', severity: 'medium',
      message: 'UDPスキャン検知: DNSポート(53)への不審なアクセス',
      relatedEventIds: ['evt-016'],
      acknowledged: false, metadata: {},
    },
  ]
  alerts.forEach(addAlert)

  // ── Defense Actions ────────────────────────────────
  const defenseActions: DefenseAction[] = [
    {
      id: 'def-001', sessionId: 'session-001',
      timestamp: new Date(T - 19*60*1000).toISOString(),
      type: 'block_ip', targetNodeId: 'node-iphone-001',
      params: { ip: '10.0.0.2', reason: 'Port scan detected' },
      status: 'applied', appliedAt: new Date(T - 18*60*1000).toISOString(),
      effect: '10.0.0.2 からの全通信をブロック (iptables DROP)',
      metadata: {},
    },
    {
      id: 'def-002', sessionId: 'session-001',
      timestamp: new Date(T - 13*60*1000).toISOString(),
      type: 'block_port', targetNodeId: 'node-vps-001',
      params: { port: 22, protocol: 'tcp', reason: 'Brute force protection' },
      status: 'applied', appliedAt: new Date(T - 12*60*1000).toISOString(),
      effect: 'ポート22(SSH)への外部からのアクセスをブロック',
      metadata: {},
    },
    {
      id: 'def-003', sessionId: 'session-001',
      timestamp: new Date(T - 5*60*1000).toISOString(),
      type: 'rate_limit', targetNodeId: 'node-iphone-001',
      params: { ip: '10.0.0.2', limit: '10req/min', target: 'http:80' },
      status: 'applied', appliedAt: new Date(T - 5*60*1000).toISOString(),
      effect: '10.0.0.2 のHTTPリクエストを 10req/min に制限',
      metadata: {},
    },
  ]
  defenseActions.forEach(addDefenseAction)
}
