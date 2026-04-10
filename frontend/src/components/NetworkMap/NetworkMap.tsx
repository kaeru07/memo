import { useState } from 'react'
import { useLabStore } from '../../store/labStore'
import type { Node } from '../../types/lab'

const ROLE_COLOR: Record<string, string> = {
  defender: '#00d4ff',
  attacker: '#ff3b5c',
  target:   '#ffa726',
  monitor:  '#8a9ab5',
}

const TRAFFIC_COLORS = ['#ff3b5c', '#ff5577', '#ff3b5caa']

export function NetworkMap() {
  const { nodes, events, alerts } = useLabStore()
  const nodeList = Object.values(nodes)
  const vps     = nodeList.find(n => n.role === 'defender')
  const iphone  = nodeList.find(n => n.role === 'attacker')
  const [selected, setSelected] = useState<Node | null>(null)

  const recentEvents = [...events]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)
  const unackAlerts = alerts.filter(a => !a.acknowledged)

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>ネットワークマップ</h2>
          <span className="badge badge-gray">WireGuard VPN 10.0.0.0/24</span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', alignItems: 'center' }}>
          <span><span style={{ color: 'var(--attack-red)' }}>●</span> 攻撃側</span>
          <span><span style={{ color: 'var(--accent-cyan)' }}>●</span> 防御側</span>
          <span><span style={{ color: 'var(--text-muted)' }}>⇢</span> パケット</span>
          {unackAlerts.length > 0 && (
            <span className="badge badge-danger">⚠ {unackAlerts.length} アラート</span>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <svg
          viewBox="0 0 800 340"
          style={{ width: '100%', height: '100%' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Grid pattern */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e2d4d" strokeWidth="0.5" />
            </pattern>
            {/* Glow filter */}
            <filter id="glow-cyan">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-red">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width="800" height="340" fill="url(#grid)" />
          <rect width="800" height="340" fill="rgba(8,13,26,0.5)" />

          {/* WireGuard label */}
          <text x="400" y="148" textAnchor="middle" fill="#2a4080" fontSize="11" fontFamily="monospace">
            ── WireGuard VPN Tunnel (10.0.0.0/24) ──
          </text>

          {/* Tunnel line */}
          <line x1="210" y1="170" x2="590" y2="170"
            stroke="#1e2d4d" strokeWidth="2" strokeDasharray="12,6" />

          {/* Animated attack packets (attacker → defender) */}
          {TRAFFIC_COLORS.map((color, i) => (
            <circle key={i} r="4" fill={color} opacity="0.9" filter="url(#glow-red)">
              <animateMotion
                dur="2s"
                repeatCount="indefinite"
                begin={`${i * 0.65}s`}
              >
                <mpath href="#tunnel-path" />
              </animateMotion>
            </circle>
          ))}
          <path id="tunnel-path" d="M 210,170 L 590,170" fill="none" />

          {/* === iPhone Node (Attacker) === */}
          {/* Pulse rings */}
          <circle cx="200" cy="170" r="72" fill="none" stroke="#ff3b5c" strokeWidth="1" opacity="0.15">
            <animate attributeName="r" values="70;82;70" dur="2.5s" repeatCount="indefinite" begin="0s" />
            <animate attributeName="opacity" values="0.15;0.04;0.15" dur="2.5s" repeatCount="indefinite" begin="0s" />
          </circle>
          <circle cx="200" cy="170" r="68" fill="none" stroke="#ff3b5c" strokeWidth="0.8" opacity="0.2">
            <animate attributeName="r" values="64;76;64" dur="2.5s" repeatCount="indefinite" begin="0.4s" />
            <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2.5s" repeatCount="indefinite" begin="0.4s" />
          </circle>
          {/* Node body */}
          <circle
            cx="200" cy="170" r="58"
            fill="#0e1628"
            stroke={selected?.id === iphone?.id ? '#ff7799' : '#ff3b5c'}
            strokeWidth={selected?.id === iphone?.id ? 3 : 2}
            filter="url(#glow-red)"
            style={{ cursor: 'pointer' }}
            onClick={() => setSelected(selected?.id === iphone?.id ? null : iphone ?? null)}
          />
          {/* Labels */}
          <text x="200" y="158" textAnchor="middle" fill="#ff3b5c" fontSize="12" fontFamily="monospace" fontWeight="bold">
            10.0.0.2
          </text>
          <text x="200" y="174" textAnchor="middle" fill="#e4ecff" fontSize="12" fontWeight="600">iPhone</text>
          <text x="200" y="190" textAnchor="middle" fill="#8a9ab5" fontSize="10">Attacker</text>
          {/* Status */}
          <circle cx="247" cy="128" r="6" fill="#ff3b5c" filter="url(#glow-red)" />
          <circle cx="247" cy="128" r="6" fill="none" stroke="#ff3b5c" strokeWidth="1" opacity="0.5">
            <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <text x="259" y="132" fill="#ff3b5c" fontSize="9" fontFamily="monospace">ONLINE</text>

          {/* OS icon area */}
          <text x="200" y="220" textAnchor="middle" fill="#2a4080" fontSize="9" fontFamily="monospace">iOS 17.4</text>

          {/* === VPS Node (Defender) === */}
          {/* Pulse rings */}
          <circle cx="600" cy="170" r="72" fill="none" stroke="#00d4ff" strokeWidth="1" opacity="0.15">
            <animate attributeName="r" values="70;82;70" dur="3s" repeatCount="indefinite" begin="0.5s" />
            <animate attributeName="opacity" values="0.15;0.04;0.15" dur="3s" repeatCount="indefinite" begin="0.5s" />
          </circle>
          <circle cx="600" cy="170" r="68" fill="none" stroke="#00d4ff" strokeWidth="0.8" opacity="0.2">
            <animate attributeName="r" values="64;76;64" dur="3s" repeatCount="indefinite" begin="0.9s" />
            <animate attributeName="opacity" values="0.2;0.05;0.2" dur="3s" repeatCount="indefinite" begin="0.9s" />
          </circle>
          {/* Node body */}
          <circle
            cx="600" cy="170" r="58"
            fill="#0e1628"
            stroke={selected?.id === vps?.id ? '#44eeff' : '#00d4ff'}
            strokeWidth={selected?.id === vps?.id ? 3 : 2}
            filter="url(#glow-cyan)"
            style={{ cursor: 'pointer' }}
            onClick={() => setSelected(selected?.id === vps?.id ? null : vps ?? null)}
          />
          <text x="600" y="158" textAnchor="middle" fill="#00d4ff" fontSize="12" fontFamily="monospace" fontWeight="bold">
            10.0.0.1
          </text>
          <text x="600" y="174" textAnchor="middle" fill="#e4ecff" fontSize="12" fontWeight="600">VPS</text>
          <text x="600" y="190" textAnchor="middle" fill="#8a9ab5" fontSize="10">Defender</text>
          {/* Status */}
          <circle cx="647" cy="128" r="6" fill="#00d4ff" filter="url(#glow-cyan)" />
          <circle cx="647" cy="128" r="6" fill="none" stroke="#00d4ff" strokeWidth="1" opacity="0.5">
            <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x="659" y="132" fill="#00d4ff" fontSize="9" fontFamily="monospace">PROTECTED</text>
          <text x="600" y="220" textAnchor="middle" fill="#2a4080" fontSize="9" fontFamily="monospace">Linux / wg0</text>

          {/* Interface labels */}
          <text x="210" y="195" fill="#2a4080" fontSize="9" fontFamily="monospace">utun0</text>
          <text x="560" y="195" fill="#2a4080" fontSize="9" fontFamily="monospace" textAnchor="end">wg0</text>

          {/* Event counter on tunnel */}
          <rect x="363" y="158" width="74" height="20" rx="4" fill="#0e1628" stroke="#2a4080" strokeWidth="1" />
          <text x="400" y="172" textAnchor="middle" fill="#4a5b7a" fontSize="10" fontFamily="monospace">
            {events.length} packets
          </text>

          {/* Click hint */}
          <text x="400" y="308" textAnchor="middle" fill="#2a4080" fontSize="10">
            ノードをクリックして詳細を表示
          </text>
        </svg>
      </div>

      {/* Detail / Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Node Detail Panel */}
        <div className="card">
          <div className="card-header">
            <h3>ノード詳細</h3>
            {selected && (
              <span className={`badge ${selected.role === 'attacker' ? 'badge-red' : 'badge-cyan'}`}>
                {selected.role}
              </span>
            )}
          </div>
          {selected ? (
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['ラベル',    selected.label],
                ['IPアドレス', selected.ip],
                ['役割',     selected.role],
                ['ステータス', selected.status],
                ['OS',       selected.os],
                ['インターフェース', selected.interfaces.map(i => `${i.name} (${i.ip})`).join(', ')],
                ...Object.entries(selected.metadata as Record<string, string>).map(([k, v]) => [k, v]),
              ].map(([k, v]) => (
                <div key={k as string} className="node-detail-row">
                  <span className="node-detail-key">{k as string}</span>
                  <span className="node-detail-val">{v as string}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">ノードをクリックして詳細を表示</div>
          )}
        </div>

        {/* Recent Traffic */}
        <div className="card">
          <div className="card-header">
            <h3>最近のトラフィック</h3>
            <span className="text-xs text-muted">直近 5件</span>
          </div>
          <div style={{ overflow: 'hidden' }}>
            {recentEvents.map(evt => (
              <div key={evt.id} className={`event-row row-${evt.severity}`} style={{ fontSize: 12 }}>
                <span className={`severity-dot ${evt.severity}`} />
                <span className="text-muted mono" style={{ fontSize: 11, minWidth: 60 }}>
                  {new Date(evt.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span style={{ flex: 1 }}>{evt.type.replace(/_/g, ' ')}</span>
                <span className="badge badge-gray" style={{ fontSize: 10 }}>{evt.protocol.toUpperCase()}</span>
                {evt.targetPort && <span className="text-muted" style={{ fontSize: 11, fontFamily: 'monospace' }}>:{evt.targetPort}</span>}
              </div>
            ))}
            {recentEvents.length === 0 && <div className="empty-state">トラフィックなし</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
