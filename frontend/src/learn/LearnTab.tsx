import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDailyPosition, fetchStartingPosition, playMove } from "../analyze/api";
import { OverviewCard } from "../analyze/OverviewCard";
import type { Evaluation, Overview } from "../analyze/types";
import { Chessboard, type SquareMarker } from "../board/Chessboard";
import type { LegalMove } from "../board/types";
import { BoardLayout } from "../layout/BoardLayout";
import { PlayerBar } from "../layout/PlayerBar";
import { createGame } from "../play/api";
import { setSeat } from "../play/storage";
import { getStreak, recordCompletionToday } from "./streak";
import { parseUci } from "./uci";
import "../analyze/Analyze.css";
import "./Learn.css";

type Step = "LOADING" | "OVERVIEW" | "WEAKEST_SQUARE" | "WHITE_MOVE" | "BLACK_MOVE" | "DONE";

const STEPS: Array<{ step: Step; label: string }> = [
  { step: "OVERVIEW", label: "Read the position" },
  { step: "WEAKEST_SQUARE", label: "Find the weakest square" },
  { step: "WHITE_MOVE", label: "Find White's best move" },
  { step: "BLACK_MOVE", label: "Find Black's best reply" },
];

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
  // choice" works: nothing is graded until a submit handler runs.
  const [pickedSquare, setPickedSquare] = useState<string | null>(null);
  const [proposedMove, setProposedMove] = useState<LegalMove | null>(null);
  const [markers, setMarkers] = useState<SquareMarker[]>([]);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  const [answered, setAnswered] = useState(false);
  const [checking, setChecking] = useState(false);
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
    const defenders = overview.white.weakestSquareDefenders;
    if (correct === null) {
      setFeedback("Every White piece here already has a defender - no weak square to find.");
      setMarkers([]);
      setLastCorrect(null);
    } else if (pickedSquare === correct) {
      setFeedback(`Correct! ${correct} has only ${defenders} defender${defenders === 1 ? "" : "s"}.`);
      setMarkers([{ square: correct, kind: "correct" }]);
      setLastCorrect(true);
    } else {
      setFeedback(
        `Not quite - the weakest square is ${correct}, with only ${defenders} defender${defenders === 1 ? "" : "s"}.`,
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
    const bestSan = evaluation.bestMoveSan ?? `${best.from}-${best.to}`;
    const isCorrect =
      proposedMove.from === best.from &&
      proposedMove.to === best.to &&
      (proposedMove.promotion ?? undefined) === best.promotion;

    setChecking(true);
    try {
      // Advance along Stockfish's line regardless of the guess, so the next step's
      // position is always the well-analyzed one.
      const response = await playMove(fen, best.from, best.to, best.promotion);
      setFen(response.fen);
      setLegalMoves(response.legalMoves);
      setEvaluation(response.evaluation);
      setFeedback(
        isCorrect
          ? `Correct! ${bestSan} is ${side === "white" ? "White" : "Black"}'s best move here.`
          : `Stockfish's top choice was ${bestSan}. Your move is marked in red.`,
      );
      const bestSquares: SquareMarker[] = [
        { square: best.from, kind: "correct" },
        { square: best.to, kind: "correct" },
      ];
      setMarkers(
        isCorrect
          ? bestSquares
          : [
              ...bestSquares,
              { square: proposedMove.from, kind: "incorrect" },
              { square: proposedMove.to, kind: "incorrect" },
            ],
      );
      setLastCorrect(isCorrect);
      setAnswered(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check that move");
    } finally {
      setChecking(false);
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

  const blackToMove = step === "BLACK_MOVE";
  const quizActive = step === "WHITE_MOVE" || step === "BLACK_MOVE";
  const bar = (color: "white" | "black") => {
    const toMove = quizActive && !answered && (color === "black") === blackToMove;
    return (
      <PlayerBar
        color={color}
        name={color === "white" ? "White" : "Black"}
        detail={toMove ? "to move" : undefined}
        active={toMove}
      />
    );
  };
  const orientation = blackToMove ? "b" : "w";

  let board = null;
  if (fen) {
    if (step === "WEAKEST_SQUARE") {
      board = (
        <Chessboard
          key={step}
          fen={fen}
          legalMoves={[]}
          onSquareClick={handlePickSquare}
          markers={markers}
          disabled={answered}
        />
      );
    } else if (quizActive) {
      board = (
        <Chessboard
          key={step}
          fen={fen}
          legalMoves={checking ? [] : legalMoves}
          orientation={orientation}
          onMove={handleProposeMove}
          markers={markers}
          disabled={answered || checking}
        />
      );
    } else {
      board = <Chessboard key={step} fen={fen} legalMoves={[]} animateEntry={step === "OVERVIEW"} disabled />;
    }
  }

  const prompt =
    step === "WEAKEST_SQUARE"
      ? "Click the White piece with the fewest defenders, then submit."
      : step === "WHITE_MOVE"
        ? "Find White's best first move, then submit."
        : step === "BLACK_MOVE"
          ? "Now find Black's best reply, then submit."
          : null;
  const canSubmit = step === "WEAKEST_SQUARE" ? pickedSquare !== null : proposedMove !== null;
  const currentIndex = STEPS.findIndex((s) => s.step === step);

  let action;
  if (step === "OVERVIEW") {
    action = (
      <button className="primary-button" onClick={advance}>
        Start
      </button>
    );
  } else if (step === "DONE") {
    action = (
      <button className="primary-button" onClick={handlePlayWithFriend} disabled={creatingGame}>
        {creatingGame ? "Starting..." : "Play this position with a friend"}
      </button>
    );
  } else if (answered) {
    action = (
      <button className="primary-button" onClick={advance}>
        {step === "BLACK_MOVE" ? "Finish" : "Next"}
      </button>
    );
  } else if (step !== "LOADING") {
    action = (
      <button
        className="primary-button"
        disabled={!canSubmit || checking}
        onClick={() =>
          step === "WEAKEST_SQUARE" ? handleSubmitWeakestSquare() : handleSubmitMove(blackToMove ? "black" : "white")
        }
      >
        {checking ? "Checking..." : "Submit"}
      </button>
    );
  }

  return (
    <BoardLayout
      top={bar(orientation === "w" ? "black" : "white")}
      board={board}
      bottom={bar(orientation === "w" ? "white" : "black")}
      panel={
        <>
          <div className="panel-section">
            <p className="panel-heading">Daily lesson{dailyNumber !== null ? ` · Position #${dailyNumber}` : ""}</p>
            <p className="learn-streak">
              {streak.currentStreak > 0
                ? `${streak.currentStreak} day streak`
                : "Complete today's lesson to start a streak"}
            </p>
          </div>

          <div className="panel-section">
            <ol className="learn-steps">
              {STEPS.map((s, i) => {
                const state = step === "DONE" || i < currentIndex ? "done" : i === currentIndex ? "current" : "todo";
                return (
                  <li key={s.step} className={`learn-step learn-step-${state}`}>
                    <span className="learn-step-number">{i + 1}</span>
                    {s.label}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="panel-section panel-section-grow learn-body">
            {step === "LOADING" && !error && <p className="panel-note">Loading today's lesson...</p>}
            {step === "OVERVIEW" && overview && (
              <>
                <OverviewCard overview={overview} />
                <p className="panel-note">A few facts about today's position. Then find the best moves.</p>
              </>
            )}
            {prompt && <p className="learn-prompt">{prompt}</p>}
            {feedback && (
              <p
                className={`learn-feedback ${
                  lastCorrect === true ? "learn-feedback-correct" : lastCorrect === false ? "learn-feedback-wrong" : ""
                }`}
              >
                {feedback}
              </p>
            )}
            {step === "DONE" && (
              <p className="learn-prompt">
                Lesson complete - {streak.currentStreak} day{streak.currentStreak === 1 ? "" : "s"} in a row. Come
                back tomorrow for a new position.
              </p>
            )}
            {error && <p className="error-text">{error}</p>}
          </div>

          {action && <div className="panel-section">{action}</div>}
        </>
      }
    />
  );
}
