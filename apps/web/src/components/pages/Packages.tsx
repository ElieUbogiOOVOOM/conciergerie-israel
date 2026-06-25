import { useId } from "react";
import { useTranslations } from "next-intl";
import { emphasis } from "@/i18n/rich";

type PackagesProps = {
  /** Namespace next-intl (clés : eyebrow, title, description, footnote, items.{key}.{tier,subtitle,pitch,services[]}). */
  namespace: string;
  /** Clés des paliers d'offre, dans l'ordre. */
  itemKeys: readonly string[];
  /** Clé du palier mis en avant (filet or permanent). */
  highlightKey?: string;
};

/**
 * Grille des paliers d'offre (« A tailored solution ») : chaque carte porte son
 * palier, son intitulé, un pitch (emphase `<b>`) et la liste détaillée des
 * services inclus. Reprend le registre sobre des autres sections (cartes ivoire,
 * filet or au survol, accents or-profond).
 */
export function Packages({ namespace, itemKeys, highlightKey }: PackagesProps) {
  const t = useTranslations(namespace);
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="scroll-mt-24 border-t border-encre/10">
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

        <ul className="mt-12 grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {itemKeys.map((key) => {
            const services = t.raw(`items.${key}.services`) as string[];
            const highlighted = key === highlightKey;
            return (
              <li
                key={key}
                className={[
                  "border bg-ivoire p-6 transition-colors",
                  highlighted ? "border-or ring-1 ring-or" : "border-encre/10 hover:border-or",
                ].join(" ")}
              >
                {highlighted && (
                  <span className="mb-4 inline-block bg-or px-2.5 py-1 font-label text-xs uppercase tracking-[0.2em] text-encre">
                    {t("featured")}
                  </span>
                )}
                <p className="font-label text-sm uppercase tracking-[0.25em] text-or-profond">
                  {t(`items.${key}.tier`)}
                </p>
                <h3 className="mt-3 font-title text-[length:var(--text-h3)] text-encre">
                  {t(`items.${key}.subtitle`)}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-encre/70">
                  {t.rich(`items.${key}.pitch`, emphasis)}
                </p>

                <ul className="mt-5 space-y-2 border-t border-encre/10 pt-5">
                  {services.map((service, i) => (
                    <li
                      key={`${key}-${i}`}
                      className="flex gap-2.5 text-sm leading-relaxed text-encre/75"
                    >
                      <span
                        aria-hidden
                        className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-or"
                      />
                      <span>{service}</span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>

        <p className="mt-10 max-w-[var(--measure)] text-[length:var(--text-lead)] italic leading-relaxed text-encre/70">
          {t("footnote")}
        </p>
      </div>
    </section>
  );
}
