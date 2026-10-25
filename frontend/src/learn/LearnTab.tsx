import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDailyPosition, fetchStartingPosition, playMove } from "../analyze/api";
import { OverviewCard } from "../analyze/OverviewCard";
import type { Evaluation, Overview } from "../analyze/types";
import { Chessboard } from "../board/Chessboard";
import type { LegalMove } from "../board/types";
import { createGame } from "../play/api";
import { setSeat } from "../play/storage";
import { getStreak, recordCompletionToday } from "./streak";
import { parseUci } from "./uci";
import "./Learn.css";

type Step = "LOADING" | "OVERVIEW" | "WEAKEST_SQUARE" | "WHITE_MOVE" | "BLACK_MOVE" | "DONE";

export function LearnTab() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("LOADING");
  const [dailyNumber, setDailyNumber] = useState<number | null>(null);
  const [fen, setFen] = useState("");
  const [legalMoves, setLegalMoves] = useState<LegalMove[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState(getStreak());
  const [creatingGame, setCreatingGame] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const daily = await fetchDailyPosition();
        const response = await fetchStartingPosition(daily.number);
        setDailyNumber(daily.number);
        setFen(response.fen);
        setLegalMoves(response.legalMoves);
        setOverview(response.overview);
        setEvaluation(response.evaluation);
        setStep("OVERVIEW");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load today's lesson");
      }
    })();
  }, []);

  function handleWeakestSquareGuess(square: string) {
    if (!overview || answered) return;
    const correct = overview.white.weakestSquare;
    if (correct === null) {
      setFeedback("Every White piece here already has a defender - no weak square to find.");
    } else if (square === correct) {
      setFeedback(
        `Correct! ${correct} has only ${overview.white.weakestSquareDefenders} defender(s).`,
      );
    } else {
      setFeedback(
        `Not quite - the weakest square is ${correct}, with only ${overview.white.weakestSquareDefenders} defender(s).`,
      );
    }
    setAnswered(true);
  }

  async function handleMoveGuess(move: LegalMove, side: "white" | "black") {
    if (!evaluation?.bestMoveUci || answered) return;
    const best = parseUci(evaluation.bestMoveUci);
    const isCorrect =
      move.from === best.from && move.to === best.to && (move.promotion ?? undefined) === best.promotion;

    try {
      // Advance along Stockfish's line regardless of the guess, so the next step's
      // position is always the well-analyzed one.
      const response = await playMove(fen, best.from, best.to, best.promotion);
      setFen(response.fen);
      setLegalMoves(response.legalMoves);
      setEvaluation(response.evaluation);
      setFeedback(
        isCorrect
          ? `Correct! ${sideLabel(side)}'s best move here is ${formatUci(evaluation.bestMoveUci)}.`
          : `Stockfish's top choice was ${formatUci(evaluation.bestMoveUci)}, not ${move.from}-${move.to}.`,
      );
      setAnswered(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check that move");
    }
  }

  function advance() {
    setFeedback(null);
    setAnswered(false);
    if (step === "OVERVIEW") setStep("WEAKEST_SQUARE");
    else if (step === "WEAKEST_SQUARE") setStep("WHITE_MOVE");
    else if (step === "WHITE_MOVE") setStep("BLACK_MOVE");
    else if (step === "BLACK_MOVE") {
      setStreak(recordCompletionToday());
      setStep("DONE");
    }
  }

  async function handlePlayWithFriend() {
    if (dailyNumber === null) return;
    setCreatingGame(true);
    setError(null);
    try {
      const response = await createGame({
        positionMode: "NUMBER",
        number: dailyNumber,
        initialSeconds: 300,
        incrementSeconds: 0,
      });
      setSeat(response.gameId, { token: response.token, color: response.color });
      navigate(`/play/${response.gameId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start a game");
    } finally {
      setCreatingGame(false);
    }
  }

  if (error) return <p className="error-text">{error}</p>;
  if (step === "LOADING" || !overview) return <p className="status-text">Loading today's lesson...</p>;

  const streakLine = (
    <p className="learn-streak">
      {streak.currentStreak > 0
        ? `${streak.currentStreak} day streak`
        : "Complete today's lesson to start a streak"}
    </p>
  );

  if (step === "OVERVIEW") {
    return (
      <div className="learn-intro centered-page">
        {streakLine}
        <OverviewCard overview={overview} />
        <p className="learn-prompt">
          Today's position is #{overview.positionNumber ?? "?"}. A few facts about it above,
          then find the best moves.
        </p>
        <button className="primary-button" onClick={advance}>
          Start
        </button>
      </div>
    );
  }

  if (step === "DONE") {
    return (
      <div className="learn-intro centered-page">
        {streakLine}
        <p className="learn-prompt">
          Lesson complete - {streak.currentStreak} day{streak.currentStreak === 1 ? "" : "s"} in a
          row.
        </p>
        <button className="primary-button" onClick={handlePlayWithFriend} disabled={creatingGame}>
          {creatingGame ? "Starting..." : "Play this position with a friend"}
        </button>
      </div>
    );
  }

  const prompt =
    step === "WEAKEST_SQUARE"
      ? "Click the White piece with the fewest defenders."
      : step === "WHITE_MOVE"
        ? "Find White's best first move."
        : "Now find Black's best reply.";
  const nextLabel = step === "BLACK_MOVE" ? "Finish" : "Next";

  return (
    <div className="board-page">
      <div className="board-page-board">
        {step === "WEAKEST_SQUARE" && (
          <Chessboard fen={fen} legalMoves={[]} onSquareClick={handleWeakestSquareGuess} />
        )}
        {step === "WHITE_MOVE" && (
          <Chessboard
            fen={fen}
            legalMoves={answered ? [] : legalMoves}
            onMove={(move) => handleMoveGuess(move, "white")}
          />
        )}
        {step === "BLACK_MOVE" && (
          <Chessboard
            fen={fen}
            legalMoves={answered ? [] : legalMoves}
            orientation="b"
            onMove={(move) => handleMoveGuess(move, "black")}
          />
        )}
      </div>

      <div className="board-page-sidebar">
        {streakLine}
        <p className="learn-prompt sidebar-card">{prompt}</p>
        {feedback && <p className="learn-feedback sidebar-card">{feedback}</p>}
        {answered && (
          <button className="primary-button" onClick={advance}>
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function sideLabel(side: "white" | "black"): string {
  return side === "white" ? "White" : "Black";
}

function formatUci(uci: string): string {
  const { from, to, promotion } = parseUci(uci);
  return `${from}-${to}${promotion ? `=${promotion.toUpperCase()}` : ""}`;
}
