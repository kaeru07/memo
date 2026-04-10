# 疑似攻撃・防御ラボ — 設計書

## 1. 画面構成

```
/lab
├── /lab/dashboard        ① ダッシュボード
├── /lab/network-map      ② ネットワークマップ
├── /lab/attack-console   ③ 攻撃コンソール
├── /lab/traffic-log      ④ 通信ログ
├── /lab/detection        ⑤ 異常検知
├── /lab/defense          ⑥ 防御操作
├── /lab/scenarios        ⑦ シナリオ選択
└── /lab/results          ⑧ 結果画面
```

### 各画面の責務

| 画面 | 責務 | 主要情報源 |
|------|------|-----------|
| Dashboard | セッション全体KPI・タイムライン | Session, Alert (未読) |
| NetworkMap | ノードグラフ・リアルタイム通信 | Node, Event (websocket) |
| AttackConsole | 攻撃タイプ選択・実行 | Scenario.allowedAttackTypes |
| TrafficLog | イベントログ・フィルタ | Event[] (websocket) |
| Detection | アラート一覧・ルール設定 | Alert[] |
| Defense | 防御操作・ファイアウォール | DefenseAction[] |
| Scenarios | シナリオ一覧・選択・目標確認 | Scenario[] |
| Results | スコア・タイムライン振り返り | Session.score, Event[] |

---

## 2. データ構造

### 概念モデル

```
Scenario
  └── Session (1 Scenario : N Sessions)
        ├── Node[]          (ネットワーク端末)
        ├── Event[]         (通信ログ)
        ├── Alert[]         (異常検知)
        └── DefenseAction[] (防御操作)
```

### 主要型（詳細は types/lab.ts, models/lab_models.py）

```
Node             id, label, ip, role, status, os, interfaces
Event            id, sessionId, timestamp, type, protocol, severity, src, dst
Alert            id, sessionId, timestamp, type, severity, message, acknowledged
DefenseAction    id, sessionId, type, targetNodeId, params, status
Scenario         id, name, difficulty, objectives[], steps[], allowedAttackTypes
Session          id, scenarioId, status, nodes[], eventIds[], score
```

### 固定ノード（WireGuard VPN環境）

```
VPS  (10.0.0.1)  role: defender   — FastAPI + React が稼働
iPhone (10.0.0.2) role: attacker   — ブラウザから操作
```

---

## 3. 状態管理構造

```
Zustand Stores
│
├── labStore         (セッション中心の状態)
│   ├── session      現在のセッション
│   ├── nodes        Record<id, Node>
│   ├── events       Event[]  (時系列追記のみ)
│   ├── alerts       Alert[]
│   ├── defenseActions DefenseAction[]
│   └── isConnected  WebSocket接続状態
│
├── scenarioStore    (シナリオ選択)
│   ├── scenarios    Scenario[]
│   └── selectedScenario
│
└── uiStore          (UI制御)
    ├── activePanel
    ├── notifications
    ├── eventSeverityFilter
    └── autoScrollLog
```

### データフロー

```
[WebSocket]
  backend --push--> useLabWebSocket hook
                       └── labStore (addEvent / addAlert / updateNode)
                                └── コンポーネント再レンダリング

[REST API]
  コンポーネント --fetch--> labApi.ts ---> backend
                                            └── ストア更新
```

---

## 4. コンポーネント構造

```
App
└── LabLayout
    ├── Sidebar (ナビゲーション)
    ├── TopBar  (セッション状態・通知)
    └── MainContent
        ├── Dashboard
        │   ├── SessionStatusCard
        │   ├── KpiCards (攻撃数/アラート数/防御数)
        │   └── RecentAlertList
        ├── NetworkMap
        │   ├── NodeGraph  (react-flow)
        │   └── NodeDetail (選択ノードの詳細)
        ├── AttackConsole
        │   ├── AttackTypeSelector
        │   ├── TargetNodeSelector
        │   └── AttackParamForm
        ├── TrafficLog
        │   ├── SeverityFilter
        │   └── EventTable (仮想スクロール)
        ├── Detection
        │   ├── AlertList
        │   └── DetectionRuleEditor  (将来)
        ├── Defense
        │   ├── DefenseActionButtons
        │   └── AppliedRuleList
        ├── Scenarios
        │   ├── ScenarioCardGrid
        │   └── ObjectiveChecklist
        └── Results
            ├── ScoreCard
            └── EventTimeline
```

