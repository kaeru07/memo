import { useState, useRef, useEffect } from 'react'
import { useLabStore } from '../../store/labStore'
import { generateAttackEvent, generateAlertForEvent } from '../../engine/attackEngine'
import { useScenarioProgress } from '../../hooks/useScenarioProgress'
import type { EventType, Protocol, Severity } from '../../types/lab'

interface AttackDef {
  type: EventType
  icon: string
  label: string
  desc: string
  protocol: Protocol
  defaultPort: number
  severity: Severity
  outputLines: (target: string, port: number) => string[]
}

const ATTACKS: AttackDef[] = [
  {
    type: 'port_scan', icon: '🔍', label: 'Port Scan',
    desc: '対象ホストの開放ポートを探索 (nmap style)',
    protocol: 'tcp', defaultPort: 80, severity: 'high',
    outputLines: (t, p) => [
      `Starting Nmap scan against ${t}...`,
      `Scanning ports 1-${p}`,
      `Discovered open port 22/tcp on ${t}`,
      `Discovered open port 80/tcp on ${t}`,
      `Discovered open port 443/tcp on ${t}`,
      `Nmap done: 1 IP address scanned`,
    ],
  },
  {
    type: 'ping', icon: '📡', label: 'ICMP Ping',
    desc: 'ICMP Echo でホスト生存確認',
    protocol: 'icmp', defaultPort: 0, severity: 'info',
    outputLines: (t) => [
      `PING ${t} (${t}): 56 data bytes`,
      `64 bytes from ${t}: icmp_seq=0 ttl=64 time=1.23 ms`,
      `64 bytes from ${t}: icmp_seq=1 ttl=64 time=1.18 ms`,
      `64 bytes from ${t}: icmp_seq=2 ttl=64 time=1.31 ms`,
      `--- ${t} ping statistics ---`,
      `3 packets transmitted, 3 received, 0% packet loss`,
    ],
  },
  {
    type: 'ssh_attempt', icon: '🔑', label: 'SSH Brute Force',
    desc: 'SSH 認証情報の総当たり攻撃',
    protocol: 'ssh', defaultPort: 22, severity: 'critical',
    outputLines: (t, p) => [
      `[*] Starting SSH brute force on ${t}:${p}`,
      `[*] Trying root:password → FAILED`,
      `[*] Trying root:123456 → FAILED`,
      `[*] Trying admin:admin → FAILED`,
      `[*] Trying root:toor → FAILED`,
      `[!] Warning: 5 attempts remaining before lockout`,
    ],
  },
  {
    type: 'http_request', icon: '🌐', label: 'HTTP Request',
    desc: 'HTTP/HTTPS リクエスト送信・ディレクトリ探索',
    protocol: 'http', defaultPort: 80, severity: 'low',
    outputLines: (t, p) => [
      `GET http://${t}:${p}/`,
      `HTTP/1.1 200 OK`,
      `GET http://${t}:${p}/admin`,
      `HTTP/1.1 403 Forbidden`,
      `GET http://${t}:${p}/.env`,
      `HTTP/1.1 404 Not Found`,
    ],
  },
  {
    type: 'payload_injection', icon: '💉', label: 'Payload Injection',
    desc: 'SQLi / XSS などのペイロード送信',
    protocol: 'http', defaultPort: 80, severity: 'critical',
    outputLines: (t, p) => [
      `[*] Testing SQL injection on http://${t}:${p}/login`,
      `Payload: ' OR 1=1--`,
      `Response: 500 Internal Server Error`,
      `[!] Possible SQL injection vulnerability detected!`,
      `Payload: <script>alert(1)</script>`,
      `Response: 200 OK (reflected)`,
    ],
  },
  {
    type: 'tcp_connect', icon: '🔗', label: 'TCP Connect',
    desc: '指定ポートへのTCP接続テスト',
    protocol: 'tcp', defaultPort: 443, severity: 'medium',
    outputLines: (t, p) => [
      `Attempting TCP connect to ${t}:${p}...`,
      `Connection established: ${t}:${p}`,
      `Remote banner: OpenSSH_8.9 Ubuntu`,
      `Connection closed by remote host`,
    ],
  },
]

interface TermLine { text: string; cls: string }

