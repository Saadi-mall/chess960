import { SegmentedControl } from "../SegmentedControl";
import type { PositionMode } from "./previewApi";

const MODE_OPTIONS = [
  { value: "RANDOM" as const, label: "Random" },
  { value: "NUMBER" as const, label: "By number" },
  { value: "DAILY" as const, label: "Today's lesson" },
];

/** Which kind of starting position - sits in the page's title row. */
export function PositionModeControl({ mode, onChange }: { mode: PositionMode; onChange: (mode: PositionMode) => void }) {
  return <SegmentedControl aria-label="Starting position" options={MODE_OPTIONS} value={mode} onChange={onChange} />;
}

interface PositionDetailProps {
  mode: PositionMode;
  number: number;
  onNumberChange: (number: number) => void;
  onShuffle: () => void;
  /** The position the preview board is actually showing, once it has loaded. */
  resolvedNumber: number | null;
}

/** The settings-card section for the chosen mode: a number field, a shuffle button, or
 * just which position today's is. */
export function PositionDetail({ mode, number, onNumberChange, onShuffle, resolvedNumber }: PositionDetailProps) {
  const label = resolvedNumber === null ? "Loading..." : `Position #${resolvedNumber}${resolvedNumber === 518 ? " (standard chess)" : ""}`;
  return (
    <div className="side-section">
      <span className="side-label">Starting position</span>
      {mode === "NUMBER" && (
        <input
          type="number"
          min={0}
          max={959}
          value={number}
          onChange={(e) => onNumberChange(Number(e.target.value))}
          className="number-input"
          aria-label="Chess960 position number (0-959)"
        />
      )}
      {mode === "RANDOM" && (
        <button type="button" className="secondary-button" style={{ width: "100%" }} onClick={onShuffle}>
          Shuffle again
        </button>
      )}
      <p className="side-text" style={{ marginTop: mode === "DAILY" ? 0 : "var(--space-2)" }}>
        <strong>{label}</strong>
      </p>
    </div>
  );
}
