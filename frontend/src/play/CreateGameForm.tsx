import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chessboard } from "../board/Chessboard";
import { ChessPage, IdentityCard, SideCard } from "../layout/ChessPage";
import { NotationPanel } from "../layout/NotationPanel";
import { PlayerBar } from "../layout/PlayerBar";
import { PreferenceToggles } from "../layout/Toggles";
import { useHistoryNav } from "../layout/useHistoryNav";
import { PositionDetail, PositionModeControl } from "../positions/PositionPicker";
import type { PositionMode } from "../positions/previewApi";
import { useStartingPreview } from "../positions/useStartingPreview";
import { formatClock } from "./clock";
import { createGame } from "./api";
import { setSeat } from "./storage";

const TIME_CONTROLS: Array<{ label: string; initialSeconds: number; incrementSeconds: number }> = [
  { label: "1+0", initialSeconds: 60, incrementSeconds: 0 },
  { label: "2+0", initialSeconds: 120, incrementSeconds: 0 },
  { label: "2+1", initialSeconds: 120, incrementSeconds: 1 },
  { label: "3+0", initialSeconds: 180, incrementSeconds: 0 },
  { label: "3+2", initialSeconds: 180, incrementSeconds: 2 },
  { label: "5+0", initialSeconds: 300, incrementSeconds: 0 },
  { label: "10+5", initialSeconds: 600, incrementSeconds: 5 },
  { label: "15+0", initialSeconds: 900, incrementSeconds: 0 },
];
const DEFAULT_TIME_CONTROL = 5; // 5+0

export function CreateGameForm() {
  const navigate = useNavigate();
  const [positionMode, setPositionMode] = useState<PositionMode>("RANDOM");
  const [number, setNumber] = useState(518);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [timeControlIndex, setTimeControlIndex] = useState(DEFAULT_TIME_CONTROL);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useHistoryNav(0);

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

  const you = <PlayerBar color="white" name="You" detail="White" clock={clock} />;
  const opponent = <PlayerBar color="black" name="Opponent" detail="Black · joins with your link" clock={clock} />;

  return (
    <ChessPage
      title="Play a friend"
      subtitle="Pick a starting position and time control, then send the link"
      headerAside={<PositionModeControl mode={positionMode} onChange={setPositionMode} />}
      left={
        <>
          <IdentityCard initial="Y" tone="white" title="You" detail="Playing White" />
          <SideCard>
            <PositionDetail
              mode={positionMode}
              number={number}
              onNumberChange={setNumber}
              onShuffle={() => setShuffleKey((k) => k + 1)}
              resolvedNumber={resolvedNumber}
            />
            <div className="side-section">
              <span className="side-label">Time control</span>
              <div className="option-grid" role="radiogroup" aria-label="Time control">
                {TIME_CONTROLS.map((tc, i) => (
                  <button
                    key={tc.label}
                    type="button"
                    role="radio"
                    aria-checked={i === timeControlIndex}
                    className={i === timeControlIndex ? "selected" : ""}
                    onClick={() => setTimeControlIndex(i)}
                  >
                    {tc.label}
                  </button>
                ))}
              </div>
            </div>
          </SideCard>
          <button className="big-button" onClick={handleCreate} disabled={busy || !fen}>
            <img src="/pieces/cburnett/bP.svg" alt="" />
            {busy ? "Creating..." : "Start game"}
          </button>
          {error && <p className="error-text">{error}</p>}
          <PreferenceToggles />
        </>
      }
      top={flipped ? you : opponent}
      board={fen && <Chessboard fen={fen} legalMoves={[]} orientation={flipped ? "b" : "w"} animateEntry disabled />}
      bottom={flipped ? opponent : you}
      right={<NotationPanel moves={[]} nav={nav} onFlip={() => setFlipped((f) => !f)} />}
    />
  );
}
