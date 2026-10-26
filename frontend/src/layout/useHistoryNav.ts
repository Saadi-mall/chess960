import { useEffect, useState } from "react";

export interface HistoryNav {
  /** How many moves into the game the board is showing (0 = starting position). */
  ply: number;
  /** Total moves played. */
  length: number;
  isLatest: boolean;
  playing: boolean;
  goTo: (ply: number) => void;
  first: () => void;
  prev: () => void;
  next: () => void;
  last: () => void;
  togglePlay: () => void;
}

/**
 * Which earlier position the board is showing, for the move list's back/forward buttons.
 * While it's on the latest position it follows new moves as they arrive; stepping back
 * pins it to that move until you step forward to the end again.
 */
export function useHistoryNav(length: number): HistoryNav {
  const [pinned, setPinned] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const ply = pinned === null ? length : Math.min(pinned, length);
  // Replay stops by itself once it reaches the last move.
  const replaying = playing && ply < length;

  function goTo(target: number) {
    const clamped = Math.max(0, Math.min(target, length));
    setPinned(clamped >= length ? null : clamped);
    setPlaying(false);
  }

  useEffect(() => {
    if (!replaying) return;
    const timer = setTimeout(() => setPinned(ply + 1 >= length ? null : ply + 1), 700);
    return () => clearTimeout(timer);
  }, [replaying, ply, length]);

  return {
    ply,
    length,
    isLatest: ply === length,
    playing: replaying,
    goTo,
    first: () => goTo(0),
    prev: () => goTo(ply - 1),
    next: () => goTo(ply + 1),
    last: () => goTo(length),
    togglePlay: () => {
      // Playing from the end replays the whole game from the start.
      if (!replaying && ply >= length) setPinned(0);
      setPlaying(!replaying);
    },
  };
}
