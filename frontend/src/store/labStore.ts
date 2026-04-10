// ============================================================
// labStore — セッション・ノード・イベント・アラート・防御操作
// ============================================================
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  Node,
  Event,
  Alert,
  DefenseAction,
  Session,
} from "../types/lab";

interface LabState {
  // --- データ ---
  session: Session | null;
  nodes: Record<string, Node>;         // id -> Node
  events: Event[];
  alerts: Alert[];
  defenseActions: DefenseAction[];
  isConnected: boolean;               // WebSocket接続状態

  // --- アクション ---
  setSession: (session: Session) => void;
  updateSessionStatus: (status: Session["status"]) => void;
  addNode: (node: Node) => void;
  updateNode: (id: string, patch: Partial<Node>) => void;
  addEvent: (event: Event) => void;
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (alertId: string) => void;
  addDefenseAction: (action: DefenseAction) => void;
  updateDefenseAction: (id: string, patch: Partial<DefenseAction>) => void;
  setConnected: (connected: boolean) => void;
  resetLab: () => void;
}

const initialState = {
  session: null,
  nodes: {},
  events: [],
  alerts: [],
  defenseActions: [],
  isConnected: false,
};

export const useLabStore = create<LabState>()(
  devtools(
    (set) => ({
      ...initialState,

      setSession: (session) => set({ session }),

      updateSessionStatus: (status) =>
        set((s) => ({
          session: s.session ? { ...s.session, status } : null,
        })),

      addNode: (node) =>
        set((s) => ({ nodes: { ...s.nodes, [node.id]: node } })),

      updateNode: (id, patch) =>
        set((s) => ({
          nodes: s.nodes[id]
            ? { ...s.nodes, [id]: { ...s.nodes[id], ...patch } }
            : s.nodes,
        })),

      addEvent: (event) =>
        set((s) => ({ events: [...s.events, event] })),

      addAlert: (alert) =>
        set((s) => ({ alerts: [...s.alerts, alert] })),

      acknowledgeAlert: (alertId) =>
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === alertId
              ? { ...a, acknowledged: true, acknowledgedAt: new Date().toISOString() }
              : a
          ),
        })),

      addDefenseAction: (action) =>
        set((s) => ({ defenseActions: [...s.defenseActions, action] })),

      updateDefenseAction: (id, patch) =>
        set((s) => ({
          defenseActions: s.defenseActions.map((a) =>
            a.id === id ? { ...a, ...patch } : a
          ),
        })),

      setConnected: (isConnected) => set({ isConnected }),

      resetLab: () => set(initialState),
    }),
    { name: "labStore" }
  )
);
