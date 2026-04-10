// ============================================================
// uiStore — UI状態（パネル・通知・フィルタ）
// ============================================================
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type ActivePanel =
  | "dashboard"
  | "network-map"
  | "attack-console"
  | "traffic-log"
  | "detection"
  | "defense"
  | "scenarios"
  | "results";

export type SeverityFilter = "all" | "info" | "low" | "medium" | "high" | "critical";

export interface Notification {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: string;
  read: boolean;
}

interface UiState {
  activePanel: ActivePanel;
  sidebarOpen: boolean;
  notifications: Notification[];
  eventSeverityFilter: SeverityFilter;
  alertSeverityFilter: SeverityFilter;
  autoScrollLog: boolean;

  setActivePanel: (panel: ActivePanel) => void;
  toggleSidebar: () => void;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  setEventSeverityFilter: (filter: SeverityFilter) => void;
  setAlertSeverityFilter: (filter: SeverityFilter) => void;
  setAutoScrollLog: (enabled: boolean) => void;
}

export const useUiStore = create<UiState>()(
  devtools(
    (set) => ({
      activePanel: "dashboard",
      sidebarOpen: true,
      notifications: [],
      eventSeverityFilter: "all",
      alertSeverityFilter: "all",
      autoScrollLog: true,

      setActivePanel: (activePanel) => set({ activePanel }),

      toggleSidebar: () =>
        set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      addNotification: (n) =>
        set((s) => ({
          notifications: [
            ...s.notifications,
            {
              ...n,
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              read: false,
            },
          ],
        })),

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      clearNotifications: () => set({ notifications: [] }),

      setEventSeverityFilter: (eventSeverityFilter) => set({ eventSeverityFilter }),
      setAlertSeverityFilter: (alertSeverityFilter) => set({ alertSeverityFilter }),
      setAutoScrollLog: (autoScrollLog) => set({ autoScrollLog }),
    }),
    { name: "uiStore" }
  )
);
