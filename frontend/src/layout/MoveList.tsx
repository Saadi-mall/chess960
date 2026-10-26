import { useEffect, useRef } from "react";

interface MoveListProps {
  /** Moves in SAN, as the server wrote them, starting with White's first move. */
  moves: string[];
}

/** The notation table: one row per move number, White's move then Black's. */
export function MoveList({ moves }: MoveListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [moves.length]);

  const rows: Array<{ number: number; white: string; black?: string }> = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ number: i / 2 + 1, white: moves[i], black: moves[i + 1] });
  }
  const lastIndex = moves.length - 1;

  return (
    <div className="move-list" ref={scrollRef}>
      {rows.length === 0 ? (
        <p className="move-list-empty">No moves yet</p>
      ) : (
        <table>
          <tbody>
            {rows.map((row, r) => (
              <tr key={row.number}>
                <td className="move-number">{row.number}</td>
                <td className={r * 2 === lastIndex ? "move-cell move-latest" : "move-cell"}>{row.white}</td>
                <td className={r * 2 + 1 === lastIndex ? "move-cell move-latest" : "move-cell"}>
                  {row.black ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
