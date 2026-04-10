import { useState } from 'react'
import { useLabStore } from '../../store/labStore'
import { generateDefenseEvent } from '../../engine/defenseEngine'
import { useScenarioProgress } from '../../hooks/useScenarioProgress'
import type { DefenseActionType } from '../../types/lab'

interface ActionDef {
  type: DefenseActionType
  icon: string
  label: string
  desc: string
  fields: { key: string; label: string; placeholder: string; defaultValue: string }[]
}

const ACTIONS: ActionDef[] = [
  {
    type: 'block_ip', icon: '🚫', label: 'IP ブロック',
    desc: '指定IPからの全通信をiptablesでDROP',
    fields: [
      { key: 'ip',     label: 'ブロックするIP', placeholder: '10.0.0.2', defaultValue: '10.0.0.2' },
      { key: 'reason', label: '理由',           placeholder: '理由を入力', defaultValue: 'Suspicious activity' },
    ],
  },
  {
    type: 'block_port', icon: '🔒', label: 'ポート閉鎖',
    desc: '指定ポートへの外部アクセスをブロック',
    fields: [
      { key: 'port',     label: 'ポート番号', placeholder: '22', defaultValue: '22' },
      { key: 'protocol', label: 'プロトコル', placeholder: 'tcp', defaultValue: 'tcp' },
    ],
  },
  {
    type: 'rate_limit', icon: '🐌', label: 'レート制限',
    desc: 'IPあたりのリクエスト数を制限',
    fields: [
      { key: 'ip',    label: 'ターゲットIP', placeholder: '10.0.0.2', defaultValue: '10.0.0.2' },
      { key: 'limit', label: '上限',         placeholder: '10req/min', defaultValue: '10req/min' },
    ],
  },
  {
    type: 'firewall_rule', icon: '🛡', label: 'ファイアウォールルール',
    desc: 'カスタムiptablesルールを追加',
    fields: [
      { key: 'rule', label: 'ルール', placeholder: '-A INPUT -s 10.0.0.2 -j DROP', defaultValue: '-A INPUT -s 10.0.0.2 -p tcp --dport 22 -j DROP' },
    ],
  },
  {
    type: 'isolate_node', icon: '🏝', label: 'ノード隔離',
    desc: '指定ノードをネットワークから完全に隔離',
    fields: [
      { key: 'reason', label: '理由', placeholder: '隔離理由', defaultValue: 'Compromised detected' },
    ],
  },
  {
    type: 'honeypot_deploy', icon: '🍯', label: 'ハニーポット展開',
    desc: '攻撃者を誘き寄せるハニーポットを展開',
    fields: [
      { key: 'port',    label: '待受ポート',    placeholder: '2222', defaultValue: '2222' },
      { key: 'service', label: 'サービス種別', placeholder: 'ssh', defaultValue: 'ssh' },
    ],
  },
]

