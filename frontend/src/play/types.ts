import type { LegalMove } from "../board/types";

export interface GameStateMessage {
  type: "STATE";
  fen: string;
  startingNumber: number;
  initialSeconds: number;
  incrementSeconds: number;
  legalMoves: LegalMove[];
  turn: "white" | "black";
  status: string;
  winner: "white" | "black" | null;
  drawOfferBy: "white" | "black" | null;
  whiteMillis: number;
  blackMillis: number;
  /** Every move so far, in SAN. */
  moveHistory: string[];
  /** The starting FEN, then the FEN after each move - one longer than moveHistory. */
  fenHistory: string[];
  /** The same moves in from/to form - for the last-move highlight and Analyze. */
  moves: LegalMove[];
  whiteConnected: boolean;
  blackConnected: boolean;
}

export interface ErrorMessage {
  type: "ERROR";
  message: string;
}

export interface RematchOfferedMessage {
  type: "REMATCH_OFFERED";
  by: "white" | "black";
}

export interface RematchStartedMessage {
  type: "REMATCH_STARTED";
  gameId: string;
  color: "white" | "black";
  token: string;
}

export type ServerMessage =
  | GameStateMessage
  | ErrorMessage
  | RematchOfferedMessage
  | RematchStartedMessage;

export const IN_PROGRESS_STATUSES = new Set(["WAITING_FOR_OPPONENT", "IN_PROGRESS"]);
