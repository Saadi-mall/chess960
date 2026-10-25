import { useEffect, useState } from "react";

interface ClockDisplayProps {
  millis: number;
  isTicking: boolean;
  label: string;
}

/** The server sends a snapshot of remaining time with each STATE message; this ticks it
 * down locally in between so the clock reads smoothly rather than jumping once a move. */
export function ClockDisplay({ millis, isTicking, label }: ClockDisplayProps) {
  const [displayMillis, setDisplayMillis] = useState(millis);

  useEffect(() => {
    const receivedAt = Date.now();
    setDisplayMillis(millis);
    if (!isTicking) return;

    const interval = setInterval(() => {
      setDisplayMillis(Math.max(0, millis - (Date.now() - receivedAt)));
    }, 200);
    return () => clearInterval(interval);
  }, [millis, isTicking]);

  const totalSeconds = Math.ceil(displayMillis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const low = displayMillis < 30_000;

  return (
    <div className={`clock${isTicking ? " clock-active" : ""}${low ? " clock-low" : ""}`}>
      <span className="clock-label">{label}</span>
      <span className="clock-time">
        {minutes}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}
