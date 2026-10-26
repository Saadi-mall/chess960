import type { ReactNode } from "react";

interface BoardLayoutProps {
  top: ReactNode;
  board: ReactNode | null;
  bottom: ReactNode;
  panel: ReactNode;
}

/**
 * The one page layout every tab uses: the board, with a player bar above and below it,
 * as large as the screen allows, and a fixed-width panel on the right. Keeping it in one
 * component is what keeps Play, Analyze and Learn the same size and shape.
 */
export function BoardLayout({ top, board, bottom, panel }: BoardLayoutProps) {
  return (
    <div className="board-page">
      <div className="board-stage">
        <div className="board-frame">
          {top}
          {board ?? <div className="board-placeholder" />}
          {bottom}
        </div>
      </div>
      <aside className="side-panel">{panel}</aside>
    </div>
  );
}
