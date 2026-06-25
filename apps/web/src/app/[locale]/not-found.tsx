import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// 404 localisée, fidèle à la charte sombre.
export default function NotFound() {
  const t = useTranslations("NotFound");
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="font-label text-sm uppercase tracking-[0.3em] text-or-champagne">404</p>
      <h1 className="mt-6 font-title text-[length:var(--text-h1)] text-creme">{t("title")}</h1>
      <p className="mt-6 max-w-[var(--measure)] text-[length:var(--text-lead)] text-creme/80">
        {t("description")}
      </p>
      <Link
        href="/"
        className="mt-10 font-label text-sm uppercase tracking-widest text-or-profond underline-offset-4 hover:underline"
      >
        {t("cta")}
      </Link>
    </section>
  );
}
