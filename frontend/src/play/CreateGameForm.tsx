import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chessboard } from "../board/Chessboard";
import { BoardLayout } from "../layout/BoardLayout";
import { PlayerBar } from "../layout/PlayerBar";
import { SegmentedControl } from "../SegmentedControl";
import { useStartingPreview } from "../positions/useStartingPreview";
import { PositionPicker } from "../positions/PositionPicker";
import type { PositionMode } from "../positions/previewApi";
import { formatClock } from "./ClockDisplay";
import { createGame } from "./api";
import { setSeat } from "./storage";
import "./Play.css";

const TIME_CONTROLS: Array<{ label: string; initialSeconds: number; incrementSeconds: number }> = [
  { label: "1+0", initialSeconds: 60, incrementSeconds: 0 },
  { label: "3+2", initialSeconds: 180, incrementSeconds: 2 },
  { label: "5+0", initialSeconds: 300, incrementSeconds: 0 },
  { label: "10+5", initialSeconds: 600, incrementSeconds: 5 },
  { label: "30+0", initialSeconds: 1800, incrementSeconds: 0 },
];

export function CreateGameForm() {
  const navigate = useNavigate();
  const [positionMode, setPositionMode] = useState<PositionMode>("RANDOM");
  const [number, setNumber] = useState(518);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [timeControlIndex, setTimeControlIndex] = useState(2); // 5+0
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { fen, resolvedNumber } = useStartingPreview(positionMode, number, shuffleKey);
  const timeControl = TIME_CONTROLS[timeControlIndex];
  const clock = <div className="clock">{formatClock(timeControl.initialSeconds * 1000)}</div>;

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      // A random preview creates exactly the position on screen, not a fresh server roll.
      const chosenNumber = positionMode === "NUMBER" ? number : resolvedNumber;
      const response = await createGame({
        positionMode: positionMode === "DAILY" ? "DAILY" : "NUMBER",
        number: positionMode === "DAILY" ? undefined : (chosenNumber ?? undefined),
        initialSeconds: timeControl.initialSeconds,
        incrementSeconds: timeControl.incrementSeconds,
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
    <BoardLayout
      top={<PlayerBar color="black" name="Opponent" detail="Black · joins with your link" trailing={clock} />}
      board={fen && <Chessboard fen={fen} legalMoves={[]} animateEntry disabled />}
      bottom={<PlayerBar color="white" name="You" detail="White" trailing={clock} />}
      panel={
        <>
          <div className="panel-section">
            <h2>New game</h2>
            <p className="panel-note">Create a game, then send the link to a friend.</p>
          </div>

          <div className="panel-section panel-section-grow">
            <PositionPicker
              mode={positionMode}
              onModeChange={setPositionMode}
              number={number}
              onNumberChange={setNumber}
              onShuffle={() => setShuffleKey((k) => k + 1)}
              resolvedNumber={resolvedNumber}
            />

            <div className="form-section">
              <span className="form-section-label">Time control</span>
              <SegmentedControl
                aria-label="Time control"
                options={TIME_CONTROLS.map((tc, i) => ({ value: String(i), label: tc.label }))}
                value={String(timeControlIndex)}
                onChange={(v) => setTimeControlIndex(Number(v))}
              />
            </div>
          </div>

          <div className="panel-section">
            <button className="primary-button" onClick={handleCreate} disabled={busy || !fen}>
              {busy ? "Creating..." : "Create game"}
            </button>
            {error && <p className="error-text">{error}</p>}
          </div>
        </>
      }
    />
  );
}
