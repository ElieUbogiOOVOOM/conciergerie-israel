import { useTranslations } from "next-intl";

// Preuve de conversion (deck HYMEA § benefits) : panneau encre (moment fort,
// contrasté) avec statistiques chiffrées en or, puis références mondiales.
const STATS = ["spend", "dwell", "topClients", "loyalty"] as const;

export function Results() {
  const t = useTranslations("Home.results");
  const references = t.raw("references") as string[];

  return (
    <section
      id="resultats"
      aria-labelledby="results-title"
      className="scroll-mt-24 border-t border-encre/10 bg-encre text-creme"
    >
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <p className="font-label text-sm uppercase tracking-[0.3em] text-or">{t("eyebrow")}</p>
        <h2
          id="results-title"
          className="mt-5 max-w-3xl font-title text-[length:var(--text-h2)] text-creme"
        >
          {t("title")}
        </h2>
        <p className="mt-6 max-w-[var(--measure)] text-[length:var(--text-lead)] leading-relaxed text-creme/75">
          {t("description")}
        </p>

        <dl className="mt-14 grid gap-px overflow-hidden border border-creme/15 bg-creme/15 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((key) => (
            <div key={key} className="bg-encre p-8">
              <dt className="font-title text-[length:var(--text-h1)] leading-none text-or">
                {t(`stats.${key}.value`)}
              </dt>
              <dd className="mt-4 text-base leading-relaxed text-creme/75">
                {t(`stats.${key}.label`)}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-14">
          <p className="font-label text-xs uppercase tracking-[0.25em] text-creme/55">
            {t("referencesTitle")}
          </p>
          <ul className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
            {references.map((name) => (
              <li key={name} className="font-title text-[length:var(--text-h3)] text-creme/85">
                {name}
              </li>
            ))}
          </ul>
          <p className="mt-5 max-w-[var(--measure)] text-sm leading-relaxed text-creme/55">
            {t("referencesNote")}
          </p>
        </div>
      </div>
    </section>
  );
}
