import { useId } from "react";
import { useTranslations } from "next-intl";

/** Section d'un document légal : un intertitre, un corps, d'éventuelles puces. */
type LegalSection = {
  heading: string;
  body?: string;
  items?: string[];
};

type LegalDocProps = {
  /** Namespace next-intl (clés : title, updated, intro, sections[]). */
  namespace: string;
};

/**
 * Gabarit éditorial des pages légales (#30) : mentions légales et politique de
 * confidentialité. Colonne de lecture étroite, registre sobre de la charte —
 * pas de panneau or, ces pages se veulent neutres et lisibles. Le contenu vit
 * intégralement dans les messages (FR/EN/HE), sections incluses.
 */
export function LegalDoc({ namespace }: LegalDocProps) {
  const t = useTranslations(namespace);
  const titleId = useId();
  const sections = t.raw("sections") as LegalSection[];

  return (
    <article aria-labelledby={titleId} className="border-b border-encre/10">
      <div className="mx-auto max-w-[var(--measure)] px-6 py-16 lg:py-24">
        <p className="font-label text-sm uppercase tracking-[0.3em] text-or-profond">
          {t("eyebrow")}
        </p>
        <h1
          id={titleId}
          className="mt-5 font-title text-[length:var(--text-h1)] leading-[1.1] text-encre"
        >
          {t("title")}
        </h1>
        <p className="mt-4 font-label text-xs uppercase tracking-widest text-encre/55">
          {t("updated")}
        </p>

        <div className="mt-12 space-y-12">
          {sections.map((section, index) => (
            <section key={index}>
              <h2 className="font-title text-[length:var(--text-h3)] text-encre">
                {section.heading}
              </h2>
              {section.body ? (
                <p className="mt-4 text-[length:var(--text-lead)] leading-relaxed text-encre/75">
                  {section.body}
                </p>
              ) : null}
              {section.items ? (
                <ul className="mt-4 space-y-2 text-[length:var(--text-lead)] leading-relaxed text-encre/75">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex gap-3">
                      <span aria-hidden className="mt-[0.55em] h-1.5 w-1.5 shrink-0 bg-or" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
