import type { AnalysisResponse } from "./types";

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
