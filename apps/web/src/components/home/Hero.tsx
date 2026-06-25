import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

/**
 * Bannière d'accueil — positionnement « expérience premium ». Registre éditorial
 * à la française, double CTA (l'action principale mène à la prise de contact).
 */
export function Hero() {
  const t = useTranslations("Home.hero");
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-20 lg:pb-28 lg:pt-28">
        <p className="font-label text-sm uppercase tracking-[0.3em] text-or-profond">
          {t("eyebrow")}
        </p>
        <h1 className="mt-6 max-w-4xl font-title text-[length:var(--text-display)] leading-[1.05] text-encre">
          {t("title")}
        </h1>
        <p className="mt-8 max-w-[var(--measure)] text-[length:var(--text-lead)] leading-relaxed text-encre/75">
          {t("subtitle")}
        </p>
        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button href="#contact" variant="primary">
            {t("ctaPrimary")}
          </Button>
          <Button href="#experience" variant="ghost">
            {t("ctaSecondary")}
          </Button>
        </div>
      </div>
    </section>
  );
}
