import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

/**
 * Bannière d'accueil : registre éditorial, contemplatif. Titre fluide en Cinzel,
 * accroche en Cormorant, double CTA (l'or rare sur l'action principale).
 */
export function Hero() {
  const t = useTranslations("Home.hero");
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-24 lg:pb-28 lg:pt-32">
        <p className="font-label text-sm uppercase tracking-[0.3em] text-or-champagne">
          {t("eyebrow")}
        </p>
        <h1 className="mt-6 max-w-4xl font-title text-[length:var(--text-display)] leading-[1.05] text-creme">
          {t("title")}
        </h1>
        <p className="mt-8 max-w-[var(--measure)] text-[length:var(--text-lead)] text-creme/80">
          {t("subtitle")}
        </p>
        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button href="#contact" variant="primary">
            {t("ctaPrimary")}
          </Button>
          <Button href="#centres-commerciaux" variant="ghost">
            {t("ctaSecondary")}
          </Button>
        </div>
      </div>
    </section>
  );
}
