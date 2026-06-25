import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { dir, isLocale, type Locale } from "@hymea/shared";
import { fontVariables } from "@/fonts";
import { routing } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ContactBlock } from "@/components/layout/ContactBlock";
import "../globals.css";

// Pré-rend les trois langues à la compilation.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Métadonnées racine (#31) : servent l'accueil et fournissent les valeurs par
// défaut (metadataBase, OG, hreflang, icône) héritées par les pages enfants.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // L'icône (favicon mandala) est injectée par la convention app/icon.svg.
  const base = await buildPageMetadata({ locale: locale as Locale, namespace: "Meta", path: "" });
  return {
    ...base,
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }
  // Active le rendu statique pour cette locale et charge ses messages.
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} dir={dir(locale)} className={fontVariables}>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main id="contenu" className="flex-1">
            {children}
          </main>
          <ContactBlock />
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
