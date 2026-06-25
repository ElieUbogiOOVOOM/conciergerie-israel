/** Indicateur de chargement sobre (filet or qui tourne). */
export function Spinner({ label = "Chargement…" }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 font-ui text-sm text-encre-doux">
      <span
        className="size-4 animate-spin rounded-full border-2 border-sable border-t-or-profond"
        aria-hidden
      />
      {label}
    </span>
  );
}