function fmtTs(ts: string) {
  return new Date(ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

const STATUS_LABELS: Record<string, string> = {
  applied:  '適用済み',
  pending:  '適用中',
  failed:   '失敗',
  reverted: '取消済み',
}

export function Defense() {
  const { nodes, session, defenseActions, addDefenseAction, addEvent, updateDefenseAction } = useLabStore()
  const { checkProgress } = useScenarioProgress()
  const [selectedAction, setSelectedAction] = useState<ActionDef | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [applying, setApplying] = useState(false)
  const [success, setSuccess] = useState(false)

  const nodeList = Object.values(nodes)
  const vps = nodeList.find(n => n.role === 'defender')
  const iphone = nodeList.find(n => n.role === 'attacker')

  function openAction(action: ActionDef) {
    setSelectedAction(action)
    setFormValues(Object.fromEntries(action.fields.map(f => [f.key, f.defaultValue])))
    setSuccess(false)
  }

  async function apply() {
    if (!selectedAction || !session || !vps) return
    setApplying(true)
    await new Promise(r => setTimeout(r, 900))

    const target = selectedAction.type === 'block_ip' || selectedAction.type === 'rate_limit'
      ? (iphone?.id ?? vps.id)
      : vps.id

    const effectMap: Record<DefenseActionType, string> = {
      block_ip:       `${formValues.ip ?? '?'} からの全通信をブロック (iptables DROP)`,
      block_port:     `ポート ${formValues.port ?? '?'}/${formValues.protocol ?? 'tcp'} を閉鎖`,
      rate_limit:     `${formValues.ip ?? '?'} を ${formValues.limit ?? '?'} に制限`,
      firewall_rule:  `ルール追加: ${formValues.rule ?? '?'}`,
      isolate_node:   `ノードをネットワークから隔離`,
      honeypot_deploy:`ハニーポット展開: port ${formValues.port ?? '?'} / ${formValues.service ?? 'ssh'}`,
      custom:         `カスタムアクション`,
    }

    const action = {
      id:          `def-live-${Date.now()}`,
      sessionId:   session.id,
      timestamp:   new Date().toISOString(),
      type:        selectedAction.type,
      targetNodeId: target,
      params:      { ...formValues },
      status:      'applied' as const,
      appliedAt:   new Date().toISOString(),
      effect:      effectMap[selectedAction.type],
      metadata:    {},
    }

    // ── DefenseAction を store に追加 ──
    addDefenseAction(action)

    // ── 防御イベントを通信ログに記録 ──
    addEvent(generateDefenseEvent(action))

    // ── シナリオ進行チェック ──
    checkProgress()

    setApplying(false)
    setSuccess(true)
    setTimeout(() => { setSuccess(false); setSelectedAction(null) }, 2000)
  }

  function revert(id: string) {
    updateDefenseAction(id, { status: 'reverted', revertedAt: new Date().toISOString() })
  }

  const activeRules = defenseActions.filter(d => d.status === 'applied')
  const allRules    = [...defenseActions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="page fade-in">
      {/* Node Status bar */}
      <div style={{ display: 'flex', gap: 12 }}>
        {nodeList.map(node => (
          <div key={node.id} className="card" style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>{node.role === 'attacker' ? '📱' : '🖥'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{node.label}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{node.ip}</div>
            </div>
            <span className={`status-badge status-${node.status === 'online' ? 'running' : node.status === 'protected' ? 'completed' : 'idle'}`}>
              {node.status}
            </span>
          </div>
        ))}
      </div>

      <div className="defense-layout">
        {/* Left: quick actions + form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick Actions */}
          <div className="card">
            <div className="card-header"><h3>防御アクション</h3></div>
            <div className="defense-actions-grid">
              {ACTIONS.map(action => (
                <button
                  key={action.type}
                  className={`defense-action-btn${selectedAction?.type === action.type ? ' active' : ''}`}
                  onClick={() => openAction(action)}
                >
                  <span className="defense-action-icon">{action.icon}</span>
                  <span className="defense-action-label">{action.label}</span>
                  <span className="defense-action-desc">{action.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          {selectedAction && (
            <div className="card slide-in">
              <div className="card-header">
                <h3>{selectedAction.icon} {selectedAction.label}</h3>
                <button className="btn-icon" onClick={() => setSelectedAction(null)}>✕</button>
              </div>
              <div className="defense-form">
                {selectedAction.fields.map(field => (
                  <div key={field.key} className="form-group">
                    <label className="form-label">{field.label}</label>
                    <input
                      className="input"
                      placeholder={field.placeholder}
                      value={formValues[field.key] ?? ''}
                      onChange={e => setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className="card-footer" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {success ? (
                  <span style={{ color: 'var(--defense-green)', fontWeight: 600 }}>
                    ✓ 適用しました
                  </span>
                ) : (
                  <button
                    className={`btn btn-success${applying ? ' loading' : ''}`}
                    onClick={apply}
                    disabled={applying}
                  >
                    {applying ? <><span className="spinner" /> 適用中...</> : '⚡ 適用する'}
                  </button>
                )}
                <button className="btn btn-outline" onClick={() => setSelectedAction(null)}>キャンセル</button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Applied Rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <h3>適用済みルール</h3>
              <span className="badge badge-green">{activeRules.length} 件</span>
            </div>
            <div className="applied-rules">
              {allRules.map(rule => (
                <div key={rule.id} className="rule-item">
                  <span className={`rule-status-dot ${rule.status}`} />
                  <div className="rule-info">
                    <div className="rule-type">
                      {ACTIONS.find(a => a.type === rule.type)?.icon ?? '⚙'}{' '}
                      {ACTIONS.find(a => a.type === rule.type)?.label ?? rule.type}
                    </div>
                    <div className="rule-effect mono">{rule.effect}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span className="rule-time">{fmtTs(rule.timestamp)}</span>
                    <span className="badge badge-gray">{STATUS_LABELS[rule.status] ?? rule.status}</span>
                    {rule.status === 'applied' && (
                      <button className="btn btn-xs btn-outline" style={{ color: 'var(--attack-red)', borderColor: 'rgba(255,59,92,0.3)' }} onClick={() => revert(rule.id)}>
                        取消
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {allRules.length === 0 && (
                <div className="empty-state">防御ルールがまだ適用されていません</div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="card">
            <div className="card-header"><h3>防御サマリー</h3></div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: '適用中ルール',   value: activeRules.length,                                      color: 'var(--defense-green)' },
                { label: 'IP ブロック',    value: activeRules.filter(r => r.type === 'block_ip').length,   color: 'var(--accent-cyan)' },
                { label: 'ポート閉鎖',    value: activeRules.filter(r => r.type === 'block_port').length, color: 'var(--accent-cyan)' },
                { label: 'レート制限',    value: activeRules.filter(r => r.type === 'rate_limit').length, color: 'var(--warning-orange)' },
                { label: '取消済みルール', value: defenseActions.filter(r => r.status === 'reverted').length, color: 'var(--text-muted)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
