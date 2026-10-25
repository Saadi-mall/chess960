import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chessboard } from "../board/Chessboard";
import { SegmentedControl } from "../SegmentedControl";
import { useStartingPreview } from "../positions/useStartingPreview";
import { createGame } from "./api";
import { setSeat } from "./storage";

const TIME_CONTROLS: Array<{ label: string; initialSeconds: number; incrementSeconds: number }> = [
  { label: "1+0", initialSeconds: 60, incrementSeconds: 0 },
  { label: "3+2", initialSeconds: 180, incrementSeconds: 2 },
  { label: "5+0", initialSeconds: 300, incrementSeconds: 0 },
  { label: "10+5", initialSeconds: 600, incrementSeconds: 5 },
  { label: "30+0", initialSeconds: 1800, incrementSeconds: 0 },
];

const POSITION_MODE_OPTIONS = [
  { value: "RANDOM" as const, label: "Random" },
  { value: "NUMBER" as const, label: "Number" },
  { value: "DAILY" as const, label: "Today's lesson" },
];

export function CreateGameForm() {
  const navigate = useNavigate();
  const [positionMode, setPositionMode] = useState<"RANDOM" | "NUMBER" | "DAILY">("RANDOM");
  const [number, setNumber] = useState(518);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [timeControlIndex, setTimeControlIndex] = useState(2); // 5+0
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { fen, resolvedNumber } = useStartingPreview(positionMode, number, shuffleKey);

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const tc = TIME_CONTROLS[timeControlIndex];
      const response = await createGame({
        positionMode,
        number: positionMode === "NUMBER" ? number : undefined,
        initialSeconds: tc.initialSeconds,
        incrementSeconds: tc.incrementSeconds,
      });
      setSeat(response.gameId, { token: response.token, color: response.color });
      navigate(`/play/${response.gameId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the game");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="board-page">
      <div className="board-page-board">
        {fen && <Chessboard fen={fen} legalMoves={[]} animateEntry />}
      </div>

      <div className="board-page-panel">
        <div className="panel-card">
          <h2>Start a game</h2>

          <div className="form-section">
            <span className="form-section-label">Starting position</span>
            <SegmentedControl
              aria-label="Starting position"
              options={POSITION_MODE_OPTIONS}
              value={positionMode}
              onChange={setPositionMode}
            />
            {positionMode === "NUMBER" && (
              <input
                type="number"
                min={0}
                max={959}
                value={number}
                onChange={(e) => setNumber(Number(e.target.value))}
                className="number-input"
                aria-label="Chess960 position number"
                style={{ marginTop: "var(--space-2)" }}
              />
            )}
            {positionMode === "RANDOM" && (
              <button
                type="button"
                className="secondary-button"
                style={{ marginTop: "var(--space-2)", width: "100%" }}
                onClick={() => setShuffleKey((k) => k + 1)}
              >
                Shuffle again
              </button>
            )}
            {resolvedNumber !== null && (
              <p className="status-text" style={{ margin: "var(--space-2) 0 0" }}>
                Position #{resolvedNumber}
              </p>
            )}
          </div>

          <div className="form-section">
            <span className="form-section-label">Time control</span>
            <SegmentedControl
              aria-label="Time control"
              options={TIME_CONTROLS.map((tc, i) => ({ value: String(i), label: tc.label }))}
              value={String(timeControlIndex)}
              onChange={(v) => setTimeControlIndex(Number(v))}
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button className="primary-button" onClick={handleCreate} disabled={busy || !fen}>
            {busy ? "Creating..." : "Create game"}
          </button>
        </div>
      </div>
    </div>
  );
}
