import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/home/Hero";
import { Universes } from "@/components/home/Universes";

// Page d'accueil (#24) : bannière éditoriale puis présentation des trois univers
// (centres commerciaux, entreprises, particuliers). Le bloc contact et le footer
// sont fournis par le layout.
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Hero />
      <Universes />
    </>
  );
}
