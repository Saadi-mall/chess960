import type { LegalMove } from "../board/types";

export interface SideOverview {
  undefendedPawnSquares: string[];
  longDiagonalBishopSquares: string[];
  castlingDistance: number | null;
  weakestSquare: string | null;
  weakestSquareDefenders: number;
}

export interface Overview {
  positionNumber: number | null;
  white: SideOverview;
  black: SideOverview;
}

export interface Evaluation {
  /** From/to form, for comparing against a move the user played. */
  bestMoveUci: string | null;
  /** The same move in SAN, for display. */
  bestMoveSan: string | null;
  scoreCentipawns: number | null;
  mateInMoves: number | null;
  depth: number;
}

export interface AnalysisResponse {
  fen: string;
  legalMoves: LegalMove[];
  turn: "white" | "black";
  status: string;
  winner: "white" | "black" | null;
  /** SAN of the move that led here; null for a freshly loaded starting position. */
  lastMoveSan: string | null;
  overview: Overview | null;
  evaluation: Evaluation;
}

/** The rules-only result of a move: no engine evaluation. */
export interface PositionState {
  fen: string;
  legalMoves: LegalMove[];
  turn: "white" | "black";
  status: string;
  winner: "white" | "black" | null;
  lastMoveSan: string | null;
}

/** One position in the Analyze tab's line; evaluation is null until Stockfish answers. */
export interface AnalyzedPosition extends PositionState {
  evaluation: Evaluation | null;
}
