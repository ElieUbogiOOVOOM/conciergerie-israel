import { useId } from "react";
import { useTranslations } from "next-intl";
import { emphasis } from "@/i18n/rich";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";

type PageHeroProps = {
  /** Namespace next-intl de la section (clés : eyebrow, title, lead). */
  namespace: string;
  /** Libellé de l'emplacement photo réelle (à fournir par le client). */
  photoLabel: string;
};

/**
 * En-tête éditorial d'une page univers : eyebrow, titre H1 unique et chapô
 * (le chapô supporte l'emphase `<b>` via t.rich), avec emplacement photo réelle.
 */
export function PageHero({ namespace, photoLabel }: PageHeroProps) {
  const t = useTranslations(namespace);
  const photoCaption = useTranslations("Home")("photoCaption");
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="border-b border-encre/10">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
        <div>
          <p className="font-label text-sm uppercase tracking-[0.3em] text-or-profond">
            {t("eyebrow")}
          </p>
          <h1
            id={titleId}
            className="mt-5 font-title text-[length:var(--text-h1)] leading-[1.08] text-encre [overflow-wrap:anywhere]"
          >
            {t("title")}
          </h1>
          <p className="mt-6 max-w-[var(--measure)] text-[length:var(--text-lead)] leading-relaxed text-encre/75">
            {t.rich("lead", emphasis)}
          </p>
        </div>
        <div className="lg:order-last">
          <PhotoPlaceholder label={photoLabel} caption={photoCaption} ratio="4 / 3" />
        </div>
      </div>
    </section>
  );
}
