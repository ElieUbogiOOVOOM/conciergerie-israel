import { useId } from "react";
import { useTranslations } from "next-intl";

type ProofStatsProps = {
  /** Namespace next-intl (clés : eyebrow, title, description, stats.{key}.{value,label}, note?). */
  namespace: string;
  /** Clés des statistiques, dans l'ordre. */
  statKeys: readonly string[];
  /** Affiche la note de source en pied de panneau. */
  hasNote?: boolean;
};

/**
 * Panneau preuve sur fond encre (moment fort, contrasté) : statistiques
 * chiffrées en or. Reprend exactement le patron de la section Results.
 */
export function ProofStats({ namespace, statKeys, hasNote = false }: ProofStatsProps) {
  const t = useTranslations(namespace);
  const titleId = useId();
  const columns = statKeys.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";

  return (
    <section aria-labelledby={titleId} className="border-t border-encre/10 bg-encre text-creme">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <p className="font-label text-sm uppercase tracking-[0.3em] text-or">{t("eyebrow")}</p>
        <h2
          id={titleId}
          className="mt-5 max-w-3xl font-title text-[length:var(--text-h2)] text-creme"
        >
          {t("title")}
        </h2>
        <p className="mt-6 max-w-[var(--measure)] text-[length:var(--text-lead)] leading-relaxed text-creme/75">
          {t("description")}
        </p>

        <dl
          className={`mt-14 grid gap-px overflow-hidden border border-creme/15 bg-creme/15 sm:grid-cols-2 ${columns}`}
        >
          {statKeys.map((key) => (
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

        {hasNote && (
          <p className="mt-8 max-w-[var(--measure)] text-sm leading-relaxed text-creme/55">
            {t("note")}
          </p>
        )}
      </div>
    </section>
  );
}
