/** Splits a UCI move string like "e2e4" or "e7e8q" into its parts. Just string slicing -
 * reading the shape of a move the server already chose, not deciding anything about it. */
export function parseUci(uci: string): { from: string; to: string; promotion?: string } {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci.slice(4) : undefined,
  };
}
