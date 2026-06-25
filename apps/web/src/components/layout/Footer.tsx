import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/brand/Logo";

// Liens de navigation (ancres accueil) et liens légaux (routes dédiées livrées
// avec les pages légales #30).
const NAV_ITEMS = [
  { key: "shoppingCentres", href: "#centres-commerciaux" },
  { key: "businesses", href: "#entreprises" },
  { key: "individuals", href: "#particuliers" },
] as const;

const LEGAL_ITEMS = [
  { key: "legalNotice", href: "/mentions-legales" },
  { key: "privacy", href: "/politique-confidentialite" },
] as const;

export function Footer() {
  const t = useTranslations("Footer");
  const tn = useTranslations("Nav");
  const year = 2026;

  return (
    <footer className="border-t border-creme/10 bg-charbon">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 text-creme">
            <Logo size={36} className="text-or-champagne" />
            <p className="font-title text-2xl uppercase tracking-[0.35em]">HYMEA</p>
          </div>
          <p className="mt-4 max-w-sm text-[length:var(--text-lead)] text-creme/65">
            {t("tagline")}
          </p>
        </div>

        <nav aria-label={t("navTitle")}>
          <h2 className="font-label text-xs uppercase tracking-[0.25em] text-or-champagne">
            {t("navTitle")}
          </h2>
          <ul className="mt-5 space-y-3">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <a
                  href={item.href}
                  className="font-label text-sm uppercase tracking-widest text-creme/70 transition-colors hover:text-creme"
                >
                  {tn(item.key)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t("legalTitle")}>
          <h2 className="font-label text-xs uppercase tracking-[0.25em] text-or-champagne">
            {t("legalTitle")}
          </h2>
          <ul className="mt-5 space-y-3">
            {LEGAL_ITEMS.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  prefetch={false}
                  className="font-label text-sm uppercase tracking-widest text-creme/70 transition-colors hover:text-creme"
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-creme/10">
        <p className="mx-auto max-w-6xl px-6 py-6 font-label text-xs uppercase tracking-widest text-creme/45">
          © {year} HYMEA — {t("rights")}
        </p>
      </div>
    </footer>
  );
}
