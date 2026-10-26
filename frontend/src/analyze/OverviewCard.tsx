import type { Overview, SideOverview } from "./types";

function squareList(squares: string[]): string {
  return squares.length === 0 ? "none" : squares.join(", ");
}

const FACTS: Array<{ label: string; value: (side: SideOverview) => string }> = [
  { label: "Undefended pawns", value: (s) => squareList(s.undefendedPawnSquares) },
  { label: "Bishops on a long diagonal", value: (s) => squareList(s.longDiagonalBishopSquares) },
  {
    label: "Pieces in the way of castling",
    value: (s) => (s.castlingDistance === null ? "can't castle" : String(s.castlingDistance)),
  },
  {
    label: "Weakest square (defenders)",
    value: (s) => (s.weakestSquare === null ? "none" : `${s.weakestSquare} (${s.weakestSquareDefenders})`),
  },
];

/** The analyzer's facts about a starting position, as a White / Black table. */
export function OverviewCard({ overview }: { overview: Overview }) {
  return (
    <table className="overview-table">
      <thead>
        <tr>
          <th />
          <th>White</th>
          <th>Black</th>
        </tr>
      </thead>
      <tbody>
        {FACTS.map((fact) => (
          <tr key={fact.label}>
            <th scope="row">{fact.label}</th>
            <td>{fact.value(overview.white)}</td>
            <td>{fact.value(overview.black)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
