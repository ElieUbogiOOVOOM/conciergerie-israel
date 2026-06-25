import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@hymea/shared";
import { buildPageMetadata } from "@/lib/seo";
import { LegalDoc } from "@/components/pages/LegalDoc";

// Politique de confidentialité (#30) — finalité, conservation 12 mois, droits
// d'accès/rectification/suppression. Trilingue. La version du texte de
// consentement référencée par le funnel (#29) y est explicitée.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale: locale as Locale,
    namespace: "PrivacyPolicy.meta",
    path: "/politique-confidentialite",
  });
}

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LegalDoc namespace="PrivacyPolicy" />;
}
