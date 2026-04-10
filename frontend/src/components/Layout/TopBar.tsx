import { useNavigate, useLocation } from 'react-router-dom'
import { useLabStore } from '../../store/labStore'
import { useScenarioStore } from '../../store/scenarioStore'

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard':       'ダッシュボード',
  '/network-map':     'ネットワークマップ',
  '/attack-console':  '攻撃コンソール',
  '/traffic-log':     '通信ログ',
  '/defense':         '防御操作',
  '/scenarios':       'シナリオ',
  '/results':         '結果画面',
}

export function TopBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { alerts, session } = useLabStore()
  const { scenarios } = useScenarioStore()

  const unread = alerts.filter(a => !a.acknowledged).length
  const scenario = scenarios.find(s => s.id === session?.scenarioId)

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>HACK LAB</span>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {ROUTE_LABELS[pathname] ?? '—'}
        </span>
      </div>

      <div className="topbar-right">
        {scenario && (
          <div className="topbar-session-badge">
            <span style={{ color: 'var(--text-muted)' }}>シナリオ:</span>
            <span style={{ color: 'var(--accent-cyan)' }}>{scenario.name}</span>
            <span className={`status-badge status-${session?.status ?? 'idle'}`} style={{ marginLeft: 4 }}>
              {session?.status === 'running' ? '実行中' : session?.status ?? '—'}
            </span>
          </div>
        )}

        <button
          className="alert-bell"
          title={`未対応アラート: ${unread}件`}
          onClick={() => navigate('/traffic-log')}
        >
          🔔
          {unread > 0 && <span className="alert-bell-count">{unread}</span>}
        </button>
      </div>
    </header>
  )
}
