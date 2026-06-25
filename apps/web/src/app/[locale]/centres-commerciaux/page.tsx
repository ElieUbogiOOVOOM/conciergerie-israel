import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/pages/PageHero";
import { FeatureGrid } from "@/components/pages/FeatureGrid";
import { ProofStats } from "@/components/pages/ProofStats";
import { PageCta } from "@/components/pages/PageCta";

// Page univers « Centres commerciaux » (#25) — concept SEGULA : lounge,
// voiturier, personal shopper, stylisme et club de fidélité. Le bloc contact
// (+ offre -20 %) et le footer sont fournis par le layout.
const SEGULA_SERVICES = ["lounge", "valet", "personalShopper", "styling", "loyalty"] as const;
const PROOF_STATS = ["basket", "dwell", "loyalty"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "MallPage.meta" });
  return { title: t("title"), description: t("description") };
}

export default async function ShoppingCentresPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHero namespace="MallPage.hero" photoLabel="Centres commerciaux" />
      <FeatureGrid namespace="MallPage.concept" itemKeys={SEGULA_SERVICES} columns={3} />
      <ProofStats namespace="MallPage.proof" statKeys={PROOF_STATS} hasNote />
      {/* CTA → funnel RDV pré-filtré sur la cible « centres commerciaux » (#28). */}
      <PageCta namespace="MallPage.cta" href="/rdv?type=mall" />
    </>
  );
}
