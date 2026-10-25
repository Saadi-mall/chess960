import { useState } from "react";
import { Link } from "react-router-dom";
import { Chessboard } from "../board/Chessboard";
import type { LegalMove } from "../board/types";
import { SegmentedControl } from "../SegmentedControl";
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

const POSITION_MODE_OPTIONS = [
  { value: "RANDOM" as const, label: "Random" },
  { value: "NUMBER" as const, label: "Number" },
  { value: "DAILY" as const, label: "Today's lesson" },
];

export function AnalyzeTab() {
  const [positionMode, setPositionMode] = useState<"RANDOM" | "NUMBER" | "DAILY">("RANDOM");
  const [number, setNumber] = useState(518);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [current, setCurrent] = useState<AnalysisResponse | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { fen: previewFen, resolvedNumber } = useStartingPreview(positionMode, number, shuffleKey);

  async function loadPosition() {
    if (resolvedNumber === null) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchStartingPosition(resolvedNumber);
      setOverview(response.overview);
      setCurrent(response);
      setMoveHistory([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load that position");
    } finally {
      setLoading(false);
    }
  }

  async function handleMove(move: LegalMove) {
    if (!current) return;
    try {
      const response = await playMove(current.fen, move.from, move.to, move.promotion);
      setCurrent(response);
      setMoveHistory((history) => [
        ...history,
        move.from + move.to + (move.promotion ?? ""),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That move was rejected");
    }
  }

  if (!current || !overview) {
    return (
      <div className="board-page">
        <div className="board-page-board">
          {previewFen && <Chessboard fen={previewFen} legalMoves={[]} animateEntry />}
        </div>

        <div className="board-page-panel">
          <div className="panel-card">
            <h2>Set up a position</h2>

            <div className="form-section">
              <span className="form-section-label">Starting position</span>
              <SegmentedControl
                aria-label="Starting position"
                options={POSITION_MODE_OPTIONS}
                value={positionMode}
                onChange={setPositionMode}
              />
              {positionMode === "NUMBER" && (
                <input
                  type="number"
                  min={0}
                  max={959}
                  value={number}
                  onChange={(e) => setNumber(Number(e.target.value))}
                  className="number-input"
                  aria-label="Chess960 position number"
                  style={{ marginTop: "var(--space-2)" }}
                />
              )}
              {positionMode === "RANDOM" && (
                <button
                  type="button"
                  className="secondary-button"
                  style={{ marginTop: "var(--space-2)", width: "100%" }}
                  onClick={() => setShuffleKey((k) => k + 1)}
                >
                  Shuffle again
                </button>
              )}
              {resolvedNumber !== null && (
                <p className="status-text" style={{ margin: "var(--space-2) 0 0" }}>
                  Position #{resolvedNumber}
                </p>
              )}
            </div>

            {error && <p className="error-text">{error}</p>}

            <button className="primary-button" onClick={loadPosition} disabled={loading || !previewFen}>
              {loading ? "Loading..." : "Analyze"}
            </button>
          </div>

          <p className="analyze-chesscom-link">
            <Link to="/chesscom-import">Or see your Chess960 stats from Chess.com &rarr;</Link>
          </p>
        </div>
      </div>
    );
  }

  const gameOver = current.status !== "IN_PROGRESS";

  return (
    <div className="board-page">
      <div className="board-page-board">
        <Chessboard
          fen={current.fen}
          legalMoves={gameOver ? [] : current.legalMoves}
          onMove={handleMove}
          animateEntry={moveHistory.length === 0}
        />
      </div>

      <div className="board-page-panel">
        <EvaluationBar evaluation={current.evaluation} turn={current.turn} />
        <OverviewCard overview={overview} />

        {error && <p className="error-text">{error}</p>}

        {gameOver && (
          <p className="status-text status-over">
            {STATUS_LABEL[current.status] ?? current.status}
            {current.winner && ` — ${current.winner} wins`}
          </p>
        )}

        {moveHistory.length > 0 && (
          <ol className="move-history panel-card">
            {moveHistory.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ol>
        )}

        <button
          className="secondary-button"
          onClick={() => {
            setCurrent(null);
            setOverview(null);
          }}
        >
          New position
        </button>
      </div>
    </div>
  );
}
