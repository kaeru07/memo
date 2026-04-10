import { useState, useMemo } from 'react'
import { useLabStore } from '../../store/labStore'
import type { Severity } from '../../types/lab'

type Filter = 'all' | Severity

const FILTER_TABS: { key: Filter; label: string }[] = [
  { key: 'all',      label: 'すべて' },
  { key: 'critical', label: 'Critical' },
  { key: 'high',     label: 'High' },
  { key: 'medium',   label: 'Medium' },
  { key: 'low',      label: 'Low' },
  { key: 'info',     label: 'Info' },
]

function fmtTs(ts: string) {
  return new Date(ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function TrafficLog() {
  const { events, alerts, acknowledgeAlert, nodes } = useLabStore()
  const [filter, setFilter]   = useState<Filter>('all')
  const [search, setSearch]   = useState('')
  const [tab, setTab]         = useState<'events' | 'alerts'>('events')

  const sortedEvents = useMemo(() =>
    [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [events]
  )

  const filteredEvents = useMemo(() => {
    return sortedEvents.filter(evt => {
      if (filter !== 'all' && evt.severity !== filter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          evt.type.includes(q) ||
          evt.protocol.includes(q) ||
          (evt.payload ?? '').toLowerCase().includes(q) ||
          evt.tags.some(t => t.includes(q))
        )
      }
      return true
    })
  }, [sortedEvents, filter, search])

  const sortedAlerts = useMemo(() =>
    [...alerts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [alerts]
  )

  const filteredAlerts = useMemo(() => {
    return sortedAlerts.filter(a => {
      if (filter !== 'all' && a.severity !== filter) return false
      if (search) return a.message.toLowerCase().includes(search.toLowerCase())
      return true
    })
  }, [sortedAlerts, filter, search])

  const unackCount = alerts.filter(a => !a.acknowledged).length

  return (
    <div className="traffic-log-page fade-in">
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
        {[
          { key: 'events', label: `イベント (${events.length})` },
          { key: 'alerts', label: `アラート (${unackCount} 未対応)` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'events' | 'alerts')}
            style={{
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === t.key ? 'var(--accent-cyan)' : 'transparent'}`,
              color: tab === t.key ? 'var(--accent-cyan)' : 'var(--text-muted)',
              fontWeight: tab === t.key ? 700 : 400,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="traffic-toolbar">
        <div className="filter-tabs">
          {FILTER_TABS.map(({ key, label }) => {
            const count = tab === 'events'
              ? (key === 'all' ? events.length : events.filter(e => e.severity === key).length)
              : (key === 'all' ? alerts.length : alerts.filter(a => a.severity === key).length)
            return (
              <button
                key={key}
                className={`filter-tab ${key}${filter === key ? ' active' : ''}`}
                onClick={() => setFilter(key)}
              >
                {label} {count > 0 && <span style={{ marginLeft: 3, opacity: 0.7 }}>({count})</span>}
              </button>
            )
          })}
        </div>

        <div className="search-input-wrap">
          <span className="search-icon">🔎</span>
          <input
            className="input"
            placeholder="検索 (type, protocol, payload...)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="traffic-stats">
          {tab === 'events' ? (
            <>表示: <strong>{filteredEvents.length}</strong> / {events.length} イベント</>
          ) : (
            <>表示: <strong>{filteredAlerts.length}</strong> / {alerts.length} アラート</>
          )}
        </div>
      </div>

      {/* Table */}
      {tab === 'events' ? (
        <div className="log-table-wrap">
          <table className="log-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>時刻</th>
                <th style={{ width: 110 }}>タイプ</th>
                <th style={{ width: 70 }}>プロトコル</th>
                <th style={{ width: 80 }}>送信元IP</th>
                <th style={{ width: 80 }}>宛先IP</th>
                <th style={{ width: 60 }}>ポート</th>
                <th style={{ width: 90 }}>重要度</th>
                <th>ペイロード / タグ</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map(evt => (
                <tr key={evt.id} className={`row-${evt.severity}`}>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtTs(evt.timestamp)}</td>
                  <td style={{ fontWeight: 500 }}>{evt.type.replace(/_/g, ' ')}</td>
                  <td><span className="badge badge-gray" style={{ fontSize: 10 }}>{evt.protocol.toUpperCase()}</span></td>
                  <td className="mono" style={{ fontSize: 11 }}>{nodes[evt.sourceNodeId]?.ip ?? evt.sourceNodeId}</td>
                  <td className="mono" style={{ fontSize: 11 }}>{nodes[evt.targetNodeId]?.ip ?? evt.targetNodeId}</td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {evt.targetPort ?? '—'}
                  </td>
                  <td><span className={`severity-badge ${evt.severity}`}>{evt.severity}</span></td>
                  <td className="payload-cell">
                    {evt.payload
                      ? <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{evt.payload}</span>
                      : evt.tags.map(tag => (
                        <span key={tag} className="badge badge-gray" style={{ marginRight: 4, fontSize: 10 }}>{tag}</span>
                      ))}
                  </td>
                </tr>
              ))}
              {filteredEvents.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>該当するイベントがありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="log-table-wrap">
          <table className="log-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>時刻</th>
                <th style={{ width: 120 }}>タイプ</th>
                <th style={{ width: 90 }}>重要度</th>
                <th>メッセージ</th>
                <th style={{ width: 100 }}>ステータス</th>
                <th style={{ width: 100 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map(alert => (
                <tr key={alert.id} className={`row-${alert.severity}`}>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtTs(alert.timestamp)}</td>
                  <td style={{ fontSize: 12 }}>{alert.type.replace(/_/g, ' ')}</td>
                  <td><span className={`severity-badge ${alert.severity}`}>{alert.severity}</span></td>
                  <td style={{ fontSize: 12, lineHeight: 1.4 }}>{alert.message}</td>
                  <td>
                    {alert.acknowledged ? (
                      <span className="badge badge-gray">対応済み</span>
                    ) : (
                      <span className="badge badge-red">未対応</span>
                    )}
                  </td>
                  <td>
                    {!alert.acknowledged && (
                      <button className="btn btn-xs btn-outline" onClick={() => acknowledgeAlert(alert.id)}>
                        ✓ 対応済み
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredAlerts.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  {filter === 'all' && !search ? '✓ アラートなし' : '該当するアラートがありません'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
