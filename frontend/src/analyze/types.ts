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
  bestMoveUci: string | null;
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
  overview: Overview | null;
  evaluation: Evaluation;
}
