import { NavLink } from 'react-router-dom'
import { useLabStore } from '../../store/labStore'

const NAV = [
  { to: '/dashboard',      icon: '⊞', label: 'ダッシュボード' },
  { to: '/network-map',    icon: '◉', label: 'ネットワークマップ' },
  { to: '/attack-console', icon: '▶', label: '攻撃コンソール' },
  { to: '/traffic-log',    icon: '≡', label: '通信ログ' },
  { to: '/defense',        icon: '⛨', label: '防御操作' },
  { to: '/scenarios',      icon: '◈', label: 'シナリオ' },
  { to: '/results',        icon: '✦', label: '結果画面' },
]

export function Sidebar() {
  const { isConnected, session } = useLabStore()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-title">⬡ HACK LAB</div>
        <div className="sidebar-logo-sub">疑似攻撃・防御ラボ</div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Navigation</div>
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{icon}</span>
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="connection-status">
          <span className={`conn-dot${isConnected ? ' connected' : ''}`} />
          <span>{isConnected ? 'WS 接続中' : 'オフライン'}</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {session?.status === 'running' ? (
            <span style={{ color: 'var(--defense-green)' }}>● SESSION ACTIVE</span>
          ) : (
            <span>○ NO SESSION</span>
          )}
        </div>
      </div>
    </aside>
  )
}
