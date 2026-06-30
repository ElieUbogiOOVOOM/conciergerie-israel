import { useId } from "react";
import { useTranslations } from "next-intl";
import { emphasis } from "@/i18n/rich";
import { FeatureFlipCard } from "@/components/pages/FeatureFlipCard";

type FeatureGridProps = {
  /** Namespace next-intl (clés : eyebrow, title, description, items.{key}.{title,description}). */
  namespace: string;
  /** Clés des prestations à afficher, dans l'ordre. */
  itemKeys: readonly string[];
  /**
   * Photographies réelles par clé, révélées au dos de la carte (#27). Sans
   * entrée, la carte garde son placeholder. L'alt est lu via `items.{key}.photoAlt`.
   */
  images?: Partial<Record<string, string>>;
  /** Surface de fond de section. */
  surface?: "creme" | "sable" | "ivoire";
  /** Nombre de colonnes au plus large breakpoint. */
  columns?: 2 | 3 | 4;
  /** id d'ancre optionnel (navigation interne). */
  id?: string;
};

const SURFACE: Record<NonNullable<FeatureGridProps["surface"]>, string> = {
  creme: "",
  sable: "bg-sable",
  ivoire: "bg-ivoire",
};

const COLUMNS: Record<NonNullable<FeatureGridProps["columns"]>, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

/**
 * Grille éditoriale de prestations : eyebrow, titre, chapô (emphase `<b>`),
 * puis cartes ivoire à filet or au survol. Reprend exactement le patron de la
 * section Experience de l'accueil.
 */
export function FeatureGrid({
  namespace,
  itemKeys,
  images,
  surface = "creme",
  columns = 4,
  id,
}: FeatureGridProps) {
  const t = useTranslations(namespace);
  const photoCaption = useTranslations("Home")("photoCaption");
  const titleId = useId();

  const flipHint = t.has("flipHint") ? t("flipHint") : undefined;
  const flipBackHint = t.has("flipBackHint") ? t("flipBackHint") : undefined;

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={["scroll-mt-24 border-t border-encre/10", SURFACE[surface]]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <p className="font-label text-sm uppercase tracking-[0.3em] text-or-profond">
          {t("eyebrow")}
        </p>
        <h2
          id={titleId}
          className="mt-5 max-w-3xl font-title text-[length:var(--text-h2)] text-encre"
        >
          {t("title")}
        </h2>
        <p className="mt-6 max-w-[var(--measure)] text-[length:var(--text-lead)] leading-relaxed text-encre/75">
          {t.rich("description", emphasis)}
        </p>

        <ul className={`mt-12 grid gap-5 ${COLUMNS[columns]}`}>
          {itemKeys.map((key) => (
            <li key={key}>
              <FeatureFlipCard
                title={t(`items.${key}.title`)}
                description={t.rich(`items.${key}.description`, emphasis)}
                photoCaption={photoCaption}
                photoSrc={images?.[key]}
                photoAlt={t.has(`items.${key}.photoAlt`) ? t(`items.${key}.photoAlt`) : undefined}
                flipHint={flipHint}
                flipBackHint={flipBackHint}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
