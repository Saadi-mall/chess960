import { useEffect, useState } from "react";
import { formatClock } from "./clock";

interface ClockDisplayProps {
  millis: number;
  isTicking: boolean;
}

/** The server sends a snapshot of remaining time with each STATE message; this ticks it
 * down locally in between so the clock reads smoothly rather than jumping once a move. */
export function ClockDisplay({ millis, isTicking }: ClockDisplayProps) {
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

  return (
    <div className={`clock${isTicking ? " clock-active" : ""}${displayMillis < 30_000 ? " clock-low" : ""}`}>
      {formatClock(displayMillis)}
    </div>
  );
}
