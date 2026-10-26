import { useState } from "react";
import { Link } from "react-router-dom";
import { Chessboard } from "../board/Chessboard";
import type { LegalMove } from "../board/types";
import { BoardLayout } from "../layout/BoardLayout";
import { MoveList } from "../layout/MoveList";
import { PlayerBar } from "../layout/PlayerBar";
import { PositionPicker } from "../positions/PositionPicker";
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
  const [current, setCurrent] = useState<AnalysisResponse | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
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
    setThinking(true);
    setError(null);
    try {
      const response = await playMove(current.fen, move.from, move.to, move.promotion);
      setCurrent(response);
      if (response.lastMoveSan) {
        const san = response.lastMoveSan;
        setMoveHistory((history) => [...history, san]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "That move was rejected");
    } finally {
      setThinking(false);
    }
  }

  function sideBar(color: "white" | "black", toMove: boolean) {
    return (
      <PlayerBar
        color={color}
        name={color === "white" ? "White" : "Black"}
        detail={toMove ? "to move" : undefined}
        active={toMove}
      />
    );
  }

  if (!current || !overview) {
    return (
      <BoardLayout
        top={sideBar("black", false)}
        board={previewFen && <Chessboard fen={previewFen} legalMoves={[]} animateEntry disabled />}
        bottom={sideBar("white", false)}
        panel={
          <>
            <div className="panel-section">
              <h2>Analyze a position</h2>
              <p className="panel-note">
                Pick a starting position to see facts about it, then play moves with a Stockfish evaluation
                after each one.
              </p>
            </div>
            <div className="panel-section panel-section-grow">
              <PositionPicker
                mode={positionMode}
                onModeChange={setPositionMode}
                number={number}
                onNumberChange={setNumber}
                onShuffle={() => setShuffleKey((k) => k + 1)}
                resolvedNumber={resolvedNumber}
              />
            </div>
            <div className="panel-section">
              <button className="primary-button" onClick={loadPosition} disabled={loading || !previewFen}>
                {loading ? "Analyzing..." : "Analyze"}
              </button>
              {error && <p className="error-text">{error}</p>}
              <Link className="analyze-chesscom-link" to="/chesscom-import">
                Or see your Chess960 stats from Chess.com &rarr;
              </Link>
            </div>
          </>
        }
      />
    );
  }

  const gameOver = current.status !== "IN_PROGRESS";

  return (
    <BoardLayout
      top={sideBar("black", !gameOver && current.turn === "black")}
      board={
        <Chessboard
          fen={current.fen}
          legalMoves={gameOver || thinking ? [] : current.legalMoves}
          onMove={handleMove}
          animateEntry={moveHistory.length === 0}
        />
      }
      bottom={sideBar("white", !gameOver && current.turn === "white")}
      panel={
        <>
          <div className="panel-section">
            <p className="panel-heading">Evaluation{thinking ? " · thinking..." : ""}</p>
            <EvaluationBar evaluation={current.evaluation} turn={current.turn} />
            {gameOver && (
              <p className="panel-status" style={{ marginTop: "var(--space-3)" }}>
                {STATUS_LABEL[current.status] ?? current.status}
                {current.winner && ` — ${current.winner === "white" ? "White" : "Black"} wins`}
              </p>
            )}
            {error && <p className="error-text">{error}</p>}
          </div>

          <div className="panel-section">
            <OverviewCard overview={overview} />
          </div>

          <div className="panel-section panel-section-grow">
            <p className="panel-heading">Moves</p>
            <MoveList moves={moveHistory} />
          </div>

          <div className="panel-section">
            <button
              className="secondary-button"
              style={{ width: "100%" }}
              onClick={() => {
                setCurrent(null);
                setOverview(null);
              }}
            >
              New position
            </button>
          </div>
        </>
      }
    />
  );
}
