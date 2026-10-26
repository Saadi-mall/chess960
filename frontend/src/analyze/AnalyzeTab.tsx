import { useState } from "react";
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
import { fetchStartingPosition, playMove } from "./api";
import { EvaluationBar } from "./EvaluationBar";
import { OverviewCard } from "./OverviewCard";
import type { AnalysisResponse, Overview } from "./types";
import "./Analyze.css";

const STATUS_LABEL: Record<string, string> = {
  CHECKMATE: "Checkmate",
  STALEMATE: "Stalemate",
  DRAW_INSUFFICIENT_MATERIAL: "Draw - insufficient material",
  DRAW_FIFTY_MOVE: "Draw by the 50-move rule",
};

export function AnalyzeTab() {
  const [positionMode, setPositionMode] = useState<PositionMode>("RANDOM");
  const [number, setNumber] = useState(518);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [overview, setOverview] = useState<Overview | null>(null);
  // Every analyzed position so far: [0] is the start, [i] is after i moves. Keeping the
  // whole response (not just the FEN) lets the evaluation follow the back/forward buttons.
  const [history, setHistory] = useState<AnalysisResponse[]>([]);
  const [moves, setMoves] = useState<string[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = useHistoryNav(moves.length);

  const { fen: previewFen, resolvedNumber } = useStartingPreview(positionMode, number, shuffleKey);
  const analyzing = history.length > 0 && overview !== null;
  const latest = history[history.length - 1];
  const viewed = history[nav.ply] ?? latest;

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

  async function handleMove(move: LegalMove) {
    if (!latest) return;
    setThinking(true);
    setError(null);
    try {
      const response = await playMove(latest.fen, move.from, move.to, move.promotion);
      setHistory((h) => [...h, response]);
      setMoves((m) => [...m, response.lastMoveSan ?? `${move.from}-${move.to}`]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That move was rejected");
    } finally {
      setThinking(false);
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
            disabled={moves.length === 0 || thinking}
            onClick={undo}
          >
            <ResetIcon />
          </button>
        )
      }
    />
  );

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
      title="Analyze a position"
      subtitle={`Position #${overview.positionNumber ?? "?"} · Stockfish evaluates every position`}
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
              <span className="side-label">Evaluation{thinking ? " · thinking..." : ""}</span>
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
          legalMoves={nav.isLatest && !gameOver && !thinking ? latest.legalMoves : []}
          orientation={flipped ? "b" : "w"}
          onMove={handleMove}
          animateEntry={moves.length === 0}
          disabled={!nav.isLatest}
        />
      }
      bottom={bar(bottomColor)}
      right={notation}
    />
  );
}
