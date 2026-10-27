import type { ReactNode } from "react";
import type { SideMaterial } from "../board/material";

interface PlayerBarProps {
  color: "white" | "black";
  name: string;
  detail?: string;
  /** Shows a green "online" dot on the avatar (Play only). */
  online?: boolean;
  /** Marks this side as the one to move. */
  active?: boolean;
  /** Pieces this side has captured and its material lead, shown under the name. */
  material?: SideMaterial;
  /** Clock, shown on the right. */
  clock?: ReactNode;
}

/** The strip above and below the board: avatar, name, captured pieces, and clock. */
export function PlayerBar({ color, name, detail, online, active = false, material, clock }: PlayerBarProps) {
  return (
    <div className={active ? "player-bar player-bar-active" : "player-bar"}>
      <span className={`avatar avatar-${color}`}>
        {name[0]}
        {online && <span className="online-dot" aria-label="online" />}
      </span>
      <div className="player-text">
        <span className="player-name">
          {name}
          {detail && <span className="player-detail">{detail}</span>}
        </span>
        <span className="captured" aria-label={capturedLabel(material)}>
          {material?.captured.map((piece, i) => {
            const side = piece === piece.toUpperCase() ? "w" : "b";
            return (
              <img
                key={i}
                className={`captured-piece captured-piece-${side}`}
                src={`/pieces/cburnett/${side}${piece.toUpperCase()}.svg`}
                alt=""
              />
            );
          })}
          {material && material.lead > 0 && <span className="captured-lead">+{material.lead}</span>}
        </span>
      </div>
      {clock && <div className="player-side">{clock}</div>}
    </div>
  );
}

const NAMES: Record<string, string> = { q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };

function capturedLabel(material?: SideMaterial): string | undefined {
  if (!material || material.captured.length === 0) return undefined;
  const names = material.captured.map((p) => NAMES[p.toLowerCase()]).join(", ");
  return `Captured ${names}${material.lead > 0 ? `, up ${material.lead}` : ""}`;
}
