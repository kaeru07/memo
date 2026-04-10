// ============================================================
// defenseEngine — 防御アクション実行後のイベント生成
// ============================================================
import type { DefenseAction, Event } from '../types/lab'

// 防御アクション実行時に通信ログへ記録するイベントを生成する
export function generateDefenseEvent(action: DefenseAction): Event {
  const descMap: Partial<Record<DefenseAction['type'], string>> = {
    block_ip:       `[DEFENSE] IP ブロック: ${action.params?.ip ?? '?'} → DROP`,
    block_port:     `[DEFENSE] ポート閉鎖: ${action.params?.port ?? '?'}/${action.params?.protocol ?? 'tcp'}`,
    rate_limit:     `[DEFENSE] レート制限: ${action.params?.ip ?? '?'} → ${action.params?.limit ?? '?'}`,
    firewall_rule:  `[DEFENSE] ファイアウォールルール追加`,
    isolate_node:   `[DEFENSE] ノード隔離実行`,
    honeypot_deploy:`[DEFENSE] ハニーポット展開: port ${action.params?.port ?? '?'}`,
    custom:         `[DEFENSE] カスタム防御アクション`,
  }

  return {
    id:           `evt-def-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sessionId:    action.sessionId,
    timestamp:    new Date().toISOString(),
    type:         'custom',
    protocol:     'other',
    severity:     'info',
    sourceNodeId: action.targetNodeId,
    targetNodeId: action.targetNodeId,
    tags:         ['defense', action.type],
    payload:      descMap[action.type] ?? '[DEFENSE] 防御操作',
    metadata: {
      defenseActionId: action.id,
      defenseType:     action.type,
      params:          action.params,
    },
  }
}
