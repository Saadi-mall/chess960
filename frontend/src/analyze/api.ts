import type { AnalysisResponse, PositionState } from "./types";

async function asJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Request failed: ${response.status}`);
  }
  return response.json();
}

export function fetchStartingPosition(number: number): Promise<AnalysisResponse> {
  return fetch(`/api/analysis/starting/${number}`).then(asJson<AnalysisResponse>);
}

export function fetchDailyPosition(): Promise<{ date: string; number: number }> {
  return fetch("/api/daily-position").then(asJson<{ date: string; number: number }>);
}

/** Rules only - the new position and its legal moves, back in a few milliseconds. */
export function applyMove(fen: string, from: string, to: string, promotion?: string): Promise<PositionState> {
  return fetch("/api/positions/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fen, from, to, promotion: promotion ?? null }),
  }).then(asJson<PositionState>);
}

/** Plays a whole line (e.g. a finished game) in one request: the position after each move. */
export function replayMoves(
  fen: string,
  moves: Array<{ from: string; to: string; promotion: string | null }>,
): Promise<PositionState[]> {
  return fetch("/api/positions/replay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fen, moves }),
  }).then(asJson<PositionState[]>);
}

/** Stockfish's evaluation of a position - slow (a search plus engine start-up). */
export function evaluatePosition(fen: string): Promise<AnalysisResponse> {
  return fetch("/api/analysis/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fen }),
  }).then(asJson<AnalysisResponse>);
}

export function playMove(
  fen: string,
  from: string,
  to: string,
  promotion?: string,
): Promise<AnalysisResponse> {
  return fetch("/api/analysis/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fen, from, to, promotion: promotion ?? null }),
  }).then(asJson<AnalysisResponse>);
}
