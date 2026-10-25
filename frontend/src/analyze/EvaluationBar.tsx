import type { Evaluation } from "./types";

interface EvaluationBarProps {
  evaluation: Evaluation;
  turn: "white" | "black";
}

/** UCI scores are from the side-to-move's perspective; this flips them to White's so the
 * bar and label read the same way regardless of whose turn it is. */
function whitePerspective(evaluation: Evaluation, turn: "white" | "black") {
  const sign = turn === "white" ? 1 : -1;
  return {
    scoreCentipawns: evaluation.scoreCentipawns === null ? null : sign * evaluation.scoreCentipawns,
    mateInMoves: evaluation.mateInMoves === null ? null : sign * evaluation.mateInMoves,
  };
}

export function EvaluationBar({ evaluation, turn }: EvaluationBarProps) {
  const { scoreCentipawns, mateInMoves } = whitePerspective(evaluation, turn);

  let label: string;
  let whiteFraction: number; // 0-1, how much of the bar is "White's"
  if (mateInMoves !== null) {
    label = mateInMoves > 0 ? `White mates in ${mateInMoves}` : `Black mates in ${-mateInMoves}`;
    whiteFraction = mateInMoves > 0 ? 1 : 0;
  } else {
    const pawns = (scoreCentipawns ?? 0) / 100;
    label = `${pawns > 0 ? "+" : ""}${pawns.toFixed(1)}`;
    // A smooth squash so the bar isn't pinned to the edges except for huge advantages.
    whiteFraction = 1 / (1 + Math.exp(-pawns / 3));
  }

  return (
    <div className="eval-bar-card sidebar-card">
      <div className="eval-bar">
        <div className="eval-bar-white" style={{ width: `${whiteFraction * 100}%` }} />
      </div>
      <span className="eval-label">{label}</span>
    </div>
  );
}
