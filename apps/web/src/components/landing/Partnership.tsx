import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Reveal } from "./Reveal";

/**
 * Section « Partenariat » de la page de garde : invitation à travailler avec
 * HYMEA (« The Service, Your Partner, A Strategy ») et accès direct au bloc
 * contact (#contact, fourni par le layout avec l'offre −20 %). Apparition au
 * défilement (Reveal).
 */
export function Partnership() {
  const t = useTranslations("Landing.partnership");

  return (
    <section
      id="partenariat"
      aria-labelledby="partenariat-title"
      className="scroll-mt-24 border-t border-encre/10 bg-creme"
    >
      <Reveal className="mx-auto max-w-6xl px-6 py-20 text-center lg:py-28">
        <p className="font-label text-sm uppercase tracking-[0.3em] text-or-profond">
          {t("eyebrow")}
        </p>
        <h2
          id="partenariat-title"
          className="mx-auto mt-5 max-w-3xl font-title text-[length:var(--text-h2)] text-encre"
        >
          {t("title")}
        </h2>
        <p className="mx-auto mt-6 font-title text-[length:var(--text-h3)] italic text-or-profond">
          {t("tagline")}
        </p>
        <p className="mx-auto mt-6 max-w-[var(--measure)] text-[length:var(--text-lead)] leading-relaxed text-encre/75">
          {t("description")}
        </p>
        <div className="mt-12">
          <Button href="#contact" variant="primary">
            {t("cta")}
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
