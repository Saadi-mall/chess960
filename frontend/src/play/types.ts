import type { LegalMove } from "../board/types";

export interface GameStateMessage {
  type: "STATE";
  fen: string;
  startingNumber: number;
  legalMoves: LegalMove[];
  turn: "white" | "black";
  status: string;
  winner: "white" | "black" | null;
  drawOfferBy: "white" | "black" | null;
  whiteMillis: number;
  blackMillis: number;
  moveHistory: string[];
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
