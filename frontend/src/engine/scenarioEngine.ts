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

  // Scenario 03: Web アプリケーション攻撃
  'scenario-03': [
    {
      objectiveId: 'obj-03-1',
      label: 'payload_injection イベントを発生させる',
      check: (events) =>
        events.some(e => e.type === 'payload_injection'),
    },
    {
      objectiveId: 'obj-03-2',
      label: 'firewall_rule が適用済み',
      check: (_, __, defenseActions) =>
        defenseActions.some(d => d.type === 'firewall_rule' && d.status === 'applied'),
    },
    {
      objectiveId: 'obj-03-3',
      label: 'firewall_rule + rate_limit の両方が適用済み',
      check: (_, __, defenseActions) =>
        defenseActions.some(d => d.type === 'firewall_rule' && d.status === 'applied') &&
        defenseActions.some(d => d.type === 'rate_limit'    && d.status === 'applied'),
    },
    {
      objectiveId: 'obj-03-4',
      label: 'injection + http_request + firewall_rule がすべて揃う',
      check: (events, _, defenseActions) =>
        events.some(e => e.type === 'payload_injection') &&
        events.some(e => e.type === 'http_request') &&
        defenseActions.some(d => d.type === 'firewall_rule' && d.status === 'applied'),
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
