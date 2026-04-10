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
  const [, forceRender] = useState(0)

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
    const id = setInterval(() => forceRender(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

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

        {/* Next Action Hint */}
        {session?.scenarioId && (
          <NextActionHint
            scenarioId={session.scenarioId}
            completedObj={completedObj}
            unackCount={unacknowledged.length}
            appliedDefense={appliedDefense}
            onNavigate={navigate}
          />
        )}
      </div>
    </div>
  )
}

interface HintStep { step: number; hint: string; action: string; actionPath: string }

function resolveHint(
  scenarioId: string,
  completedObj: number,
  unackCount: number,
  appliedDefense: number,
): HintStep | null {
  const done = (s: number, h: string, a: string, p: string): HintStep => ({ step: s, hint: h, action: a, actionPath: p })

  switch (scenarioId) {

    case 'scenario-01':
      if (completedObj === 0)
        return done(1, '攻撃コンソールで「Port Scan」を選択して Execute を押してください。', '攻撃コンソールへ', '/attack-console')
      if (unackCount > 0 && completedObj < 3)
        return done(2, '通信ログ → アラートタブでポートスキャン検知アラートを「✓ 対応済み」にしてください。', 'アラートを確認', '/traffic-log')
      if (appliedDefense === 0 && completedObj < 3)
        return done(3, '防御ページで「IP ブロック」を選択し、攻撃元 10.0.0.2 をブロックしてください。', '防御ページへ', '/defense')
      if (completedObj === 3)
        return done(4, '攻撃コンソールで再度 Port Scan を実行して、遮断されていることを確認してください。', '攻撃コンソールへ', '/attack-console')
      if (completedObj >= 4)
        return done(5, 'すべての目標を達成しました！結果ページでスコアを確認しましょう。', '結果を見る', '/results')
      return null

    case 'scenario-02':
      if (completedObj === 0)
        return done(1, '攻撃コンソールで「SSH Brute Force」を選択し、Execute を 3 回以上繰り返してください。', '攻撃コンソールへ', '/attack-console')
      if (unackCount > 0 && completedObj < 3)
        return done(2, '通信ログ → アラートタブでブルートフォース検知アラートを「✓ 対応済み」にしてください。', 'アラートを確認', '/traffic-log')
      if (completedObj < 3)
        return done(3, '防御ページで「レート制限」または「IP ブロック」を適用してアカウントをロックしてください。', '防御ページへ', '/defense')
      if (completedObj === 3)
        return done(4, '防御ページで「ポート閉鎖」を選択し、SSH ポート 22 を閉鎖して攻撃を封鎖してください。', '防御ページへ', '/defense')
      if (completedObj >= 4)
        return done(5, 'すべての目標を達成しました！結果ページでスコアを確認しましょう。', '結果を見る', '/results')
      return null

    case 'scenario-03':
      if (completedObj === 0)
        return done(1, '攻撃コンソールで「TCP Connect」を選択し、不審なポート（例: 4444）を指定して Execute してください。マルウェアのC2通信をシミュレートします。', '攻撃コンソールへ', '/attack-console')
      if (unackCount > 0 && completedObj < 3)
        return done(2, '通信ログ → アラートタブで異常トラフィックアラートを「✓ 対応済み」にしてください。', 'アラートを確認', '/traffic-log')
      if (completedObj < 3)
        return done(3, '防御ページで「ノード隔離」を選択し、感染ノードをネットワークから完全に隔離してください。', '防御ページへ', '/defense')
      if (completedObj === 3)
        return done(4, '攻撃コンソールで再度 TCP Connect を実行し、通信が遮断されていることを確認してください。', '攻撃コンソールへ', '/attack-console')
      if (completedObj >= 4)
        return done(5, 'すべての目標を達成しました！結果ページでスコアを確認しましょう。', '結果を見る', '/results')
      return null

    case 'scenario-04':
      if (completedObj === 0)
        return done(1, '攻撃コンソールで「TCP Connect」を選択し、不審なポート（例: 8888）を指定して Execute してください。', '攻撃コンソールへ', '/attack-console')
      if (unackCount > 0 && completedObj < 3)
        return done(2, '通信ログ → アラートタブで異常アクセスアラートを「✓ 対応済み」にしてください。', 'アラートを確認', '/traffic-log')
      if (completedObj < 3)
        return done(3, '防御ページで「ファイアウォールルール」または「ポート閉鎖」を適用してポートをブロックしてください。', '防御ページへ', '/defense')
      if (completedObj === 3)
        return done(4, '攻撃コンソールで再度 TCP Connect を実行し、ファイアウォールが機能していることを確認してください。', '攻撃コンソールへ', '/attack-console')
      if (completedObj >= 4)
        return done(5, 'すべての目標を達成しました！結果ページでスコアを確認しましょう。', '結果を見る', '/results')
      return null

    default:
      return null
  }
}

function NextActionHint({
  scenarioId,
  completedObj,
  unackCount,
  appliedDefense,
  onNavigate,
}: {
  scenarioId: string
  completedObj: number
  unackCount: number
  appliedDefense: number
  onNavigate: (path: string) => void
}) {
  const hint = resolveHint(scenarioId, completedObj, unackCount, appliedDefense)
  if (!hint) return null

  const isCompleted = hint.step === 5

  return (
    <div className="card" style={{
      border: `1px solid ${isCompleted ? 'rgba(0,230,118,0.3)' : 'rgba(0,212,255,0.3)'}`,
      background: isCompleted ? 'rgba(0,230,118,0.04)' : 'rgba(0,212,255,0.04)',
    }}>
      <div className="card-header">
        <h3 style={{ color: isCompleted ? 'var(--defense-green)' : 'var(--accent-cyan)' }}>
          {isCompleted ? '🎉 完了' : `💡 次のステップ (Step ${hint.step}/4)`}
        </h3>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {hint.hint}
        </div>
        <button
          className={`btn ${isCompleted ? 'btn-success' : 'btn-outline'}`}
          style={{ whiteSpace: 'nowrap' }}
          onClick={() => onNavigate(hint.actionPath)}
        >
          {hint.action} →
        </button>
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
