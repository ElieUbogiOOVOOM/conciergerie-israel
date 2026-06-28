import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@hymea/shared";
import { buildPageMetadata } from "@/lib/seo";
import { Hero } from "@/components/home/Hero";
import { Leviers } from "@/components/home/Leviers";
import { Experience } from "@/components/home/Experience";
import { Results } from "@/components/home/Results";

// Page univers « Centres commerciaux » (#25) — reçoit l'expérience premium
// HYMEA (deck) : accroche → trois leviers de valeur → services signature →
// preuve chiffrée. La conversion est portée par le bloc contact commun (offre
// -20 % + CTA RDV pré-filtré « mall ») et le footer, fournis par le layout.
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
    </>
  );
}
