import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDailyPosition, fetchStartingPosition, playMove } from "../analyze/api";
import { OverviewCard } from "../analyze/OverviewCard";
import type { Evaluation, Overview } from "../analyze/types";
import { Chessboard, type SquareMarker } from "../board/Chessboard";
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

  // The learner's pending answer for the current step, before they press Submit - a
  // square for the weakest-square quiz, a move for the two "find the best move" steps.
  // Picking again before submitting just overwrites these, which is how "change your
  // choice" works: nothing is graded until handleSubmit runs.
  const [pickedSquare, setPickedSquare] = useState<string | null>(null);
  const [proposedMove, setProposedMove] = useState<LegalMove | null>(null);
  const [markers, setMarkers] = useState<SquareMarker[]>([]);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

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

  function handlePickSquare(square: string) {
    if (answered) return;
    setPickedSquare(square);
  }

  function handleProposeMove(move: LegalMove) {
    if (answered) return;
    setProposedMove(move);
    setMarkers([
      { square: move.from, kind: "selected" },
      { square: move.to, kind: "selected" },
    ]);
  }

  function handleSubmitWeakestSquare() {
    if (!overview || pickedSquare === null) return;
    const correct = overview.white.weakestSquare;
    if (correct === null) {
      setFeedback("Every White piece here already has a defender - no weak square to find.");
      setMarkers([]);
      setLastCorrect(null);
    } else if (pickedSquare === correct) {
      setFeedback(
        `Correct! ${correct} has only ${overview.white.weakestSquareDefenders} defender(s).`,
      );
      setMarkers([{ square: correct, kind: "correct" }]);
      setLastCorrect(true);
    } else {
      setFeedback(
        `Not quite - the weakest square is ${correct}, with only ${overview.white.weakestSquareDefenders} defender(s).`,
      );
      setMarkers([
        { square: correct, kind: "correct" },
        { square: pickedSquare, kind: "incorrect" },
      ]);
      setLastCorrect(false);
    }
    setAnswered(true);
  }

  async function handleSubmitMove(side: "white" | "black") {
    if (!evaluation?.bestMoveUci || !proposedMove) return;
    const best = parseUci(evaluation.bestMoveUci);
    const isCorrect =
      proposedMove.from === best.from &&
      proposedMove.to === best.to &&
      (proposedMove.promotion ?? undefined) === best.promotion;

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
          : `Stockfish's top choice was ${formatUci(evaluation.bestMoveUci)}, not ${proposedMove.from}-${proposedMove.to}.`,
      );
      setMarkers(
        isCorrect
          ? [
              { square: best.from, kind: "correct" },
              { square: best.to, kind: "correct" },
            ]
          : [
              { square: best.from, kind: "correct" },
              { square: best.to, kind: "correct" },
              { square: proposedMove.from, kind: "incorrect" },
              { square: proposedMove.to, kind: "incorrect" },
            ],
      );
      setLastCorrect(isCorrect);
      setAnswered(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check that move");
    }
  }

  function advance() {
    setFeedback(null);
    setAnswered(false);
    setPickedSquare(null);
    setProposedMove(null);
    setMarkers([]);
    setLastCorrect(null);
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
      <div className="board-page">
        <div className="board-page-board">
          <Chessboard fen={fen} legalMoves={[]} disabled />
        </div>
        <div className="board-page-panel">
          {streakLine}
          <OverviewCard overview={overview} />
          <div className="panel-card">
            <p className="learn-prompt">
              Today's position is #{overview.positionNumber ?? "?"}. A few facts about it
              above, then find the best moves.
            </p>
            <button className="primary-button" onClick={advance} style={{ marginTop: "var(--space-3)" }}>
              Start
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "DONE") {
    return (
      <div className="board-page">
        <div className="board-page-board">
          <Chessboard fen={fen} legalMoves={[]} disabled />
        </div>
        <div className="board-page-panel">
          {streakLine}
          <div className="panel-card">
            <p className="learn-prompt">
              Lesson complete - {streak.currentStreak} day{streak.currentStreak === 1 ? "" : "s"}{" "}
              in a row.
            </p>
            <button
              className="primary-button"
              onClick={handlePlayWithFriend}
              disabled={creatingGame}
              style={{ marginTop: "var(--space-3)" }}
            >
              {creatingGame ? "Starting..." : "Play this position with a friend"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const prompt =
    step === "WEAKEST_SQUARE"
      ? "Click the White piece with the fewest defenders, then submit."
      : step === "WHITE_MOVE"
        ? "Find White's best first move, then submit."
        : "Now find Black's best reply, then submit.";
  const nextLabel = step === "BLACK_MOVE" ? "Finish" : "Next";
  const canSubmit =
    step === "WEAKEST_SQUARE" ? pickedSquare !== null : proposedMove !== null;

  return (
    <div className="board-page">
      <div className="board-page-board">
        {step === "WEAKEST_SQUARE" && (
          <Chessboard
            fen={fen}
            legalMoves={[]}
            onSquareClick={handlePickSquare}
            markers={markers}
            disabled={answered}
          />
        )}
        {step === "WHITE_MOVE" && (
          <Chessboard
            fen={fen}
            legalMoves={legalMoves}
            onMove={handleProposeMove}
            markers={markers}
            disabled={answered}
          />
        )}
        {step === "BLACK_MOVE" && (
          <Chessboard
            fen={fen}
            legalMoves={legalMoves}
            orientation="b"
            onMove={handleProposeMove}
            markers={markers}
            disabled={answered}
          />
        )}
      </div>

      <div className="board-page-panel">
        {streakLine}
        <p className="learn-prompt panel-card">{prompt}</p>
        {feedback && (
          <p
            className={`learn-feedback panel-card ${
              lastCorrect === true ? "success-text" : lastCorrect === false ? "error-text" : ""
            }`}
          >
            {feedback}
          </p>
        )}
        {!answered && (
          <button
            className="primary-button"
            disabled={!canSubmit}
            onClick={() =>
              step === "WEAKEST_SQUARE"
                ? handleSubmitWeakestSquare()
                : handleSubmitMove(step === "WHITE_MOVE" ? "white" : "black")
            }
          >
            Submit
          </button>
        )}
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
