import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Chessboard } from "../board/Chessboard";
import { ClockDisplay } from "./ClockDisplay";
import { getGameInfo, joinGame } from "./api";
import { getSeat, setSeat, type StoredSeat } from "./storage";
import { useGameSocket } from "./useGameSocket";
import "./Play.css";

const STATUS_LABEL: Record<string, string> = {
  CHECKMATE: "Checkmate",
  STALEMATE: "Stalemate",
  DRAW_AGREEMENT: "Draw agreed",
  DRAW_FIFTY_MOVE: "Draw by the 50-move rule",
  DRAW_REPETITION: "Draw by repetition",
  DRAW_INSUFFICIENT_MATERIAL: "Draw - insufficient material",
  RESIGNED: "Resigned",
  TIMEOUT: "Time out",
};

export function GameView() {
  const { gameId = "" } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [seat, setSeatState] = useState<StoredSeat | null>(() => getSeat(gameId));
  const [joinError, setJoinError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(!seat);
  // POST /join claims a seat server-side - not idempotent. A plain "cancelled" flag set
  // from the effect's cleanup doesn't stop that request from actually firing, only from
  // applying its result, so under StrictMode's mount-effect double-invoke the first
  // (real) join quietly succeeds and gets its result thrown away, then the second join
  // attempt fails because the seat it wanted is already taken. This ref instead makes
  // sure the request itself only ever fires once per component instance.
  const joinAttempted = useRef(false);

  useEffect(() => {
    if (!gameId || seat) {
      setResolving(false);
      return;
    }
    if (joinAttempted.current) return;
    joinAttempted.current = true;

    (async () => {
      try {
        const info = await getGameInfo(gameId);
        if (!info.whiteJoined || !info.blackJoined) {
          const joined = await joinGame(gameId);
          const newSeat: StoredSeat = { token: joined.token, color: joined.color };
          setSeat(gameId, newSeat);
          setSeatState(newSeat);
        }
      } catch (e) {
        setJoinError(e instanceof Error ? e.message : "Could not join this game");
      } finally {
        setResolving(false);
      }
    })();
  }, [gameId, seat]);

  const socket = useGameSocket(gameId, seat?.token ?? null);

  useEffect(() => {
    if (!socket.rematchStarted) return;
    const { gameId: newId, color, token } = socket.rematchStarted;
    const newSeat: StoredSeat = { token, color };
    setSeat(newId, newSeat);
    // React Router keeps this same component instance mounted across a param-only
    // navigation (/play/oldId -> /play/newId), so without this the seat state - and
    // therefore which color/token the socket connects as - would keep stale data from
    // the finished game instead of the swapped seat for the new one.
    setSeatState(newSeat);
    navigate(`/play/${newId}`);
  }, [socket.rematchStarted, navigate]);

  if (!gameId) return null;
  if (resolving) return <p className="status-text">Loading...</p>;
  if (joinError) return <p className="error-text">{joinError}</p>;
  if (!socket.state) return <p className="status-text">Connecting...</p>;

  const { state } = socket;
  const myColor = seat?.color ?? null;
  const isPlayer = myColor !== null;
  const isMyTurn = isPlayer && state.turn === myColor;
  const gameOver = state.status !== "WAITING_FOR_OPPONENT" && state.status !== "IN_PROGRESS";

  return (
    <div className="board-page">
      <div className="board-page-board">
        <Chessboard
          fen={state.fen}
          legalMoves={isMyTurn ? state.legalMoves : []}
          orientation={myColor === "black" ? "b" : "w"}
          onMove={(move) => socket.sendMove(move.from, move.to, move.promotion)}
          animateEntry={state.moveHistory.length === 0}
        />
      </div>

      <div className="board-page-panel">
        <div className="panel-card clocks">
          <ClockDisplay
            label="Black"
            millis={state.blackMillis}
            isTicking={state.status === "IN_PROGRESS" && state.turn === "black"}
          />
          <ClockDisplay
            label="White"
            millis={state.whiteMillis}
            isTicking={state.status === "IN_PROGRESS" && state.turn === "white"}
          />
        </div>

        {state.status === "WAITING_FOR_OPPONENT" && (
          <div className="panel-card waiting-banner">
            <p>Share this link with a friend:</p>
            <div className="share-row">
              <input
                readOnly
                value={window.location.href}
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                className="secondary-button"
                onClick={() => navigator.clipboard.writeText(window.location.href)}
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {socket.error && <p className="error-text">{socket.error}</p>}

        {gameOver && (
          <p className="status-text status-over">
            {STATUS_LABEL[state.status] ?? state.status}
            {state.winner && ` — ${state.winner} wins`}
          </p>
        )}

        {isPlayer && state.status === "IN_PROGRESS" && (
          <div className="game-controls">
            <button className="secondary-button" onClick={socket.resign}>
              Resign
            </button>
            {state.drawOfferBy === myColor ? (
              <span className="status-text">Draw offered...</span>
            ) : state.drawOfferBy ? (
              <>
                <button className="secondary-button" onClick={() => socket.respondDraw(true)}>
                  Accept draw
                </button>
                <button className="secondary-button" onClick={() => socket.respondDraw(false)}>
                  Decline
                </button>
              </>
            ) : (
              <button className="secondary-button" onClick={socket.offerDraw}>
                Offer draw
              </button>
            )}
          </div>
        )}

        {isPlayer && gameOver && (
          <div className="game-controls">
            {socket.rematchOfferedBy === myColor ? (
              <span className="status-text">Rematch offered...</span>
            ) : socket.rematchOfferedBy ? (
              <button className="primary-button" onClick={socket.requestRematch}>
                Accept rematch
              </button>
            ) : (
              <button className="primary-button" onClick={socket.requestRematch}>
                Rematch
              </button>
            )}
          </div>
        )}

        {state.moveHistory.length > 0 && (
          <ol className="move-history panel-card">
            {state.moveHistory.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
