import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@hymea/shared";
import { buildPageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/pages/PageHero";
import { Pillars } from "@/components/pages/Pillars";
import { Packages } from "@/components/pages/Packages";
import { ProofStats } from "@/components/pages/ProofStats";

// Page univers « Entreprises » (#26) — HYMEA Lounge & entretien premium des
// bureaux, conciergerie d'entreprise (deck « The Office Conciergerie »). La
// conversion est portée par le bloc contact commun (offre -20 % + CTA RDV
// pré-filtré « entreprise ») et le footer, fournis par le layout.
const PILLARS = ["talent", "hrLever", "productivity", "standards"] as const;
// Paliers « A tailored solution » (deck p.24-25), du socle inclus à la demande.
const OFFERS = ["basic", "silver", "gold", "onRequest"] as const;
const PROOF_STATS = ["gdp", "productivity", "applicants"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale: locale as Locale,
    namespace: "BusinessPage.meta",
    path: "/entreprises",
  });
}

export default async function BusinessesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHero namespace="BusinessPage.hero" photoLabel="Entreprises" ctaType="entreprise" />
      <Pillars namespace="BusinessPage.pillars" itemKeys={PILLARS} />
      <Packages namespace="BusinessPage.offers" itemKeys={OFFERS} highlightKey="gold" />
      <ProofStats namespace="BusinessPage.proof" statKeys={PROOF_STATS} hasNote />
    </>
  );
}
