import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/Logo";
import { Reveal } from "./Reveal";

// Marques du groupe Sandra Bibas Holding, dans l'ordre du deck « The history of
// the Group ». HYMEA en est l'aboutissement (panneau or ci-dessous).
const ENTITIES = ["pepites", "oovoom", "oovoomDriver", "maVape"] as const;
const PRINCIPLE_COUNT = 2;

/**
 * Récit éditorial de l'histoire du groupe : positionnement, deux principes
 * fondateurs, portée B2C/B2B, marques du groupe et émergence de HYMEA en Israël.
 * Apparition au défilement (Reveal) fidèle au « mouvement quand on slide ».
 */
export function GroupHistory() {
  const t = useTranslations("Landing.history");
  const principles = t.raw("principles") as string[];

  return (
    <section
      id="histoire"
      aria-labelledby="histoire-title"
      className="scroll-mt-24 border-t border-encre/10 bg-sable"
    >
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <Reveal>
          <p className="font-label text-sm uppercase tracking-[0.3em] text-or-profond">
            {t("eyebrow")}
          </p>
          <h2
            id="histoire-title"
            className="mt-5 max-w-3xl font-title text-[length:var(--text-h2)] text-encre"
          >
            {t("title")}
          </h2>
          <p className="mt-6 max-w-[var(--measure)] text-[length:var(--text-lead)] leading-relaxed text-encre/75">
            {t("lead")}
          </p>
        </Reveal>

        {/* Deux principes fondateurs */}
        <Reveal className="mt-14">
          <p className="font-label text-xs uppercase tracking-[0.25em] text-encre/55">
            {t("principlesTitle")}
          </p>
          <ol className="mt-6 grid gap-px overflow-hidden border border-encre/10 bg-encre/10 sm:grid-cols-2">
            {principles.slice(0, PRINCIPLE_COUNT).map((principle, i) => (
              <li key={principle} className="bg-creme p-8">
                <span className="font-title text-[length:var(--text-h3)] text-or">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-3 text-[length:var(--text-lead)] leading-relaxed text-encre/80">
                  {principle}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-8 max-w-[var(--measure)] leading-relaxed text-encre/70">{t("reach")}</p>
        </Reveal>

        {/* Marques du groupe */}
        <Reveal className="mt-16">
          <p className="font-label text-xs uppercase tracking-[0.25em] text-encre/55">
            {t("entitiesTitle")}
          </p>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ENTITIES.map((key) => (
              <li
                key={key}
                className="border border-encre/10 bg-ivoire p-6 transition-colors hover:border-or"
              >
                <h3 className="font-title text-[length:var(--text-h3)] leading-tight text-or-profond">
                  {t(`entities.${key}.name`)}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-encre/70">
                  {t(`entities.${key}.description`)}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Émergence de HYMEA — moment fort, panneau or. */}
        <Reveal className="mt-12 flex items-center gap-5 border border-or/40 bg-or p-8 lg:gap-7 lg:p-10">
          <Logo size={56} className="hidden shrink-0 text-ivoire sm:block" />
          <p className="max-w-[var(--measure)] text-[length:var(--text-lead)] font-medium leading-relaxed text-ivoire">
            {t("emergence")}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
