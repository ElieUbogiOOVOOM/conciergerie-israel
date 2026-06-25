"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { locales, type Locale } from "@hymea/shared";
import { usePathname, useRouter } from "@/i18n/navigation";

// Chaque langue est affichée dans sa propre langue (convention d'accessibilité).
const LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  he: "עברית",
};

const SHORT: Record<Locale, string> = {
  fr: "FR",
  en: "EN",
  he: "עב",
};

/**
 * Sélecteur de langue : conserve le chemin courant et met à jour la locale
 * (le cookie NEXT_LOCALE est posé par le middleware au changement d'URL).
 */
export function LanguageSwitcher() {
  const t = useTranslations("LanguageSwitcher");
  const active = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === active) return;
    startTransition(() => {
      // pathname est déjà sans préfixe de langue : on rejoue la même route dans
      // la locale cible (le middleware met à jour le cookie NEXT_LOCALE).
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <nav aria-label={t("label")} className="flex items-center gap-1">
      <ul className="flex items-center gap-1">
        {locales.map((loc) => {
          const isActive = loc === active;
          return (
            <li key={loc}>
              <button
                type="button"
                lang={loc}
                onClick={() => switchTo(loc)}
                disabled={isPending}
                aria-current={isActive ? "true" : undefined}
                title={LABELS[loc]}
                className={[
                  "px-2 py-1 font-label text-xs uppercase tracking-widest transition-colors",
                  // La langue active porte l'unique touche de bleu cobalt de la
                  // vitrine — un accent confidentiel, volontairement rare.
                  isActive ? "text-bleu" : "text-encre/60 hover:text-encre disabled:opacity-50",
                ].join(" ")}
              >
                <span aria-hidden="true">{SHORT[loc]}</span>
                <span className="sr-only">{LABELS[loc]}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
