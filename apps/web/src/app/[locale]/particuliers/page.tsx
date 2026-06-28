import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@hymea/shared";
import { buildPageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/pages/PageHero";
import { FeatureGrid } from "@/components/pages/FeatureGrid";
import { Pillars } from "@/components/pages/Pillars";

// Page univers « Particuliers » (#27) — nettoyage haut de gamme : habitations,
// véhicules, mobilier et textiles. La conversion est portée par le bloc contact
// commun (offre -20 % + CTA RDV pré-filtré « particulier ») et le footer, fournis
// par le layout.
const PRESTATIONS = ["homes", "vehicles", "furniture", "textiles"] as const;
const COMMITMENTS = ["diagnosis", "care", "discretion", "reliability"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale: locale as Locale,
    namespace: "IndividualsPage.meta",
    path: "/particuliers",
  });
}

export default async function IndividualsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHero namespace="IndividualsPage.hero" photoLabel="Particuliers" />
      <FeatureGrid namespace="IndividualsPage.services" itemKeys={PRESTATIONS} columns={4} />
      <Pillars namespace="IndividualsPage.commitments" itemKeys={COMMITMENTS} />
    </>
  );
}
