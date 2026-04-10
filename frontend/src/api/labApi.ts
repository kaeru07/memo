// ============================================================
// labApi — REST API クライアント
// ============================================================
import type {
  Session,
  Scenario,
  Event,
  Alert,
  DefenseAction,
  DefenseActionType,
} from "../types/lab";

const BASE = "/api/lab";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API Error: ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

// --- Sessions ---
export const SessionApi = {
  list: () => request<Session[]>("/sessions"),
  get: (id: string) => request<Session>(`/sessions/${id}`),
  create: (scenarioId: string) =>
    request<Session>("/sessions", {
      method: "POST",
      body: JSON.stringify({ scenarioId }),
    }),
  start: (id: string) => request<Session>(`/sessions/${id}/start`, { method: "POST" }),
  pause: (id: string) => request<Session>(`/sessions/${id}/pause`, { method: "POST" }),
  finish: (id: string) => request<Session>(`/sessions/${id}/finish`, { method: "POST" }),
  reset: (id: string) => request<Session>(`/sessions/${id}/reset`, { method: "POST" }),
};

// --- Scenarios ---
export const ScenarioApi = {
  list: () => request<Scenario[]>("/scenarios"),
  get: (id: string) => request<Scenario>(`/scenarios/${id}`),
};

// --- Events ---
export const EventApi = {
  list: (sessionId: string) => request<Event[]>(`/sessions/${sessionId}/events`),
};

// --- Alerts ---
export const AlertApi = {
  list: (sessionId: string) => request<Alert[]>(`/sessions/${sessionId}/alerts`),
  acknowledge: (sessionId: string, alertId: string) =>
    request<Alert>(`/sessions/${sessionId}/alerts/${alertId}/ack`, { method: "POST" }),
};

// --- Defense Actions ---
export const DefenseApi = {
  list: (sessionId: string) => request<DefenseAction[]>(`/sessions/${sessionId}/defense`),
  apply: (
    sessionId: string,
    type: DefenseActionType,
    targetNodeId: string,
    params: Record<string, unknown>
  ) =>
    request<DefenseAction>(`/sessions/${sessionId}/defense`, {
      method: "POST",
      body: JSON.stringify({ type, targetNodeId, params }),
    }),
  revert: (sessionId: string, actionId: string) =>
    request<DefenseAction>(`/sessions/${sessionId}/defense/${actionId}/revert`, {
      method: "POST",
    }),
};
