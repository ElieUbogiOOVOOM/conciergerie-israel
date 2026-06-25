import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/home/Hero";
import { Leviers } from "@/components/home/Leviers";
import { Experience } from "@/components/home/Experience";
import { Results } from "@/components/home/Results";
import { Universes } from "@/components/home/Universes";

// Page d'accueil (#24) — orientée conversion, registre « expérience premium »
// (deck SEGULA). Enchaînement : accroche → leviers de valeur → services
// signature → preuve chiffrée → les trois univers. Le bloc contact (+ offre
// -20 %) et le footer sont fournis par le layout.
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Hero />
      <Leviers />
      <Experience />
      <Results />
      <Universes />
    </>
  );
}
