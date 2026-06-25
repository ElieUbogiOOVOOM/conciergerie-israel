import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

// Coordonnées provisoires (placeholders) — remplacées par les coordonnées
// définitives du client. cf. SPEC § 14.
const CONTACT_EMAIL = "contact@hymea.com";

/**
 * Bloc de contact réutilisable (cible de l'ancre #contact) : met en avant
 * l'offre « -20 % sur la première prestation » et l'accès à la prise de contact.
 * Le CTA pointera vers le funnel RDV (#28) une fois celui-ci livré ; en
 * attendant, il ouvre une prise de contact directe.
 */
export function ContactBlock() {
  const t = useTranslations("Contact");

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="scroll-mt-24 border-t border-creme/10 bg-charbon-clair"
    >
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="font-label text-sm uppercase tracking-[0.3em] text-or-champagne">
              {t("eyebrow")}
            </p>
            <h2
              id="contact-title"
              className="mt-5 font-title text-[length:var(--text-h2)] text-creme"
            >
              {t("title")}
            </h2>
            <p className="mt-6 max-w-[var(--measure)] text-[length:var(--text-lead)] text-creme/75">
              {t("description")}
            </p>
          </div>

          {/* Carte de l'offre -20 %, accent or maîtrisé (sans dégradé). */}
          <div className="border border-or-champagne/35 bg-charbon p-8">
            <p className="font-title text-[length:var(--text-h3)] leading-tight text-or-champagne">
              {t("offerHeadline")}
            </p>
            <p className="mt-3 text-[length:var(--text-lead)] text-creme/75">{t("offerDetail")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button href={`mailto:${CONTACT_EMAIL}`} variant="primary">
                {t("cta")}
              </Button>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="self-center font-label text-xs uppercase tracking-widest text-creme/60 underline-offset-4 hover:text-creme hover:underline lg:self-start"
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