---

## 5. ファイル構成

```
lab/
├── DESIGN.md
├── frontend/
│   └── src/
│       ├── types/
│       │   └── lab.ts               ← 全型定義
│       ├── store/
│       │   ├── labStore.ts          ← セッション・イベント状態
│       │   ├── scenarioStore.ts     ← シナリオ選択状態
│       │   └── uiStore.ts           ← UI状態
│       ├── api/
│       │   └── labApi.ts            ← REST APIクライアント
│       ├── hooks/
│       │   └── useLabWebSocket.ts   ← WS接続・メッセージ処理
│       └── components/
│           ├── Dashboard/
│           ├── NetworkMap/
│           ├── AttackConsole/
│           ├── TrafficLog/
│           ├── Detection/
│           ├── Defense/
│           ├── Scenarios/
│           └── Results/
└── backend/
    ├── main.py                      ← FastAPI エントリ
    ├── requirements.txt
    ├── models/
    │   └── lab_models.py            ← Pydantic モデル
    ├── routers/
    │   ├── sessions.py              ← セッションCRUD
    │   ├── scenarios.py             ← シナリオ一覧
    │   ├── events.py                ← イベントログ
    │   ├── alerts.py                ← アラート・Ack
    │   └── defense.py               ← 防御操作
    ├── services/                    ← [将来実装]
    │   ├── network_monitor.py       ← tcpdump/nflog連携
    │   ├── detection_engine.py      ← ルールベース検知
    │   └── defense_engine.py        ← iptables/nft操作
    └── ws/
        └── lab_ws.py                ← WebSocket ハブ
```

---

## 6. API構成

### REST エンドポイント

```
# Session
GET    /api/lab/sessions
POST   /api/lab/sessions              body: { scenarioId }
GET    /api/lab/sessions/:id
POST   /api/lab/sessions/:id/start
POST   /api/lab/sessions/:id/pause
POST   /api/lab/sessions/:id/finish
POST   /api/lab/sessions/:id/reset

# Scenarios
GET    /api/lab/scenarios
GET    /api/lab/scenarios/:id

# Events (read-only; write は WS or service 経由)
GET    /api/lab/sessions/:id/events

# Alerts
GET    /api/lab/sessions/:id/alerts
POST   /api/lab/sessions/:id/alerts/:alertId/ack

# Defense Actions
GET    /api/lab/sessions/:id/defense
POST   /api/lab/sessions/:id/defense  body: { type, targetNodeId, params }
POST   /api/lab/sessions/:id/defense/:actionId/revert
```

### WebSocket

```
WS  /ws/lab/:sessionId

# Server → Client push
{ type: "event",          payload: Event }
{ type: "alert",          payload: Alert }
{ type: "node_update",    payload: Partial<Node> }
{ type: "defense_result", payload: Partial<DefenseAction> }
{ type: "session_update", payload: { status: SessionStatus } }
```

---

## 7. 将来拡張ポイント

| 拡張項目 | 場所 | 概要 |
|---------|------|------|
| ネットワーク監視 | `services/network_monitor.py` | tcpdump / nflog でパケットキャプチャ → Event 生成 |
| ルールベース検知 | `services/detection_engine.py` | Snort/Suricata ルール互換の検知ロジック |
| 実iptables操作 | `services/defense_engine.py` | iptables/nftables で実防御適用 |
| グラフ可視化 | `NetworkMap/NodeGraph.tsx` | react-flow + D3 でリアルタイム通信アニメーション |
| シナリオYAML | `scenarios/*.yaml` | シナリオを宣言的に定義・バージョン管理 |
| スコアリング | `Session.score` | 目標達成度・時間・防御率から自動算出 |
| セッション録画 | `Session.eventIds` | イベント列からリプレイ再生 |
| マルチユーザー | `Node.role` 拡張 | チーム対戦モード (Red vs Blue) |
