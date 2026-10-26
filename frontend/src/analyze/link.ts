/** The shareable Analyze link for a finished game: /analyze?position=<n>&moves=e2e4,e7e5,... */
export function analysisLink(
  startingNumber: number,
  moves: Array<{ from: string; to: string; promotion?: string | null }>,
): string {
  const list = moves.map((m) => m.from + m.to + (m.promotion ?? "")).join(",");
  return `/analyze?position=${startingNumber}${list ? `&moves=${list}` : ""}`;
}

/** Parses that link's move list back into the board's move form, skipping anything malformed. */
export function parseMoveList(list: string): Array<{ from: string; to: string; promotion: string | null }> {
  return list
    .split(",")
    .filter((m) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m))
    .map((m) => ({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] ?? null }));
}
