"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";

// Les entrées de navigation ancrent vers les sections de l'accueil. Elles
// deviendront des routes dédiées avec les pages univers (#25-27).
const NAV_ITEMS = [
  { key: "shoppingCentres", href: "#centres-commerciaux" },
  { key: "businesses", href: "#entreprises" },
  { key: "individuals", href: "#particuliers" },
  { key: "contact", href: "#contact" },
] as const;

export function Header() {
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Referme le menu mobile à chaque navigation et sur Échap.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-creme/10 bg-charbon/85 backdrop-blur-md">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-or-champagne focus:px-4 focus:py-2 focus:font-label focus:text-xs focus:uppercase focus:tracking-widest focus:text-charbon"
      >
        {t("skipToContent")}
      </a>

      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          aria-label="HYMEA"
          className="group flex items-center gap-3 text-creme transition-colors hover:text-or-champagne"
        >
          <Logo size={34} className="text-or-champagne" />
          <span className="font-title text-2xl uppercase tracking-[0.35em]">HYMEA</span>
        </Link>

        {/* Navigation principale (desktop) */}
        <nav aria-label={t("primary")} className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className="font-label text-xs uppercase tracking-widest text-creme/70 transition-colors hover:text-creme"
            >
              {t(item.key)}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <LanguageSwitcher />
        </div>

        {/* Déclencheur du menu mobile */}
        <button
          type="button"
          className="flex items-center gap-2 font-label text-xs uppercase tracking-widest text-creme md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? t("close") : t("menu")}
        </button>
      </div>

      {/* Panneau mobile */}
      {open && (
        <div id="mobile-menu" className="border-t border-creme/10 bg-charbon md:hidden">
          <nav aria-label={t("primary")} className="mx-auto flex max-w-6xl flex-col px-6 py-4">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.key}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-creme/5 py-4 font-label text-sm uppercase tracking-widest text-creme/80 transition-colors hover:text-or-champagne"
              >
                {t(item.key)}
              </a>
            ))}
            <div className="pt-5">
              <LanguageSwitcher />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
