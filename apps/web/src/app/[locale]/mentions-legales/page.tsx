import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@hymea/shared";
import { buildPageMetadata } from "@/lib/seo";
import { LegalDoc } from "@/components/pages/LegalDoc";

// Mentions légales (#30) — page neutre, trilingue (FR/EN/HE). Liée depuis le
// footer (« Informations »). Contenu porté par les messages LegalNotice.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale: locale as Locale,
    namespace: "LegalNotice.meta",
    path: "/mentions-legales",
  });
}

export default async function LegalNoticePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LegalDoc namespace="LegalNotice" />;
}