export function AttackConsole() {
  const { nodes, session, addEvent, addAlert } = useLabStore()
  const { checkProgress } = useScenarioProgress()
  const [selected, setSelected] = useState(ATTACKS[0])
  const [targetPort, setTargetPort] = useState(selected.defaultPort)
  const [delay, setDelay] = useState(100)
  const [executing, setExecuting] = useState(false)
  const [lines, setLines] = useState<TermLine[]>([
    { text: '# Hack Lab Attack Console v0.1', cls: 'info' },
    { text: '# 攻撃タイプを選択して Execute を押してください', cls: 'info' },
    { text: '', cls: 'info' },
  ])
  const termRef = useRef<HTMLDivElement>(null)

  const nodeList = Object.values(nodes)
  const vps = nodeList.find(n => n.role === 'defender')

  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight
    }
  }, [lines])

  function addLine(text: string, cls = 'output') {
    setLines(prev => [...prev, { text, cls }])
  }

  async function execute() {
    if (!vps || !session || executing) return
    setExecuting(true)

    const attack = selected
    const kindMap: Record<string, import('../../engine/attackEngine').AttackKind> = {
      port_scan:         'port-scan',
      ssh_attempt:       'ssh-attempt',
      brute_force:       'brute-force',
      http_request:      'http-scan',
      payload_injection: 'payload-injection',
      tcp_connect:       'tcp-connect',
      ping:              'ping',
    }
    const kind = kindMap[attack.type] ?? 'port-scan'

    // ── ターミナル出力アニメーション ──
    addLine(`$ ${attack.type.replace(/_/g, '-')} --target ${vps.ip} --port ${targetPort}`, 'prompt')
    const outputLines = attack.outputLines(vps.ip, targetPort)
    for (let i = 0; i < outputLines.length; i++) {
      await new Promise(r => setTimeout(r, delay + Math.random() * 80))
      addLine(outputLines[i], i === outputLines.length - 1 ? 'success' : 'output')
    }

    // ── attackEngine でイベント生成 ──
    const newEvent = generateAttackEvent({
      kind,
      sessionId:    session.id,
      sourceNodeId: 'node-iphone-001',
      targetNodeId: vps.id,
      targetIp:     vps.ip,
      targetPort:   targetPort || undefined,
    })
    addEvent(newEvent)

    // ── attackEngine でアラート生成 ──
    const newAlert = generateAlertForEvent(newEvent, session.id)
    if (newAlert) {
      addAlert(newAlert)
      addLine(`[!] アラート発生: ${newAlert.message}`, 'error')
    }

    // ── シナリオ進行チェック ──
    const progress = checkProgress()
    if (progress.newlyCompleted.length > 0) {
      addLine(`[✓] 目標達成: ${progress.newlyCompleted.length}件`, 'success')
    }
    if (progress.sessionCompleted) {
      addLine('[🎉] シナリオ完了！結果画面で確認してください。', 'success')
    }

    addLine('')
    addLine('[+] 攻撃完了 — イベントがログに記録されました', 'success')
    addLine('')
    setExecuting(false)
  }

  return (
    <div className="page fade-in" style={{ gap: 0 }}>
      <div className="attack-layout" style={{ flex: 1 }}>
        {/* Attack types */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header"><h3>攻撃タイプ</h3></div>
          <div className="attack-type-list" style={{ overflowY: 'auto', flex: 1 }}>
            {ATTACKS.map(atk => (
              <button
                key={atk.type}
                className={`attack-type-btn${selected.type === atk.type ? ' selected' : ''}`}
                onClick={() => { setSelected(atk); setTargetPort(atk.defaultPort) }}
              >
                <span className="attack-type-icon">{atk.icon}</span>
                <div>
                  <div className="attack-type-label">{atk.label}</div>
                  <div className="attack-type-desc">{atk.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Config */}
        <div className="card attack-config">
          <div className="card-header">
            <h3>設定 — {selected.label}</h3>
            <span className={`severity-badge ${selected.severity}`}>{selected.severity}</span>
          </div>
          <div className="attack-config-body">
            <div className="form-group">
              <label className="form-label">攻撃元</label>
              <div className="input" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)', cursor: 'not-allowed' }}>
                10.0.0.2 (iPhone / Attacker)
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">攻撃対象</label>
              <div className="input" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)', cursor: 'not-allowed' }}>
                {vps ? `${vps.ip} (${vps.label})` : '未選択'}
              </div>
            </div>
            {selected.defaultPort > 0 && (
              <div className="form-group">
                <label className="form-label">ターゲットポート</label>
                <input
                  className="input"
                  type="number"
                  min={1} max={65535}
                  value={targetPort}
                  onChange={e => setTargetPort(Number(e.target.value))}
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">パケット遅延 (ms): {delay}ms</label>
              <input
                className="range-input"
                type="range"
                min={50} max={500} step={50}
                value={delay}
                onChange={e => setDelay(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">プロトコル</label>
              <div className="input" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)', cursor: 'not-allowed' }}>
                {selected.protocol.toUpperCase()}
              </div>
            </div>
            <div style={{
              padding: '10px 12px',
              background: 'rgba(255,59,92,0.06)',
              border: '1px solid rgba(255,59,92,0.2)',
              borderRadius: 'var(--radius)',
              fontSize: 12,
              color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}>
              ⚠ このラボは閉域WireGuard VPN内のみで動作します。<br />
              実行したイベントはリアルタイムで通信ログに記録されます。
            </div>
          </div>
          <div className="attack-config-footer">
            <button
              className={`btn btn-danger execute-btn btn-lg${executing ? ' loading' : ''}`}
              onClick={execute}
              disabled={executing || !vps || !session}
            >
              {executing
                ? <><span className="spinner" /> 実行中...</>
                : `▶ Execute`}
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              実行するとイベントが記録されます
            </span>
          </div>
        </div>

        {/* Terminal output */}
        <div className="card attack-output">
          <div className="card-header">
            <h3>出力ターミナル</h3>
            <button className="btn btn-xs btn-outline" onClick={() => setLines([{ text: '# cleared', cls: 'info' }])}>
              クリア
            </button>
          </div>
          <div className="terminal" ref={termRef}>
            {lines.map((l, i) => (
              <div key={i} className={`terminal-line ${l.cls}`}>{l.text || '\u00A0'}</div>
            ))}
            {executing && <div className="terminal-line prompt">▌<span className="terminal-cursor" /></div>}
          </div>
        </div>
      </div>
    </div>
  )
}
