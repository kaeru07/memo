// ============================================================
// scenarioEngine — シナリオ成功条件定義・進行チェック
// ============================================================
import type { Event, Alert, DefenseAction } from '../types/lab'

export interface ScenarioCondition {
  objectiveId: string                   // scenarioStore の objective.id に対応
  label:       string                   // ログ用ラベル
  check: (
    events:        Event[],
    alerts:        Alert[],
    defenseActions: DefenseAction[]
  ) => boolean
}

// ── シナリオ別 成功条件 ────────────────────────────────────
//
// objectiveId は mockData.ts で定義した objective.id と一致させること
//
export const SCENARIO_CONDITIONS: Record<string, ScenarioCondition[]> = {

  // Scenario 01: ポートスキャン検知と対応
  'scenario-01': [
    {
      objectiveId: 'obj-01-1',
      label: 'port_scan イベントを発生させる',
      check: (events) =>
        events.some(e => e.type === 'port_scan'),
    },
    {
      objectiveId: 'obj-01-2',
      label: 'port_scan_detected アラートが存在する',
      check: (_, alerts) =>
        alerts.some(a => a.type === 'port_scan_detected'),
    },
    {
      objectiveId: 'obj-01-3',
      label: 'block_ip ルールが適用済み',
      check: (_, __, defenseActions) =>
        defenseActions.some(d => d.type === 'block_ip' && d.status === 'applied'),
    },
    {
      objectiveId: 'obj-01-4',
      label: 'ブロック後に追加スキャンを実行 (合計2回以上)',
      check: (events, _, defenseActions) => {
        const hasBlock = defenseActions.some(d => d.type === 'block_ip' && d.status === 'applied')
        const manualScans = events.filter(
          e => e.type === 'port_scan' && e.metadata?.manual === true
        )
        return hasBlock && manualScans.length >= 2
      },
    },
  ],

  // Scenario 02: SSH ブルートフォース攻撃
  'scenario-02': [
    {
      objectiveId: 'obj-02-1',
      label: 'ssh_attempt を 3 回以上実行',
      check: (events) =>
        events.filter(e => e.type === 'ssh_attempt').length >= 3,
    },
    {
      objectiveId: 'obj-02-2',
      label: 'brute_force_detected アラートが存在する',
      check: (_, alerts) =>
        alerts.some(a => a.type === 'brute_force_detected'),
    },
    {
      objectiveId: 'obj-02-3',
      label: 'rate_limit または block_ip が適用済み',
      check: (_, __, defenseActions) =>
        defenseActions.some(
          d => (d.type === 'rate_limit' || d.type === 'block_ip') && d.status === 'applied'
        ),
    },
    {
      objectiveId: 'obj-02-4',
      label: 'port 22 が block_port で閉鎖済み',
      check: (_, __, defenseActions) =>
        defenseActions.some(
          d => d.type === 'block_port' && String(d.params?.port) === '22' && d.status === 'applied'
        ),
    },
  ],

  // Scenario 03: 異常通信検知（マルウェアC2通信 → ノード隔離）
  'scenario-03': [
    {
      objectiveId: 'obj-03-1',
      label: '手動 tcp_connect イベントを発生させる（C2通信シミュレーション）',
      check: (events) =>
        events.some(e => e.type === 'tcp_connect' && e.metadata?.manual === true),
    },
    {
      objectiveId: 'obj-03-2',
      label: 'anomalous_traffic アラートを対応済みにする',
      check: (_, alerts) =>
        alerts.some(a => a.type === 'anomalous_traffic' && a.acknowledged === true),
    },
    {
      objectiveId: 'obj-03-3',
      label: 'isolate_node が適用済み',
      check: (_, __, defenseActions) =>
        defenseActions.some(d => d.type === 'isolate_node' && d.status === 'applied'),
    },
    {
      objectiveId: 'obj-03-4',
      label: '隔離後に tcp_connect を再実行（手動2回以上）',
      check: (events, _, defenseActions) => {
        const hasIsolation = defenseActions.some(d => d.type === 'isolate_node' && d.status === 'applied')
        const manualConnects = events.filter(e => e.type === 'tcp_connect' && e.metadata?.manual === true)
        return hasIsolation && manualConnects.length >= 2
      },
    },
  ],

  // Scenario 04: ポート異常アクセス（不審ポート → Firewall rule）
  'scenario-04': [
    {
      objectiveId: 'obj-04-1',
      label: '手動 tcp_connect イベントを発生させる（不審ポートへのアクセス）',
      check: (events) =>
        events.some(e => e.type === 'tcp_connect' && e.metadata?.manual === true),
    },
    {
      objectiveId: 'obj-04-2',
      label: 'anomalous_traffic アラートが存在する',
      check: (_, alerts) =>
        alerts.some(a => a.type === 'anomalous_traffic'),
    },
    {
      objectiveId: 'obj-04-3',
      label: 'firewall_rule または block_port が適用済み',
      check: (_, __, defenseActions) =>
        defenseActions.some(
          d => (d.type === 'firewall_rule' || d.type === 'block_port') && d.status === 'applied'
        ),
    },
    {
      objectiveId: 'obj-04-4',
      label: 'Firewall設定後に tcp_connect を再実行（手動2回以上）',
      check: (events, _, defenseActions) => {
        const hasFirewall = defenseActions.some(
          d => (d.type === 'firewall_rule' || d.type === 'block_port') && d.status === 'applied'
        )
        const manualConnects = events.filter(e => e.type === 'tcp_connect' && e.metadata?.manual === true)
        return hasFirewall && manualConnects.length >= 2
      },
    },
  ],
}

// ── 進行チェック結果型 ─────────────────────────────────────
export interface ProgressResult {
  scenarioId:       string
  allCompleted:     boolean
  newlyCompleted:   string[]   // 今回新たに達成した objectiveId 一覧
}

export function evaluateProgress(
  scenarioId:     string,
  events:         Event[],
  alerts:         Alert[],
  defenseActions: DefenseAction[],
  alreadyDone:    Set<string>   // 既に完了済みの objectiveId
): ProgressResult {
  const conditions = SCENARIO_CONDITIONS[scenarioId] ?? []
  const newlyCompleted: string[] = []

  for (const cond of conditions) {
    if (!alreadyDone.has(cond.objectiveId) && cond.check(events, alerts, defenseActions)) {
      newlyCompleted.push(cond.objectiveId)
    }
  }

  const totalCompleted = new Set([...alreadyDone, ...newlyCompleted])
  const allCompleted   = conditions.length > 0 && conditions.every(c => totalCompleted.has(c.objectiveId))

  return { scenarioId, allCompleted, newlyCompleted }
}
