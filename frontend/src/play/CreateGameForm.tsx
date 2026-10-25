import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createGame } from "./api";
import { setSeat } from "./storage";

const TIME_CONTROLS: Array<{ label: string; initialSeconds: number; incrementSeconds: number }> = [
  { label: "1+0 Bullet", initialSeconds: 60, incrementSeconds: 0 },
  { label: "3+2 Blitz", initialSeconds: 180, incrementSeconds: 2 },
  { label: "5+0 Blitz", initialSeconds: 300, incrementSeconds: 0 },
  { label: "10+5 Rapid", initialSeconds: 600, incrementSeconds: 5 },
  { label: "30+0 Classical", initialSeconds: 1800, incrementSeconds: 0 },
];

export function CreateGameForm() {
  const navigate = useNavigate();
  const [positionMode, setPositionMode] = useState<"RANDOM" | "NUMBER" | "DAILY">("RANDOM");
  const [number, setNumber] = useState(518);
  const [timeControlIndex, setTimeControlIndex] = useState(2); // 5+0
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    <div className="create-game">
      <h2>Start a game</h2>

      <fieldset className="field-group">
        <legend>Starting position</legend>
        <label>
          <input
            type="radio"
            checked={positionMode === "RANDOM"}
            onChange={() => setPositionMode("RANDOM")}
          />
          Random Chess960 position
        </label>
        <label>
          <input
            type="radio"
            checked={positionMode === "NUMBER"}
            onChange={() => setPositionMode("NUMBER")}
          />
          Position number
          <input
            type="number"
            min={0}
            max={959}
            value={number}
            disabled={positionMode !== "NUMBER"}
            onChange={(e) => setNumber(Number(e.target.value))}
            className="number-input"
          />
        </label>
        <label>
          <input
            type="radio"
            checked={positionMode === "DAILY"}
            onChange={() => setPositionMode("DAILY")}
          />
          Today's lesson position
        </label>
      </fieldset>

      <fieldset className="field-group">
        <legend>Time control</legend>
        <div className="time-control-options">
          {TIME_CONTROLS.map((tc, i) => (
            <button
              key={tc.label}
              type="button"
              className={i === timeControlIndex ? "selected" : ""}
              onClick={() => setTimeControlIndex(i)}
            >
              {tc.label}
            </button>
          ))}
        </div>
      </fieldset>

      {error && <p className="error-text">{error}</p>}

      <button className="primary-button" onClick={handleCreate} disabled={busy}>
        {busy ? "Creating..." : "Create game"}
      </button>
    </div>
  );
}
