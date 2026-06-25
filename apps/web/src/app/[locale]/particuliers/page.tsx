import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/pages/PageHero";
import { FeatureGrid } from "@/components/pages/FeatureGrid";
import { Pillars } from "@/components/pages/Pillars";
import { PageCta } from "@/components/pages/PageCta";

// Page univers « Particuliers » (#27) — nettoyage haut de gamme : habitations,
// véhicules, mobilier et textiles. Le bloc contact (+ offre -20 %) et le footer
// sont fournis par le layout.
const PRESTATIONS = ["homes", "vehicles", "furniture", "textiles"] as const;
const COMMITMENTS = ["diagnosis", "care", "discretion", "reliability"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "IndividualsPage.meta" });
  return { title: t("title"), description: t("description") };
}

export default async function IndividualsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHero namespace="IndividualsPage.hero" photoLabel="Particuliers" />
      <FeatureGrid namespace="IndividualsPage.services" itemKeys={PRESTATIONS} columns={4} />
      <Pillars namespace="IndividualsPage.commitments" itemKeys={COMMITMENTS} />
      {/* CTA → funnel ?type=particulier (#28) une fois livré ; en attendant #contact. */}
      <PageCta namespace="IndividualsPage.cta" />
    </>
  );
}
