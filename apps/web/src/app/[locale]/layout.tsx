import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { dir, isLocale } from "@hymea/shared";
import { fontVariables } from "@/fonts";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ContactBlock } from "@/components/layout/ContactBlock";
import "../globals.css";

// Pré-rend les trois langues à la compilation.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("title"),
    description: t("description"),
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
      <head>
        {/* Marque le JS actif avant le paint : les révélations au scroll ne
            s'appliquent qu'avec JS, le contenu reste visible sans (SEO + a11y). */}
        <script
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
      </head>
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
