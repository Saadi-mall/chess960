import { useEffect, useMemo, useRef, useState } from "react";
import { squaresFromFen } from "./fen";
import { fileOf, rankOf, squareAt, type LegalMove } from "./types";
import "./Chessboard.css";

/**
 * The "Cburnett" piece set by Colin M. L. Burnett, CC BY-SA 3.0 - see README.md for the
 * full attribution. Served as static files from public/pieces/cburnett.
 */
function pieceImageHref(piece: string): string {
  const color = piece === piece.toUpperCase() ? "w" : "b";
  return `/pieces/cburnett/${color}${piece.toUpperCase()}.svg`;
}

const SIZE = 100; // one square, in SVG user units
const BOARD = SIZE * 8;

interface ChessboardProps {
  fen: string;
  legalMoves: LegalMove[];
  orientation?: "w" | "b";
  onMove?: (move: LegalMove) => void;
  /** Play the back-rank "shuffling into place" animation the next time `fen` changes. */
  animateEntry?: boolean;
  /**
   * Switches the board into "pick a square" mode for quizzes like "find the weakest
   * square": any square click reports here directly instead of going through the normal
   * select-a-piece-then-move flow, and pieces aren't draggable.
   */
  onSquareClick?: (square: string) => void;
}

interface DragState {
  from: string;
  pointerX: number;
  pointerY: number;
}

