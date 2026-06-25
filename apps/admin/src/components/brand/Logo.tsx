type LogoProps = {
  /** Taille en pixels (carré). */
  size?: number;
  className?: string;
  /** Titre accessible ; si absent, le logo est décoratif (aria-hidden). */
  title?: string;
};

/**
 * Monogramme HYMEA — rosette/mandala à 8 pétales, trait fin.
 * Interprétation vectorielle de la charte (à remplacer par le vecteur officiel
 * du client s'il est fourni). Le trait suit `currentColor` : il se teinte donc
 * automatiquement (or champagne, crème, etc.) selon le contexte.
 */
export function Logo({ size = 40, className, title }: LogoProps) {
  const decorative = !title;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={title}
    >
      {!decorative && <title>{title}</title>}
      <defs>
        <path id="hymea-petal-outer" d="M50 50 C40 30 44 13 50 6 C56 13 60 30 50 50 Z" />
        <path id="hymea-petal-inner" d="M50 50 C43 40 43 29 50 23 C57 29 57 40 50 50 Z" />
      </defs>
      <g>
        <use href="#hymea-petal-outer" />
        <use href="#hymea-petal-outer" transform="rotate(45 50 50)" />
        <use href="#hymea-petal-outer" transform="rotate(90 50 50)" />
        <use href="#hymea-petal-outer" transform="rotate(135 50 50)" />
        <use href="#hymea-petal-outer" transform="rotate(180 50 50)" />
        <use href="#hymea-petal-outer" transform="rotate(225 50 50)" />
        <use href="#hymea-petal-outer" transform="rotate(270 50 50)" />
        <use href="#hymea-petal-outer" transform="rotate(315 50 50)" />
      </g>
      <g>
        <use href="#hymea-petal-inner" />
        <use href="#hymea-petal-inner" transform="rotate(45 50 50)" />
        <use href="#hymea-petal-inner" transform="rotate(90 50 50)" />
        <use href="#hymea-petal-inner" transform="rotate(135 50 50)" />
        <use href="#hymea-petal-inner" transform="rotate(180 50 50)" />
        <use href="#hymea-petal-inner" transform="rotate(225 50 50)" />
        <use href="#hymea-petal-inner" transform="rotate(270 50 50)" />
        <use href="#hymea-petal-inner" transform="rotate(315 50 50)" />
      </g>
      <circle cx="50" cy="50" r="3.2" />
    </svg>
  );
}
