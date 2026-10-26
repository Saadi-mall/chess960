import type { ReactNode } from "react";

/** Small line icons for the icon buttons (no icon font or emoji), drawn in currentColor. */

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

export const FlagIcon = () => (
  <Icon>
    <path d="M5 21V4" />
    <path d="M5 4h12l-2.5 4.5L17 13H5" />
  </Icon>
);

export const ResetIcon = () => (
  <Icon>
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M4 4v5h5" />
  </Icon>
);

export const FlipIcon = () => (
  <Icon>
    <path d="M7 4v16" />
    <path d="M3 8l4-4 4 4" />
    <path d="M17 20V4" />
    <path d="M13 16l4 4 4-4" />
  </Icon>
);

export const FirstIcon = () => (
  <Icon>
    <path d="M6 5v14" />
    <path d="M18 6l-8 6 8 6z" fill="currentColor" />
  </Icon>
);

export const PrevIcon = () => (
  <Icon>
    <path d="M16 6l-8 6 8 6z" fill="currentColor" />
  </Icon>
);

export const PlayIcon = () => (
  <Icon>
    <path d="M8 5l11 7-11 7z" fill="currentColor" />
  </Icon>
);

export const PauseIcon = () => (
  <Icon>
    <path d="M8 5v14M16 5v14" />
  </Icon>
);

export const NextIcon = () => (
  <Icon>
    <path d="M8 6l8 6-8 6z" fill="currentColor" />
  </Icon>
);

export const LastIcon = () => (
  <Icon>
    <path d="M6 6l8 6-8 6z" fill="currentColor" />
    <path d="M18 5v14" />
  </Icon>
);
