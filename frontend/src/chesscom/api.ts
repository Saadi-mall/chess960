import type { ChessComStats } from "./types";

export async function importChessComStats(username: string): Promise<ChessComStats> {
  const response = await fetch(`/api/chesscom/${encodeURIComponent(username)}/import`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Request failed: ${response.status}`);
  }
  return response.json();
}
