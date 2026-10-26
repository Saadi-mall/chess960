import type { ReactNode } from "react";

interface ChessPageProps {
  title: string;
  subtitle: string;
  /** Right side of the title row - e.g. the starting-position selector. */
  headerAside?: ReactNode;
  /** Left column: player card, settings, main button, toggles. */
  left: ReactNode;
  top: ReactNode;
  board: ReactNode | null;
  bottom: ReactNode;
  /** Right column: the notation panel. */
  right: ReactNode;
}

/**
 * The one page layout every tab uses: a title row, then a single card with the controls
 * on the left, the board (with a player bar above and below) in the middle, and the move
 * list on the right. Keeping it in one component keeps Play, Analyze and Learn identical.
 */
export function ChessPage({ title, subtitle, headerAside, left, top, board, bottom, right }: ChessPageProps) {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        {headerAside && <div className="page-header-aside">{headerAside}</div>}
      </div>

      <div className="page-card">
        <aside className="left-col">{left}</aside>
        <section className="center-col">
          {top}
          {board ?? <div className="board-placeholder" />}
          {bottom}
        </section>
        <aside className="right-col">{right}</aside>
      </div>
    </div>
  );
}

/** A bordered box in the left column, optionally split into sections. */
export function SideCard({ children }: { children: ReactNode }) {
  return <div className="side-card">{children}</div>;
}

/** The person/position card at the top of the left column. */
export function IdentityCard({ initial, tone, title, detail }: {
  initial: string;
  tone: "white" | "black" | "accent";
  title: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="side-card identity-card">
      <span className={`avatar avatar-round avatar-${tone}`}>{initial}</span>
      <div className="identity-text">
        <span className="identity-title">{title}</span>
        {detail && <span className="identity-detail">{detail}</span>}
      </div>
    </div>
  );
}
