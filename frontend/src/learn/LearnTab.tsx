import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Chessboard, type BoardArrow, type SquareMarker } from "../board/Chessboard";
import { sanGivesCheck } from "../board/fen";
import { materialFromFen } from "../board/material";
import { squaresFromFen } from "../board/fen";
import type { LegalMove } from "../board/types";
import { ChessPage, IdentityCard, SideCard } from "../layout/ChessPage";
import { NotationPanel } from "../layout/NotationPanel";
import { PlayerBar } from "../layout/PlayerBar";
import { PreferenceToggles } from "../layout/Toggles";
import { useHistoryNav } from "../layout/useHistoryNav";
import { createGame } from "../play/api";
import { setSeat } from "../play/storage";
import { SegmentedControl } from "../SegmentedControl";
import { fetchLesson } from "./api";
import { useLessonProgress } from "./progress";
import type { Lesson, LegalMoveSan, MoveQuiz } from "./types";
import "./Learn.css";

type Step = "FEATURES" | "WEAKEST_PAWN" | "WHITE_MOVES" | "BLACK_MOVES" | "PLANS";

const STEPS: Array<{ step: Step; label: string }> = [
  { step: "FEATURES", label: "Key features" },
  { step: "WEAKEST_PAWN", label: "Find the weakest pawn" },
  { step: "WHITE_MOVES", label: "White's three best moves" },
  { step: "BLACK_MOVES", label: "Black's three best replies" },
  { step: "PLANS", label: "Plans for both sides" },
];

const GUESSES = 3;

function sameMove(a: { from: string; to: string; promotion: string | null }, b: typeof a) {
  return a.from === b.from && a.to === b.to && (a.promotion ?? null) === (b.promotion ?? null);
}

