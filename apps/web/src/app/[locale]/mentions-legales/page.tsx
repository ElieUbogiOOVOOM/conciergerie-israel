import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalDoc } from "@/components/pages/LegalDoc";

// Mentions légales (#30) — page neutre, trilingue (FR/EN/HE). Liée depuis le
// footer (« Informations »). Contenu porté par les messages LegalNotice.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "LegalNotice.meta" });
  return { title: t("title"), description: t("description") };
}

export default async function LegalNoticePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LegalDoc namespace="LegalNotice" />;
}
