import { useNavigate } from 'react-router-dom'
import { useLabStore } from '../../store/labStore'
import { useScenarioStore } from '../../store/scenarioStore'
import { SCENARIO_CONDITIONS } from '../../engine/scenarioEngine'

function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}時間${m % 60}分`
  return `${m}分${s % 60}秒`
}

export function Results() {
  const navigate = useNavigate()
  const { session, events, alerts, defenseActions } = useLabStore()
  const { scenarios } = useScenarioStore()

  const scenario       = scenarios.find(s => s.id === session?.scenarioId)
  const completedObj   = scenario?.objectives.filter(o => o.completed).length ?? 0
  const totalObj       = scenario?.objectives.length ?? 1
  const objScore       = Math.round((completedObj / totalObj) * 100)

  // 攻撃スコア: 手動実行イベント数・severity 比率から算出
  const manualEvents   = events.filter(e => e.metadata?.manual === true)
  const criticalEvents = events.filter(e => e.severity === 'critical' || e.severity === 'high').length
  const attackScore    = Math.min(100, Math.round(
    (manualEvents.length / Math.max(events.length, 1)) * 60 +
    (criticalEvents / Math.max(events.length, 1)) * 40
  ))

  // 防御スコア: アラート対応率 + 防御ルール適用率
  const ackedAlerts  = alerts.filter(a => a.acknowledged).length
  const appliedDef   = defenseActions.filter(d => d.status === 'applied').length
  const defenseScore = Math.min(100, Math.round(
    (ackedAlerts / Math.max(alerts.length, 1))         * 50 +
    (appliedDef  / Math.max(defenseActions.length, 1)) * 50
  ))

  const totalScore   = Math.round(objScore * 0.4 + defenseScore * 0.6)

  // シナリオ完了判定
  const isCompleted  = session?.status === 'completed'

  // シナリオ条件の詳細（チェック結果付き）
  const scenarioConditions = session?.scenarioId
    ? (SCENARIO_CONDITIONS[session.scenarioId] ?? []).map(cond => ({
        ...cond,
        passed: cond.check(events, alerts, defenseActions),
      }))
    : []

  const elapsedMs = session?.startedAt
    ? Date.now() - new Date(session.startedAt).getTime()
    : 0

  // Timeline data for SVG chart
  const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  const startMs = sortedEvents[0] ? new Date(sortedEvents[0].timestamp).getTime() : Date.now() - 60000
  const endMs   = sortedEvents.slice(-1)[0] ? new Date(sortedEvents.slice(-1)[0].timestamp).getTime() : Date.now()
  const span    = Math.max(endMs - startMs, 1)

  const SEV_COLORS: Record<string, string> = {
    critical: '#ff1744', high: '#ff5722', medium: '#ffa726', low: '#ffee58', info: '#40c4ff',
  }

  const GRADE = totalScore >= 90 ? 'S' : totalScore >= 75 ? 'A' : totalScore >= 60 ? 'B' : totalScore >= 40 ? 'C' : 'D'
  const GRADE_COLOR = totalScore >= 90 ? '#00e676' : totalScore >= 75 ? '#00d4ff' : totalScore >= 60 ? '#ffa726' : totalScore >= 40 ? '#ff5722' : '#ff1744'

  return (
    <div className="page fade-in results-page">
      {/* Hero score */}
      <div className="results-hero card">
        {/* シナリオ結果バッジ */}
        <div style={{ marginBottom: 12 }}>
          {isCompleted ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 18px', borderRadius: 20,
              background: 'rgba(0,230,118,0.15)', border: '1px solid rgba(0,230,118,0.4)',
              color: 'var(--defense-green)', fontWeight: 700, fontSize: 14,
            }}>
              🎉 シナリオ完了
            </span>
          ) : (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 18px', borderRadius: 20,
              background: 'rgba(255,145,0,0.15)', border: '1px solid rgba(255,145,0,0.4)',
              color: 'var(--warning-orange)', fontWeight: 700, fontSize: 14,
            }}>
              ⏳ 進行中 — 未達成の目標があります
            </span>
          )}
        </div>

        <div className="results-score-label">総合スコア</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 16, marginTop: 12 }}>
          <div className="results-score-big">{totalScore}</div>
          <div style={{ fontSize: 28, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 8 }}>/100</div>
          <div style={{
            fontSize: 56, fontWeight: 900, fontFamily: 'monospace',
            color: GRADE_COLOR, textShadow: `0 0 20px ${GRADE_COLOR}`,
            marginBottom: 4,
          }}>{GRADE}</div>
        </div>
        <div className="results-scenario-name">{scenario?.name ?? '—'}</div>
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          経過時間: {fmtTime(elapsedMs)} &nbsp;|&nbsp;
          攻撃実行: {manualEvents.length}件 &nbsp;|&nbsp;
          アラート: {alerts.length}件 &nbsp;|&nbsp;
          防御: {appliedDef}件
        </div>
      </div>

      <div className="results-grid">
        {/* Score breakdown */}
        <div className="card">
          <div className="card-header"><h3>スコア内訳</h3></div>
          <div className="score-breakdown">
            <div className="score-item">
              <div className="score-item-header">
                <span className="score-item-label" style={{ color: 'var(--attack-red)' }}>⚡ 攻撃スコア</span>
                <span className="score-item-value" style={{ color: 'var(--attack-red)' }}>{attackScore}</span>
              </div>
              <div className="progress-bar" style={{ height: 8 }}>
                <div className="progress-fill red" style={{ width: `${attackScore}%` }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                実行した攻撃の多様性と成功度から算出
              </span>
            </div>

            <div className="score-item">
              <div className="score-item-header">
                <span className="score-item-label" style={{ color: 'var(--defense-green)' }}>🛡 防御スコア</span>
                <span className="score-item-value" style={{ color: 'var(--defense-green)' }}>{defenseScore}</span>
              </div>
              <div className="progress-bar" style={{ height: 8 }}>
                <div className="progress-fill green" style={{ width: `${defenseScore}%` }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                アラート対応率・防御ルール適用率から算出
              </span>
            </div>

            <div className="score-item">
              <div className="score-item-header">
                <span className="score-item-label" style={{ color: 'var(--accent-cyan)' }}>🎯 目標達成</span>
                <span className="score-item-value" style={{ color: 'var(--accent-cyan)' }}>{objScore}</span>
              </div>
              <div className="progress-bar" style={{ height: 8 }}>
                <div className="progress-fill" style={{ width: `${objScore}%` }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {completedObj} / {totalObj} 目標達成
              </span>
            </div>

            <hr className="divider" />

            {/* Stats table */}
            {[
              ['総イベント数',            events.length],
              ['手動実行攻撃数',          manualEvents.length],
              ['Critical/High イベント',  criticalEvents],
              ['アラート総数',            alerts.length],
              ['対応済みアラート',         ackedAlerts],
              ['適用した防御ルール',       appliedDef],
              ['シナリオ結果',            isCompleted ? '✓ 完了' : '⏳ 進行中'],
              ['経過時間',               `${Math.floor(elapsedMs / 60000)}分`],
            ].map(([label, val]) => (
              <div key={label as string} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '5px 0', borderBottom: '1px solid var(--border)',
                fontSize: 13,
              }}>
                <span style={{ color: 'var(--text-muted)' }}>{label as string}</span>
                <strong style={{ fontFamily: 'monospace' }}>{val}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline + Objectives */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* SVG Timeline */}
          <div className="card">
            <div className="card-header"><h3>イベントタイムライン</h3></div>
            <div className="results-timeline">
              <svg viewBox="0 0 600 100" className="timeline-svg">
                {/* axis */}
                <line x1="0" y1="70" x2="600" y2="70" stroke="var(--border)" strokeWidth="1" />
                {/* events */}
                {sortedEvents.map((evt, i) => {
                  const x = Math.round(((new Date(evt.timestamp).getTime() - startMs) / span) * 580) + 10
                  const y = 70 - (evt.severity === 'critical' ? 40 : evt.severity === 'high' ? 30 : evt.severity === 'medium' ? 20 : evt.severity === 'low' ? 12 : 6)
                  return (
                    <g key={i}>
                      <line x1={x} y1={70} x2={x} y2={y} stroke={SEV_COLORS[evt.severity]} strokeWidth="1.5" opacity="0.6" />
                      <circle cx={x} cy={y} r="3" fill={SEV_COLORS[evt.severity]} opacity="0.9" />
                    </g>
                  )
                })}
                {/* Legend */}
                {Object.entries(SEV_COLORS).map(([sev, color], i) => (
                  <g key={sev} transform={`translate(${i * 100 + 20}, 92)`}>
                    <circle cx="0" cy="0" r="4" fill={color} />
                    <text x="8" y="4" fill="var(--text-muted)" fontSize="9" fontFamily="monospace">{sev}</text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Objectives result */}
          <div className="card">
            <div className="card-header">
              <h3>目標達成状況</h3>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{completedObj}/{totalObj}</span>
            </div>
            <div className="objective-list">
              {scenario?.objectives.map((obj) => {
                const cond = scenarioConditions.find(c => c.objectiveId === obj.id)
                return (
                  <div key={obj.id} className={`objective-item${obj.completed ? ' done' : ''}`}>
                    <span className="obj-check" style={{ color: obj.completed ? 'var(--defense-green)' : 'var(--attack-red)' }}>
                      {obj.completed ? '✓' : '✗'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div className="obj-text">{obj.description}</div>
                      {cond && !obj.completed && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          条件: {cond.label}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Improvement hints */}
          {defenseScore < 80 && (
            <div className="card" style={{ border: '1px solid rgba(255,145,0,0.3)' }}>
              <div className="card-header">
                <h3 style={{ color: 'var(--warning-orange)' }}>💡 改善ポイント</h3>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ackedAlerts < alerts.length && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    → 未対応アラートが {alerts.length - ackedAlerts}件 残っています。アラートには早期対応しましょう。
                  </div>
                )}
                {appliedDef < 2 && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    → 防御ルールがまだ少ないです。IP ブロックやレート制限を積極的に活用しましょう。
                  </div>
                )}
                {completedObj < totalObj && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    → 未達成の目標が {totalObj - completedObj}件 あります。ヒントを参考に再挑戦してみましょう。
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="results-actions">
        <button className="btn btn-outline btn-lg" onClick={() => navigate('/scenarios')}>
          ◈ 別のシナリオへ
        </button>
        <button className="btn btn-outline btn-lg" onClick={() => navigate('/traffic-log')}>
          ≡ ログを振り返る
        </button>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/attack-console')}>
          ▶ もう一度挑戦
        </button>
      </div>
    </div>
  )
}
