import { SegmentedControl } from "../SegmentedControl";
import type { PositionMode } from "./previewApi";

const MODE_OPTIONS = [
  { value: "RANDOM" as const, label: "Random" },
  { value: "NUMBER" as const, label: "Number" },
  { value: "DAILY" as const, label: "Today's lesson" },
];

interface PositionPickerProps {
  mode: PositionMode;
  onModeChange: (mode: PositionMode) => void;
  number: number;
  onNumberChange: (number: number) => void;
  onShuffle: () => void;
  /** The position the preview board is actually showing, once it has loaded. */
  resolvedNumber: number | null;
}

/** The "which starting position" controls shared by the Play and Analyze setup screens. */
export function PositionPicker({
  mode,
  onModeChange,
  number,
  onNumberChange,
  onShuffle,
  resolvedNumber,
}: PositionPickerProps) {
  return (
    <div className="form-section">
      <span className="form-section-label">Starting position</span>
      <SegmentedControl aria-label="Starting position" options={MODE_OPTIONS} value={mode} onChange={onModeChange} />

      <div className="position-picker-row">
        {mode === "NUMBER" && (
          <input
            type="number"
            min={0}
            max={959}
            value={number}
            onChange={(e) => onNumberChange(Number(e.target.value))}
            className="number-input"
            aria-label="Chess960 position number"
          />
        )}
        {mode === "RANDOM" && (
          <button type="button" className="secondary-button" onClick={onShuffle}>
            Shuffle again
          </button>
        )}
        <span className="position-number">
          {resolvedNumber === null ? "" : `#${resolvedNumber}${resolvedNumber === 518 ? " · standard chess" : ""}`}
        </span>
      </div>
    </div>
  );
}
