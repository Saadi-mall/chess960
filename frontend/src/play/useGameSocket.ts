import { useEffect, useRef, useState } from "react";
import type { GameStateMessage, RematchStartedMessage, ServerMessage } from "./types";

interface GameSocket {
  connected: boolean;
  state: GameStateMessage | null;
  error: string | null;
  rematchOfferedBy: "white" | "black" | null;
  rematchStarted: RematchStartedMessage | null;
  sendMove: (from: string, to: string, promotion?: string) => void;
  resign: () => void;
  offerDraw: () => void;
  respondDraw: (accept: boolean) => void;
  requestRematch: () => void;
}

/** Often enough to stay well inside a 15-minute idle timeout on free hosting. */
const PING_INTERVAL_MS = 4 * 60 * 1000;

function socketBase(): string {
  const configured = import.meta.env.VITE_BACKEND_WS_URL;
  if (configured) return configured.replace(/\/$/, "");
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}`;
}

export function useGameSocket(gameId: string, token: string | null): GameSocket {
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<GameStateMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rematchOfferedBy, setRematchOfferedBy] = useState<"white" | "black" | null>(null);
  const [rematchStarted, setRematchStarted] = useState<RematchStartedMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const query = token ? `?token=${encodeURIComponent(token)}` : "";
    const socket = new WebSocket(`${socketBase()}/ws/games/${gameId}${query}`);
    socketRef.current = socket;

    // While a player thinks, nothing else is sent - this keeps the connection (and a free
    // host that sleeps when idle) awake through a long think.
    const ping = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "PING" }));
    }, PING_INTERVAL_MS);

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onmessage = (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      switch (message.type) {
        case "STATE":
          setState(message);
          setError(null);
          break;
        case "ERROR":
          setError(message.message);
          break;
        case "REMATCH_STARTED":
          setRematchStarted(message);
          break;
        case "REMATCH_OFFERED":
          setRematchOfferedBy(message.by);
          break;
      }
    };

    return () => {
      clearInterval(ping);
      socket.close();
    };
  }, [gameId, token]);

  function send(payload: object) {
    socketRef.current?.send(JSON.stringify(payload));
  }

  return {
    connected,
    state,
    error,
    rematchOfferedBy,
    rematchStarted,
    sendMove: (from, to, promotion) => send({ type: "MOVE", from, to, promotion: promotion ?? null }),
    resign: () => send({ type: "RESIGN" }),
    offerDraw: () => send({ type: "OFFER_DRAW" }),
    respondDraw: (accept) => send({ type: "RESPOND_DRAW", accept }),
    requestRematch: () => send({ type: "REMATCH" }),
  };
}
