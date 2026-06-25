import { useId } from "react";
import { useTranslations } from "next-intl";
import { emphasisInherit } from "@/i18n/rich";
import { Button } from "@/components/ui/Button";

type PageCtaProps = {
  /** Namespace next-intl (clés : eyebrow, title, description, label). */
  namespace: string;
  /**
   * Cible du CTA. Par défaut l'ancre du bloc contact commun (#contact).
   * À terme : funnel RDV typé `?type=mall|entreprise|particulier` (#28).
   */
  href?: string;
};

/**
 * Appel à l'action de conversion propre à l'univers, sur panneau or (moment
 * fort). Le bloc contact + offre −20 % du layout suit immédiatement en pied de
 * page (cf. CDC § 04).
 */
export function PageCta({ namespace, href = "#contact" }: PageCtaProps) {
  const t = useTranslations(namespace);
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="border-t border-encre/10 bg-or">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <p className="font-label text-sm uppercase tracking-[0.3em] text-ivoire/80">
          {t("eyebrow")}
        </p>
        <h2
          id={titleId}
          className="mt-5 max-w-3xl font-title text-[length:var(--text-h2)] text-ivoire"
        >
          {t("title")}
        </h2>
        <p className="mt-6 max-w-[var(--measure)] text-[length:var(--text-lead)] leading-relaxed text-ivoire/85">
          {t.rich("description", emphasisInherit)}
        </p>
        <div className="mt-12">
          <Button href={href} variant="primary">
            {t("label")}
          </Button>
        </div>
      </div>
    </section>
  );
}
