import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/pages/PageHero";
import { Pillars } from "@/components/pages/Pillars";
import { FeatureGrid } from "@/components/pages/FeatureGrid";
import { ProofStats } from "@/components/pages/ProofStats";
import { PageCta } from "@/components/pages/PageCta";

// Page univers « Entreprises » (#26) — HYMEA Lounge & entretien premium des
// bureaux, conciergerie d'entreprise (deck « The Office Conciergerie »). Le bloc
// contact (+ offre -20 %) et le footer sont fournis par le layout.
const PILLARS = ["talent", "hrLever", "productivity", "standards"] as const;
const SERVICES = ["lounge", "concierge", "wellness", "team", "hospitality", "valet"] as const;
const PROOF_STATS = ["gdp", "productivity", "applicants"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BusinessPage.meta" });
  return { title: t("title"), description: t("description") };
}

export default async function BusinessesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHero namespace="BusinessPage.hero" photoLabel="Entreprises" />
      <Pillars namespace="BusinessPage.pillars" itemKeys={PILLARS} />
      <FeatureGrid namespace="BusinessPage.services" itemKeys={SERVICES} columns={3} />
      <ProofStats namespace="BusinessPage.proof" statKeys={PROOF_STATS} hasNote />
      {/* CTA → funnel ?type=entreprise (#28) une fois livré ; en attendant #contact. */}
      <PageCta namespace="BusinessPage.cta" />
    </>
  );
}