export function Chessboard({
  fen,
  legalMoves,
  orientation = "w",
  onMove,
  animateEntry = false,
  onSquareClick,
}: ChessboardProps) {
  const squares = useMemo(() => squaresFromFen(fen), [fen]);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [promotionChoice, setPromotionChoice] = useState<{ from: string; to: string } | null>(
    null,
  );
  const svgRef = useRef<SVGSVGElement>(null);

  const entryOffsets = useBackRankEntryAnimation(fen, animateEntry);

  const destinations = useMemo(() => {
    const from = drag?.from ?? selected;
    if (!from) return new Set<string>();
    return new Set(legalMoves.filter((m) => m.from === from).map((m) => m.to));
  }, [legalMoves, selected, drag]);

  function squareToXY(square: string): { x: number; y: number } {
    const file = fileOf(square);
    const rank = rankOf(square);
    const displayFile = orientation === "w" ? file : 7 - file;
    const displayRank = orientation === "w" ? 7 - rank : rank;
    return { x: displayFile * SIZE, y: displayRank * SIZE };
  }

  function clientToSquare(clientX: number, clientY: number): string | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const point = new DOMPoint(clientX, clientY).matrixTransform(
      svg.getScreenCTM()?.inverse(),
    );
    const displayFile = Math.floor(point.x / SIZE);
    const displayRank = Math.floor(point.y / SIZE);
    if (displayFile < 0 || displayFile > 7 || displayRank < 0 || displayRank > 7) {
      return null;
    }
    const file = orientation === "w" ? displayFile : 7 - displayFile;
    const rank = orientation === "w" ? 7 - displayRank : displayRank;
    return squareAt(file, rank);
  }

  function attemptMove(from: string, to: string) {
    const candidates = legalMoves.filter((m) => m.from === from && m.to === to);
    if (candidates.length === 0) {
      return;
    }
    if (candidates.length === 1) {
      onMove?.(candidates[0]);
    } else {
      // Several candidates with the same from/to only happens when promotion choice
      // is the difference - ask which piece before telling the server the move.
      setPromotionChoice({ from, to });
    }
    setSelected(null);
  }

  function handleSquareClick(square: string) {
    if (onSquareClick) {
      onSquareClick(square);
      return;
    }
    if (promotionChoice) return;
    if (selected && destinations.has(square)) {
      attemptMove(selected, square);
      return;
    }
    setSelected(squares[square] ? square : null);
  }

  function handlePiecePointerDown(square: string, event: React.PointerEvent) {
    if (onSquareClick) {
      event.preventDefault();
      onSquareClick(square);
      return;
    }
    if (promotionChoice) return;
    event.preventDefault();
    if (selected && destinations.has(square)) {
      // This piece is a legal capture of the already-selected piece, not a new selection.
      attemptMove(selected, square);
      return;
    }
    setSelected(square);
    setDrag({ from: square, pointerX: event.clientX, pointerY: event.clientY });
  }

  useEffect(() => {
    if (!drag) return;
    const from = drag.from;

    function onMoveEvent(e: PointerEvent) {
      setDrag((d) => (d ? { ...d, pointerX: e.clientX, pointerY: e.clientY } : d));
    }
    function onUp(e: PointerEvent) {
      const target = clientToSquare(e.clientX, e.clientY);
      setDrag(null);
      if (target && target !== from) {
        attemptMove(from, target);
      }
    }
    window.addEventListener("pointermove", onMoveEvent);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => window.removeEventListener("pointermove", onMoveEvent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.from]);

  const draggedXY =
    drag &&
    (() => {
      const svg = svgRef.current;
      if (!svg) return squareToXY(drag.from);
      const point = new DOMPoint(drag.pointerX, drag.pointerY).matrixTransform(
        svg.getScreenCTM()?.inverse(),
      );
      return { x: point.x - SIZE / 2, y: point.y - SIZE / 2 };
    })();

  return (
    <div className="chessboard-wrap">
      <svg
        ref={svgRef}
        viewBox={`-18 -18 ${BOARD + 36} ${BOARD + 36}`}
        className="chessboard"
        role="group"
        aria-label="Chess board"
      >
        {renderSquares(orientation, handleSquareClick, destinations, selected)}
        {renderCoordinates(orientation)}
        {Object.entries(squares).map(([square, piece]) => {
          if (!piece) return null;
          if (drag?.from === square) return null; // drawn separately, following the pointer
          const { x, y } = squareToXY(square);
          const entry = entryOffsets.get(square);
          const transform = entry
            ? `translate(${x + entry.dx}px, ${y + entry.dy}px)`
            : `translate(${x}px, ${y}px)`;
          return (
            <g
              key={square}
              className="piece"
              style={{ transform, transitionDelay: entry ? `${entry.delayMs}ms` : "0ms" }}
              onPointerDown={(e) => handlePiecePointerDown(square, e)}
            >
              <Piece piece={piece} />
            </g>
          );
        })}
        {drag && draggedXY && (
          <g
            className="piece piece-dragging"
            style={{ transform: `translate(${draggedXY.x}px, ${draggedXY.y}px)` }}
          >
            <Piece piece={squares[drag.from]!} />
          </g>
        )}
      </svg>
      {promotionChoice && (
        <PromotionPicker
          color={squares[promotionChoice.from]?.toUpperCase() === squares[promotionChoice.from] ? "w" : "b"}
          onChoose={(promotion) => {
            onMove?.({ ...promotionChoice, promotion });
            setPromotionChoice(null);
          }}
          onCancel={() => setPromotionChoice(null)}
        />
      )}
    </div>
  );
}

function Piece({ piece }: { piece: string }) {
  return (
    <image
      href={pieceImageHref(piece)}
      x={SIZE * 0.05}
      y={SIZE * 0.05}
      width={SIZE * 0.9}
      height={SIZE * 0.9}
    />
  );
}

function renderSquares(
  orientation: "w" | "b",
  onClick: (square: string) => void,
  destinations: Set<string>,
  selected: string | null,
) {
  const squares = [];
  for (let file = 0; file < 8; file++) {
    for (let rank = 0; rank < 8; rank++) {
      const displayFile = orientation === "w" ? file : 7 - file;
      const displayRank = orientation === "w" ? 7 - rank : rank;
      const square = squareAt(file, rank);
      const light = (file + rank) % 2 === 1;
      squares.push(
        <rect
          key={square}
          x={displayFile * SIZE}
          y={displayRank * SIZE}
          width={SIZE}
          height={SIZE}
          className={light ? "square-light" : "square-dark"}
          onClick={() => onClick(square)}
        />,
      );
      if (destinations.has(square)) {
        squares.push(
          <circle
            key={square + "-dot"}
            cx={displayFile * SIZE + SIZE / 2}
            cy={displayRank * SIZE + SIZE / 2}
            r={SIZE * 0.14}
            className="move-dot"
            onClick={() => onClick(square)}
          />,
        );
      }
      if (selected === square) {
        squares.push(
          <rect
            key={square + "-sel"}
            x={displayFile * SIZE}
            y={displayRank * SIZE}
            width={SIZE}
            height={SIZE}
            className="square-selected"
          />,
        );
      }
    }
  }
  return squares;
}

