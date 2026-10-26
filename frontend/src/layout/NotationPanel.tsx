import { useEffect, useRef, type ReactNode } from "react";
import { FirstIcon, FlipIcon, LastIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon } from "./icons";
import type { HistoryNav } from "./useHistoryNav";

interface NotationPanelProps {
  /** Moves in SAN, as the server wrote them, starting with White's first move. */
  moves: string[];
  nav: HistoryNav;
  onFlip: () => void;
  /** Icon buttons in the top-right corner (resign, draw, reset...). */
  actions?: ReactNode;
}

const PIECE_LETTERS = "NBRQK";

/**
 * A SAN move with its piece drawn as a small icon instead of a letter (figurine
 * notation): "Nf3" shows a knight then "f3". Pawn moves get a pawn icon, castling none.
 * Purely a display transform of the server's SAN string.
 */
function Figurine({ san, color }: { san: string; color: "w" | "b" }) {
  if (san.startsWith("O-O")) return <span className="move-text">{san}</span>;
  const piece = PIECE_LETTERS.includes(san[0]) ? san[0] : "P";
  const text = piece === "P" ? san : san.slice(1);
  return (
    <>
      <img className={`move-piece move-piece-${color}`} src={`/pieces/cburnett/${color}${piece}.svg`} alt="" />
      <span className="move-text">{text}</span>
    </>
  );
}

/** The right-hand column: actions, the move table, back/forward controls and a timeline. */
export function NotationPanel({ moves, nav, onFlip, actions }: NotationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (nav.isLatest) {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    } else {
      currentRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [nav.ply, nav.isLatest, moves.length]);

  const rows: Array<{ number: number; white: string; black?: string }> = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ number: i / 2 + 1, white: moves[i], black: moves[i + 1] });
  }

  function cell(san: string | undefined, index: number, color: "w" | "b") {
    if (san === undefined) return <td className="move-cell" />;
    // Move at index i leads to the position after i + 1 moves.
    const current = nav.ply === index + 1;
    return (
      <td className="move-cell">
        <button
          ref={current ? currentRef : undefined}
          type="button"
          className={current ? "move-button move-current" : "move-button"}
          onClick={() => nav.goTo(index + 1)}
        >
          <Figurine san={san} color={color} />
        </button>
      </td>
    );
  }

  // Arrow keys step through the moves like the buttons: left/right one move, up/down (or
  // Home/End) to the start/end. Ignored while typing in a form field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      const actions: Record<string, () => void> = {
        ArrowLeft: nav.prev,
        ArrowRight: nav.next,
        ArrowUp: nav.first,
        Home: nav.first,
        ArrowDown: nav.last,
        End: nav.last,
      };
      const action = actions[e.key];
      if (!action) return;
      e.preventDefault();
      action();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav]);

  const progress = moves.length === 0 ? 0 : (nav.ply / moves.length) * 100;

  return (
    <>
      <div className="right-actions">{actions}</div>

      <div className="move-table" ref={scrollRef}>
        {rows.length === 0 ? (
          <p className="move-table-empty">No moves yet</p>
        ) : (
          <table>
            <tbody>
              {rows.map((row, r) => (
                <tr key={row.number}>
                  <td className="move-number">{row.number}</td>
                  {cell(row.white, r * 2, "w")}
                  {cell(row.black, r * 2 + 1, "b")}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="nav-row">
        <div className="nav-group">
          <button type="button" aria-label="First move" title="First move (Up)" onClick={nav.first} disabled={nav.ply === 0}>
            <FirstIcon />
          </button>
          <button type="button" aria-label="Previous move" title="Previous move (Left)" onClick={nav.prev} disabled={nav.ply === 0}>
            <PrevIcon />
          </button>
          <button
            type="button"
            aria-label={nav.playing ? "Pause" : "Replay moves"}
            onClick={nav.togglePlay}
            disabled={moves.length === 0}
          >
            {nav.playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button type="button" aria-label="Next move" title="Next move (Right)" onClick={nav.next} disabled={nav.isLatest}>
            <NextIcon />
          </button>
          <button type="button" aria-label="Last move" title="Last move (Down)" onClick={nav.last} disabled={nav.isLatest}>
            <LastIcon />
          </button>
        </div>
        <button type="button" className="icon-button" aria-label="Flip board" onClick={onFlip}>
          <FlipIcon />
        </button>
      </div>

      <div
        className="timeline"
        role="slider"
        aria-label="Move timeline"
        aria-valuemin={0}
        aria-valuemax={moves.length}
        aria-valuenow={nav.ply}
        onClick={(e) => {
          if (moves.length === 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          nav.goTo(Math.round(((e.clientX - rect.left) / rect.width) * moves.length));
        }}
      >
        <div className="timeline-fill" style={{ width: `${progress}%` }} />
        <div className="timeline-thumb" style={{ left: `${progress}%` }} />
      </div>
    </>
  );
}
