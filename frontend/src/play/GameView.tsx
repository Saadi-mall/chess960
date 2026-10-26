import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Chessboard } from "../board/Chessboard";
import { BoardLayout } from "../layout/BoardLayout";
import { ConfirmDialog } from "../layout/ConfirmDialog";
import { MoveList } from "../layout/MoveList";
import { PlayerBar } from "../layout/PlayerBar";
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

type Pending = "RESIGN" | "OFFER_DRAW" | null;

export function GameView() {
  const { gameId = "" } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [seat, setSeatState] = useState<StoredSeat | null>(() => getSeat(gameId));
  const [joinError, setJoinError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(!seat);
  const [confirming, setConfirming] = useState<Pending>(null);
  const [copied, setCopied] = useState(false);
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

  const state = socket.state;
  const myColor = seat?.color ?? null;
  const isPlayer = myColor !== null;
  const bottomColor = myColor ?? "white";
  const topColor = bottomColor === "white" ? "black" : "white";

  function bar(color: "white" | "black") {
    const sideLabel = color === "white" ? "White" : "Black";
    const name = !isPlayer ? sideLabel : color === myColor ? "You" : "Opponent";
    const connected = state ? (color === "white" ? state.whiteConnected : state.blackConnected) : false;
    const detail = isPlayer ? `${sideLabel}${connected ? "" : " · not connected"}` : connected ? "" : "not connected";
    const ticking = state?.status === "IN_PROGRESS" && state.turn === color;
    return (
      <PlayerBar
        color={color}
        name={name}
        detail={detail || undefined}
        active={ticking}
        trailing={
          state && (
            <ClockDisplay millis={color === "white" ? state.whiteMillis : state.blackMillis} isTicking={ticking} />
          )
        }
      />
    );
  }

  if (!gameId) return null;

  if (resolving || joinError || !state) {
    return (
      <BoardLayout
        top={bar(topColor)}
        board={null}
        bottom={bar(bottomColor)}
        panel={
          <div className="panel-section">
            {joinError ? <p className="error-text">{joinError}</p> : <p className="panel-status">Connecting...</p>}
          </div>
        }
      />
    );
  }

  const isMyTurn = isPlayer && state.turn === myColor;
  const gameOver = state.status !== "WAITING_FOR_OPPONENT" && state.status !== "IN_PROGRESS";
  const opponentOfferedDraw = isPlayer && state.drawOfferBy !== null && state.drawOfferBy !== myColor;

  let statusLine: string;
  if (state.status === "WAITING_FOR_OPPONENT") statusLine = "Waiting for an opponent";
  else if (gameOver) statusLine = STATUS_LABEL[state.status] ?? state.status;
  else if (isPlayer) statusLine = isMyTurn ? "Your move" : "Opponent's move";
  else statusLine = `${state.turn === "white" ? "White" : "Black"} to move`;

  let resultLine: string | null = null;
  if (gameOver) {
    if (!state.winner) resultLine = "The game is drawn.";
    else if (isPlayer) resultLine = state.winner === myColor ? "You won." : "You lost.";
    else resultLine = `${state.winner === "white" ? "White" : "Black"} wins.`;
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function confirmPending() {
    if (confirming === "RESIGN") socket.resign();
    if (confirming === "OFFER_DRAW") socket.offerDraw();
    setConfirming(null);
  }

  return (
    <>
      <BoardLayout
        top={bar(topColor)}
        board={
          <Chessboard
            fen={state.fen}
            legalMoves={isMyTurn ? state.legalMoves : []}
            orientation={bottomColor === "black" ? "b" : "w"}
            onMove={(move) => socket.sendMove(move.from, move.to, move.promotion)}
            animateEntry={state.moveHistory.length === 0}
          />
        }
        bottom={bar(bottomColor)}
        panel={
          <>
            <div className="panel-section">
              <p className="panel-heading">Chess960 · Position #{state.startingNumber}</p>
              <p className="panel-status">{statusLine}</p>
              {resultLine && <p className="panel-note">{resultLine}</p>}
              {socket.error && <p className="error-text">{socket.error}</p>}

              {state.status === "WAITING_FOR_OPPONENT" && (
                <div className="invite">
                  <p className="panel-note">Send this link to a friend. The game starts when they open it.</p>
                  <div className="share-row">
                    <input
                      readOnly
                      className="text-input"
                      value={window.location.href}
                      onFocus={(e) => e.currentTarget.select()}
                      aria-label="Invite link"
                    />
                    <button className="secondary-button" onClick={copyLink}>
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {opponentOfferedDraw && state.status === "IN_PROGRESS" && (
                <div className="draw-offer">
                  <p className="panel-note">Your opponent offers a draw.</p>
                  <div className="button-row">
                    <button className="primary-button" onClick={() => socket.respondDraw(true)}>
                      Accept draw
                    </button>
                    <button className="secondary-button" onClick={() => socket.respondDraw(false)}>
                      Decline
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="panel-section panel-section-grow">
              <p className="panel-heading">Moves</p>
              <MoveList moves={state.moveHistory} />
            </div>

            {isPlayer && state.status === "IN_PROGRESS" && (
              <div className="panel-section">
                <div className="button-row">
                  <button
                    className="secondary-button"
                    disabled={state.drawOfferBy !== null}
                    onClick={() => setConfirming("OFFER_DRAW")}
                  >
                    {state.drawOfferBy === myColor ? "Draw offered" : "Offer draw"}
                  </button>
                  <button className="secondary-button" onClick={() => setConfirming("RESIGN")}>
                    Resign
                  </button>
                </div>
              </div>
            )}

            {gameOver && (
              <div className="panel-section">
                <div className="button-row">
                  {isPlayer && (
                    <button
                      className="primary-button"
                      disabled={socket.rematchOfferedBy === myColor}
                      onClick={socket.requestRematch}
                    >
                      {socket.rematchOfferedBy === myColor
                        ? "Rematch offered"
                        : socket.rematchOfferedBy
                          ? "Accept rematch"
                          : "Rematch"}
                    </button>
                  )}
                  <button className="secondary-button" onClick={() => navigate("/play")}>
                    New game
                  </button>
                </div>
              </div>
            )}
          </>
        }
      />

      {confirming === "RESIGN" && (
        <ConfirmDialog
          title="Resign this game?"
          message="Your opponent will be awarded the win. This can't be undone."
          confirmLabel="Resign"
          danger
          onConfirm={confirmPending}
          onCancel={() => setConfirming(null)}
        />
      )}
      {confirming === "OFFER_DRAW" && (
        <ConfirmDialog
          title="Offer a draw?"
          message="Your opponent can accept or decline. The offer lapses once the next move is played."
          confirmLabel="Offer draw"
          onConfirm={confirmPending}
          onCancel={() => setConfirming(null)}
        />
      )}
    </>
  );
}
