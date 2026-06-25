import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";

// Page d'accueil provisoire (#22) : valide le rendu trilingue et le RTL hébreu.
// Le contenu éditorial complet (les 3 univers) arrive en #24.
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations("Home.hero");
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <p className="font-label text-sm uppercase tracking-[0.3em] text-or-champagne">
        {t("eyebrow")}
      </p>
      <h1 className="mt-6 font-title text-[length:var(--text-display)] text-creme">{t("title")}</h1>
      <p className="mt-8 max-w-[var(--measure)] text-[length:var(--text-lead)] text-creme/80">
        {t("subtitle")}
      </p>
    </section>
  );
}
