import { useTranslations } from "next-intl";

// Services signature de l'expérience SEGULA (deck). Grille éditoriale sobre,
// chaque service en carte ivoire avec filet or au survol.
const SERVICES = [
  "lounge",
  "handsFree",
  "styling",
  "valet",
  "personalShopper",
  "loyalty",
  "crm",
  "events",
] as const;

export function Experience() {
  const t = useTranslations("Home.experience");

  return (
    <section
      id="experience"
      aria-labelledby="experience-title"
      className="scroll-mt-24 border-t border-encre/10"
    >
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <p className="font-label text-sm uppercase tracking-[0.3em] text-or-profond">
          {t("eyebrow")}
        </p>
        <h2
          id="experience-title"
          className="mt-5 max-w-3xl font-title text-[length:var(--text-h2)] text-encre"
        >
          {t("title")}
        </h2>
        <p className="mt-6 max-w-[var(--measure)] text-[length:var(--text-lead)] leading-relaxed text-encre/75">
          {t("description")}
        </p>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((key) => (
            <li
              key={key}
              className="border border-encre/10 bg-ivoire p-6 transition-colors hover:border-or"
            >
              <h3 className="font-title text-[length:var(--text-h3)] text-encre">
                {t(`services.${key}.title`)}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-encre/70">
                {t(`services.${key}.description`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
