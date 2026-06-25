import { Logo } from "@/components/brand/Logo";

type PhotoPlaceholderProps = {
  /** Légende de l'emplacement (ex. nom de l'univers). */
  label: string;
  /** Texte « photographie à venir » localisé. */
  caption: string;
  /** Rapport d'aspect CSS (défaut 4/5, format éditorial portrait). */
  ratio?: string;
  className?: string;
};

/**
 * Emplacement réservé pour une photographie réelle (fournie par le client,
 * cf. SPEC § 14). Reste sobre et charté : surface charbon clair, monogramme
 * discret, légende. À remplacer par <Image> une fois les visuels livrés.
 */
export function PhotoPlaceholder({
  label,
  caption,
  ratio = "4 / 5",
  className,
}: PhotoPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={`${caption} — ${label}`}
      style={{ aspectRatio: ratio }}
      className={[
        "flex flex-col items-center justify-center gap-4 border border-creme/10 bg-charbon-clair",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Logo size={48} className="text-or-champagne/40" />
      <span className="px-6 text-center font-label text-xs uppercase tracking-[0.25em] text-creme/35">
        {caption}
      </span>
    </div>
  );
}
