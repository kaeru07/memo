// ============================================================
// useScenarioProgress
//
// 攻撃・防御操作後に呼ぶだけで
//  ① 達成した目標を自動で completed にする
//  ② 全目標達成時にセッションを 'completed' にする
//  ③ トースト通知を返す
// ============================================================
import { useLabStore } from '../store/labStore'
import { useScenarioStore } from '../store/scenarioStore'
import { evaluateProgress } from '../engine/scenarioEngine'
import { useUiStore } from '../store/uiStore'

export interface ProgressCheckResult {
  newlyCompleted: string[]
  sessionCompleted: boolean
}

export function useScenarioProgress() {
  const { updateSessionStatus } = useLabStore()
  const { updateObjective }     = useScenarioStore()
  const { addNotification }     = useUiStore()

  /**
   * 呼び出すだけで目標チェック・ストア更新・通知を行う。
   * AttackConsole の execute() と Defense の apply() の末尾で呼ぶ。
   */
  function checkProgress(): ProgressCheckResult {
    // 最新ストア状態を同期取得
    const { session, events, alerts, defenseActions } = useLabStore.getState()
    const { scenarios }                               = useScenarioStore.getState()

    if (!session?.scenarioId || session.status === 'completed') {
      return { newlyCompleted: [], sessionCompleted: false }
    }

    const scenarioId = session.scenarioId
    const scenario   = scenarios.find(s => s.id === scenarioId)
    if (!scenario) return { newlyCompleted: [], sessionCompleted: false }

    // 既に完了している objectiveId のセットを作る
    const alreadyDone = new Set(
      scenario.objectives.filter(o => o.completed).map(o => o.id)
    )

    // scenarioEngine で評価
    const result = evaluateProgress(scenarioId, events, alerts, defenseActions, alreadyDone)

    // 新たに達成した目標を scenarioStore に反映
    for (const objId of result.newlyCompleted) {
      updateObjective(scenarioId, objId, true)
      const obj = scenario.objectives.find(o => o.id === objId)
      if (obj) {
        addNotification({
          type: 'success',
          message: `✓ 目標達成: ${obj.description}`,
        })
      }
    }

    // 全目標達成 → セッション完了
    if (result.allCompleted) {
      updateSessionStatus('completed')
      addNotification({
        type: 'success',
        message: '🎉 シナリオ完了！ 結果画面を確認してください。',
      })
    }

    return {
      newlyCompleted:   result.newlyCompleted,
      sessionCompleted: result.allCompleted,
    }
  }

  return { checkProgress }
}
