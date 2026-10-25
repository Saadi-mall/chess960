import { useState } from "react";
import { Link } from "react-router-dom";
import { Chessboard } from "../board/Chessboard";
import type { LegalMove } from "../board/types";
import { fetchDailyPosition, fetchStartingPosition, playMove } from "./api";
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
  const [positionMode, setPositionMode] = useState<"RANDOM" | "NUMBER" | "DAILY">("RANDOM");
  const [number, setNumber] = useState(518);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [current, setCurrent] = useState<AnalysisResponse | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPosition() {
    setLoading(true);
    setError(null);
    try {
      const chosenNumber =
        positionMode === "RANDOM"
          ? Math.floor(Math.random() * 960)
          : positionMode === "DAILY"
            ? (await fetchDailyPosition()).number
            : number;
      const response = await fetchStartingPosition(chosenNumber);
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
      <div className="analyze-setup">
        <h2>Set up a position</h2>
        <fieldset className="field-group">
          <legend>Starting position</legend>
          <label>
            <input type="radio" checked={positionMode === "RANDOM"} onChange={() => setPositionMode("RANDOM")} />
            Random Chess960 position
          </label>
          <label>
            <input type="radio" checked={positionMode === "NUMBER"} onChange={() => setPositionMode("NUMBER")} />
            Position number
            <input
              type="number"
              min={0}
              max={959}
              value={number}
              disabled={positionMode !== "NUMBER"}
              onChange={(e) => setNumber(Number(e.target.value))}
              className="number-input"
            />
          </label>
          <label>
            <input type="radio" checked={positionMode === "DAILY"} onChange={() => setPositionMode("DAILY")} />
            Today's lesson position
          </label>
        </fieldset>
        {error && <p className="error-text">{error}</p>}
        <button className="primary-button" onClick={loadPosition} disabled={loading}>
          {loading ? "Loading..." : "Analyze"}
        </button>
        <p className="analyze-chesscom-link">
          <Link to="/chesscom-import">Or see your Chess960 stats from Chess.com &rarr;</Link>
        </p>
      </div>
    );
  }

  const gameOver = current.status !== "IN_PROGRESS";

  return (
    <div className="analyze-view">
      <OverviewCard overview={overview} />

      <div className="analyze-board-row">
        <Chessboard
          fen={current.fen}
          legalMoves={gameOver ? [] : current.legalMoves}
          onMove={handleMove}
          animateEntry={moveHistory.length === 0}
        />
        <EvaluationBar evaluation={current.evaluation} turn={current.turn} />
      </div>

      {error && <p className="error-text">{error}</p>}

      {gameOver && (
        <p className="status-text status-over">
          {STATUS_LABEL[current.status] ?? current.status}
          {current.winner && ` — ${current.winner} wins`}
        </p>
      )}

      {moveHistory.length > 0 && (
        <ol className="move-history">
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
  );
}
