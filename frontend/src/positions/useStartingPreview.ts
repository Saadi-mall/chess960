import { useEffect, useRef, useState } from "react";
import { fetchStartingPreview, type PositionMode } from "./previewApi";

/** Live-preview FEN for a setup screen's board, kept in sync with the chosen position
 * mode/number. Debounced for NUMBER mode since it updates on every keystroke; bump
 * refreshKey to re-roll a RANDOM preview on demand (e.g. a "shuffle" button). */
export function useStartingPreview(mode: PositionMode, number: number, refreshKey = 0) {
  const [fen, setFen] = useState<string | null>(null);
  const [resolvedNumber, setResolvedNumber] = useState<number | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const timeout = setTimeout(
      () => {
        fetchStartingPreview(mode, mode === "NUMBER" ? number : undefined).then(
          (preview) => {
            if (requestId.current !== id) return;
            setFen(preview.fen);
            setResolvedNumber(preview.number);
          },
          () => {
            // Leave the previous preview on screen rather than clearing it on a transient error.
          },
        );
      },
      mode === "NUMBER" ? 200 : 0,
    );
    return () => clearTimeout(timeout);
  }, [mode, number, refreshKey]);

  return { fen, resolvedNumber };
}
