import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LandingHero } from "@/components/landing/LandingHero";
import { Universes } from "@/components/home/Universes";
import { GroupHistory } from "@/components/landing/GroupHistory";
import { Partnership } from "@/components/landing/Partnership";

// Page de garde HYMEA — vitrine de marque. Enchaînement : bannière signature
// (logo, slogan, expérience HYMEA) → redirection vers les trois univers
// (particuliers / entreprises / centres commerciaux) → histoire du groupe
// Sandra Bibas Holding → partenariat. Le bloc contact (+ offre −20 %) et le
// footer sont fournis par le layout.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing.meta" });
  return { title: t("title"), description: t("description") };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <LandingHero />
      {/* Cible de l'ancre #univers (CTA du hero) — bloc de redirection. */}
      <div id="univers" className="scroll-mt-24">
        <Universes />
      </div>
      <GroupHistory />
      <Partnership />
    </>
  );
}
