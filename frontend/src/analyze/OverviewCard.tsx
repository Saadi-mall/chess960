import type { Overview, SideOverview } from "./types";

function squareList(squares: string[]): string {
  return squares.length === 0 ? "none" : squares.join(", ");
}

function SideFacts({ label, side }: { label: string; side: SideOverview }) {
  return (
    <div className="overview-side">
      <h3>{label}</h3>
      <dl>
        <dt>Undefended pawns</dt>
        <dd>{squareList(side.undefendedPawnSquares)}</dd>
        <dt>Bishops on a long diagonal</dt>
        <dd>{squareList(side.longDiagonalBishopSquares)}</dd>
        <dt>Castling distance</dt>
        <dd>
          {side.castlingDistance === null
            ? "no castling rights"
            : `${side.castlingDistance} piece${side.castlingDistance === 1 ? "" : "s"} in the way`}
        </dd>
        <dt>Weakest square</dt>
        <dd>
          {side.weakestSquare === null
            ? "n/a"
            : `${side.weakestSquare} (${side.weakestSquareDefenders} defender${side.weakestSquareDefenders === 1 ? "" : "s"})`}
        </dd>
      </dl>
    </div>
  );
}

export function OverviewCard({ overview }: { overview: Overview }) {
  return (
    <div className="overview-card">
      <h2>
        Position #{overview.positionNumber ?? "?"}
        {overview.positionNumber === 518 && <span className="overview-badge">normal chess</span>}
      </h2>
      <div className="overview-sides">
        <SideFacts label="White" side={overview.white} />
        <SideFacts label="Black" side={overview.black} />
      </div>
    </div>
  );
}
