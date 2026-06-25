import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { isTypeClient, type Locale } from "@hymea/shared";
import { buildPageMetadata } from "@/lib/seo";
import { RdvFunnel } from "@/components/rdv/RdvFunnel";

// Funnel de prise de rendez-vous (#28). Le type de client peut être
// pré-sélectionné via `?type=mall|entreprise|particulier` depuis les CTA des
// pages univers ; toute valeur invalide est ignorée (l'utilisateur choisit).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({ locale: locale as Locale, namespace: "Rdv.meta", path: "/rdv" });
}

export default async function RdvPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { locale } = await params;
  const { type } = await searchParams;
  setRequestLocale(locale);

  const initialType = type && isTypeClient(type) ? type : null;

  return <RdvFunnel initialType={initialType} />;
}
