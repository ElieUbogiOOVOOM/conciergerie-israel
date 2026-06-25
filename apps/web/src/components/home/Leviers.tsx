import { useTranslations } from "next-intl";

// Les trois leviers stratégiques du deck SEGULA : panier moyen, fidélité,
// zone de chalandise. Présentés comme la promesse de valeur de l'expérience.
const LEVIERS = ["spend", "loyalty", "catchment"] as const;

export function Leviers() {
  const t = useTranslations("Home.leviers");

  return (
    <section aria-labelledby="leviers-title" className="border-t border-encre/10 bg-sable">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
        <p className="font-label text-sm uppercase tracking-[0.3em] text-or-profond">
          {t("eyebrow")}
        </p>
        <h2
          id="leviers-title"
          className="mt-5 max-w-3xl font-title text-[length:var(--text-h2)] text-encre"
        >
          {t("title")}
        </h2>

        <ol className="mt-12 grid gap-px overflow-hidden border border-encre/10 bg-encre/10 sm:grid-cols-3">
          {LEVIERS.map((key, i) => (
            <li key={key} className="bg-creme p-8">
              <span className="font-label text-sm uppercase tracking-[0.25em] text-or-profond">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 font-title text-[length:var(--text-h3)] text-encre">
                {t(`items.${key}.title`)}
              </h3>
              <p className="mt-3 text-[length:var(--text-lead)] leading-relaxed text-encre/70">
                {t(`items.${key}.description`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
