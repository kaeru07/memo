// ============================================================
// useLabWebSocket — サーバーからのリアルタイムイベント受信
// ============================================================
import { useEffect, useRef } from "react";
import { useLabStore } from "../store/labStore";
import { useUiStore } from "../store/uiStore";
import type { WsMessage, Event, Alert, DefenseAction, Node, Session } from "../types/lab";

const WS_URL = `ws://${window.location.hostname}:8000/ws/lab`;

export function useLabWebSocket(sessionId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const { addEvent, addAlert, updateNode, updateDefenseAction, updateSessionStatus, setConnected } =
    useLabStore();
  const { addNotification } = useUiStore();

  useEffect(() => {
    if (!sessionId) return;

    const ws = new WebSocket(`${WS_URL}/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      addNotification({ message: "WebSocket接続エラー", type: "error" });
    };

    ws.onmessage = (raw) => {
      try {
        const msg: WsMessage = JSON.parse(raw.data as string);
        switch (msg.type) {
          case "event":
            addEvent(msg.payload as Event);
            break;
          case "alert": {
            const alert = msg.payload as Alert;
            addAlert(alert);
            if (alert.severity === "high" || alert.severity === "critical") {
              addNotification({ message: alert.message, type: "warning" });
            }
            break;
          }
          case "node_update":
            updateNode((msg.payload as Node).id, msg.payload as Partial<Node>);
            break;
          case "defense_result":
            updateDefenseAction(
              (msg.payload as DefenseAction).id,
              msg.payload as Partial<DefenseAction>
            );
            break;
          case "session_update":
            updateSessionStatus((msg.payload as Session).status);
            break;
        }
      } catch {
        // malformed message — ignore
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = (message: WsMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return { send };
}
