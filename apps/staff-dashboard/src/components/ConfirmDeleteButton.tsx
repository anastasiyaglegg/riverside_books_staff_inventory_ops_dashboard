import { useState } from "react";

// Two-click inline confirm instead of window.confirm() -- keeps styling consistent
// with the rest of the app and avoids a native dialog blocking automated flows.
export function ConfirmDeleteButton({
  onConfirm,
  label = "Delete",
}: {
  onConfirm: () => void | Promise<void>;
  label?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn btn-danger"
        onClick={() => setConfirming(true)}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="confirm-delete">
      <button
        type="button"
        className="btn btn-danger"
        disabled={deleting}
        onClick={() => {
          setDeleting(true);
          void Promise.resolve(onConfirm()).finally(() => setDeleting(false));
        }}
      >
        {deleting ? "Deleting…" : "Confirm?"}
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={deleting}
        onClick={() => setConfirming(false)}
      >
        Cancel
      </button>
    </span>
  );
}
