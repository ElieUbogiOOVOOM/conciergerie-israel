"use client";

import { useEffect, useRef } from "react";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Corps explicatif (conséquences de l'action). */
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** true = action destructive : bouton de confirmation en rouge. */
  destructive?: boolean;
  /** Désactive les boutons et affiche un indicateur pendant l'appel réseau. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Sélecteur des éléments focusables d'une modale. */
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modale de confirmation accessible (pattern APG dialog) : focus initial sur
 * l'action, piège Tab/Shift+Tab, restaure le focus à la fermeture, fermeture
 * Échap/clic backdrop. Réutilisée pour les actions sensibles (annulation RDV, RGPD).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Annuler",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Mémorise l'élément déclencheur pour restaurer le focus à la fermeture.
    const previous = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        onCancel();
        return;
      }
      if (e.key !== "Tab") return;
      // Piège le focus dans la modale (boucle premier ↔ dernier).
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-encre/40 p-4"
      onMouseDown={() => !busy && onCancel()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="w-full max-w-md rounded-md border border-sable bg-ivoire p-6 shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="font-title text-h3 text-encre">
          {title}
        </h2>
        <div id="confirm-desc" className="mt-3 font-ui text-sm leading-relaxed text-encre-doux">
          {description}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && (
              <span
                className="size-4 animate-spin rounded-full border-2 border-creme/40 border-t-creme"
                aria-hidden
              />
            )}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
