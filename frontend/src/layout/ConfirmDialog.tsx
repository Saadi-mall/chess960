import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  /** Styles the confirm button as destructive (red), e.g. for resigning. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A styled modal asking the player to confirm a game-ending or opponent-visible action.
 * Escape or clicking the backdrop cancels. */
export function ConfirmDialog({ title, message, confirmLabel, danger = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{message}</p>
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={danger ? "primary-button danger-button" : "primary-button"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