export function LearnTab() {
  const navigate = useNavigate();
  const progress = useLessonProgress();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("FEATURES");
  const [featureIndex, setFeatureIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [creatingGame, setCreatingGame] = useState(false);

  // Weakest-pawn step: the picked square, staged until Submit.
  const [pickedSquare, setPickedSquare] = useState<string | null>(null);
  const [pickHint, setPickHint] = useState<string | null>(null);
  // Best-move steps: up to three guesses, in any order, staged until Submit.
  const [guesses, setGuesses] = useState<LegalMoveSan[]>([]);
  const [answered, setAnswered] = useState(false);

  // Final answers, kept for the end of the lesson (signed-in learners send them to be graded).
  const [pawnAnswer, setPawnAnswer] = useState<string | null>(null);
  const [whiteAnswer, setWhiteAnswer] = useState<LegalMoveSan[]>([]);
  const [blackAnswer, setBlackAnswer] = useState<LegalMoveSan[]>([]);
  const [weakestCorrect, setWeakestCorrect] = useState(false);
  const [whiteFound, setWhiteFound] = useState(0);
  const [blackFound, setBlackFound] = useState(0);
  const [planFilter, setPlanFilter] = useState<"both" | "white" | "black">("both");

  // Steps through Stockfish's main line in the last step; before that the move list is empty.
  const nav = useHistoryNav(lesson?.mainLineMoves.length ?? 0);
  const idleNav = useHistoryNav(0);

  useEffect(() => {
    fetchLesson().then(
      (l) => {
        setLesson(l);
        // Start on the first feature that has something to show on the board.
        const firstVisual = l.features.findIndex((f) => f.arrows.length > 0 || f.squares.length > 0);
        setFeatureIndex(Math.max(0, firstVisual));
      },
      (e) => setError(e instanceof Error ? e.message : "Could not load today's lesson"),
    );
  }, []);

  const quiz: MoveQuiz | null =
    lesson && step === "WHITE_MOVES" ? lesson.whiteMoves : lesson && step === "BLACK_MOVES" ? lesson.blackMoves : null;

  function advance() {
    setAnswered(false);
    setPickedSquare(null);
    setPickHint(null);
    setGuesses([]);
    const index = STEPS.findIndex((s) => s.step === step);
    const next = STEPS[index + 1]?.step;
    if (!next) return;
    if (next === "PLANS" && lesson) {
      nav.first();
      const asGuess = (m: LegalMoveSan) => ({ from: m.from, to: m.to, promotion: m.promotion });
      void progress.record({
        weakestPawn: pawnAnswer,
        whiteGuesses: whiteAnswer.map(asGuess),
        blackGuesses: blackAnswer.map(asGuess),
      });
    }
    setStep(next);
  }

  function handlePickSquare(square: string) {
    if (!lesson || answered) return;
    if (squaresFromFen(lesson.fen)[square] !== "P") {
      setPickedSquare(null);
      setPickHint("Pick one of White's pawns.");
      return;
    }
    setPickHint(null);
    setPickedSquare(square);
  }

  function submitWeakestPawn() {
    if (!lesson || !pickedSquare) return;
    setWeakestCorrect(lesson.weakestPawn.answers.includes(pickedSquare));
    setPawnAnswer(pickedSquare);
    setAnswered(true);
  }

  function handleGuess(move: LegalMove) {
    if (!quiz || answered) return;
    const legal = quiz.legalMoves.find((m) => sameMove(m, { ...move, promotion: move.promotion ?? null }));
    if (!legal) return;
    setGuesses((g) => (g.length >= GUESSES || g.some((x) => sameMove(x, legal)) ? g : [...g, legal]));
  }

  function submitGuesses() {
    if (!quiz) return;
    const found = guesses.filter((g) => quiz.bestMoves.some((b) => sameMove(b, g))).length;
    if (step === "WHITE_MOVES") {
      setWhiteFound(found);
      setWhiteAnswer(guesses);
    } else {
      setBlackFound(found);
      setBlackAnswer(guesses);
    }
    setAnswered(true);
  }

  async function handlePlayWithFriend() {
    if (!lesson) return;
    setCreatingGame(true);
    try {
      const response = await createGame({
        positionMode: "NUMBER",
        number: lesson.number,
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

  // ---------- Board ----------

  const blackSide = step === "BLACK_MOVES";
  const orientation = blackSide !== flipped ? "b" : "w";
  let board = null;
  if (lesson) {
    if (step === "FEATURES") {
      const feature = lesson.features[featureIndex];
      board = (
        <Chessboard
          key={step}
          fen={lesson.fen}
          legalMoves={[]}
          orientation={orientation}
          arrows={feature?.arrows ?? []}
          markers={(feature?.squares ?? []).map((square) => ({ square, kind: "selected" as const }))}
          animateEntry
          disabled
        />
      );
    } else if (step === "WEAKEST_PAWN") {
      const markers: SquareMarker[] = [];
      if (answered) {
        lesson.weakestPawn.answers.forEach((square) => markers.push({ square, kind: "correct" }));
        if (pickedSquare && !weakestCorrect) markers.push({ square: pickedSquare, kind: "incorrect" });
      } else if (pickedSquare) {
        markers.push({ square: pickedSquare, kind: "selected" });
      }
      board = (
        <Chessboard
          key={step}
          fen={lesson.fen}
          legalMoves={[]}
          orientation={orientation}
          onSquareClick={handlePickSquare}
          markers={markers}
          disabled={answered}
        />
      );
    } else if (quiz) {
      const arrows: BoardArrow[] = answered
        ? [
            ...quiz.bestMoves.map((b) => ({ from: b.from, to: b.arrowTo, color: "good" as const })),
            ...guesses
              .filter((g) => !quiz.bestMoves.some((b) => sameMove(b, g)))
              .map((g) => ({ from: g.from, to: g.arrowTo, color: "bad" as const })),
          ]
        : guesses.map((g) => ({ from: g.from, to: g.arrowTo, color: "guess" as const }));
      board = (
        <Chessboard
          key={step}
          fen={quiz.fen}
          legalMoves={
            answered || guesses.length >= GUESSES
              ? []
              : quiz.legalMoves.map((m) => ({ from: m.from, to: m.to, promotion: (m.promotion ?? undefined) as LegalMove["promotion"] }))
          }
          orientation={orientation}
          onMove={handleGuess}
          arrows={arrows}
          disabled={answered}
          lastMove={
            // Black's quiz starts after White's best move - show which move that was.
            step === "BLACK_MOVES" && lesson.whiteMoves.bestMoves[0]
              ? { from: lesson.whiteMoves.bestMoves[0].from, to: lesson.whiteMoves.bestMoves[0].arrowTo }
              : null
          }
        />
      );
    } else {
      const arrows =
        nav.ply === 0
          ? lesson.plans.filter((p) => planFilter === "both" || p.side === planFilter).flatMap((p) => p.arrows)
          : [];
      board = (
        <Chessboard
          key={step}
          fen={lesson.mainLineFens[nav.ply] ?? lesson.fen}
          legalMoves={[]}
          orientation={orientation}
          arrows={arrows}
          lastMove={nav.ply > 0 ? lesson.mainLineSquares[nav.ply - 1] : null}
          inCheck={sanGivesCheck(lesson.mainLineMoves[nav.ply - 1])}
          disabled
        />
      );
    }
  }

  const sideToMove = quiz?.sideToMove;
  const bar = (color: "white" | "black") => (
    <PlayerBar
      color={color}
      name={color === "white" ? "White" : "Black"}
      detail={sideToMove === color && !answered ? "to move" : undefined}
      active={sideToMove === color && !answered}
      // Only the plans step's main line can have captures; every other step shows the start.
      material={step === "PLANS" && lesson ? materialFromFen(lesson.mainLineFens[nav.ply] ?? lesson.fen)[color] : undefined}
    />
  );

  // ---------- Left column content per step ----------

  const currentIndex = STEPS.findIndex((s) => s.step === step);
  let content = null;
  let action = null;

  if (!lesson) {
    content = error ? <p className="error-text">{error}</p> : <p className="side-text muted">Preparing today's lesson...</p>;
  } else if (step === "FEATURES") {
    content = (
      <>
        <p className="side-text muted">Click a feature to see it on the board.</p>
        <ul className="feature-list">
          {lesson.features.map((feature, i) => (
            <li key={feature.title}>
              <button
                type="button"
                className={i === featureIndex ? "feature-item feature-current" : "feature-item"}
                onClick={() => setFeatureIndex(i)}
              >
                <span className="feature-title">{feature.title}</span>
                {i === featureIndex && <span className="feature-text">{feature.text}</span>}
              </button>
            </li>
          ))}
        </ul>
      </>
    );
    action = (
      <button className="big-button" onClick={advance}>
        Start the questions
      </button>
    );
  } else if (step === "WEAKEST_PAWN") {
    content = (
      <>
        <p className="learn-prompt">{lesson.weakestPawn.question}</p>
        {!answered && (
          <p className="side-text muted">
            {pickHint ?? (pickedSquare ? `You picked ${pickedSquare}. Change it or submit.` : "Click a pawn on the board.")}
          </p>
        )}
        {answered && (
          <p className={`learn-feedback ${weakestCorrect ? "learn-feedback-correct" : "learn-feedback-wrong"}`}>
            {weakestCorrect ? "Correct! " : `Not quite - you picked ${pickedSquare}. `}
            {lesson.weakestPawn.explanation}
          </p>
        )}
      </>
    );
    action = answered ? (
      <button className="big-button" onClick={advance}>
        Next
      </button>
    ) : (
      <button className="big-button" onClick={submitWeakestPawn} disabled={!pickedSquare}>
        Submit
      </button>
    );
  } else if (quiz) {
    content = (
      <>
        <p className="learn-prompt">{quiz.prompt}</p>
        {!answered ? (
          <>
            <p className="side-text muted">
              Play a move on the board to add it. Remove one to change your mind.
            </p>
            <ol className="guess-list">
              {Array.from({ length: GUESSES }, (_, i) => guesses[i]).map((guess, i) => (
                <li key={i} className={guess ? "guess guess-filled" : "guess"}>
                  <span className="guess-number">{i + 1}</span>
                  <span className="guess-san">{guess ? guess.san : "-"}</span>
                  {guess && (
                    <button
                      type="button"
                      className="guess-remove"
                      aria-label={`Remove ${guess.san}`}
                      onClick={() => setGuesses((g) => g.filter((x) => x !== guess))}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <>
            <p
              className={`learn-feedback ${
                (step === "WHITE_MOVES" ? whiteFound : blackFound) > 0 ? "learn-feedback-correct" : "learn-feedback-wrong"
              }`}
            >
              You found {step === "WHITE_MOVES" ? whiteFound : blackFound} of Stockfish's top 3.
            </p>
            <ol className="best-list">
              {quiz.bestMoves.map((best) => {
                const found = guesses.some((g) => sameMove(g, best));
                return (
                  <li key={best.san} className={found ? "best best-found" : "best"}>
                    <span className="best-san">{best.san}</span>
                    <span className="best-score">{best.score}</span>
                    <span className="best-status">{found ? "Found" : "Missed"}</span>
                  </li>
                );
              })}
            </ol>
            {guesses.some((g) => !quiz.bestMoves.some((b) => sameMove(b, g))) && (
              <p className="side-text muted">
                Not in the top 3:{" "}
                {guesses
                  .filter((g) => !quiz.bestMoves.some((b) => sameMove(b, g)))
                  .map((g) => g.san)
                  .join(", ")}{" "}
                (red arrows).
              </p>
            )}
          </>
        )}
      </>
    );
    action = answered ? (
      <button className="big-button" onClick={advance}>
        Next
      </button>
    ) : (
      <button className="big-button" onClick={submitGuesses} disabled={guesses.length < GUESSES}>
        Submit {guesses.length}/{GUESSES}
      </button>
    );
  } else {
    content = (
      <>
        <SegmentedControl
          aria-label="Show plans for"
          options={[
            { value: "both" as const, label: "Both" },
            { value: "white" as const, label: "White" },
            { value: "black" as const, label: "Black" },
          ]}
          value={planFilter}
          onChange={(v) => {
            setPlanFilter(v);
            nav.first();
          }}
        />
        {lesson.plans.map((plan) => (
          <p key={plan.side} className="side-text plan-text">
            <span className={`plan-swatch plan-swatch-${plan.side}`} aria-hidden />
            {plan.text}
          </p>
        ))}
        <p className="side-text muted">Main line: {lesson.mainLine}. Step through it with the buttons on the right.</p>
        <div className="score-summary">
          <span>Weakest pawn: {weakestCorrect ? "correct" : "missed"}</span>
          <span>White's best moves: {whiteFound}/3</span>
          <span>Black's best replies: {blackFound}/3</span>
        </div>
        {progress.signedIn ? (
          <p className="side-text muted">
            {progress.saved === "yes"
              ? "Saved to your account."
              : progress.saved === "failed"
                ? "Couldn't save this to your account."
                : "Saving..."}
          </p>
        ) : (
          <p className="side-text muted">
            <Link to="/login" state={{ from: "/learn" }}>
              Log in
            </Link>{" "}
            to keep your streak and results on every device.
          </p>
        )}
      </>
    );
    action = (
      <button className="big-button" onClick={handlePlayWithFriend} disabled={creatingGame}>
        {creatingGame ? "Starting..." : "Play this position with a friend"}
      </button>
    );
  }

  return (
    <ChessPage
      title="Daily lesson"
      subtitle="One Chess960 position a day, the same for everyone"
      headerAside={
        <span className="streak-pill">
          {progress.streak > 0 ? `${progress.streak} day streak` : "Start a streak today"}
        </span>
      }
      left={
        <>
          <IdentityCard
            initial="#"
            tone="accent"
            title={lesson ? `Position #${lesson.number}` : "Today's position"}
            detail={lesson ? `Stockfish: ${lesson.evaluation}` : "Loading"}
          />
          <SideCard>
            <div className="side-section learn-body">{content}</div>
          </SideCard>
          {action}
          <PreferenceToggles />
        </>
      }
      top={bar(orientation === "w" ? "black" : "white")}
      board={board}
      bottom={bar(orientation === "w" ? "white" : "black")}
      right={
        <>
          <SideCard>
            <div className="side-section">
              <span className="side-label">Lesson</span>
              <ol className="learn-steps">
                {STEPS.map((s, i) => {
                  const state = i < currentIndex ? "done" : i === currentIndex ? "current" : "todo";
                  return (
                    <li key={s.step} className={`learn-step learn-step-${state}`}>
                      <span className="learn-step-number">{i + 1}</span>
                      {s.label}
                    </li>
                  );
                })}
              </ol>
            </div>
          </SideCard>
          <NotationPanel
            moves={step === "PLANS" && lesson ? lesson.mainLineMoves : []}
            nav={step === "PLANS" ? nav : idleNav}
            onFlip={() => setFlipped((f) => !f)}
          />
        </>
      }
    />
  );
}
