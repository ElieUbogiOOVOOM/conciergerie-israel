import Image from "next/image";
import { Logo } from "@/components/brand/Logo";

type PhotoPlaceholderProps = {
  /** Légende de l'emplacement (ex. nom de l'univers). */
  label: string;
  /** Texte « photographie à venir » localisé. */
  caption: string;
  /** Rapport d'aspect CSS (défaut 4/5, format éditorial portrait). */
  ratio?: string;
  className?: string;
  /**
   * Chemin de la photographie réelle (cf. SPEC § 14). Si fourni, l'image
   * remplace le placeholder ; sinon on garde le monogramme + légende.
   */
  src?: string;
  /** Texte alternatif localisé, requis dès qu'une `src` est fournie. */
  alt?: string;
  /**
   * Charge l'image en priorité (LCP des héros) plutôt qu'en lazy. Sans effet
   * sur le placeholder.
   */
  priority?: boolean;
  /** Indice de tailles pour le srcset responsive de next/image. */
  sizes?: string;
};

/**
 * Emplacement d'une photographie réelle (fournie par le client, cf. SPEC § 14).
 * Avec `src`, affiche un `next/image` recadré (object-cover) dans la boîte au
 * bon ratio ; sans `src`, conserve le placeholder charté (monogramme + légende)
 * comme fallback tant que le visuel n'est pas livré.
 */
export function PhotoPlaceholder({
  label,
  caption,
  ratio = "4 / 5",
  className,
  src,
  alt,
  priority = false,
  sizes = "(min-width: 1024px) 50vw, 100vw",
}: PhotoPlaceholderProps) {
  if (src) {
    return (
      <div
        style={{ aspectRatio: ratio }}
        className={["relative overflow-hidden border border-encre/10 bg-sable", className]
          .filter(Boolean)
          .join(" ")}
      >
        <Image
          src={src}
          alt={alt ?? label}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`${caption} — ${label}`}
      style={{ aspectRatio: ratio }}
      className={[
        "flex flex-col items-center justify-center gap-4 border border-encre/10 bg-sable",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Logo size={48} className="text-or/50" />
      <span className="px-6 text-center font-label text-xs uppercase tracking-[0.25em] text-encre/40">
        {caption}
      </span>
    </div>
  );
}
