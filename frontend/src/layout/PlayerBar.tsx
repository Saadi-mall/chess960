import type { ReactNode } from "react";

interface PlayerBarProps {
  color: "white" | "black";
  name: string;
  detail?: string;
  /** Shows a green "online" dot on the avatar (Play only). */
  online?: boolean;
  /** Marks this side as the one to move. */
  active?: boolean;
  /** Clock, shown on the right. */
  clock?: ReactNode;
}

/** The strip above and below the board: avatar, name, detail, and clock. */
export function PlayerBar({ color, name, detail, online, active = false, clock }: PlayerBarProps) {
  return (
    <div className={active ? "player-bar player-bar-active" : "player-bar"}>
      <span className={`avatar avatar-${color}`}>
        {name[0]}
        {online && <span className="online-dot" aria-label="online" />}
      </span>
      <div className="player-text">
        <span className="player-name">{name}</span>
        {detail && <span className="player-detail">{detail}</span>}
      </div>
      <div className="player-side">
        {clock}
        <img
          className={`player-piece player-piece-${color === "white" ? "w" : "b"}`}
          src={`/pieces/cburnett/${color === "white" ? "w" : "b"}P.svg`}
          alt=""
        />
      </div>
    </div>
  );
}
