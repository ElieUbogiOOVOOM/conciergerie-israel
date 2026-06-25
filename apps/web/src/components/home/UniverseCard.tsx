import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";

type UniverseCardProps = {
  /** Ancre de section (cible de la navigation). */
  id: string;
  /** Numéro d'ordre affiché (01, 02, 03). */
  index: string;
  label: string;
  title: string;
  description: string;
  services: string[];
  ctaLabel: string;
  /** Route de la page univers dédiée (#25-27), préfixée par locale via Link. */
  pageHref: string;
  /** Libellé du lien « Découvrir » vers la page dédiée. */
  learnMoreLabel: string;
  /** Texte « photographie à venir » localisé. */
  photoCaption: string;
  /** Inverse l'ordre photo/texte (alternance visuelle). */
  reversed?: boolean;
};

/**
 * Présentation d'un univers HYMEA : emplacement photo réelle + narration.
 * Mise en page alternée, naturellement bidirectionnelle (grille + logical
 * properties). Lien « Découvrir » vers la page dédiée (#25-27) et CTA de
 * conversion vers le bloc contact.
 */
export function UniverseCard({
  id,
  index,
  label,
  title,
  description,
  services,
  ctaLabel,
  pageHref,
  learnMoreLabel,
  photoCaption,
  reversed = false,
}: UniverseCardProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 border-t border-encre/10 py-16 lg:py-24"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 lg:grid-cols-2 lg:gap-16">
        <div className={reversed ? "lg:order-2" : undefined}>
          <PhotoPlaceholder label={label} caption={photoCaption} />
        </div>

        <div className={reversed ? "lg:order-1" : undefined}>
          <div className="flex items-baseline gap-4">
            <span className="font-title text-[length:var(--text-h3)] text-or">{index}</span>
            <p className="font-label text-sm uppercase tracking-[0.3em] text-or-profond">{label}</p>
          </div>

          <h3
            id={`${id}-title`}
            className="mt-5 font-title text-[length:var(--text-h2)] text-encre"
          >
            {title}
          </h3>

          <p className="mt-6 max-w-[var(--measure)] text-[length:var(--text-lead)] leading-relaxed text-encre/75">
            {description}
          </p>

          {services.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              {services.map((service) => (
                <li
                  key={service}
                  className="font-label text-xs uppercase tracking-widest text-encre/70"
                >
                  {service}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Button href="#contact" variant="ghost">
              {ctaLabel}
            </Button>
            <Link
              href={pageHref}
              className="group inline-flex items-center gap-2 font-label text-xs uppercase tracking-widest text-or-profond transition-colors hover:text-encre"
            >
              {learnMoreLabel}
              <span
                aria-hidden
                className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
              >
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
