import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Chessboard } from "../board/Chessboard";
import { ChessPage, IdentityCard, SideCard } from "../layout/ChessPage";
import { ConfirmDialog } from "../layout/ConfirmDialog";
import { FlagIcon } from "../layout/icons";
import { NotationPanel } from "../layout/NotationPanel";
import { PlayerBar } from "../layout/PlayerBar";
import { PreferenceToggles } from "../layout/Toggles";
import { useHistoryNav } from "../layout/useHistoryNav";
import { ClockDisplay } from "./ClockDisplay";
import { getGameInfo, joinGame } from "./api";
import { getSeat, setSeat, type StoredSeat } from "./storage";
import { useGameSocket } from "./useGameSocket";
import { analysisLink } from "../analyze/link";

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
  const [flipped, setFlipped] = useState(false);
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
  const nav = useHistoryNav(state?.moveHistory.length ?? 0);
  const myColor = seat?.color ?? null;
  const isPlayer = myColor !== null;
  const baseColor = myColor ?? "white";
  const bottomColor = flipped ? (baseColor === "white" ? "black" : "white") : baseColor;
  const topColor = bottomColor === "white" ? "black" : "white";

  function bar(color: "white" | "black") {
    const side = color === "white" ? "White" : "Black";
    const name = !isPlayer ? side : color === myColor ? "You" : "Opponent";
    const connected = state ? (color === "white" ? state.whiteConnected : state.blackConnected) : false;
    const ticking = state?.status === "IN_PROGRESS" && state.turn === color;
    return (
      <PlayerBar
        color={color}
        name={name}
        detail={isPlayer ? side : connected ? "connected" : "not connected"}
        online={connected}
        active={ticking}
        clock={
          state && <ClockDisplay millis={color === "white" ? state.whiteMillis : state.blackMillis} isTicking={ticking} />
        }
      />
    );
  }

  if (!gameId) return null;

  if (resolving || joinError || !state) {
    return (
      <ChessPage
        title="Play a friend"
        subtitle="Joining the game"
        left={
          <SideCard>
            <div className="side-section">
              {joinError ? <p className="error-text">{joinError}</p> : <p className="side-status">Connecting...</p>}
            </div>
          </SideCard>
        }
        top={bar(topColor)}
        board={null}
        bottom={bar(bottomColor)}
        right={<NotationPanel moves={[]} nav={nav} onFlip={() => setFlipped((f) => !f)} />}
      />
    );
  }

  const isMyTurn = isPlayer && state.turn === myColor;
  const inProgress = state.status === "IN_PROGRESS";
  const waiting = state.status === "WAITING_FOR_OPPONENT";
  const gameOver = !waiting && !inProgress;
  const opponentOfferedDraw = isPlayer && inProgress && state.drawOfferBy !== null && state.drawOfferBy !== myColor;
  const timeControl = `${state.initialSeconds / 60}+${state.incrementSeconds}`;

  let title: string;
  if (waiting) title = "Waiting for an opponent";
  else if (gameOver) title = STATUS_LABEL[state.status] ?? state.status;
  else if (isPlayer) title = isMyTurn ? "Your move" : "Opponent's move";
  else title = `${state.turn === "white" ? "White" : "Black"} to move`;

  let result: string | null = null;
  if (gameOver) {
    if (!state.winner) result = "The game is drawn.";
    else if (isPlayer) result = state.winner === myColor ? "You won." : "You lost.";
    else result = `${state.winner === "white" ? "White" : "Black"} wins.`;
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

  const actions = isPlayer && inProgress && (
    <>
      <button
        type="button"
        className="icon-button"
        aria-label={state.drawOfferBy === myColor ? "Draw offered" : "Offer a draw"}
        title={state.drawOfferBy === myColor ? "Draw offered" : "Offer a draw"}
        disabled={state.drawOfferBy !== null}
        onClick={() => setConfirming("OFFER_DRAW")}
      >
        ½
      </button>
      <button
        type="button"
        className="icon-button icon-button-danger"
        aria-label="Resign"
        title="Resign"
        onClick={() => setConfirming("RESIGN")}
      >
        <FlagIcon />
      </button>
    </>
  );

  return (
    <>
      <ChessPage
        title={title}
        subtitle={`Chess960 position #${state.startingNumber} · ${timeControl}`}
        left={
          <>
            <IdentityCard
              initial={isPlayer ? "Y" : "S"}
              tone={isPlayer ? (myColor ?? "white") : "accent"}
              title={isPlayer ? "You" : "Spectator"}
              detail={isPlayer ? `Playing ${myColor === "white" ? "White" : "Black"}` : "Watching this game"}
            />
            <SideCard>
              <div className="side-section">
                <span className="side-label">Game</span>
                <p className="side-status">{title}</p>
                {result && <p className="side-text muted">{result}</p>}
                {state.drawOfferBy === myColor && inProgress && (
                  <p className="side-text muted">Draw offered - waiting for a reply.</p>
                )}
                {socket.error && <p className="error-text">{socket.error}</p>}
              </div>

              {waiting && (
                <div className="side-section">
                  <span className="side-label">Invite link</span>
                  <input
                    readOnly
                    className="text-input"
                    value={window.location.href}
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label="Invite link"
                  />
                  <p className="side-text muted" style={{ marginTop: "var(--space-2)" }}>
                    The game starts when your friend opens it.
                  </p>
                </div>
              )}

              {opponentOfferedDraw && (
                <div className="side-section">
                  <span className="side-label">Draw offer</span>
                  <p className="side-text" style={{ marginBottom: "var(--space-3)" }}>
                    Your opponent offers a draw.
                  </p>
                  <div className="button-row">
                    <button className="primary-button" onClick={() => socket.respondDraw(true)}>
                      Accept
                    </button>
                    <button className="secondary-button" onClick={() => socket.respondDraw(false)}>
                      Decline
                    </button>
                  </div>
                </div>
              )}

              <div className="side-section">
                <span className="side-label">Settings</span>
                <p className="side-text">Position #{state.startingNumber}</p>
                <p className="side-text">Time control {timeControl}</p>
              </div>
            </SideCard>

            {waiting && (
              <button className="big-button" onClick={copyLink}>
                {copied ? "Link copied" : "Copy invite link"}
              </button>
            )}
            {gameOver && isPlayer && (
              <button className="big-button" disabled={socket.rematchOfferedBy === myColor} onClick={socket.requestRematch}>
                {socket.rematchOfferedBy === myColor
                  ? "Rematch offered"
                  : socket.rematchOfferedBy
                    ? "Accept rematch"
                    : "Rematch"}
              </button>
            )}
            {gameOver && (
              <button
                className="big-button big-button-secondary"
                onClick={() => navigate(analysisLink(state.startingNumber, state.moves))}
              >
                Analyze this game
              </button>
            )}
            {gameOver && (
              <button className="big-button big-button-secondary" onClick={() => navigate("/play")}>
                New game
              </button>
            )}
            <PreferenceToggles />
          </>
        }
        top={bar(topColor)}
        board={
          <Chessboard
            fen={state.fenHistory[nav.ply] ?? state.fen}
            legalMoves={isMyTurn && nav.isLatest ? state.legalMoves : []}
            orientation={bottomColor === "black" ? "b" : "w"}
            onMove={(move) => socket.sendMove(move.from, move.to, move.promotion)}
            animateEntry={state.moveHistory.length === 0}
            disabled={!nav.isLatest}
            lastMove={nav.ply > 0 ? state.moves[nav.ply - 1] : null}
          />
        }
        bottom={bar(bottomColor)}
        right={
          <NotationPanel moves={state.moveHistory} nav={nav} onFlip={() => setFlipped((f) => !f)} actions={actions} />
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
