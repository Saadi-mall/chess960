import type { ReactNode } from "react";

interface PlayerBarProps {
  color: "white" | "black";
  name: string;
  detail?: string;
  /** Marks this side as the one to move. */
  active?: boolean;
  /** Right-hand slot - a clock in Play. */
  trailing?: ReactNode;
}

export function PlayerBar({ color, name, detail, active = false, trailing }: PlayerBarProps) {
  return (
    <div className={active ? "player-bar player-bar-active" : "player-bar"}>
      <span className={`player-chip player-chip-${color}`} aria-hidden />
      <div className="player-text">
        <span className="player-name">{name}</span>
        {detail && <span className="player-detail">{detail}</span>}
      </div>
      {trailing}
    </div>
  );
}
