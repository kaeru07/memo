import { useNavigate } from 'react-router-dom'
import { useScenarioStore } from '../../store/scenarioStore'
import { useLabStore } from '../../store/labStore'
import type { Scenario } from '../../types/lab'

const CATEGORY_LABEL: Record<string, string> = {
  reconnaissance: '偵察',
  exploitation:   '攻撃',
  persistence:    '持続化',
  defense:        '防御',
  forensics:      'フォレンジック',
}

const DIFF_ICON: Record<string, string> = {
  beginner:     '★☆☆☆',
  intermediate: '★★☆☆',
  advanced:     '★★★☆',
  expert:       '★★★★',
}

const DIFF_LABEL: Record<string, string> = {
  beginner:     '初級',
  intermediate: '中級',
  advanced:     '上級',
  expert:       '熟練',
}

export function Scenarios() {
  const navigate = useNavigate()
  const { scenarios, selectedScenario, selectScenario, clearSelection, resetScenarioObjectives } = useScenarioStore()
  const { session, setSession, resetLab, nodes } = useLabStore()

  function handleSelect(sc: Scenario) {
    if (selectedScenario?.id === sc.id) {
      clearSelection()
    } else {
      selectScenario(sc.id)
    }
  }

  function handleStart() {
    if (!selectedScenario) return

    // アクティブなセッションが別シナリオで実行中の場合は確認
    if (session?.status === 'running' && session.scenarioId !== selectedScenario.id) {
      const ok = window.confirm(
        `現在「${scenarios.find(s => s.id === session.scenarioId)?.name ?? session.scenarioId}」が実行中です。\n別のシナリオを開始すると、現在のセッションが終了します。\n続けますか？`
      )
      if (!ok) return
    }

    // ① ラボのイベント・アラート・防御アクションをリセット
    resetLab()

    // ② リセット後にノードを再登録
    const nodeList = Object.values(nodes)
    nodeList.forEach(n => useLabStore.getState().addNode(n))

    // ③ シナリオの目標をすべて未達成に戻す
    resetScenarioObjectives(selectedScenario.id)

    // ④ 新しいセッションを開始
    setSession({
      id:           `session-${Date.now()}`,
      scenarioId:   selectedScenario.id,
      status:       'running',
      startedAt:    new Date().toISOString(),
      nodes:        nodeList,
      eventIds:     [],
      alertIds:     [],
      defenseActionIds: [],
      metadata:     {},
    })

    navigate('/dashboard')
  }

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>シナリオ選択</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            学習したいシナリオを選択してセッションを開始してください
          </p>
        </div>
        {selectedScenario && (
          <button className="btn btn-primary btn-lg" onClick={handleStart}>
            ▶ セッション開始
          </button>
        )}
      </div>

      <div className="scenarios-grid">
        {scenarios.map(sc => (
          <ScenarioCard
            key={sc.id}
            scenario={sc}
            isSelected={selectedScenario?.id === sc.id}
            isCurrent={session?.scenarioId === sc.id}
            onSelect={() => handleSelect(sc)}
            onStart={() => { selectScenario(sc.id); handleStart() }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="card" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>難易度:</div>
          {(['beginner', 'intermediate', 'advanced', 'expert'] as const).map(d => (
            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={`difficulty-badge ${d}`}>{DIFF_LABEL[d]}</span>
              <span>{DIFF_ICON[d]}</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
            <div><span style={{ color: 'var(--accent-cyan)' }}>■</span> 選択中</div>
            <div><span style={{ color: 'var(--defense-green)' }}>■</span> 現在実行中</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScenarioCard({
  scenario,
  isSelected,
  isCurrent,
  onSelect,
  onStart,
}: {
  scenario: Scenario
  isSelected: boolean
  isCurrent: boolean
  onSelect: () => void
  onStart: () => void
}) {
  const completedCount = scenario.objectives.filter(o => o.completed).length
  const mins = scenario.timeLimit ? Math.floor(scenario.timeLimit / 60) : null

  return (
    <div
      className={`scenario-card${isSelected ? ' selected' : ''}`}
      onClick={onSelect}
      style={isCurrent ? { borderColor: 'var(--defense-green)' } : undefined}
    >
      <div className="scenario-card-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          <div className="scenario-card-title">{scenario.name}</div>
          {isCurrent && <span className="badge badge-green">実行中</span>}
        </div>
        <div className="scenario-card-desc">{scenario.description}</div>
      </div>

      <div className="scenario-card-meta">
        <span className={`difficulty-badge ${scenario.difficulty}`}>
          {DIFF_LABEL[scenario.difficulty] ?? scenario.difficulty}
          {' '}{DIFF_ICON[scenario.difficulty]}
        </span>
        <span className="badge badge-gray">
          {CATEGORY_LABEL[scenario.category] ?? scenario.category}
        </span>
        {mins && <span className="badge badge-gray">⏱ {mins}分</span>}
        <span className="badge badge-gray">
          🎯 {scenario.objectives.length}目標
        </span>
      </div>

      {scenario.objectives.length > 0 && (
        <div className="scenario-card-objectives">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            目標 ({completedCount}/{scenario.objectives.length})
          </div>
          {scenario.objectives.map(obj => (
            <div key={obj.id} className={`scenario-obj-item${obj.completed ? ' done' : ''}`}>
              <span className="obj-check">{obj.completed ? '✓' : '○'}</span>
              <span>{obj.description}</span>
            </div>
          ))}
          <div className="progress-bar" style={{ marginTop: 8 }}>
            <div
              className="progress-fill"
              style={{ width: `${(completedCount / scenario.objectives.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Tags */}
      <div style={{ padding: '8px 16px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {scenario.tags.map(tag => (
          <span key={tag} className="badge badge-gray" style={{ fontSize: 10 }}>{tag}</span>
        ))}
      </div>

      <div className="scenario-card-footer">
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {isSelected ? '✓ 選択済み' : 'クリックして選択'}
        </span>
        <button
          className="btn btn-primary btn-xs"
          onClick={e => { e.stopPropagation(); onStart() }}
        >
          ▶ 開始
        </button>
      </div>
    </div>
  )
}
