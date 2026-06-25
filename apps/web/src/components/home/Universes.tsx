import { useTranslations } from "next-intl";
import { UniverseCard } from "./UniverseCard";

// Les trois cibles de la marque, dans l'ordre de la narration. Les ancres
// correspondent aux liens de navigation du header.
const UNIVERSES = [
  { id: "centres-commerciaux", key: "shoppingCentres", index: "01" },
  { id: "entreprises", key: "businesses", index: "02" },
  { id: "particuliers", key: "individuals", index: "03" },
] as const;

export function Universes() {
  const t = useTranslations("Home");
  const tu = useTranslations("Home.universes");

  return (
    <div>
      {/* Intro narrative des trois univers */}
      <section aria-labelledby="univers-title" className="border-t border-encre/10 bg-sable">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <p className="font-label text-sm uppercase tracking-[0.3em] text-or-profond">
            {t("intro.eyebrow")}
          </p>
          <h2
            id="univers-title"
            className="mt-5 max-w-3xl font-title text-[length:var(--text-h2)] text-encre"
          >
            {t("intro.title")}
          </h2>
          <p className="mt-6 max-w-[var(--measure)] text-[length:var(--text-lead)] leading-relaxed text-encre/75">
            {t("intro.description")}
          </p>
        </div>
      </section>

      {UNIVERSES.map((u, i) => (
        <UniverseCard
          key={u.id}
          id={u.id}
          index={u.index}
          label={tu(`${u.key}.label`)}
          title={tu(`${u.key}.title`)}
          description={tu(`${u.key}.description`)}
          services={tu.raw(`${u.key}.services`) as string[]}
          ctaLabel={tu(`${u.key}.cta`)}
          photoCaption={t("photoCaption")}
          reversed={i % 2 === 1}
        />
      ))}
    </div>
  );
}
