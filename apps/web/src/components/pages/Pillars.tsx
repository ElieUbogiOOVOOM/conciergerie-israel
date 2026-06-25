import { useId } from "react";
import { useTranslations } from "next-intl";
import { emphasis } from "@/i18n/rich";

type PillarsProps = {
  /** Namespace next-intl (clés : eyebrow, title, items.{key}.{title,description}). */
  namespace: string;
  /** Clés des piliers, dans l'ordre (numérotés 01, 02, …). */
  itemKeys: readonly string[];
};

/**
 * Leviers / piliers numérotés sur fond sable, façon section Leviers de
 * l'accueil : chaque carte porte son rang (01…) en or et une description.
 */
export function Pillars({ namespace, itemKeys }: PillarsProps) {
  const t = useTranslations(namespace);
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="border-t border-encre/10 bg-sable">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
        <p className="font-label text-sm uppercase tracking-[0.3em] text-or-profond">
          {t("eyebrow")}
        </p>
        <h2
          id={titleId}
          className="mt-5 max-w-3xl font-title text-[length:var(--text-h2)] text-encre"
        >
          {t("title")}
        </h2>

        <ol className="mt-12 grid gap-px overflow-hidden border border-encre/10 bg-encre/10 sm:grid-cols-2">
          {itemKeys.map((key, i) => (
            <li key={key} className="bg-creme p-8">
              <span className="font-label text-sm uppercase tracking-[0.25em] text-or-profond">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 font-title text-[length:var(--text-h3)] text-encre">
                {t(`items.${key}.title`)}
              </h3>
              <p className="mt-3 text-[length:var(--text-lead)] leading-relaxed text-encre/70">
                {t.rich(`items.${key}.description`, emphasis)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