function renderCoordinates(orientation: "w" | "b") {
  const files = "abcdefgh".split("");
  const labels = [];
  for (let i = 0; i < 8; i++) {
    const file = orientation === "w" ? i : 7 - i;
    labels.push(
      <text key={"f" + i} x={i * SIZE + SIZE / 2} y={BOARD + 11} className="coord" textAnchor="middle">
        {files[file]}
      </text>,
    );
    const rank = orientation === "w" ? 7 - i : i;
    labels.push(
      <text key={"r" + i} x={-9} y={i * SIZE + SIZE / 2} className="coord" textAnchor="middle">
        {rank + 1}
      </text>,
    );
  }
  return labels;
}

function PromotionPicker({
  color,
  onChoose,
  onCancel,
}: {
  color: "w" | "b";
  onChoose: (p: "q" | "r" | "b" | "n") => void;
  onCancel: () => void;
}) {
  const options: Array<"q" | "r" | "b" | "n"> = ["q", "r", "b", "n"];
  return (
    <div className="promotion-overlay" onClick={onCancel}>
      <div className="promotion-picker" onClick={(e) => e.stopPropagation()}>
        {options.map((option) => (
          <button key={option} onClick={() => onChoose(option)} className="promotion-option">
            <img src={pieceImageHref(color === "w" ? option.toUpperCase() : option)} alt={option} width={40} height={40} />
          </button>
        ))}
      </div>
    </div>
  );
}

type EntryOffsets = Map<string, { dx: number; dy: number; delayMs: number }>;

function computeEntryOffsets(fen: string): EntryOffsets {
  const squares = squaresFromFen(fen);
  const next: EntryOffsets = new Map();
  for (const [square, piece] of Object.entries(squares)) {
    const rank = rankOf(square);
    if (rank !== 0 && rank !== 7) continue; // only the shuffled back ranks
    if (!piece) continue;
    const angle = Math.random() * Math.PI * 2;
    const distance = 260 + Math.random() * 120;
    next.set(square, {
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      delayMs: Math.random() * 150,
    });
  }
  return next;
}

/**
 * Computes a one-time random offset per back-rank piece whenever `fen` changes (and
 * `enabled`), then clears it a tick later so the piece transitions from that offset to
 * (0, 0) - i.e. shuffles into place. Pawns are left alone: in Chess960 only the back rank
 * is scrambled.
 *
 * The "detect a new fen" half of this runs during render (React's documented pattern for
 * resetting derived state from a prop change) rather than in an effect, specifically
 * because an effect-only version is fragile under StrictMode's mount-effect double-invoke:
 * a version that schedules a cancellable rAF chain and guards against re-scheduling with a
 * "have we already seen this fen" ref can have its first (cancelled) invocation's guard
 * suppress the second invocation's attempt to reschedule, permanently losing the "settle
 * back to zero" step. Keeping entry/settled as plain state updated unconditionally
 * sidesteps that - a second invocation just re-does the same work harmlessly.
 */
function useBackRankEntryAnimation(fen: string, enabled: boolean) {
  const [tracked, setTracked] = useState(() => ({
    fen,
    entering: enabled,
    offsets: enabled ? computeEntryOffsets(fen) : new Map<string, never>(),
  }));

  if (tracked.fen !== fen) {
    setTracked({
      fen,
      entering: enabled,
      offsets: enabled ? computeEntryOffsets(fen) : new Map(),
    });
  }

  useEffect(() => {
    if (!tracked.entering) return;
    const timeout = setTimeout(() => {
      setTracked((t) => (t.fen === fen ? { ...t, entering: false } : t));
    }, 20);
    return () => clearTimeout(timeout);
  }, [tracked.entering, fen]);

  return tracked.entering ? tracked.offsets : EMPTY_OFFSETS;
}

const EMPTY_OFFSETS: EntryOffsets = new Map();
