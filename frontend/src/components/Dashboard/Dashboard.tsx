import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLabStore } from '../../store/labStore'
import { useScenarioStore } from '../../store/scenarioStore'
import type { Alert } from '../../types/lab'

function elapsed(startedAt: string | undefined) {
  if (!startedAt) return 0
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
}
function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`
}
function fmtTs(ts: string) {
  return new Date(ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function Dashboard() {
  const navigate = useNavigate()
  const { session, events, alerts, defenseActions, updateSessionStatus } = useLabStore()
  const { scenarios } = useScenarioStore()
  const [tick, setTick] = useState(0)

  const scenario = scenarios.find(s => s.id === session?.scenarioId)
  const unacknowledged = alerts.filter(a => !a.acknowledged)
  const recentEvents = [...events]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 7)
  const appliedDefense = defenseActions.filter(d => d.status === 'applied').length
  const completedObj = scenario?.objectives.filter(o => o.completed).length ?? 0
  const totalObj = scenario?.objectives.length ?? 1
  const score = Math.round((completedObj / totalObj) * 100)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const sec = elapsed(session?.startedAt) + tick * 0

  return (
    <div className="page fade-in">
      {/* Session Header */}
      <div className="card session-header">
        <div className="session-info">
          <div className="session-field">
            <span className="session-field-label">シナリオ</span>
            <span className="session-field-value" style={{ color: 'var(--accent-cyan)' }}>
              {scenario?.name ?? '未選択'}
            </span>
          </div>
          <div className="session-field">
            <span className="session-field-label">ステータス</span>
            <span className={`status-badge status-${session?.status ?? 'idle'}`}>
              {session?.status === 'running' ? '実行中'
                : session?.status === 'paused' ? '一時停止'
                : session?.status === 'completed' ? '完了'
                : '待機中'}
            </span>
          </div>
          <div className="session-field">
            <span className="session-field-label">経過時間</span>
            <span className="session-timer mono">{fmtTime(elapsed(session?.startedAt))}</span>
          </div>
          <div className="session-field">
            <span className="session-field-label">難易度</span>
            <span className={`difficulty-badge ${scenario?.difficulty ?? ''}`}>
              {scenario?.difficulty ?? '—'}
            </span>
          </div>
        </div>
        <div className="session-actions">
          {session?.status === 'running' ? (
            <button className="btn btn-outline" onClick={() => updateSessionStatus('paused')}>
              ⏸ 一時停止
            </button>
          ) : (
            <button className="btn btn-success" onClick={() => updateSessionStatus('running')}>
              ▶ 再開
            </button>
          )}
          <button className="btn btn-primary" onClick={() => navigate('/attack-console')}>
            攻撃コンソール →
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="kpi-grid">
        <div className="kpi-card" onClick={() => navigate('/traffic-log')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon">⚡</div>
          <div className="kpi-value" style={{ color: 'var(--accent-cyan)' }}>{events.length}</div>
          <div className="kpi-label">総イベント数</div>
        </div>
        <div
          className={`kpi-card${unacknowledged.length > 0 ? ' alert-active' : ''}`}
          onClick={() => navigate('/traffic-log')}
          style={{ cursor: 'pointer' }}
        >
          <div className="kpi-icon">🔔</div>
          <div className="kpi-value" style={{ color: unacknowledged.length > 0 ? 'var(--sev-critical)' : undefined }}>
            {unacknowledged.length}
            <span className="kpi-sub"> / {alerts.length}</span>
          </div>
          <div className="kpi-label">未対応アラート</div>
        </div>
        <div className="kpi-card" onClick={() => navigate('/defense')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon">🛡</div>
          <div className="kpi-value" style={{ color: 'var(--defense-green)' }}>{appliedDefense}</div>
          <div className="kpi-label">防御ルール適用済</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">📊</div>
          <div className="kpi-value">
            {score}
            <span className="kpi-sub"> / 100</span>
          </div>
          <div className="kpi-label">目標達成スコア</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${score}%` }} />
          </div>
        </div>
      </div>

      {/* Main panels */}
      <div className="dashboard-grid">
        {/* Recent Events */}
        <div className="card">
          <div className="card-header">
            <h3>最近のイベント</h3>
            <button className="btn-link" onClick={() => navigate('/traffic-log')}>すべて表示 →</button>
          </div>
          <div className="event-list">
            {recentEvents.map(evt => (
              <div key={evt.id} className={`event-row row-${evt.severity}`}>
                <span className={`severity-dot ${evt.severity}`} />
                <span className="event-time">{fmtTs(evt.timestamp)}</span>
                <span className="event-type">{evt.type.replace(/_/g, ' ')}</span>
                <span className="badge badge-gray" style={{ fontSize: 10 }}>{evt.protocol}</span>
                {evt.targetPort && <span className="event-port">:{evt.targetPort}</span>}
              </div>
            ))}
            {recentEvents.length === 0 && <div className="empty-state">イベントなし</div>}
          </div>
        </div>

        {/* Active Alerts */}
        <div className="card">
          <div className="card-header">
            <h3>アクティブアラート</h3>
            {unacknowledged.length > 0 && (
              <span className="badge badge-danger">{unacknowledged.length}</span>
            )}
          </div>
          <div className="alert-list">
            {unacknowledged.slice(0, 4).map(a => (
              <AlertCard key={a.id} alert={a} />
            ))}
            {unacknowledged.length === 0 && (
              <div className="empty-state ok">✓ すべてのアラートが対応済みです</div>
            )}
          </div>
          {unacknowledged.length > 0 && (
            <div className="card-footer">
              <button className="btn btn-outline" onClick={() => navigate('/traffic-log')}>
                アラート一覧を表示
              </button>
            </div>
          )}
        </div>

        {/* Objectives */}
        <div className="card">
          <div className="card-header">
            <h3>シナリオ目標 ({completedObj}/{totalObj})</h3>
            <div className="progress-bar" style={{ width: 80 }}>
              <div className="progress-fill" style={{ width: `${score}%` }} />
            </div>
          </div>
          <div className="objective-list">
            {scenario?.objectives.map(obj => (
              <div key={obj.id} className={`objective-item${obj.completed ? ' done' : ''}`}>
                <span className="obj-check">{obj.completed ? '✓' : '○'}</span>
                <span className="obj-text">{obj.description}</span>
              </div>
            ))}
            {!scenario && <div className="empty-state">シナリオを選択してください</div>}
          </div>
          <div className="card-footer" style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => navigate('/scenarios')}>
              シナリオ変更
            </button>
            <button className="btn btn-success" onClick={() => navigate('/results')}>
              結果を見る →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AlertCard({ alert }: { alert: Alert }) {
  const { acknowledgeAlert } = useLabStore()
  return (
    <div className="alert-item">
      <div className="alert-item-header">
        <span className={`severity-badge ${alert.severity}`}>{alert.severity}</span>
        <span className="text-xs text-muted mono">
          {new Date(alert.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="alert-item-msg">{alert.message}</div>
      <button className="btn btn-xs btn-outline" onClick={() => acknowledgeAlert(alert.id)}>
        ✓ 対応済みにする
      </button>
    </div>
  )
}
