export type PositionMode = "RANDOM" | "NUMBER" | "DAILY";

export interface StartingPreview {
  number: number;
  fen: string;
}

async function asJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Request failed: ${response.status}`);
  }
  return response.json();
}

/** The cheap FEN-only endpoint behind every setup screen's live preview board - see
 * PositionController#starting on the backend. */
export function fetchStartingPreview(mode: PositionMode, number?: number): Promise<StartingPreview> {
  const params = new URLSearchParams({ mode });
  if (mode === "NUMBER" && number !== undefined) {
    params.set("number", String(number));
  }
  return fetch(`/api/positions/starting?${params}`).then(asJson<StartingPreview>);
}
