import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@hymea/shared";
import { buildPageMetadata } from "@/lib/seo";
import { Hero } from "@/components/home/Hero";
import { Leviers } from "@/components/home/Leviers";
import { Experience } from "@/components/home/Experience";
import { Results } from "@/components/home/Results";
import { PageCta } from "@/components/pages/PageCta";

// Page univers « Centres commerciaux » (#25) — reçoit l'expérience premium
// HYMEA (deck) : accroche → trois leviers de valeur → services signature →
// preuve chiffrée → CTA de conversion vers le funnel RDV typé. Le bloc contact
// (+ offre -20 %) et le footer sont fournis par le layout.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale: locale as Locale,
    namespace: "MallPage.meta",
    path: "/centres-commerciaux",
  });
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
      <Hero />
      <Leviers />
      <Experience />
      <Results />
      {/* CTA → funnel RDV pré-filtré sur la cible « centres commerciaux » (#28). */}
      <PageCta namespace="MallPage.cta" href="/rdv?type=mall" />
    </>
  );
}
