import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Chessboard } from "../board/Chessboard";
import type { LegalMove } from "../board/types";
import { ChessPage, IdentityCard, SideCard } from "../layout/ChessPage";
import { ResetIcon } from "../layout/icons";
import { NotationPanel } from "../layout/NotationPanel";
import { PlayerBar } from "../layout/PlayerBar";
import { PreferenceToggles } from "../layout/Toggles";
import { useHistoryNav } from "../layout/useHistoryNav";
import { PositionDetail, PositionModeControl } from "../positions/PositionPicker";
import type { PositionMode } from "../positions/previewApi";
import { useStartingPreview } from "../positions/useStartingPreview";
import { applyMove, evaluatePosition, fetchStartingPosition, replayMoves } from "./api";
import { EvaluationBar } from "./EvaluationBar";
import { OverviewCard } from "./OverviewCard";
import type { AnalyzedPosition, Overview } from "./types";
import { parseMoveList } from "./link";
import "./Analyze.css";

const STATUS_LABEL: Record<string, string> = {
  CHECKMATE: "Checkmate",
  STALEMATE: "Stalemate",
  DRAW_INSUFFICIENT_MATERIAL: "Draw - insufficient material",
  DRAW_FIFTY_MOVE: "Draw by the 50-move rule",
};

export function AnalyzeTab() {
  // A finished game opens here as /analyze?position=<n>&moves=<from><to>,...
  const [searchParams, setSearchParams] = useSearchParams();
  const gamePosition = searchParams.get("position");
  const gameMoves = searchParams.get("moves") ?? "";
  const [positionMode, setPositionMode] = useState<PositionMode>("RANDOM");
  const [number, setNumber] = useState(518);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [overview, setOverview] = useState<Overview | null>(null);
  // Every position so far: [0] is the start, [i] is after i moves. Keeping the whole
  // position (not just the FEN) lets the evaluation follow the back/forward buttons.
  const [history, setHistory] = useState<AnalyzedPosition[]>([]);
  const [moves, setMoves] = useState<string[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(gamePosition !== null);
  const [fromGame, setFromGame] = useState(false);
  // Which positions Stockfish has already been asked about, so each is evaluated once.
  const requested = useRef(new Set<string>());
  // True only while the (fast) rules request for a move is in flight.
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = useHistoryNav(moves.length);

  const { fen: previewFen, resolvedNumber } = useStartingPreview(positionMode, number, shuffleKey);
  const analyzing = history.length > 0 && overview !== null;
  const latest = history[history.length - 1];
  const viewed = history[nav.ply] ?? latest;

  function requestEvaluation(index: number, fen: string) {
    const key = `${index}:${fen}`;
    if (requested.current.has(key)) return;
    requested.current.add(key);
    evaluatePosition(fen).then(
      (result) =>
        setHistory((h) =>
          // Skip it if that position was undone (and maybe replaced) while Stockfish was thinking.
          h.map((p, i) => (i === index && p.fen === fen ? { ...p, evaluation: result.evaluation } : p)),
        ),
      () => {
        requested.current.delete(key);
        setError("Stockfish couldn't evaluate that position");
      },
    );
  }

  // A replayed game arrives without evaluations; evaluate whichever position is on screen.
  useEffect(() => {
    if (history.length > 0 && viewed && viewed.evaluation === null) requestEvaluation(nav.ply, viewed.fen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.length, nav.ply, viewed?.fen, viewed?.evaluation]);

  const loadedLink = useRef<string | null>(null);
  useEffect(() => {
    const link = `${gamePosition}|${gameMoves}`;
    if (gamePosition === null || loadedLink.current === link) return;
    loadedLink.current = link;
    const number = Number(gamePosition);
    const line = parseMoveList(gameMoves);
    (async () => {
      try {
        const start = await fetchStartingPosition(number);
        const positions = line.length > 0 ? await replayMoves(start.fen, line) : [];
        requested.current.clear();
        setOverview(start.overview);
        setHistory([
          start,
          ...positions.map((p, i) => ({ ...p, evaluation: null, lastMove: { from: line[i].from, to: line[i].to } })),
        ]);
        setMoves(positions.map((p) => p.lastMoveSan ?? "?"));
        setFromGame(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load that game");
      } finally {
        setLoading(false);
      }
    })();
  }, [gamePosition, gameMoves]);

  async function loadPosition() {
    if (resolvedNumber === null) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchStartingPosition(resolvedNumber);
      setOverview(response.overview);
      setHistory([response]);
      setMoves([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load that position");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Two requests, so the board never waits for the engine: the rules endpoint answers in
   * milliseconds with the new position, which goes on the board straight away; Stockfish's
   * evaluation of it follows in the background and is filled in when it arrives.
   */
  async function handleMove(move: LegalMove) {
    if (!latest) return;
    setMoving(true);
    setError(null);
    try {
      const next = await applyMove(latest.fen, move.from, move.to, move.promotion);
      const index = history.length;
      setHistory((h) => [...h, { ...next, evaluation: null, lastMove: { from: move.from, to: move.to } }]);
      setMoves((m) => [...m, next.lastMoveSan ?? `${move.from}-${move.to}`]);
      requestEvaluation(index, next.fen);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That move was rejected");
    } finally {
      setMoving(false);
    }
  }

  function undo() {
    setHistory((h) => h.slice(0, -1));
    setMoves((m) => m.slice(0, -1));
  }

  function reset() {
    setHistory([]);
    setOverview(null);
    setMoves([]);
    setFromGame(false);
    requested.current.clear();
    if (gamePosition !== null) setSearchParams({});
  }

  const turn = viewed?.turn ?? "white";
  const gameOver = viewed ? viewed.status !== "IN_PROGRESS" : false;
  const bar = (color: "white" | "black") => (
    <PlayerBar
      color={color}
      name={color === "white" ? "White" : "Black"}
      detail={analyzing && !gameOver && turn === color ? "to move" : undefined}
      active={analyzing && !gameOver && turn === color}
    />
  );
  const bottomColor = flipped ? "black" : "white";
  const topColor = flipped ? "white" : "black";
  const notation = (
    <NotationPanel
      moves={moves}
      nav={nav}
      onFlip={() => setFlipped((f) => !f)}
      actions={
        analyzing && (
          <button
            type="button"
            className="icon-button"
            aria-label="Undo last move"
            title="Undo last move"
            disabled={moves.length === 0 || moving}
            onClick={undo}
          >
            <ResetIcon />
          </button>
        )
      }
    />
  );

  if (loading && gamePosition !== null && !analyzing) {
    return (
      <ChessPage
        title="Analyze your game"
        subtitle="Loading the game"
        left={
          <IdentityCard initial="#" tone="accent" title={`Position #${gamePosition}`} detail="Replaying the moves..." />
        }
        top={bar(topColor)}
        board={null}
        bottom={bar(bottomColor)}
        right={notation}
      />
    );
  }

  if (!analyzing || !viewed || !overview) {
    return (
      <ChessPage
        title="Analyze a position"
        subtitle="Pick a starting position, then play moves with a Stockfish evaluation after each one"
        headerAside={<PositionModeControl mode={positionMode} onChange={setPositionMode} />}
        left={
          <>
            <IdentityCard
              initial="#"
              tone="accent"
              title={resolvedNumber === null ? "Position" : `Position #${resolvedNumber}`}
              detail={resolvedNumber === 518 ? "Standard chess" : "Chess960"}
            />
            <SideCard>
              <PositionDetail
                mode={positionMode}
                number={number}
                onNumberChange={setNumber}
                onShuffle={() => setShuffleKey((k) => k + 1)}
                resolvedNumber={resolvedNumber}
              />
            </SideCard>
            <button className="big-button" onClick={loadPosition} disabled={loading || !previewFen}>
              {loading ? "Analyzing..." : "Analyze"}
            </button>
            {error && <p className="error-text">{error}</p>}
            <PreferenceToggles />
          </>
        }
        top={bar(topColor)}
        board={
          previewFen && (
            <Chessboard fen={previewFen} legalMoves={[]} orientation={flipped ? "b" : "w"} animateEntry disabled />
          )
        }
        bottom={bar(bottomColor)}
        right={notation}
      />
    );
  }

  return (
    <ChessPage
      title={fromGame ? "Analyze your game" : "Analyze a position"}
      subtitle={
        fromGame
          ? `Position #${overview.positionNumber ?? "?"} · ${moves.length} moves · step through with the arrow keys`
          : `Position #${overview.positionNumber ?? "?"} · Stockfish evaluates every position`
      }
      left={
        <>
          <IdentityCard
            initial="#"
            tone="accent"
            title={`Position #${overview.positionNumber ?? "?"}`}
            detail={overview.positionNumber === 518 ? "Standard chess" : "Chess960"}
          />
          <SideCard>
            <div className="side-section">
              <span className="side-label">Evaluation</span>
              <EvaluationBar evaluation={viewed.evaluation} turn={viewed.turn} />
              {gameOver && (
                <p className="side-status" style={{ marginTop: "var(--space-3)" }}>
                  {STATUS_LABEL[viewed.status] ?? viewed.status}
                  {viewed.winner && ` — ${viewed.winner === "white" ? "White" : "Black"} wins`}
                </p>
              )}
              {error && <p className="error-text">{error}</p>}
            </div>
            <div className="side-section">
              <span className="side-label">About this starting position</span>
              <OverviewCard overview={overview} />
            </div>
          </SideCard>
          <button className="big-button big-button-secondary" onClick={reset}>
            New position
          </button>
          <PreferenceToggles />
        </>
      }
      top={bar(topColor)}
      board={
        <Chessboard
          fen={viewed.fen}
          legalMoves={nav.isLatest && !gameOver && !moving ? latest.legalMoves : []}
          orientation={flipped ? "b" : "w"}
          onMove={handleMove}
          animateEntry={moves.length === 0}
          disabled={!nav.isLatest}
          lastMove={viewed.lastMove ?? null}
        />
      }
      bottom={bar(bottomColor)}
      right={notation}
    />
  );
}
